const PptxGenJS = require('pptxgenjs');
const { MODULE_LABELS, canonicalUnit } = require('../lib/modules');
const { thaiMonthLabel, THAI_MONTHS_SHORT, daysInPeriodMonth } = require('../lib/periods');

/**
 * Server-side PowerPoint generator using pptxgenjs.
 */
async function generatePowerPointReport({ period_month, rawEntries = [], yearComparison = [] }) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  // Theme Palette
  const COLOR_NAVY     = '0F172A';
  const COLOR_BLUE     = '1E40AF';
  const COLOR_AMBER    = 'D97706';
  const COLOR_PURPLE   = '6B21A8';
  const COLOR_GREEN    = '15803D';
  const COLOR_SLATE    = '475569';
  const COLOR_LIGHT_BG = 'F8FAFC';

  const [yStr] = period_month.split('-');
  const selectedYear = Number(yStr);
  const thaiYear = selectedYear > 2500 ? selectedYear : selectedYear + 543;
  const periodLabel = thaiMonthLabel(period_month, 'full');

  // Filter entries for selected period_month
  const monthEntries = rawEntries.filter(r => r.period_month === period_month);

  // ── Slide 1: Cover Slide (หน้าปก) ──────────────────────────────────────────
  const slide1 = pptx.addSlide();
  slide1.background = { color: COLOR_NAVY };

  slide1.addText('รายงานสรุปสถิติการจัดการขยะและของใช้สิ้นเปลือง', {
    x: 0.8, y: 2.0, w: 11.5, h: 1.0,
    fontSize: 32, bold: true, color: 'FFFFFF', fontFace: 'Arial',
  });

  slide1.addText(`ประจำเดือน ${periodLabel} (พ.ศ. ${thaiYear})`, {
    x: 0.8, y: 3.2, w: 11.5, h: 0.8,
    fontSize: 22, bold: true, color: '60A5FA', fontFace: 'Arial',
  });

  slide1.addText('สถานีสรุปข้อมูลสถิติการจัดการขยะและทรัพยากร | CKAP System v4', {
    x: 0.8, y: 4.2, w: 11.5, h: 0.5,
    fontSize: 14, color: '94A3B8', fontFace: 'Arial',
  });

  slide1.addText(`วันที่สร้างเอกสาร: ${new Date().toLocaleDateString('th-TH')}`, {
    x: 0.8, y: 6.2, w: 11.5, h: 0.4,
    fontSize: 12, color: '64748B', fontFace: 'Arial',
  });

  // ── Slide 2: Executive Summary Table (สรุปภาพรวม 8 โมดูล) ─────────────────
  const slide2 = pptx.addSlide();
  slide2.addText(`1. สรุปภาพรวมสถิติประจำเดือน — ${periodLabel}`, {
    x: 0.8, y: 0.5, w: 11.5, h: 0.6,
    fontSize: 22, bold: true, color: COLOR_BLUE, fontFace: 'Arial',
  });

  const tableRows = [
    [
      { text: 'โมดูลการดำเนินงาน', options: { bold: true, fill: COLOR_BLUE, color: 'FFFFFF' } },
      { text: 'ปริมาณรวม', options: { bold: true, fill: COLOR_BLUE, color: 'FFFFFF', align: 'right' } },
      { text: 'หน่วย', options: { bold: true, fill: COLOR_BLUE, color: 'FFFFFF', align: 'center' } },
      { text: 'สถานะบันทึก', options: { bold: true, fill: COLOR_BLUE, color: 'FFFFFF', align: 'center' } },
    ],
  ];

  const MODULE_CODES = ['rdf', 'dog_food', 'pig_feed', 'wet_waste', 'black_bag', 'consumable', 'tissue', 'recycle'];

  for (const modCode of MODULE_CODES) {
    const modRows = monthEntries.filter(r => r.module === modCode);
    let totalVal = 0;

    if (modCode === 'pig_feed') {
      const pigRow = monthEntries.find(r => r.module === 'pig_feed');
      const dailyAvg = pigRow ? Number(pigRow.quantity ?? pigRow.weight_kg ?? 0) : 0;
      totalVal = Math.round(dailyAvg * daysInPeriodMonth(period_month) * 100) / 100;
    } else if (modCode === 'wet_waste') {
      const dogWeight = monthEntries.filter(r => r.module === 'dog_food').reduce((s, r) => s + Number(r.weight_kg ?? 0), 0);
      const pigRow = monthEntries.find(r => r.module === 'pig_feed');
      const pigDailyAvg = pigRow ? Number(pigRow.quantity ?? pigRow.weight_kg ?? 0) : 0;
      const pigWeight = Math.round(pigDailyAvg * daysInPeriodMonth(period_month) * 100) / 100;
      totalVal = Math.round((dogWeight + pigWeight) * 100) / 100;
    } else {
      totalVal = modRows.reduce((s, r) => s + Number(r.weight_kg ?? r.quantity ?? r.amount ?? 0), 0);
    }

    const valStr = totalVal > 0 ? totalVal.toLocaleString('th-TH') : '—';
    const unitStr = canonicalUnit(modCode);
    const labelStr = MODULE_LABELS[modCode] || modCode;

    tableRows.push([
      { text: labelStr, options: { fontFace: 'Arial', bold: true } },
      { text: valStr, options: { align: 'right', fontFace: 'Arial' } },
      { text: unitStr, options: { align: 'center', fontFace: 'Arial' } },
      { text: totalVal > 0 ? 'บันทึกแล้ว' : 'ไม่มีข้อมูล', options: { align: 'center', fontFace: 'Arial', color: totalVal > 0 ? '166534' : '94A3B8' } },
    ]);
  }

  slide2.addTable(tableRows, {
    x: 0.8, y: 1.3, w: 11.5,
    colW: [4.0, 3.0, 2.0, 2.5],
    fontSize: 13,
    border: { pt: '1', color: 'CBD5E1' },
  });

  // ── Slide 3: 12-Month Waste Trend Slide (เปรียบเทียบสถิติ 12 เดือน) ──────
  const slide3 = pptx.addSlide();
  slide3.addText(`2. สถิติเปรียบเทียบขยะรายเดือน — ปี พ.ศ. ${thaiYear}`, {
    x: 0.8, y: 0.5, w: 11.5, h: 0.6,
    fontSize: 22, bold: true, color: COLOR_BLUE, fontFace: 'Arial',
  });

  const chartData = [
    {
      name: 'ขยะ RDF (กก.)',
      labels: THAI_MONTHS_SHORT,
      values: yearComparison.map(m => m.rdf_kg || 0),
    },
    {
      name: 'ขยะเปียกรวม (กก.)',
      labels: THAI_MONTHS_SHORT,
      values: yearComparison.map(m => m.wet_waste_kg || 0),
    },
    {
      name: 'ขยะ Recycle (กก.)',
      labels: THAI_MONTHS_SHORT,
      values: yearComparison.map(m => m.recycle_kg || 0),
    },
  ];

  slide3.addChart(pptx.ChartType.bar, chartData, {
    x: 0.8, y: 1.3, w: 11.5, h: 5.2,
    barDir: 'col',
    chartColors: ['3B82F6', 'F59E0B', '10B981'],
    showLegend: true,
    legendPos: 'b',
    showValue: true,
  });

  // ── Slide 4: Wet Waste Formula & Breakdown Slide (ขยะเปียก 3 ส่วน) ─────────
  const slide4 = pptx.addSlide();
  slide4.addText(`3. สรุปสูตรการคำนวณขยะเปียก — ${periodLabel}`, {
    x: 0.8, y: 0.5, w: 11.5, h: 0.6,
    fontSize: 22, bold: true, color: COLOR_PURPLE, fontFace: 'Arial',
  });

  // Formula Card Text
  slide4.addText('สูตรคำนวณมาตรฐาน:  ขยะเปียกรวม = อาหารสุนัข (ยอดจริง) + อาหารหมู (ประมาณการ)', {
    x: 0.8, y: 1.3, w: 11.5, h: 0.8,
    fontSize: 16, bold: true, color: '581C87', fill: 'F3E8FF', align: 'center', fontFace: 'Arial',
  });

  const dogWeight = monthEntries.filter(r => r.module === 'dog_food').reduce((s, r) => s + Number(r.weight_kg ?? 0), 0);
  const pigRow = monthEntries.find(r => r.module === 'pig_feed');
  const pigDailyAvg = pigRow ? Number(pigRow.quantity ?? pigRow.weight_kg ?? 0) : 0;
  const daysCount = daysInPeriodMonth(period_month);
  const pigWeight = Math.round(pigDailyAvg * daysCount * 100) / 100;
  const totalWet = dogWeight + pigWeight;

  const wetTableRows = [
    [
      { text: 'ส่วนประกอบขยะเปียก', options: { bold: true, fill: COLOR_PURPLE, color: 'FFFFFF' } },
      { text: 'ปริมาณ (กก.)', options: { bold: true, fill: COLOR_PURPLE, color: 'FFFFFF', align: 'right' } },
      { text: 'รายละเอียดสูตรคำนวณ', options: { bold: true, fill: COLOR_PURPLE, color: 'FFFFFF' } },
    ],
    [
      { text: '1. อาหารสุนัข (ยอดจริง)', options: { bold: true } },
      { text: dogWeight > 0 ? dogWeight.toLocaleString('th-TH') : '—', options: { align: 'right' } },
      { text: 'ยอดบันทึกจริงประจำเดือน' },
    ],
    [
      { text: '2. อาหารหมู (ค่าประมาณ)', options: { bold: true } },
      { text: pigWeight > 0 ? pigWeight.toLocaleString('th-TH') : '—', options: { align: 'right', color: '6B21A8' } },
      { text: `ค่าเฉลี่ย ${pigDailyAvg} กก./วัน × ${daysCount} วัน (ประมาณการ)` },
    ],
    [
      { text: '3. ขยะเปียกรวม (ผลคำนวณ)', options: { bold: true, fill: 'DCFCE7' } },
      { text: totalWet > 0 ? totalWet.toLocaleString('th-TH') : '—', options: { align: 'right', bold: true, color: '14532D', fill: 'DCFCE7' } },
      { text: 'ยอดรวมขยะเปียกที่ส่งต่อกำจัด', options: { bold: true, fill: 'DCFCE7' } },
    ],
  ];

  slide4.addTable(wetTableRows, {
    x: 0.8, y: 2.5, w: 11.5,
    colW: [4.5, 3.0, 4.0],
    fontSize: 14,
    border: { pt: '1', color: 'E9D5FF' },
  });

  // ── Slide 5: Recycle Sales 9 Categories Slide (ขยะรีไซเคิล 9 หมวด) ────────
  const slide5 = pptx.addSlide();
  slide5.addText(`4. รายงานยอดขายขยะรีไซเคิล 9 หมวดหมู่ — ${periodLabel}`, {
    x: 0.8, y: 0.5, w: 11.5, h: 0.6,
    fontSize: 22, bold: true, color: COLOR_GREEN, fontFace: 'Arial',
  });

  const recycleRows = monthEntries.filter(r => r.module === 'recycle');
  const recycleTableRows = [
    [
      { text: 'หมวดหมู่รีไซเคิล', options: { bold: true, fill: COLOR_GREEN, color: 'FFFFFF' } },
      { text: 'น้ำหนัก (กก.)', options: { bold: true, fill: COLOR_GREEN, color: 'FFFFFF', align: 'right' } },
      { text: 'ยอดเงิน (บาท)', options: { bold: true, fill: COLOR_GREEN, color: 'FFFFFF', align: 'right' } },
    ],
  ];

  let totalRecycleKg = 0;
  let totalRecycleRevenue = 0;

  for (const r of recycleRows) {
    const w = Number(r.weight_kg ?? 0);
    const amt = Number(r.amount ?? 0);
    totalRecycleKg += w;
    totalRecycleRevenue += amt;

    recycleTableRows.push([
      { text: r.notes || r.category_code },
      { text: w > 0 ? w.toLocaleString('th-TH') : '—', options: { align: 'right' } },
      { text: amt > 0 ? `฿${amt.toLocaleString('th-TH')}` : '—', options: { align: 'right' } },
    ]);
  }

  recycleTableRows.push([
    { text: 'รวมยอดขายรีไซเคิลทั้งหมด', options: { bold: true, fill: 'ECFDF5' } },
    { text: totalRecycleKg.toLocaleString('th-TH'), options: { align: 'right', bold: true, fill: 'ECFDF5' } },
    { text: `฿${totalRecycleRevenue.toLocaleString('th-TH')}`, options: { align: 'right', bold: true, fill: 'ECFDF5', color: '065F46' } },
  ]);

  slide5.addTable(recycleTableRows, {
    x: 0.8, y: 1.3, w: 11.5,
    colW: [5.5, 3.0, 3.0],
    fontSize: 12,
    border: { pt: '1', color: 'A7F3D0' },
  });

  // ── Slide 6: Consumables & Black Bags Slide (ของใช้สิ้นเปลือง & ถุงดำ) ──────
  const slide6 = pptx.addSlide();
  slide6.addText(`5. สรุปของใช้สิ้นเปลืองและถุงขยะ — ${periodLabel}`, {
    x: 0.8, y: 0.5, w: 11.5, h: 0.6,
    fontSize: 22, bold: true, color: COLOR_SLATE, fontFace: 'Arial',
  });

  const otherEntries = monthEntries.filter(r => ['black_bag', 'consumable', 'tissue'].includes(r.module));
  const otherTableRows = [
    [
      { text: 'รายการทรัพยากร / ของใช้', options: { bold: true, fill: COLOR_SLATE, color: 'FFFFFF' } },
      { text: 'โมดูล', options: { bold: true, fill: COLOR_SLATE, color: 'FFFFFF', align: 'center' } },
      { text: 'จำนวนที่ใช้', options: { bold: true, fill: COLOR_SLATE, color: 'FFFFFF', align: 'right' } },
      { text: 'หน่วย', options: { bold: true, fill: COLOR_SLATE, color: 'FFFFFF', align: 'center' } },
    ],
  ];

  for (const r of otherEntries) {
    const qty = Number(r.quantity ?? r.weight_kg ?? 0);
    const modLabel = MODULE_LABELS[r.module] || r.module;
    const unit = canonicalUnit(r.module, r.category_code);

    otherTableRows.push([
      { text: r.notes || r.category_code },
      { text: modLabel, options: { align: 'center' } },
      { text: qty > 0 ? qty.toLocaleString('th-TH') : '—', options: { align: 'right' } },
      { text: unit, options: { align: 'center' } },
    ]);
  }

  slide6.addTable(otherTableRows, {
    x: 0.8, y: 1.3, w: 11.5,
    colW: [4.5, 3.0, 2.0, 2.0],
    fontSize: 13,
    border: { pt: '1', color: 'E2E8F0' },
  });

  // Generate binary nodebuffer
  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer;
}

module.exports = { generatePowerPointReport };
