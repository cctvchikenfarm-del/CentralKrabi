const express = require('express');
const { supabase } = require('../services/supabase');
const { requirePermission } = require('../middleware/auth');
const { WET_WASTE_SOURCE_MODULES } = require('../lib/modules');
const { daysInPeriodMonth } = require('../lib/periods');

const router = express.Router();

// ── Data Quality Score ────────────────────────────────────────────────────────
/**
 * Computes data quality score per module.
 * score = coverage × 70 + completeness × 30
 * coverage    = unique_days_with_entry / expected_days
 * completeness = rows_with_primary_metric / total_rows
 * score < 55 → anomaly (flagged)
 */
function computeQualityScore(rows, moduleConfig, periodMonth) {
  if (!rows || rows.length === 0) return { score: 0, coverage: 0, completeness: 0, anomaly: true };

  const totalDays = daysInPeriodMonth(periodMonth);
  const inputMode = moduleConfig?.input_mode || 'daily';
  const primaryMetric = moduleConfig?.primary_metric || 'weight_kg';

  // Expected days depends on input mode
  const expectedDays = ['monthly', 'calculated'].includes(inputMode) ? 1 : totalDays;

  const uniqueDays = new Set(rows.map(r => r.entry_date)).size;
  const coverage = Math.min(uniqueDays / expectedDays, 1);

  const rowsWithMetric = rows.filter(r => r[primaryMetric] !== null && r[primaryMetric] !== undefined && r[primaryMetric] > 0).length;
  const completeness = rows.length > 0 ? rowsWithMetric / rows.length : 0;

  const score = Math.round(coverage * 70 + completeness * 30);
  return {
    score,
    coverage: Math.round(coverage * 100),
    completeness: Math.round(completeness * 100),
    unique_days: uniqueDays,
    expected_days: expectedDays,
    row_count: rows.length,
    anomaly: score < 55,
  };
}

// ── GET /api/dashboard ────────────────────────────────────────────────────────
router.get('/dashboard', requirePermission('dashboard.read'), async (req, res, next) => {
  try {
    const { period_month } = req.query;
    if (!period_month) return res.status(400).json({ error: 'ต้องระบุ period_month' });

    // Derive prior month
    const [y, m] = period_month.split('-').map(Number);
    const priorDate = new Date(y, m - 2, 1); // month is 0-indexed in JS Date constructor
    const prior_month = `${priorDate.getFullYear()}-${String(priorDate.getMonth() + 1).padStart(2, '0')}-01`;

    // Fetch entries for both months
    const [currResp, priorResp, modulesResp] = await Promise.all([
      supabase.from('data_entries').select('*').eq('period_month', period_month),
      supabase.from('data_entries').select('*').eq('period_month', prior_month),
      supabase.from('master_modules').select('code, input_mode, primary_metric, better_direction').eq('active', true),
    ]);

    if (currResp.error) throw currResp.error;
    if (modulesResp.error) throw modulesResp.error;

    const currEntries = currResp.data || [];
    const priorEntries = priorResp.data || [];
    const modules = modulesResp.data || [];

    // Group entries by module
    const groupByModule = (entries) => {
      const grouped = {};
      for (const e of entries) {
        if (!grouped[e.module]) grouped[e.module] = [];
        grouped[e.module].push(e);
      }
      return grouped;
    };

    const currByModule  = groupByModule(currEntries);
    const priorByModule = groupByModule(priorEntries);

    const totalDays = daysInPeriodMonth(period_month);

    // Compute per-module totals and MoM change
    const moduleSummaries = [];

    // Pre-calculate dog_food total and pig_feed daily_avg
    const dogFoodActual = currByModule['dog_food']?.reduce((s, r) => s + (r.weight_kg ?? 0), 0) ?? 0;
    const pigFeedDailyAvg = currByModule['pig_feed']?.reduce((s, r) => s + (r.quantity ?? r.weight_kg ?? 0), 0) ?? 0;
    const pigFeedEstimatedTotal = pigFeedDailyAvg * totalDays;

    for (const mod of modules) {
      const curr  = currByModule[mod.code]  || [];
      const prior = priorByModule[mod.code] || [];

      const metric = mod.primary_metric || 'weight_kg';
      let currTotal = curr.reduce((s, r) => s + (r[metric] ?? 0), 0);

      // Pig feed mode: daily_avg * days_in_month
      if (mod.code === 'pig_feed') {
        currTotal = pigFeedEstimatedTotal;
      }

      // wet_waste override: sum dog_food_actual + pig_feed_estimated
      let wetWasteBreakdown = null;
      if (mod.code === 'wet_waste') {
        currTotal = dogFoodActual + pigFeedEstimatedTotal;
        wetWasteBreakdown = {
          dog_food_actual: Math.round(dogFoodActual * 100) / 100,
          pig_feed_estimated: Math.round(pigFeedEstimatedTotal * 100) / 100,
          total_wet_waste: Math.round(currTotal * 100) / 100,
        };
      }

      const priorTotal = prior.reduce((s, r) => s + (r[metric] ?? 0), 0);
      const momPct = priorTotal > 0 ? ((currTotal - priorTotal) / priorTotal) * 100 : null;
      const quality = computeQualityScore(curr, mod, period_month);

      moduleSummaries.push({
        module:           mod.code,
        current_total:    Math.round(currTotal * 100) / 100,
        prior_total:      Math.round(priorTotal * 100) / 100,
        mom_pct:          momPct !== null ? Math.round(momPct * 10) / 10 : null,
        better_direction: mod.better_direction,
        row_count:        curr.length,
        wet_waste_breakdown: wetWasteBreakdown,
        quality,
      });
    }

    res.json({
      period_month,
      prior_month,
      modules: moduleSummaries,
    });
  } catch (err) { next(err); }
});

