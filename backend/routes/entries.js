const express = require('express');
const { z } = require('zod');
const { supabase } = require('../services/supabase');
const { requirePermission } = require('../middleware/auth');
const { toPeriodMonth, validateEntryDateInPeriod, todayBangkok } = require('../lib/periods');
const { WET_WASTE_SOURCE_MODULES } = require('../lib/modules');

const router = express.Router();

// ── Zod Schemas ───────────────────────────────────────────────────────────────
const EntrySchema = z.object({
  module:        z.string().min(1),
  category_code: z.string().min(1),
  entry_date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)'),
  weight_kg:     z.number().nonnegative().nullable().optional(),
  quantity:      z.number().nonnegative().nullable().optional(),
  unit_price:    z.number().nonnegative().nullable().optional(),
  amount:        z.number().nonnegative().nullable().optional(),
  notes:         z.string().max(500).nullable().optional(),
  metadata:      z.record(z.unknown()).nullable().optional(),
}).refine(d => {
  const period = toPeriodMonth(d.entry_date);
  try { validateEntryDateInPeriod(d.entry_date, period); return true; } catch { return false; }
}, { message: 'entry_date ไม่ตรงกับ period_month' });

// ── GET /api/entries ──────────────────────────────────────────────────────────
router.get('/entries', requirePermission('entries.read'), async (req, res, next) => {
  try {
    const { module, period_month, entry_date, limit = 200, offset = 0 } = req.query;

    let q = supabase
      .from('data_entries')
      .select('*', { count: 'exact' })
      .order('entry_date', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (module) {
      // wet_waste is calculated — expand to source modules
      if (module === 'wet_waste') {
        q = q.in('module', WET_WASTE_SOURCE_MODULES);
      } else {
        q = q.eq('module', module);
      }
    }
    if (period_month) q = q.eq('period_month', period_month);
    if (entry_date)   q = q.eq('entry_date', entry_date);

    const { data, error, count } = await q;
    if (error) throw error;

    res.json({ data, count, offset: Number(offset), limit: Number(limit) });
  } catch (err) { next(err); }
});

// ── GET /api/entries/calendar ─────────────────────────────────────────────────
router.get('/entries/calendar', requirePermission('entries.read'), async (req, res, next) => {
  try {
    const { period_month, module } = req.query;
    if (!period_month) return res.status(400).json({ error: 'ต้องระบุ period_month' });

    let q = supabase
      .from('data_entries')
      .select('entry_date, module')
      .eq('period_month', period_month);

    if (module && module !== 'wet_waste') q = q.eq('module', module);
    if (module === 'wet_waste') q = q.in('module', WET_WASTE_SOURCE_MODULES);

    const { data, error } = await q;
    if (error) throw error;

    // Group by date → set of modules
    const byDate = {};
    for (const row of data) {
      if (!byDate[row.entry_date]) byDate[row.entry_date] = new Set();
      byDate[row.entry_date].add(row.module);
    }

    // Convert sets to arrays
    const calendar = Object.fromEntries(
      Object.entries(byDate).map(([d, mods]) => [d, [...mods]])
    );

    res.json({ period_month, calendar });
  } catch (err) { next(err); }
});

// ── GET /api/entries/day ──────────────────────────────────────────────────────
router.get('/entries/day', requirePermission('entries.read'), async (req, res, next) => {
  try {
    const { entry_date, module } = req.query;
    if (!entry_date) return res.status(400).json({ error: 'ต้องระบุ entry_date' });

    let q = supabase
      .from('data_entries')
      .select('*')
      .eq('entry_date', entry_date)
      .order('module', { ascending: true });

    if (module && module !== 'wet_waste') q = q.eq('module', module);
    if (module === 'wet_waste') q = q.in('module', WET_WASTE_SOURCE_MODULES);

    const { data, error } = await q;
    if (error) throw error;

    res.json({ entry_date, data });
  } catch (err) { next(err); }
});

// ── GET /api/entries/month-summary ───────────────────────────────────────────
router.get('/entries/month-summary', requirePermission('entries.read'), async (req, res, next) => {
  try {
    const { period_month } = req.query;
    if (!period_month) return res.status(400).json({ error: 'ต้องระบุ period_month' });

    const { data, error } = await supabase
      .from('data_entries')
      .select('module, weight_kg, quantity, amount')
      .eq('period_month', period_month);

    if (error) throw error;

    // Aggregate per module
    const summary = {};
    for (const row of data) {
      if (!summary[row.module]) summary[row.module] = { total_weight_kg: 0, total_amount: 0, row_count: 0 };
      summary[row.module].total_weight_kg += row.weight_kg ?? 0;
      summary[row.module].total_amount    += row.amount    ?? 0;
      summary[row.module].row_count       += 1;
    }

    // Add wet_waste as calculated field
    const dogFood  = summary['dog_food']?.total_weight_kg ?? 0;
    const pigFeed  = summary['pig_feed']?.total_weight_kg ?? 0;
    summary['wet_waste'] = {
      total_weight_kg: dogFood + pigFeed,
      total_amount: 0,
      row_count: 0,
      calculated: true,
    };

    res.json({ period_month, summary });
  } catch (err) { next(err); }
});

// ── GET /api/entries/yearly-ledger ───────────────────────────────────────────
router.get('/entries/yearly-ledger', requirePermission('entries.read'), async (req, res, next) => {
  try {
    let year = Number(req.query.year);
    if (!year) {
      year = new Date().getFullYear();
    } else if (year > 2500) {
      year -= 543; // Convert Buddhist year to AD year if passed in BE
    }

    const startPeriod = `${year}-01-01`;
    const endPeriod   = `${year}-12-01`;

    const { data: rows, error } = await supabase
      .from('data_entries')
      .select('*')
      .gte('period_month', startPeriod)
      .lte('period_month', endPeriod)
      .order('period_month', { ascending: true });

    if (error) throw error;

    // Generate list of 12 period_months for the year
    const months = Array.from({ length: 12 }, (_, i) => {
      const mStr = String(i + 1).padStart(2, '0');
      return `${year}-${mStr}-01`;
    });

    // Group rows by module -> category_code -> period_month
    const matrix = {};
    for (const r of rows) {
      if (!matrix[r.module]) matrix[r.module] = {};
      if (!matrix[r.module][r.category_code]) matrix[r.module][r.category_code] = {};
      if (!matrix[r.module][r.category_code][r.period_month]) {
        matrix[r.module][r.category_code][r.period_month] = {
          weight_kg: 0,
          quantity: 0,
          amount: 0,
          row_count: 0,
          quantity_unit: r.quantity !== null ? r.quantity : null,
        };
      }
      const cell = matrix[r.module][r.category_code][r.period_month];
      cell.weight_kg += Number(r.weight_kg ?? 0);
      cell.quantity  += Number(r.quantity ?? 0);
      cell.amount    += Number(r.amount ?? 0);
      cell.row_count += 1;
    }

    res.json({ year, months, matrix });
  } catch (err) { next(err); }
});

// ── POST /api/entries ─────────────────────────────────────────────────────────
router.post('/entries', requirePermission('entries.create'), async (req, res, next) => {
  try {
    const parsed = EntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const entry = parsed.data;
    if (entry.module === 'wet_waste') {
      return res.status(400).json({ error: 'wet_waste เป็น calculated module ไม่สามารถบันทึกโดยตรงได้' });
    }

    const period_month = toPeriodMonth(entry.entry_date);
    const { data, error } = await supabase
      .from('data_entries')
      .insert([{
        ...entry,
        period_month,
        created_by: req.user.id,
      }])
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert([{
      actor_id:  req.user.id,
      action:    'create',
      table_name: 'data_entries',
      record_id: data.id,
      new_data:  data,
    }]);

    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// ── PUT /api/entries/:id ──────────────────────────────────────────────────────
router.put('/entries/:id', requirePermission('entries.edit'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch existing for audit
    const { data: existing, error: fetchErr } = await supabase
      .from('data_entries').select('*').eq('id', id).single();
    if (fetchErr || !existing) return res.status(404).json({ error: 'ไม่พบรายการที่ต้องการแก้ไข' });

    const parsed = EntrySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const updates = parsed.data;
    if (updates.entry_date) updates.period_month = toPeriodMonth(updates.entry_date);

    const { data, error } = await supabase
      .from('data_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert([{
      actor_id:   req.user.id,
      action:     'update',
      table_name: 'data_entries',
      record_id:  id,
      old_data:   existing,
      new_data:   data,
    }]);

    res.json({ data });
  } catch (err) { next(err); }
});

// ── DELETE /api/entries/:id ───────────────────────────────────────────────────
router.delete('/entries/:id', requirePermission('entries.delete'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: existing } = await supabase.from('data_entries').select('*').eq('id', id).single();

    const { error } = await supabase.from('data_entries').delete().eq('id', id);
    if (error) throw error;

    await supabase.from('audit_logs').insert([{
      actor_id:   req.user.id,
      action:     'delete',
      table_name: 'data_entries',
      record_id:  id,
      old_data:   existing,
    }]);

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── POST /api/entries/batch ───────────────────────────────────────────────────
router.post('/entries/batch', requirePermission('entries.import'), async (req, res, next) => {
  try {
    const { rows, import_batch_id } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'ต้องระบุ rows อย่างน้อย 1 รายการ' });
    }
    if (rows.length > 500) {
      return res.status(400).json({ error: 'นำเข้าได้สูงสุด 500 รายการต่อครั้ง' });
    }

    const enriched = rows.map(r => ({
      ...r,
      period_month: toPeriodMonth(r.entry_date),
      import_batch_id: import_batch_id ?? null,
      created_by: req.user.id,
    }));

    const { data, error } = await supabase.from('data_entries').insert(enriched).select();
    if (error) throw error;

    res.status(201).json({ inserted: data.length, data });
  } catch (err) { next(err); }
});

