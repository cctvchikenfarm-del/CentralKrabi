/**
 * Frontend period utilities — mirrors backend lib/periods.js
 * Single source of truth for date formatting on the client side.
 */

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

/** Returns YYYY-MM-01 for today in Bangkok time */
export function currentPeriodMonth() {
  const d = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
  return d.slice(0, 7) + '-01'
}

/** Returns YYYY-MM-DD for today in Bangkok time */
export function todayBangkok() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
}

/** Converts any date string to period_month (YYYY-MM-01) */
export function toPeriodMonth(dateStr) {
  return dateStr.slice(0, 7) + '-01'
}

/** Returns the number of days in a given period_month (YYYY-MM-01) */
export function daysInPeriodMonth(periodMonth) {
  const [year, month] = periodMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}


/** Thai month label e.g. "ก.ค. 2568" */
export function thaiMonthLabel(periodMonth, style = 'short') {
  if (!periodMonth) return ''
  const [year, month] = periodMonth.split('-').map(Number)
  const buddhistYear = year + 543
  const monthName = style === 'full' ? THAI_MONTHS_FULL[month - 1] : THAI_MONTHS_SHORT[month - 1]
  return `${monthName} ${buddhistYear}`
}

/** Format number with Thai locale */
export function formatNumber(n, decimals = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return Number(n).toLocaleString('th-TH', { maximumFractionDigits: decimals })
}

export { THAI_MONTHS_SHORT, THAI_MONTHS_FULL }
