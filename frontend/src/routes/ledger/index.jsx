import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { entries, dashboard } from '../../api/index.js'
import { useAuth } from '../../hooks/useAuth.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { THAI_MONTHS_SHORT, daysInPeriodMonth } from '../../lib/periods.js'
import { MODULE_ORDER, MODULE_LABELS } from '../../lib/modules.js'

export const Route = createFileRoute('/ledger')({
  component: LedgerPage,
})

export function LedgerPage() {
  const { data: user } = useAuth()
  const currentADYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentADYear)
  const [selectedModule, setSelectedModule] = useState('rdf')

  // Queries
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', selectedModule],
    queryFn: () => dashboard.categories({ module: selectedModule }),
    enabled: !!user && selectedModule !== 'wet_waste',
  })

  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['yearly-ledger', selectedYear],
    queryFn: () => entries.yearlyLedger({ year: selectedYear }),
    enabled: !!user,
  })

  const categories = categoriesData?.data || []
  const months = ledgerData?.months || Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}-01`)
  const matrix = ledgerData?.matrix || {}

  // Available year options (CE -> BE)
  const yearOptions = [currentADYear, currentADYear - 1, currentADYear - 2]

  return (
    <>
      <PageHeader
        title="สมุดบัญชีคุมสถิตีย้อนหลังประจำปี (Yearly Ledger)"
        subtitle={`ประจำปี พ.ศ. ${selectedYear + 543} (ค.ศ. ${selectedYear})`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <select
              className="form-select"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>
                  พ.ศ. {y + 543} ({y})
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="page-content">
        {/* Module Selector Pills */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {MODULE_ORDER.map(mod => (
            <button
              key={mod}
              type="button"
              className={`btn ${selectedModule === mod ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedModule(mod)}
            >
              {MODULE_LABELS[mod] || mod}
              {mod === 'pig_feed' && <span style={{ fontSize: '10px', marginLeft: 4, opacity: 0.8 }}>(ค่าประมาณ)</span>}
              {mod === 'wet_waste' && <span style={{ fontSize: '10px', marginLeft: 4, opacity: 0.8 }}>(คำนวณ)</span>}
            </button>
          ))}
        </div>

        {/* ── Ledger Table Card ────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header flex-between">
            <div>
              <h2 className="card-title">
                ตารางคุมสถิติ — {MODULE_LABELS[selectedModule]} (ปี พ.ศ. {selectedYear + 543})
              </h2>
              <span className="text-xs text-secondary">
                เดือนที่ไม่มีการบันทึกข้อมูลจะแสดงเป็น "—" ไม่นับรวมเป็นเดือนที่มีสถิติบันทึก
              </span>
            </div>
            {selectedModule === 'pig_feed' && (
              <span className="badge badge-purple">ติดป้าย "ค่าประมาณ" ประจำเดือน</span>
            )}
            {selectedModule === 'wet_waste' && (
              <span className="badge badge-yellow">สูตรคำนวณ: อาหารสุนัข + อาหารหมู</span>
            )}
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {isLoading ? (
              <div className="page-loading" style={{ padding: 'var(--space-8)' }}>
                <span className="spinner spinner-lg" />
                <span>กำลังโหลดข้อมูลตารางบัญชีคุม...</span>
              </div>
            ) : (
              <LedgerTableGrid
                selectedModule={selectedModule}
                categories={categories}
                months={months}
                matrix={matrix}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Ledger Table Grid Component ─────────────────────────────────────────────
function LedgerTableGrid({ selectedModule, categories, months, matrix }) {
  // Modules with predefined fixed categories
  const FIXED_MODULE_CATEGORIES = {
    rdf: [{ code: 'rdf_general', name_th: 'ขยะ RDF รวม', unit: 'กก.' }],
    dog_food: [{ code: 'df_general', name_th: 'อาหารสุนัข', unit: 'กก.' }],
    pig_feed: [{ code: 'pf_general', name_th: 'อาหารหมู (ค่าเฉลี่ย x วันจริง)', unit: 'กก./วัน' }],
    black_bag: [
      { code: 'black_bag_large',  name_th: 'ถุงใหญ่ 30×40 สีดำ',  unit: 'ใบ' },
      { code: 'black_bag_medium', name_th: 'ถุงกลาง 28×36 สีชา', unit: 'ใบ' },
      { code: 'black_bag_small',  name_th: 'ถุงเล็ก 18×20 สีดำ',  unit: 'ใบ' },
    ],
    tissue: [
      { code: 'tissue_roll',  name_th: 'กระดาษทิชชู่ ม้วน',    unit: 'ม้วน' },
      { code: 'tissue_hand',  name_th: 'กระดาษทิชชู่ เช็ดมือ',  unit: 'แพ็ค' },
      { code: 'tissue_popup', name_th: 'กระดาษทิชชู่ ป๊อปอัพ',  unit: 'แพ็ค' },
    ],
  }

  // ── Render Wet Waste Breakdown ─────────────────────────────────────────────
  if (selectedModule === 'wet_waste') {
    const dogMatrix = matrix['dog_food']?.['df_general'] || {}
    const pigMatrix = matrix['pig_feed']?.['pf_general'] || {}

    const dogMonthVals = months.map(m => dogMatrix[m]?.weight_kg || 0)
    const pigMonthVals = months.map(m => {
      const dailyAvg = pigMatrix[m]?.weight_kg || pigMatrix[m]?.quantity || 0
      const days = daysInPeriodMonth(m)
      return Math.round(dailyAvg * days * 100) / 100
    })
    const totalMonthVals = months.map((_, i) => dogMonthVals[i] + pigMonthVals[i])

    const totalDog = dogMonthVals.reduce((s, v) => s + v, 0)
    const totalPig = pigMonthVals.reduce((s, v) => s + v, 0)
    const totalWet = totalMonthVals.reduce((s, v) => s + v, 0)

    return (
      <div className="table-wrapper" style={{ maxHeight: 600, overflowY: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>รายการส่วนประกอบขยะเปียก</th>
              <th style={{ width: 80 }}>หน่วย</th>
              {THAI_MONTHS_SHORT.map(mName => (
                <th key={mName} className="table-num" style={{ minWidth: 75 }}>{mName}</th>
              ))}
              <th className="table-num" style={{ minWidth: 100, background: 'var(--gray-100)' }}>รวมทั้งปี</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 1: Dog Food Actual */}
            <tr>
              <td><strong>1. อาหารสุนัข (ยอดจริง)</strong></td>
              <td><span className="badge badge-yellow">กก.</span></td>
              {dogMonthVals.map((val, i) => (
                <td key={i} className="table-num">
                  {val > 0 ? val.toLocaleString('th-TH') : <span className="text-secondary">—</span>}
                </td>
              ))}
              <td className="table-num" style={{ fontWeight: 'bold', background: 'var(--gray-50)' }}>
                {totalDog > 0 ? totalDog.toLocaleString('th-TH') : '—'}
              </td>
            </tr>

            {/* Row 2: Pig Feed Estimated */}
            <tr>
              <td><strong>2. อาหารหมู (ค่าประมาณ)</strong></td>
              <td><span className="badge badge-purple">กก.</span></td>
              {pigMonthVals.map((val, i) => (
                <td key={i} className="table-num" style={{ color: '#6b21a8' }}>
                  {val > 0 ? val.toLocaleString('th-TH') : <span className="text-secondary">—</span>}
                </td>
              ))}
              <td className="table-num" style={{ fontWeight: 'bold', color: '#6b21a8', background: 'var(--gray-50)' }}>
                {totalPig > 0 ? totalPig.toLocaleString('th-TH') : '—'}
              </td>
            </tr>

            {/* Row 3: Total Wet Waste */}
            <tr style={{ background: '#f0fdf4', fontWeight: 'bold' }}>
              <td><strong style={{ color: '#166534' }}>3. ขยะเปียกรวม (ผลคำนวณ)</strong></td>
              <td><span className="badge badge-green">กก.</span></td>
              {totalMonthVals.map((val, i) => (
                <td key={i} className="table-num" style={{ color: '#15803d', fontSize: 'var(--text-base)' }}>
                  {val > 0 ? val.toLocaleString('th-TH') : <span className="text-secondary">—</span>}
                </td>
              ))}
              <td className="table-num" style={{ color: '#14532d', fontSize: 'var(--text-lg)', background: '#dcfce7' }}>
                {totalWet > 0 ? totalWet.toLocaleString('th-TH') : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  // Determine rows to render
  const catRows = FIXED_MODULE_CATEGORIES[selectedModule] || categories.map(c => ({
    code: c.code,
    name_th: c.name_th,
    unit: c.unit || 'กก.',
  }))

  const moduleMatrix = matrix[selectedModule] || {}

  return (
    <div className="table-wrapper" style={{ maxHeight: 600, overflowY: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            <th style={{ minWidth: 220 }}>ชนิดย่อย / รายการ</th>
            <th style={{ width: 80 }}>หน่วย</th>
            {THAI_MONTHS_SHORT.map(mName => (
              <th key={mName} className="table-num" style={{ minWidth: 75 }}>{mName}</th>
            ))}
            <th className="table-num" style={{ minWidth: 100, background: 'var(--gray-100)' }}>รวมทั้งปี</th>
          </tr>
        </thead>
        <tbody>
          {!catRows.length ? (
            <tr>
              <td colSpan={15} className="empty-state">ไม่พบบันทึกข้อมูลประจำปีนี้</td>
            </tr>
          ) : (
            catRows.map(cat => {
              const catMatrix = moduleMatrix[cat.code] || {}

              const monthValues = months.map(m => {
                const cell = catMatrix[m]
                if (!cell || cell.row_count === 0) return null

                if (selectedModule === 'black_bag' || selectedModule === 'tissue' || selectedModule === 'consumable') {
                  return cell.quantity ?? cell.weight_kg ?? null
                }
                if (selectedModule === 'pig_feed') {
                  return cell.quantity ?? cell.weight_kg ?? null
                }
                return cell.weight_kg ?? null
              })

              const validVals = monthValues.filter(v => v !== null && v > 0)
              const yearlyTotal = validVals.reduce((s, v) => s + v, 0)

              return (
                <tr key={cat.code}>
                  <td><strong>{cat.name_th}</strong></td>
                  <td><span className="badge badge-gray">{cat.unit || 'กก.'}</span></td>
                  {monthValues.map((val, i) => (
                    <td key={i} className="table-num">
                      {val !== null && val > 0 ? (
                        <span>
                          {val.toLocaleString('th-TH')}
                          {selectedModule === 'pig_feed' && (
                            <span style={{ fontSize: '10px', color: '#6b21a8', display: 'block' }}>
                              (ประมาณการ {(val * daysInPeriodMonth(months[i])).toLocaleString('th-TH')} กก.)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-secondary">—</span>
                      )}
                    </td>
                  ))}
                  <td className="table-num" style={{ fontWeight: 'bold', background: 'var(--gray-50)' }}>
                    {yearlyTotal > 0 ? yearlyTotal.toLocaleString('th-TH') : '—'}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
