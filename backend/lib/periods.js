/**
 * periods.js — Canonical period and date utilities (Asia/Bangkok)
 *
 * RULE: period_month is ALWAYS stored as YYYY-MM-01 (first day of month).
 * entry_date must belong to the same calendar month as period_month.
 */

const TZ = 'Asia/Bangkok';

/**
 * Returns the current date in Bangkok time as a YYYY-MM-DD string.
 */
function todayBangkok() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ }); // sv-SE gives ISO format
}

/**
 * Returns the current period_month as YYYY-MM-01.
 */
function currentPeriodMonth() {
  const d = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
  return d.slice(0, 7) + '-01';
}

/**
 * Converts any date string YYYY-MM-DD to its period_month (YYYY-MM-01).
 */
function toPeriodMonth(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error(`Invalid dateStr: ${dateStr}`);
  }
  return dateStr.slice(0, 7) + '-01';
}

/**
 * Validates that entry_date and period_month are in the same calendar month.
 */
function validateEntryDateInPeriod(entryDate, periodMonth) {
  const entryYM = entryDate.slice(0, 7);
  const periodYM = periodMonth.slice(0, 7);
  if (entryYM !== periodYM) {
    throw new Error(
      `entry_date ${entryDate} does not belong to period_month ${periodMonth}`
    );
  }
}

/**
 * Returns the number of days in a given period_month (YYYY-MM-01).
 */
function daysInPeriodMonth(periodMonth) {
  const [year, month] = periodMonth.split('-').map(Number);
  return new Date(year, month, 0).getDate(); // month is 1-based; new Date(y, m, 0) = last day of month m-1
}

/**
 * Thai month name (short).
 */
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

/**
 * Thai month name (full).
 */
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

/**
 * Format period_month as Thai label, e.g. "ก.ค. 2568" (Buddhist year).
 */
function thaiMonthLabel(periodMonth, style = 'short') {
  const [year, month] = periodMonth.split('-').map(Number);
  const buddhistYear = year + 543;
  const monthName = style === 'full' ? THAI_MONTHS_FULL[month - 1] : THAI_MONTHS_SHORT[month - 1];
  return `${monthName} ${buddhistYear}`;
}

module.exports = {
  todayBangkok,
  currentPeriodMonth,
  toPeriodMonth,
  validateEntryDateInPeriod,
  daysInPeriodMonth,
  thaiMonthLabel,
  THAI_MONTHS_SHORT,
  THAI_MONTHS_FULL,
};
