const ExcelJS = require('exceljs');

/**
 * Service to generate professional Excel (.xlsx) workbooks from Supabase data_entries
 */
async function generateExcelReport({ period_month, entries = [], summaryData = {} }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CKAP Central Krabi Platform';
  workbook.created = new Date();

  // Color Tokens
  const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B5E20' } };
  const HEADER_FONT = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  const TITLE_FONT = { name: 'Segoe UI', size: 16, bold: true, color: { argb: '1B5E20' } };
  const SUBTITLE_FONT = { name: 'Segoe UI', size: 10, italic: true, color: { argb: '555555' } };
  const BORDER_THIN = {
    top: { style: 'thin', color: { argb: 'CCCCCC' } },
    left: { style: 'thin', color: { argb: 'CCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
    right: { style: 'thin', color: { argb: 'CCCCCC' } },
  };

  // -------------------------------------------------------------
  // SHEET 1: สรุปภาพรวม (Summary Report)
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('สรุปภาพรวมรายเดือน', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  summarySheet.columns = [
    { header: 'ลำดับ', key: 'no', width: 8 },
    { header: 'โมดูล / ประเภทข้อมูล', key: 'module_name', width: 30 },
    { header: 'รหัสหมวดหมู่', key: 'category_code', width: 22 },
    { header: 'ชื่อรายการวัสดุ', key: 'material_name', width: 30 },
    { header: 'ปริมาณรวม', key: 'total_value', width: 18 },
    { header: 'หน่วย', key: 'unit', width: 12 },
    { header: 'จำนวนเงินรวม (บาท)', key: 'total_amount', width: 22 },
  ];

  // Title Banner
  summarySheet.mergeCells('A1:G1');
  summarySheet.getCell('A1').value = `รายงานสรุปภาพรวมการจัดการขยะและของใช้สิ้นเปลือง ประจำเดือน ${period_month || 'ทั้งหมด'}`;
  summarySheet.getCell('A1').font = TITLE_FONT;

  summarySheet.mergeCells('A2:G2');
  summarySheet.getCell('A2').value = `ศูนย์การค้าเซ็นทรัล กระบี่ | ข้อมูลอัปเดต ณ วันที่ ${new Date().toLocaleDateString('th-TH')}`;
  summarySheet.getCell('A2').font = SUBTITLE_FONT;

  summarySheet.addRow([]); // Blank row A3

  // Header row at line 4
  const headerRow = summarySheet.getRow(4);
  headerRow.values = ['ลำดับ', 'โมดูล / ประเภทข้อมูล', 'รหัสหมวดหมู่', 'ชื่อรายการวัสดุ', 'ปริมาณรวม', 'หน่วย', 'จำนวนเงินรวม (บาท)'];
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Calculate Aggregates per category
  const categoryAggMap = {};
  let globalTotalAmount = 0;

  (entries || []).forEach((e) => {
    const key = `${e.module || 'other'}_${e.category_code || 'gen'}`;
    if (!categoryAggMap[key]) {
      categoryAggMap[key] = {
        module: e.module || 'ทั่วไป',
        category_code: e.category_code || '-',
        material_name: e.material_name || e.category_code || '-',
        total_value: 0,
        unit: e.unit || '-',
        total_amount: 0,
      };
    }
    categoryAggMap[key].total_value += Number(e.value || e.weight_kg || e.quantity || 0);
    const amt = Number(e.total_amount || e.amount || 0);
    categoryAggMap[key].total_amount += amt;
    globalTotalAmount += amt;
  });

  let rowIdx = 1;
  Object.values(categoryAggMap).forEach((item) => {
    const row = summarySheet.addRow([
      rowIdx++,
      item.module.toUpperCase(),
      item.category_code,
      item.material_name,
      item.total_value,
      item.unit,
      item.total_amount,
    ]);

    row.getCell(5).numberFormat = '#,##0.00';
    row.getCell(7).numberFormat = '฿#,##0.00';
    row.eachCell((cell) => {
      cell.border = BORDER_THIN;
    });
  });

  // Total Summary Row
  const totalRow = summarySheet.addRow(['', 'รวมทั้งสิ้น (GRAND TOTAL)', '', '', '', '', globalTotalAmount]);
  totalRow.font = { bold: true, size: 12 };
  totalRow.getCell(7).numberFormat = '฿#,##0.00';
  totalRow.eachCell((cell) => {
    cell.border = { top: { style: 'double' }, bottom: { style: 'double' } };
  });


  // -------------------------------------------------------------
  // SHEET 2: ข้อมูลรายวันทั้งหมด (All Daily Entries - Pivot Ready)
  // -------------------------------------------------------------
  const detailSheet = workbook.addWorksheet('ข้อมูลรายวันทั้งหมด (Raw Data)', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  detailSheet.columns = [
    { header: 'ID', key: 'id', width: 12 },
    { header: 'วันที่ (Date)', key: 'entry_date', width: 14 },
    { header: 'รอบเดือน (Period)', key: 'period_month', width: 14 },
    { header: 'สาขา (Station)', key: 'station_name', width: 18 },
    { header: 'โมดูล (Module)', key: 'module', width: 16 },
    { header: 'รหัสหมวดหมู่ (Category)', key: 'category_code', width: 22 },
    { header: 'รายการ (Material)', key: 'material_name', width: 28 },
    { header: 'จำนวน/น้ำหนัก (Value)', key: 'value', width: 18 },
    { header: 'หน่วย (Unit)', key: 'unit', width: 12 },
    { header: 'ราคา/หน่วย (Price)', key: 'unit_price', width: 16 },
    { header: 'จำนวนเงินรวม (Total Amount)', key: 'total_amount', width: 22 },
  ];

  const detailHeaderRow = detailSheet.getRow(1);
  detailHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E7D32' } };
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  (entries || []).forEach((e) => {
    const val = Number(e.value || e.weight_kg || e.quantity || 0);
    const price = Number(e.unit_price || e.price || 0);
    const amt = Number(e.total_amount || e.amount || (val * price) || 0);

    const row = detailSheet.addRow([
      e.id || '',
      e.entry_date || '',
      e.period_month || period_month || '',
      e.station_name || 'Central Krabi',
      (e.module || 'general').toUpperCase(),
      e.category_code || '',
      e.material_name || e.category_code || '',
      val,
      e.unit || '',
      price,
      amt,
    ]);

    row.getCell(8).numberFormat = '#,##0.00';
    row.getCell(10).numberFormat = '฿#,##0.00';
    row.getCell(11).numberFormat = '฿#,##0.00';
    row.eachCell((cell) => {
      cell.border = BORDER_THIN;
    });
  });

  // Enable AutoFilter on Data Sheet
  detailSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: (entries || []).length + 1, column: 11 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = { generateExcelReport };
