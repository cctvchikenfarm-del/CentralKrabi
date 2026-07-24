import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { entries, dashboard } from '../../api/index.js'
import { api } from '../../api/client.js'
import { useAuth } from '../../hooks/useAuth.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { currentPeriodMonth, todayBangkok, thaiMonthLabel, daysInPeriodMonth } from '../../lib/periods.js'
import { MODULE_ORDER, MODULE_LABELS, canonicalUnit } from '../../lib/modules.js'

import ThaiMonthPicker from '../../components/common/ThaiMonthPicker.jsx'

export const Route = createFileRoute('/data-entry')({
  component: DataEntryPage,
})

export function DataEntryPage() {
  const { data: user } = useAuth()
  const qc = useQueryClient()

  const [period, setPeriod] = useState(currentPeriodMonth())
  const [selectedModule, setSelectedModule] = useState('rdf')

  // Queries
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', selectedModule],
    queryFn: () => dashboard.categories({ module: selectedModule }),
    enabled: !!user && selectedModule !== 'wet_waste',
  })

  const { data: monthEntriesData, isLoading: monthLoading } = useQuery({
    queryKey: ['entries-month', period, selectedModule],
    queryFn: () => entries.list({ period_month: period, module: selectedModule, limit: 500 }),
    enabled: !!user,
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard', period],
    queryFn: () => dashboard.summary({ period_month: period }),
    enabled: !!user,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => entries.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries-month'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['yearly-ledger'] })
    },
  })

  const categories = categoriesData?.data || []

  return (
    <>
      <PageHeader
        title="ระบบบันทึกข้อมูลและทรัพยากร"
        subtitle={`ประจำเดือน ${thaiMonthLabel(period)}`}
      />

      <div className="page-content">
        {/* Module Selector & Month Filter Bar */}
        <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: 'var(--space-3)', background: 'var(--surface-card)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto' }}>
            {MODULE_ORDER.map(mod => (
              <button
                key={mod}
                type="button"
                className={`btn ${selectedModule === mod ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedModule(mod)}
              >
                {MODULE_LABELS[mod] || mod}
                {mod === 'wet_waste' && <span style={{ fontSize: '10px', marginLeft: 4, opacity: 0.8 }}>(คำนวณ)</span>}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--text-secondary)' }}>📅 เลือกเดือนรายงาน:</span>
            <ThaiMonthPicker
              value={period}
              onChange={val => setPeriod(val)}
            />
          </div>
        </div>

        {/* ── Pattern 1: Dual-Mode Switcher Card (ขยะ RDF) ──────────────────── */}
        {selectedModule === 'rdf' && (
          <RdfDualModeCard
            period={period}
            onPeriodChange={setPeriod}
            monthEntriesData={monthEntriesData}
            monthLoading={monthLoading}
            deleteMutation={deleteMutation}
          />
        )}

        {/* ── Pattern 1: Dual-Mode Switcher Card (อาหารหมา — เหมือน RDF) ───────── */}
        {selectedModule === 'dog_food' && (
          <DogFoodDualModeCard
            period={period}
            onPeriodChange={setPeriod}
            monthEntriesData={monthEntriesData}
            monthLoading={monthLoading}
            deleteMutation={deleteMutation}
          />
        )}

        {/* ── Pattern 4: Live Calculated Formula Card (อาหารหมู) ───────────────── */}
        {selectedModule === 'pig_feed' && (
          <PigFeedFormulaCard
            period={period}
            onPeriodChange={setPeriod}
            monthEntriesData={monthEntriesData}
          />
        )}

        {/* ── Pattern 4: Live Calculated Breakdown Card (ขยะเปียก) ─────────────── */}
        {selectedModule === 'wet_waste' && (
          <WetWasteBreakdownCard
            period={period}
            onPeriodChange={setPeriod}
            dashboardData={dashboardData}
          />
        )}

        {/* ── Pattern 1: Dual-Mode Switcher Grid Card (กระดาษทิชชู่) ───────────── */}
        {selectedModule === 'tissue' && (
          <TissueDualModeGridCard
            period={period}
            onPeriodChange={setPeriod}
            categories={categories}
            monthEntriesData={monthEntriesData}
          />
        )}

        {/* ── Pattern 3: Fixed Multi-Item Table Card (ถุงดำ/ถุงขยะ 3 ขนาด) ─────── */}
        {selectedModule === 'black_bag' && (
          <BlackBagFixedTableCard
            period={period}
            onPeriodChange={setPeriod}
            monthEntriesData={monthEntriesData}
          />
        )}

        {/* ── Pattern 3: Fixed Multi-Item Table Card (ของใช้สิ้นเปลือง 2 รายการ) ─ */}
        {selectedModule === 'consumable' && (
          <ConsumablesFixedTableCard
            period={period}
            onPeriodChange={setPeriod}
            categories={categories}
            monthEntriesData={monthEntriesData}
          />
        )}

        {/* ── Pre-populated Table Card (ขยะรีไซเคิล — ดึงหมวดหมู่อัตโนมัติ) ──────── */}
        {selectedModule === 'recycle' && (
          <RecyclePrepopulatedCard
            period={period}
            onPeriodChange={setPeriod}
            categories={categories}
            monthEntriesData={monthEntriesData}
            deleteMutation={deleteMutation}
          />
        )}
      </div>
    </>
  )
}

// ── Pattern 1 Component: RDF Dual-Mode Switcher Card ─────────────────────────
function RdfDualModeCard({ period, onPeriodChange, monthEntriesData, monthLoading, deleteMutation }) {
  const qc = useQueryClient()
  const [isDailyMode, setIsDailyMode] = useState(false)
  const [directTotal, setDirectTotal] = useState('')
  const [dailyGrid, setDailyGrid] = useState({})
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const totalDays = daysInPeriodMonth(period)
  const [yStr, mStr] = period.split('-')

  useEffect(() => {
    const initialGrid = {}
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${yStr}-${mStr}-${String(d).padStart(2, '0')}`
      initialGrid[dateStr] = ''
    }

    if (monthEntriesData?.data?.length) {
      let sum = 0
      monthEntriesData.data.forEach(r => {
        if (r.module === 'rdf') {
          if (initialGrid[r.entry_date] !== undefined) {
            initialGrid[r.entry_date] = r.weight_kg !== null ? String(r.weight_kg) : ''
          }
          sum += Number(r.weight_kg ?? 0)
        }
      })
      setDirectTotal(sum > 0 ? String(sum) : '')
    } else {
      setDirectTotal('')
    }
    setDailyGrid(initialGrid)
  }, [monthEntriesData, period])

  const calculatedGridTotal = Object.values(dailyGrid).reduce((s, v) => s + (Number(v) || 0), 0)

  const saveBatchMutation = useMutation({
    mutationFn: (rows) => api.post('/entries/batch', { rows }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries-month'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['yearly-ledger'] })
      setError('')
    },
    onError: (err) => setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ'),
  })

  function handleSave() {
    setError('')
    const rowsToSave = []

    if (isDailyMode) {
      for (const [entry_date, val] of Object.entries(dailyGrid)) {
        if (val !== '') {
          const w = Number(val)
          if (isNaN(w) || w < 0) return setError(`น้ำหนักวันที่ ${entry_date} ต้องเป็นจำนวนบวก`)
          rowsToSave.push({
            module: 'rdf',
            category_code: 'rdf_general',
            entry_date,
            weight_kg: w,
            notes: notes || null,
          })
        }
      }
    } else {
      if (!directTotal || Number(directTotal) < 0) return setError('กรุณากรอกปริมาณขยะ RDF รวมทั้งเดือน')
      rowsToSave.push({
        module: 'rdf',
        category_code: 'rdf_general',
        entry_date: `${period.slice(0, 7)}-01`,
        weight_kg: Number(directTotal),
        notes: notes || null,
      })
    }

    if (rowsToSave.length === 0) return setError('ไม่มีข้อมูลใหม่ที่จะบันทึก')
    saveBatchMutation.mutate(rowsToSave)
  }

  return (
    <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="card-header flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h2 className="card-title" style={{ margin: 0 }}>บันทึกขยะ RDF — ประจำเดือน</h2>
          <ThaiMonthPicker value={period} onChange={onPeriodChange} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--gray-100)', padding: '6px 12px', borderRadius: 'var(--radius-full)' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-secondary)' }}>
            กรอกข้อมูลแบบรายวัน (1-{totalDays} วัน)
          </span>
          <input
            type="checkbox"
            id="rdf-daily-toggle"
            checked={isDailyMode}
            onChange={e => setIsDailyMode(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
        </div>
      </div>

      <div className="card-body">
        {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

        {!isDailyMode ? (
          <div style={{ maxWidth: 450, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label form-label-required">ปริมาณขยะ RDF รวมทั้งเดือน (กก.)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input text-center"
                style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold' }}
                placeholder="0.00"
                value={directTotal}
                onChange={e => setDirectTotal(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">หมายเหตุ</label>
              <input
                type="text"
                className="form-input"
                placeholder="รายละเอียดเพิ่มเติม"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              กรอกปริมาณขยะ RDF แต่ละวัน (กก.):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-2)', maxHeight: 400, overflowY: 'auto' }}>
              {Array.from({ length: totalDays }, (_, i) => {
                const dayNum = i + 1
                const dateStr = `${yStr}-${mStr}-${String(dayNum).padStart(2, '0')}`

                return (
                  <div key={dateStr} style={{ background: 'var(--gray-50)', padding: 8, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: 2 }}>วันที่ {dayNum}</div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input text-center"
                      style={{ padding: '4px', fontSize: '12px' }}
                      placeholder="—"
                      value={dailyGrid[dateStr] ?? ''}
                      onChange={e => setDailyGrid({ ...dailyGrid, [dateStr]: e.target.value })}
                    />
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--blue-50)', borderRadius: 'var(--radius-md)', textAlign: 'right', fontWeight: 'bold' }}>
              ยอดรวมคำนวณจากตารางรายวัน: {calculatedGridTotal.toLocaleString('th-TH')} กก.
            </div>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleSave}
            disabled={saveBatchMutation.isPending}
          >
            {saveBatchMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูลขยะ RDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pattern 1 Component: Dog Food Dual-Mode Switcher Card (เหมือน RDF) ─────────────
function DogFoodDualModeCard({ period, onPeriodChange, monthEntriesData, monthLoading, deleteMutation }) {
  const qc = useQueryClient()
  const [isDailyMode, setIsDailyMode] = useState(false)
  const [directTotal, setDirectTotal] = useState('')
  const [dailyGrid, setDailyGrid] = useState({})
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const totalDays = daysInPeriodMonth(period)
  const [yStr, mStr] = period.split('-')

  useEffect(() => {
    const initialGrid = {}
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${yStr}-${mStr}-${String(d).padStart(2, '0')}`
      initialGrid[dateStr] = ''
    }

    if (monthEntriesData?.data?.length) {
      let sum = 0
      monthEntriesData.data.forEach(r => {
        if (r.module === 'dog_food') {
          if (initialGrid[r.entry_date] !== undefined) {
            initialGrid[r.entry_date] = r.weight_kg !== null ? String(r.weight_kg) : ''
          }
          sum += Number(r.weight_kg ?? 0)
        }
      })
      setDirectTotal(sum > 0 ? String(sum) : '')
    } else {
      setDirectTotal('')
    }
    setDailyGrid(initialGrid)
  }, [monthEntriesData, period])

  const calculatedGridTotal = Object.values(dailyGrid).reduce((s, v) => s + (Number(v) || 0), 0)

  const saveBatchMutation = useMutation({
    mutationFn: (rows) => api.post('/entries/batch', { rows }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries-month'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['yearly-ledger'] })
      setError('')
    },
    onError: (err) => setError(err.message || 'บันทึกข้อมูลอาหารสุนัขไม่สำเร็จ'),
  })

  function handleSave() {
    setError('')
    const rowsToSave = []

    if (isDailyMode) {
      for (const [entry_date, val] of Object.entries(dailyGrid)) {
        if (val !== '') {
          const w = Number(val)
          if (isNaN(w) || w < 0) return setError(`น้ำหนักอาหารสุนัขวันที่ ${entry_date} ต้องเป็นจำนวนบวก`)
          rowsToSave.push({
            module: 'dog_food',
            category_code: 'df_general',
            entry_date,
            weight_kg: w,
            notes: notes || null,
          })
        }
      }
    } else {
      if (!directTotal || Number(directTotal) < 0) return setError('กรุณากรอกปริมาณอาหารสุนัขทั้งเดือน')
      rowsToSave.push({
        module: 'dog_food',
        category_code: 'df_general',
        entry_date: `${period.slice(0, 7)}-01`,
        weight_kg: Number(directTotal),
        notes: notes || null,
      })
    }

    if (rowsToSave.length === 0) return setError('ไม่มีข้อมูลใหม่ที่จะบันทึก')
    saveBatchMutation.mutate(rowsToSave)
  }

  return (
    <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="card-header flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h2 className="card-title" style={{ margin: 0 }}>บันทึกอาหารสุนัข — ประจำเดือน</h2>
          <ThaiMonthPicker value={period} onChange={onPeriodChange} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--gray-100)', padding: '6px 12px', borderRadius: 'var(--radius-full)' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-secondary)' }}>
            กรอกข้อมูลแบบรายวัน (1-{totalDays} วัน)
          </span>
          <input
            type="checkbox"
            id="dogfood-daily-toggle"
            checked={isDailyMode}
            onChange={e => setIsDailyMode(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
        </div>
      </div>

      <div className="card-body">
        {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

        {!isDailyMode ? (
          <div style={{ maxWidth: 450, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label form-label-required">ปริมาณอาหารสุนัขรวมทั้งเดือน (กก.)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input text-center"
                style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold' }}
                placeholder="0.00"
                value={directTotal}
                onChange={e => setDirectTotal(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">หมายเหตุ</label>
              <input
                type="text"
                className="form-input"
                placeholder="รายละเอียดเพิ่มเติม"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
              กรอกปริมาณอาหารสุนัขแต่ละวัน (กก.):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-2)', maxHeight: 400, overflowY: 'auto' }}>
              {Array.from({ length: totalDays }, (_, i) => {
                const dayNum = i + 1
                const dateStr = `${yStr}-${mStr}-${String(dayNum).padStart(2, '0')}`

                return (
                  <div key={dateStr} style={{ background: 'var(--gray-50)', padding: 8, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: 2 }}>วันที่ {dayNum}</div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input text-center"
                      style={{ padding: '4px', fontSize: '12px' }}
                      placeholder="—"
                      value={dailyGrid[dateStr] ?? ''}
                      onChange={e => setDailyGrid({ ...dailyGrid, [dateStr]: e.target.value })}
                    />
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--yellow-50)', borderRadius: 'var(--radius-md)', textAlign: 'right', fontWeight: 'bold' }}>
              ยอดรวมคำนวณจากตารางรายวัน: {calculatedGridTotal.toLocaleString('th-TH')} กก.
            </div>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleSave}
            disabled={saveBatchMutation.isPending}
          >
            {saveBatchMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูลอาหารสุนัข'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pattern 4 Component: Pig Feed Formula Card ───────────────────────────────
function PigFeedFormulaCard({ period, onPeriodChange, monthEntriesData }) {
  const qc = useQueryClient()
  const totalDays = daysInPeriodMonth(period)
  const [dailyAvg, setDailyAvg] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const existingEntry = monthEntriesData?.data?.find(r => r.module === 'pig_feed')

  useEffect(() => {
    if (existingEntry) {
      setDailyAvg(existingEntry.quantity ?? existingEntry.weight_kg ?? '')
      setNotes(existingEntry.notes ?? '')
    } else {
      setDailyAvg('')
      setNotes('')
    }
  }, [existingEntry, period])

  const saveMutation = useMutation({
    mutationFn: (payload) => api.post('/entries/upsert-monthly', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries-month'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['yearly-ledger'] })
      setError('')
    },
    onError: (err) => setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ'),
  })

  const dailyAvgNum = Number(dailyAvg) || 0
  const calculatedTotal = Math.round(dailyAvgNum * totalDays * 100) / 100

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!dailyAvg || Number(dailyAvg) < 0) return setError('กรุณากรอกค่าเฉลี่ยต่อวัน (กก./วัน)')

    saveMutation.mutate({
      module: 'pig_feed',
      category_code: 'pf_general',
      period_month: period,
      quantity: Number(dailyAvg),
      weight_kg: calculatedTotal,
      notes: notes || null,
    })
  }

  return (
    <div className="card" style={{ maxWidth: 650, margin: '0 auto' }}>
      <div className="card-header flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h2 className="card-title" style={{ margin: 0 }}>บันทึกอาหารหมู — ประจำเดือน</h2>
          <ThaiMonthPicker value={period} onChange={onPeriodChange} />
        </div>
        <span className="badge badge-blue">รายเดือน</span>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label form-label-required">ค่าเฉลี่ยต่อวัน (กก./วัน)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="form-input"
              placeholder="0.00"
              value={dailyAvg}
              onChange={e => setDailyAvg(e.target.value)}
            />
          </div>

          <div style={{ background: '#f3e8ff', border: '1px solid #e9d5ff', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 'var(--text-sm)', color: '#6b21a8', fontWeight: 'bold' }}>
              สูตรคำนวณอัตโนมัติประจำเดือนนี้ ({totalDays} วัน):
            </div>
            <div style={{ fontSize: 'var(--text-base)', marginTop: 4, color: '#581c87' }}>
              <code>{dailyAvgNum.toLocaleString('th-TH')} กก./วัน × {totalDays} วัน = <strong>{calculatedTotal.toLocaleString('th-TH')} กก. (ประมาณการทั้งเดือน)</strong></code>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">หมายเหตุ</label>
            <input
              type="text"
              className="form-input"
              placeholder="รายละเอียดเพิ่มเติม"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'กำลังบันทึก...' : existingEntry ? 'อัปเดตข้อมูลอาหารหมู' : 'บันทึกข้อมูลอาหารหมู'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Pattern 4 Component: Wet Waste Breakdown Card ───────────────────────────
function WetWasteBreakdownCard({ period, onPeriodChange, dashboardData }) {
  const wetMod = dashboardData?.modules?.find(m => m.module === 'wet_waste')
  const breakdown = wetMod?.wet_waste_breakdown || { dog_food_actual: 0, pig_feed_estimated: 0, total_wet_waste: 0 }

  return (
    <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="card-header flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h2 className="card-title" style={{ margin: 0 }}>สรุปการคำนวณขยะเปียก — ประจำเดือน</h2>
          <ThaiMonthPicker value={period} onChange={onPeriodChange} />
        </div>
        <span className="badge badge-yellow">การ์ดคำนวณอัตโนมัติ</span>
      </div>
      <div className="card-body">
        <div className="alert alert-info mb-6">
          ℹ️ <strong>ขยะเปียก</strong> คำนวณจากสูตร:
          <br />
          <code>ขยะเปียกรวม = อาหารสุนัข (ยอดจริง) + อาหารหมู (ประมาณการ)</code>
        </div>

        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          <div className="kpi-card" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
            <div className="kpi-label" style={{ color: '#92400e' }}>1. อาหารสุนัข (ยอดจริง)</div>
            <div className="kpi-value" style={{ color: '#78350f' }}>{breakdown.dog_food_actual.toLocaleString('th-TH')}</div>
            <div className="kpi-unit">กก.</div>
          </div>

          <div className="kpi-card" style={{ background: '#f3e8ff', borderColor: '#e9d5ff' }}>
            <div className="kpi-label" style={{ color: '#6b21a8' }}>2. อาหารหมู (ค่าประมาณ)</div>
            <div className="kpi-value" style={{ color: '#581c87' }}>{breakdown.pig_feed_estimated.toLocaleString('th-TH')}</div>
            <div className="kpi-unit">กก. (คำนวณจากค่าเฉลี่ย x วันจริง)</div>
          </div>

          <div className="kpi-card" style={{ background: '#dcfce7', borderColor: '#bbf7d0' }}>
            <div className="kpi-label" style={{ color: '#166534' }}>3. ขยะเปียกรวม (ผลคำนวณ)</div>
            <div className="kpi-value" style={{ color: '#14532d', fontSize: 'var(--text-3xl)' }}>{breakdown.total_wet_waste.toLocaleString('th-TH')}</div>
            <div className="kpi-unit">กก.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Pattern 1 Component: Tissue Dual-Mode Grid Card ─────────────────────────
function TissueDualModeGridCard({ period, onPeriodChange, categories, monthEntriesData }) {
  const qc = useQueryClient()
  const totalDays = daysInPeriodMonth(period)
  const [yStr, mStr] = period.split('-')

  const [gridState, setGridState] = useState({})
  const [modified, setModified] = useState(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    const initialState = {}
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${yStr}-${mStr}-${String(day).padStart(2, '0')}`
      initialState[dateStr] = { tissue_roll: '', tissue_hand: '', tissue_popup: '' }
    }

    if (monthEntriesData?.data) {
      for (const row of monthEntriesData.data) {
        if (row.module === 'tissue' && initialState[row.entry_date]) {
          initialState[row.entry_date][row.category_code] = row.quantity !== null && row.quantity !== undefined ? String(row.quantity) : ''
        }
      }
    }
    setGridState(initialState)
    setModified(new Set())
  }, [monthEntriesData, period])

  function handleCellChange(dateStr, catCode, val) {
    setGridState(prev => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], [catCode]: val }
    }))
    setModified(prev => new Set(prev).add(`${dateStr}|${catCode}`))
  }

  const saveMutation = useMutation({
    mutationFn: (cells) => api.post('/entries/tissue-grid', { cells }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries-month'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setModified(new Set())
      setError('')
    },
    onError: (err) => setError(err.message || 'บันทึกข้อมูลตารางทิชชู่ไม่สำเร็จ'),
  })

  function handleSave() {
    setError('')
    const cellsToSave = []
    for (const key of modified) {
      const [entry_date, category_code] = key.split('|')
      const val = gridState[entry_date]?.[category_code]
      if (val !== undefined && val !== '') {
        const valNum = Number(val)
        if (isNaN(valNum) || valNum < 0 || !Number.isInteger(valNum)) {
          return setError(`วันที่ ${entry_date} (${category_code}) ต้องเป็นจำนวนเต็มบวกหรือ 0 เท่านั้น`)
        }
        cellsToSave.push({ entry_date, category_code, quantity: valNum })
      }
    }

    if (cellsToSave.length === 0) return setError('ไม่มีช่องที่ถูกแก้ไข')
    saveMutation.mutate(cellsToSave)
  }

  return (
    <div className="card">
      <div className="card-header flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h2 className="card-title" style={{ margin: 0 }}>ตารางบันทึกกระดาษทิชชู่ (Spreadsheet Grid) — ประจำเดือน</h2>
          <ThaiMonthPicker value={period} onChange={onPeriodChange} />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={modified.size === 0 || saveMutation.isPending}
        >
          {saveMutation.isPending ? 'กำลังบันทึก...' : `บันทึกตาราง (${modified.size} ช่อง)`}
        </button>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

        <div className="table-wrapper" style={{ maxHeight: 550, overflowY: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>วันที่</th>
                <th className="text-center">ม้วน (ม้วน)</th>
                <th className="text-center">เช็ดมือ (แพ็ค)</th>
                <th className="text-center">ป๊อปอัพ (แพ็ค)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalDays }, (_, i) => {
                const dayNum = i + 1
                const dateStr = `${yStr}-${mStr}-${String(dayNum).padStart(2, '0')}`
                const row = gridState[dateStr] || {}

                return (
                  <tr key={dateStr}>
                    <td><strong>วันที่ {dayNum}</strong></td>
                    {['tissue_roll', 'tissue_hand', 'tissue_popup'].map(cat => (
                      <td key={cat} className="text-center" style={{ padding: 4 }}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="form-input text-center"
                          style={{ width: 100, margin: '0 auto', background: modified.has(`${dateStr}|${cat}`) ? '#fef9c3' : 'inherit' }}
                          placeholder="—"
                          value={row[cat] ?? ''}
                          onChange={e => handleCellChange(dateStr, cat, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Pattern 3 Component: Black Bag Fixed Table Card ──────────────────────────
function BlackBagFixedTableCard({ period, monthEntriesData }) {
  const qc = useQueryClient()
  const [formState, setFormState] = useState({
    black_bag_large: '',
    black_bag_medium: '',
    black_bag_small: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    const initialState = { black_bag_large: '', black_bag_medium: '', black_bag_small: '' }
    if (monthEntriesData?.data) {
      for (const r of monthEntriesData.data) {
        if (r.module === 'black_bag' && initialState[r.category_code] !== undefined) {
          initialState[r.category_code] = r.quantity !== null ? String(r.quantity) : ''
        }
      }
    }
    setFormState(initialState)
  }, [monthEntriesData, period])

  const saveMutation = useMutation({
    mutationFn: async (items) => {
      for (const item of items) {
        await api.post('/entries/upsert-monthly', item)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries-month'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setError('')
    },
    onError: (err) => setError(err.message || 'บันทึกข้อมูลถุงขยะไม่สำเร็จ'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const items = []

    for (const [code, val] of Object.entries(formState)) {
      if (val !== '') {
        const valNum = Number(val)
        if (isNaN(valNum) || valNum < 0 || !Number.isInteger(valNum)) {
          return setError('จำนวนต้องเป็นจำนวนเต็มบวกหรือ 0 เท่านั้น')
        }
        items.push({
          module: 'black_bag',
          category_code: code,
          period_month: period,
          quantity: valNum,
        })
      }
    }

    if (items.length === 0) return setError('กรุณากรอกจำนวนถุงอย่างน้อย 1 ชนิด')
    saveMutation.mutate(items)
  }

  const bagItems = [
    { code: 'black_bag_large',  label: 'ถุงใหญ่ 30×40 สีดำ',  unit: 'ใบ' },
    { code: 'black_bag_medium', label: 'ถุงกลาง 28×36 สีชา', unit: 'ใบ' },
    { code: 'black_bag_small',  label: 'ถุงเล็ก 18×20 สีดำ',  unit: 'ใบ' },
  ]

  return (
    <div className="card" style={{ maxWidth: 650, margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="card-title">บันทึกถุงขยะ — ประจำเดือน {thaiMonthLabel(period)}</h2>
        <span className="badge badge-blue">รายเดือน</span>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ชนิดย่อยถุงขยะ</th>
                <th className="text-center" style={{ width: 160 }}>จำนวน (ใบ)</th>
              </tr>
            </thead>
            <tbody>
              {bagItems.map(item => (
                <tr key={item.code}>
                  <td><strong>{item.label}</strong></td>
                  <td className="text-center">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-input text-center"
                      placeholder="0"
                      value={formState[item.code] ?? ''}
                      onChange={e => setFormState({ ...formState, [item.code]: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="submit" className="btn btn-primary mt-4" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูลถุงขยะ'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Pattern 3 Component: Consumables Fixed Table Card ────────────────────────
function ConsumablesFixedTableCard({ period, categories, monthEntriesData }) {
  const qc = useQueryClient()
  const [formState, setFormState] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    const initialState = {}
    categories.forEach(c => { initialState[c.code] = '' })

    if (monthEntriesData?.data) {
      for (const r of monthEntriesData.data) {
        if (r.module === 'consumable' && initialState[r.category_code] !== undefined) {
          initialState[r.category_code] = r.quantity !== null ? String(r.quantity) : ''
        }
      }
    }
    setFormState(initialState)
  }, [categories, monthEntriesData, period])

  const saveMutation = useMutation({
    mutationFn: async (items) => {
      for (const item of items) {
        await api.post('/entries/upsert-monthly', item)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries-month'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setError('')
    },
    onError: (err) => setError(err.message || 'บันทึกข้อมูลของใช้สิ้นเปลืองไม่สำเร็จ'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const items = []

    for (const [code, val] of Object.entries(formState)) {
      if (val !== '') {
        const valNum = Number(val)
        if (isNaN(valNum) || valNum < 0) return setError('จำนวนต้องเป็นจำนวนบวกหรือ 0')
        items.push({
          module: 'consumable',
          category_code: code,
          period_month: period,
          quantity: valNum,
        })
      }
    }

    if (items.length === 0) return setError('กรุณากรอกจำนวนอย่างน้อย 1 รายการ')
    saveMutation.mutate(items)
  }

  return (
    <div className="card" style={{ maxWidth: 650, margin: '0 auto' }}>
      <div className="card-header">
        <h2 className="card-title">บันทึกของใช้สิ้นเปลือง — ประจำเดือน {thaiMonthLabel(period)}</h2>
        <span className="badge badge-blue">รายเดือน</span>
      </div>
      <div className="card-body">
        {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ชนิดย่อย</th>
                <th>หน่วย</th>
                <th className="text-center" style={{ width: 160 }}>จำนวนที่ใช้</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.code}>
                  <td><strong>{cat.name_th}</strong></td>
                  <td><span className="badge badge-gray">{cat.unit || 'แกลลอน'}</span></td>
                  <td className="text-center">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input text-center"
                      placeholder="0"
                      value={formState[cat.code] ?? ''}
                      onChange={e => setFormState({ ...formState, [cat.code]: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="submit" className="btn btn-primary mt-4" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกข้อมูลของใช้สิ้นเปลือง'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Pre-populated Table Component: Recycle Waste (ดึงหมวดหมู่อัตโนมัติ) ──────────────
function RecyclePrepopulatedCard({ period, categories, monthEntriesData, deleteMutation }) {
  const qc = useQueryClient()
  const [entryDate, setEntryDate] = useState(todayBangkok())
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  // Pre-populate rows automatically from categories
  useEffect(() => {
    if (categories?.length) {
      setRows(categories.map(c => ({
        id: c.code,
        category_code: c.code,
        name_th: c.name_th,
        weight_kg: '',
        unit_price: '',
        amount: '',
        notes: '',
        isCustom: false,
      })))
    }
  }, [categories])

  function addCustomRow() {
    setRows(prev => [
      ...prev,
      {
        id: Date.now(),
        category_code: categories[0]?.code || '',
        name_th: '',
        weight_kg: '',
        unit_price: '',
        amount: '',
        notes: '',
        isCustom: true,
      }
    ])
  }

  function removeRow(id) {
    setRows(prev => prev.filter(r => r.id !== id))
  }

  function updateRow(id, field, val) {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: val }

      if (field === 'category_code' && r.isCustom) {
        const selected = categories.find(c => c.code === val)
        updated.name_th = selected ? selected.name_th : ''
      }

      // Auto calculate amount = weight * unit_price if weight or unit_price changes
      if (field === 'weight_kg' || field === 'unit_price') {
        const w = Number(field === 'weight_kg' ? val : r.weight_kg)
        const p = Number(field === 'unit_price' ? val : r.unit_price)
        if (!isNaN(w) && !isNaN(p) && w > 0 && p >= 0) {
          updated.amount = String(Math.round(w * p * 100) / 100)
        }
      }
      return updated
    }))
  }

  // Summary Bar totals
  const totalWeight = rows.reduce((s, r) => s + (Number(r.weight_kg) || 0), 0)
  const totalRevenue = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const saveBatchMutation = useMutation({
    mutationFn: (batchRows) => api.post('/entries/batch', { rows: batchRows }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries-month'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      // Reset input fields
      setRows(categories.map(c => ({
        id: c.code,
        category_code: c.code,
        name_th: c.name_th,
        weight_kg: '',
        unit_price: '',
        amount: '',
        notes: '',
        isCustom: false,
      })))
      setError('')
    },
    onError: (err) => setError(err.message || 'บันทึกรายการขายรีไซเคิลไม่สำเร็จ'),
  })

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const batchRows = []

    for (const r of rows) {
      if (r.weight_kg !== '' && r.weight_kg !== null) {
        const cat = r.category_code || categories[0]?.code
        const w = Number(r.weight_kg)
        const p = Number(r.unit_price)
        const a = Number(r.amount)

        if (isNaN(w) || w <= 0) return setError(`น้ำหนักรายการ "${r.name_th || cat}" ต้องมากกว่า 0`)
        if (isNaN(p) || p < 0) return setError(`ราคาต่อกิโลกรัมรายการ "${r.name_th || cat}" ต้องเป็นจำนวนบวก`)

        batchRows.push({
          module: 'recycle',
          category_code: cat,
          entry_date: entryDate,
          weight_kg: w,
          unit_price: p,
          amount: !isNaN(a) ? a : w * p,
          notes: r.notes || null,
        })
      }
    }

    if (batchRows.length === 0) return setError('กรุณากรอกน้ำหนักอย่างน้อย 1 รายการเพื่อบันทึก')
    saveBatchMutation.mutate(batchRows)
  }

  const recycleMonthEntries = monthEntriesData?.data?.filter(r => r.module === 'recycle') || []

  return (
    <div className="card" style={{ maxWidth: 950, margin: '0 auto' }}>
      <div className="card-header flex-between">
        <div>
          <h2 className="card-title">บันทึกยอดขายขยะรีไซเคิล (Pre-populated Table)</h2>
          <span className="text-xs text-secondary">ดึงหมวดหมู่ทั้งหมด 9 รายการมารอเป็นแถวพร้อมกรอกอัตโนมัติ — ประจำเดือน {thaiMonthLabel(period)}</span>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={addCustomRow}>
          + เพิ่มแถวพิเศษ
        </button>
      </div>

      <div className="card-body">
        {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group" style={{ maxWidth: 220 }}>
            <label className="form-label form-label-required">วันที่ขาย</label>
            <input
              type="date"
              className="form-input"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
            />
          </div>

          <div className="table-wrapper" style={{ maxHeight: 450, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>ประเภทวัสดุ</th>
                  <th style={{ width: 120 }}>น้ำหนัก (กก.)</th>
                  <th style={{ width: 120 }}>ราคา/กก. (บาท)</th>
                  <th style={{ width: 130 }}>ยอดขายจริง (บาท)</th>
                  <th>หมายเหตุ/รอบ</th>
                  <th style={{ width: 60 }} className="text-center">เอาออก</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>
                      {!r.isCustom ? (
                        <strong>{r.name_th}</strong>
                      ) : (
                        <select
                          className="form-select"
                          value={r.category_code}
                          onChange={e => updateRow(r.id, 'category_code', e.target.value)}
                        >
                          {categories.map(c => (
                            <option key={c.code} value={c.code}>{c.name_th}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input text-center"
                        placeholder="0.00"
                        value={r.weight_kg}
                        onChange={e => updateRow(r.id, 'weight_kg', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input text-center"
                        placeholder="0.00"
                        value={r.unit_price}
                        onChange={e => updateRow(r.id, 'unit_price', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input text-center"
                        placeholder="0.00"
                        value={r.amount}
                        onChange={e => updateRow(r.id, 'amount', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="หมายเหตุเพิ่มเติม..."
                        value={r.notes}
                        onChange={e => updateRow(r.id, 'notes', e.target.value)}
                      />
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeRow(r.id)}
                        title="เอาแถวนี้ออก"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Bar */}
          <div style={{ padding: 'var(--space-4)', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <div>น้ำหนักรวมรอบนี้: <span style={{ color: 'var(--color-primary)' }}>{totalWeight.toLocaleString('th-TH')} กก.</span></div>
            <div>รายได้รวมรอบนี้: <span style={{ color: 'var(--color-success)' }}>฿{totalRevenue.toLocaleString('th-TH')}</span></div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg mt-2" disabled={saveBatchMutation.isPending}>
            {saveBatchMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกรายการขายทั้งหมด'}
          </button>
        </form>

        {/* Existing Entries Table */}
        <div style={{ marginTop: 'var(--space-6)' }}>
          <h3 className="card-title" style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>
            รายการขายรีไซเคิลที่บันทึกแล้วในเดือนนี้ ({recycleMonthEntries.length} รายการ)
          </h3>
          <div className="table-wrapper" style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>ประเภท</th>
                  <th className="table-num">กก.</th>
                  <th className="table-num">บาท/กก.</th>
                  <th className="table-num">ยอดเงิน (บาท)</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {recycleMonthEntries.map(r => {
                  const catObj = categories.find(c => c.code === r.category_code)
                  return (
                    <tr key={r.id}>
                      <td>{r.entry_date}</td>
                      <td><strong>{catObj?.name_th || r.category_code}</strong></td>
                      <td className="table-num">{r.weight_kg?.toLocaleString('th-TH') ?? '—'}</td>
                      <td className="table-num">{r.unit_price?.toLocaleString('th-TH') ?? '—'}</td>
                      <td className="table-num" style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>
                        ฿{r.amount?.toLocaleString('th-TH') ?? '—'}
                      </td>
                      <td>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => deleteMutation.mutate(r.id)}>
                          ลบ
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
