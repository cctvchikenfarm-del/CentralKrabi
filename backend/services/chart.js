const { supabase } = require('./supabase');
const { WET_WASTE_SOURCE_MODULES } = require('../lib/modules');
const { daysInPeriodMonth } = require('../lib/periods');

/**
 * Build comprehensive chart analytics data.
 */
async function buildChartData({ module, metric = 'weight_kg', period_month, year }) {
  let selectedYear = Number(year);
  if (!selectedYear) {
    if (period_month) {
      selectedYear = Number(period_month.split('-')[0]);
    } else {
      selectedYear = new Date().getFullYear();
    }
  } else if (selectedYear > 2500) {
    selectedYear -= 543;
  }

  const startPeriod = `${selectedYear}-01-01`;
  const endPeriod   = `${selectedYear}-12-01`;

  // Fetch full year data_entries
  const { data: yearEntries, error } = await supabase
    .from('data_entries')
    .select('*')
    .gte('period_month', startPeriod)
    .lte('period_month', endPeriod)
    .order('entry_date', { ascending: true });

  if (error) throw error;

  const rows = yearEntries || [];

  // Generate 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const mStr = String(i + 1).padStart(2, '0');
    return `${selectedYear}-${mStr}-01`;
  });

  // 1. Monthly Comparison across all 12 months
  const monthlyComparison = months.map(m => {
    const mRows = rows.filter(r => r.period_month === m);
    const rdfWeight = mRows.filter(r => r.module === 'rdf').reduce((s, r) => s + Number(r.weight_kg ?? 0), 0);
    const dogWeight = mRows.filter(r => r.module === 'dog_food').reduce((s, r) => s + Number(r.weight_kg ?? 0), 0);
    
    // Pig feed daily average x days in month
    const pigRow = mRows.find(r => r.module === 'pig_feed');
    const pigDailyAvg = pigRow ? Number(pigRow.quantity ?? pigRow.weight_kg ?? 0) : 0;
    const pigWeight = Math.round(pigDailyAvg * daysInPeriodMonth(m) * 100) / 100;
    
    const wetWasteWeight = dogWeight + pigWeight;
    const recycleWeight = mRows.filter(r => r.module === 'recycle').reduce((s, r) => s + Number(r.weight_kg ?? 0), 0);
    const recycleRevenue = mRows.filter(r => r.module === 'recycle').reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const totalWeight = rdfWeight + wetWasteWeight + recycleWeight;

    return {
      period_month: m,
      month_num: Number(m.split('-')[1]),
      rdf_kg: Math.round(rdfWeight * 100) / 100,
      wet_waste_kg: Math.round(wetWasteWeight * 100) / 100,
      dog_food_kg: Math.round(dogWeight * 100) / 100,
      pig_feed_kg: Math.round(pigWeight * 100) / 100,
      recycle_kg: Math.round(recycleWeight * 100) / 100,
      recycle_revenue: Math.round(recycleRevenue * 100) / 100,
      total_kg: Math.round(totalWeight * 100) / 100,
      total_tons: Math.round((totalWeight / 1000) * 1000) / 1000,
    };
  });

  // 2. Daily time series for target period_month
  const targetMonth = period_month || `${selectedYear}-01-01`;
  const targetMonthRows = rows.filter(r => r.period_month === targetMonth);

  let filteredRows = targetMonthRows;
  if (module === 'wet_waste') {
    filteredRows = targetMonthRows.filter(r => WET_WASTE_SOURCE_MODULES.includes(r.module));
  } else if (module) {
    filteredRows = targetMonthRows.filter(r => r.module === module);
  }

  const byDate = {};
  for (const row of filteredRows) {
    const d = row.entry_date;
    if (!byDate[d]) byDate[d] = 0;
    byDate[d] += Number(row[metric] ?? 0);
  }

  const dailySeries = Object.entries(byDate).map(([date, val]) => ({
    date,
    day_num: Number(date.split('-')[2]),
    value: Math.round(val * 100) / 100,
  }));

  // 3. Category Breakdown for target period_month (e.g. Recycle items or Wet Waste sources)
  const categoryBreakdown = {};
  for (const r of targetMonthRows) {
    if (module && r.module !== module && !(module === 'wet_waste' && WET_WASTE_SOURCE_MODULES.includes(r.module))) {
      continue;
    }
    const key = r.category_code;
    if (!categoryBreakdown[key]) {
      categoryBreakdown[key] = { category_code: key, weight_kg: 0, amount: 0, count: 0 };
    }
    categoryBreakdown[key].weight_kg += Number(r.weight_kg ?? 0);
    categoryBreakdown[key].amount += Number(r.amount ?? 0);
    categoryBreakdown[key].count += 1;
  }

  const categorySeries = Object.values(categoryBreakdown).map(item => ({
    ...item,
    weight_kg: Math.round(item.weight_kg * 100) / 100,
    amount: Math.round(item.amount * 100) / 100,
  }));

  return {
    year: selectedYear,
    period_month: targetMonth,
    module,
    metric,
    monthlyComparison,
    dailySeries,
    categorySeries,
    rawEntries: rows,
  };
}

module.exports = { buildChartData };
