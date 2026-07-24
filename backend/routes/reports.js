const express = require('express');
const { requirePermission } = require('../middleware/auth');
const { generatePowerPointReport } = require('../services/pptx');
const { supabase } = require('../services/supabase');
const { currentPeriodMonth } = require('../lib/periods');

const router = express.Router();

const { buildChartData } = require('../services/chart');

// GET /api/reports/preview — returns report preview metadata
router.get('/reports/preview', requirePermission('reports.preview'), async (req, res, next) => {
  try {
    const period_month = req.query.period_month || currentPeriodMonth();
    const year = Number(period_month.split('-')[0]);

    const chartData = await buildChartData({ period_month, year });

    res.json({
      period_month,
      slides: [
        { id: 1, title: 'หน้าปกรายงาน (Title Cover)', type: 'cover' },
        { id: 2, title: 'สรุปภาพรวมสถิติประจำเดือน (Executive Summary Table)', type: 'summary' },
        { id: 3, title: 'สถิติเปรียบเทียบขยะ 12 เดือน (Monthly Waste Comparison)', type: 'chart' },
        { id: 4, title: 'สรุปสูตรการคำนวณขยะเปียก 3 ส่วน (Wet Waste Breakdown)', type: 'formula' },
        { id: 5, title: 'รายงานยอดขายขยะรีไซเคิล 9 หมวดหมู่ (Recycle 9 Categories)', type: 'recycle' },
        { id: 6, title: 'สรุปของใช้สิ้นเปลืองและถุงขยะ (Consumables & Black Bags)', type: 'consumables' },
      ],
      data: chartData,
    });
  } catch (err) { next(err); }
});

const { generateExcelReport } = require('../services/excel-exporter');

// GET /api/reports/excel — generates and streams .xlsx file (Query param: period_month, module)
router.get('/reports/excel', requirePermission('reports.export'), async (req, res, next) => {
  try {
    const period_month = req.query.period_month || currentPeriodMonth();
    const moduleFilter = req.query.module;

    let query = supabase.from('data_entries').select('*').order('entry_date', { ascending: true });
    if (period_month && period_month !== 'all') {
      query = query.eq('period_month', period_month);
    }
    if (moduleFilter && moduleFilter !== 'all') {
      query = query.eq('module', moduleFilter);
    }

    const { data: entries, error } = await query;
    if (error) throw error;

    const buffer = await generateExcelReport({ period_month, entries: entries || [] });

    const filename = `CKAP_Excel_Report_${period_month || 'All'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) { next(err); }
});

// POST /api/reports/excel — generates and streams .xlsx file via POST body
router.post('/reports/excel', requirePermission('reports.export'), async (req, res, next) => {
  try {
    const { period_month = currentPeriodMonth(), module: moduleFilter } = req.body;

    let query = supabase.from('data_entries').select('*').order('entry_date', { ascending: true });
    if (period_month && period_month !== 'all') {
      query = query.eq('period_month', period_month);
    }
    if (moduleFilter && moduleFilter !== 'all') {
      query = query.eq('module', moduleFilter);
    }

    const { data: entries, error } = await query;
    if (error) throw error;

    const buffer = await generateExcelReport({ period_month, entries: entries || [] });

    const filename = `CKAP_Excel_Report_${period_month || 'All'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) { next(err); }
});

// POST /api/reports/powerpoint — generates and streams .pptx binary
router.post('/reports/powerpoint', requirePermission('reports.export'), async (req, res, next) => {
  try {
    const { period_month = currentPeriodMonth() } = req.body;
    const year = Number(period_month.split('-')[0]);

    const chartAnalytics = await buildChartData({ period_month, year });

    const buffer = await generatePowerPointReport({
      period_month,
      rawEntries: chartAnalytics.rawEntries || [],
      yearComparison: chartAnalytics.monthlyComparison || [],
    });

    const filename = `CKAP_PowerPoint_Report_${period_month.slice(0, 7)}.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

    // Audit log
    await supabase.from('report_runs').insert([{
      period_month,
      status: 'success',
      generated_by: req.user.id,
    }]).catch(() => null);
  } catch (err) { next(err); }
});

module.exports = router;