// ── GET /api/data-quality ─────────────────────────────────────────────────────
router.get('/data-quality', requirePermission('dashboard.read'), async (req, res, next) => {
  try {
    const { period_month } = req.query;
    if (!period_month) return res.status(400).json({ error: 'ต้องระบุ period_month' });

    const [entriesResp, modulesResp] = await Promise.all([
      supabase.from('data_entries').select('module, entry_date, weight_kg, quantity, amount').eq('period_month', period_month),
      supabase.from('master_modules').select('code, input_mode, primary_metric').eq('active', true),
    ]);

    if (entriesResp.error) throw entriesResp.error;

    const entries = entriesResp.data || [];
    const modules = modulesResp.data || [];

    const grouped = {};
    for (const e of entries) {
      if (!grouped[e.module]) grouped[e.module] = [];
      grouped[e.module].push(e);
    }

    const scores = modules.map(mod => ({
      module: mod.code,
      ...computeQualityScore(grouped[mod.code] || [], mod, period_month),
    }));

    res.json({ period_month, scores });
  } catch (err) { next(err); }
});

// Approved recycle categories strictly per user specification (9 items)
const RECYCLE_ALLOWED_CODES = [
  'rc_brown_paper',
  'rc_jap_jua',
  'rc_tin_can',
  'rc_tin_can_2nd',
  'rc_pet',
  'rc_plastic_mixed',
  'rc_plastic_mixed_2nd',
  'rc_alu_coke',
  'rc_glass_mixed',
];

const EXACT_RECYCLE_CATEGORIES = [
  { module: 'recycle', code: 'rc_brown_paper',       name_th: 'กระดาษน้ำตาล',           unit: 'กก.', color: '#b45309', sort_order: 0, active: true },
  { module: 'recycle', code: 'rc_jap_jua',           name_th: 'กระดาษจับจั้ว',          unit: 'กก.', color: '#d97706', sort_order: 1, active: true },
  { module: 'recycle', code: 'rc_tin_can',           name_th: 'สังกะสีกระป๋อง',         unit: 'กก.', color: '#64748b', sort_order: 2, active: true },
  { module: 'recycle', code: 'rc_tin_can_2nd',       name_th: 'สังกะสีกระป๋อง อีกราคา',  unit: 'กก.', color: '#475569', sort_order: 3, active: true },
  { module: 'recycle', code: 'rc_pet',               name_th: 'PET',                    unit: 'กก.', color: '#0284c7', sort_order: 4, active: true },
  { module: 'recycle', code: 'rc_plastic_mixed',     name_th: 'พลาสติกรวม',             unit: 'กก.', color: '#16a34a', sort_order: 5, active: true },
  { module: 'recycle', code: 'rc_plastic_mixed_2nd', name_th: 'พลาสติกรวม อีกราคา',     unit: 'กก.', color: '#15803d', sort_order: 6, active: true },
  { module: 'recycle', code: 'rc_alu_coke',          name_th: 'อลู-โค๊ก',               unit: 'กก.', color: '#eab308', sort_order: 7, active: true },
  { module: 'recycle', code: 'rc_glass_mixed',       name_th: 'แก้ว-รวมสี',             unit: 'กก.', color: '#2563eb', sort_order: 8, active: true },
];

// ── GET /api/master-categories ────────────────────────────────────────────────
router.get('/master-categories', requirePermission('entries.read'), async (req, res, next) => {
  try {
    const { module } = req.query;

    if (module === 'dog_food') {
      await supabase.from('master_categories').update({ name_th: 'อาหารสุนัข' }).eq('module', 'dog_food').eq('code', 'df_general');
      await supabase.from('master_modules').update({ label_th: 'อาหารสุนัข' }).eq('code', 'dog_food');
    }

    if (module === 'recycle') {
      // Auto upsert exact 9 items into DB
      await supabase.from('master_categories').upsert(EXACT_RECYCLE_CATEGORIES, { onConflict: 'module,code' });
      // Delete old unused codes
      const allowedCodes = EXACT_RECYCLE_CATEGORIES.map(c => c.code);
      await supabase.from('master_categories').delete().eq('module', 'recycle').not('code', 'in', `("${allowedCodes.join('","')}")`);
    }

    let q = supabase
      .from('master_categories')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (module) q = q.eq('module', module);

    const { data, error } = await q;
    if (error) throw error;

    res.json({ data: data || [] });
  } catch (err) { next(err); }
});

module.exports = router;