// ── POST /api/entries/upsert-monthly ─────────────────────────────────────────
// Handles pig_feed, black_bag, consumable (1 entry per category per month)
router.post('/entries/upsert-monthly', requirePermission('entries.create'), async (req, res, next) => {
  try {
    const { module, category_code, period_month, weight_kg, quantity, unit_price, amount, notes } = req.body;

    if (!module || !category_code || !period_month) {
      return res.status(400).json({ error: 'ต้องระบุ module, category_code และ period_month' });
    }

    const entry_date = `${period_month.slice(0, 7)}-01`;

    // Check if entry already exists for this module + category + period_month
    const { data: existing } = await supabase
      .from('data_entries')
      .select('id')
      .eq('module', module)
      .eq('category_code', category_code)
      .eq('period_month', period_month)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('data_entries')
        .update({
          weight_kg: weight_kg ?? null,
          quantity: quantity ?? null,
          unit_price: unit_price ?? null,
          amount: amount ?? null,
          notes: notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('data_entries')
        .insert([{
          module,
          category_code,
          entry_date,
          period_month,
          weight_kg: weight_kg ?? null,
          quantity: quantity ?? null,
          unit_price: unit_price ?? null,
          amount: amount ?? null,
          notes: notes ?? null,
          created_by: req.user.id,
        }])
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.json({ data: result });
  } catch (err) { next(err); }
});

// ── POST /api/entries/tissue-grid ────────────────────────────────────────────
// Saves Modified tissue grid cells for a full month (tissue_roll, tissue_hand, tissue_popup)
router.post('/entries/tissue-grid', requirePermission('entries.create'), async (req, res, next) => {
  try {
    const { cells } = req.body; // [{ entry_date, category_code, quantity }]
    if (!Array.isArray(cells) || cells.length === 0) {
      return res.status(400).json({ error: 'ต้องระบุ cells อย่างน้อย 1 รายการ' });
    }

    const results = [];
    for (const cell of cells) {
      const { entry_date, category_code, quantity } = cell;
      if (!entry_date || !category_code || quantity === undefined || quantity === null) continue;

      const qtyNum = Math.floor(Number(quantity));
      if (isNaN(qtyNum) || qtyNum < 0) continue; // Only integer >= 0

      const period_month = toPeriodMonth(entry_date);

      // Check existing
      const { data: existing } = await supabase
        .from('data_entries')
        .select('id')
        .eq('module', 'tissue')
        .eq('category_code', category_code)
        .eq('entry_date', entry_date)
        .maybeSingle();

      if (existing) {
        const { data } = await supabase
          .from('data_entries')
          .update({ quantity: qtyNum, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (data) results.push(data);
      } else {
        const { data } = await supabase
          .from('data_entries')
          .insert([{
            module: 'tissue',
            category_code,
            entry_date,
            period_month,
            quantity: qtyNum,
            created_by: req.user.id,
          }])
          .select()
          .single();
        if (data) results.push(data);
      }
    }

    res.json({ saved_count: results.length, data: results });
  } catch (err) { next(err); }
});

module.exports = router;
