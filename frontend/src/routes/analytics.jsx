import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analytics, dashboard } from '../api/index.js'
import { useAuth } from '../hooks/useAuth.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import { currentPeriodMonth, thaiMonthLabel, THAI_MONTHS_SHORT, daysInPeriodMonth } from '../lib/periods.js'
import { MODULE_ORDER, MODULE_LABELS } from '../lib/modules.js'
import { toPng, toSvg } from 'html-to-image'

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'

export const Route = createFileRoute('/analytics')({
  component: AnalyticsPage,
})

const COLOR_PALETTE = [
  '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444',
  '#06b6d4', '#ec4899', '#6366f1', '#f97316', '#14b8a6',
  '#84cc16', '#a855f7', '#0284c7', '#d97706', '#059669',
]

const FIXED_CATEGORIES = {
  rdf: [{ code: 'rdf_general', name_th: 'ขยะ RDF รวม', unit: 'กก.' }],
  dog_food: [{ code: 'df_general', name_th: 'อาหารสุนัข', unit: 'กก.' }],
  pig_feed: [{ code: 'pf_general', name_th: 'อาหารหมู (ค่าเฉลี่ย x วัน)', unit: 'กก./วัน' }],
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

export function AnalyticsPage() {
  const { data: user } = useAuth()
  const currentADYear = new Date().getFullYear()

  // Active Tab: 'dashboard' | 'custom_builder'
  const [activeTab, setActiveTab] = useState('dashboard')

  const [period, setPeriod] = useState(currentPeriodMonth())
  const [selectedYear, setSelectedYear] = useState(currentADYear)

  // Fetch Analytics Data
  const { data: chartResp, isLoading } = useQuery({
    queryKey: ['analytics-chart', selectedYear, period],
    queryFn: () => analytics.chart({ year: selectedYear, period_month: period }),
    enabled: !!user,
  })

  // Fetch Categories
  const { data: recycleCatData } = useQuery({
    queryKey: ['categories', 'recycle'],
    queryFn: () => dashboard.categories({ module: 'recycle' }),
    enabled: !!user,
  })

  const { data: consumableCatData } = useQuery({
    queryKey: ['categories', 'consumable'],
    queryFn: () => dashboard.categories({ module: 'consumable' }),
    enabled: !!user,
  })

  const analyticsData = chartResp?.data || {}
  const monthlyComparison = analyticsData.monthlyComparison || []
  const dailySeries = analyticsData.dailySeries || []
  const categorySeries = analyticsData.categorySeries || []
  const rawEntries = analyticsData.rawEntries || []

  const recycleCategories = recycleCatData?.data || []
  const consumableCategories = consumableCatData?.data || []

  const yearOptions = [currentADYear, currentADYear - 1, currentADYear - 2]

  return (
    <>
      <PageHeader
        title="กราฟวิเคราะห์และเปรียบเทียบเชิงลึก (Analytics & Charts)"
        subtitle={`ประจำปี พ.ศ. ${selectedYear + 543} | เดือน ${thaiMonthLabel(period)}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={selectedYear}
              onChange={e => {
                const y = Number(e.target.value)
                setSelectedYear(y)
                setPeriod(`${y}-01-01`)
              }}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>ปี พ.ศ. {y + 543} ({y})</option>
              ))}
            </select>
            <input
              type="month"
              className="form-input"
              style={{ width: 'auto' }}
              value={period.slice(0, 7)}
              onChange={e => e.target.value && setPeriod(`${e.target.value}-01`)}
            />
          </div>
        }
      />

      <div className="page-content">
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-2)' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md)', fontWeight: 'bold' }}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 สรุปวิเคราะห์มาตรฐาน (Standard Dashboard)
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'custom_builder' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md)', fontWeight: 'bold' }}
            onClick={() => setActiveTab('custom_builder')}
          >
            🎨 เครื่องมือสร้างกราฟอิสระ (Custom Chart Studio)
          </button>
        </div>

        {isLoading ? (
          <div className="page-loading" style={{ minHeight: 400 }}>
            <span className="spinner spinner-lg" />
            <span>กำลังโหลดข้อมูลกราฟวิเคราะห์...</span>
          </div>
        ) : activeTab === 'dashboard' ? (
          <StandardDashboardView
            period={period}
            selectedYear={selectedYear}
            monthlyComparison={monthlyComparison}
            dailySeries={dailySeries}
            categorySeries={categorySeries}
            recycleCategories={recycleCategories}
          />
        ) : (
          <CustomChartStudioView
            selectedYear={selectedYear}
            period={period}
            rawEntries={rawEntries}
            recycleCategories={recycleCategories}
            consumableCategories={consumableCategories}
          />
        )}
      </div>
    </>
  )
}

// ── Tab 1: Standard Dashboard View ──────────────────────────────────────────
function StandardDashboardView({ period, selectedYear, monthlyComparison, dailySeries, categorySeries, recycleCategories }) {
  const currentMonthData = monthlyComparison.find(m => m.period_month === period) || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* KPI Badges */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        <div className="kpi-card" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
          <div className="kpi-label" style={{ color: '#1d4ed8' }}>ขยะ RDF เดือนนี้</div>
          <div className="kpi-value" style={{ color: '#1e40af' }}>
            {(currentMonthData.rdf_kg || 0).toLocaleString('th-TH')}
          </div>
          <div className="kpi-unit">กก.</div>
        </div>

        <div className="kpi-card" style={{ background: '#fef3c7', borderColor: '#fde68a' }}>
          <div className="kpi-label" style={{ color: '#b45309' }}>ขยะเปียกรวม เดือนนี้</div>
          <div className="kpi-value" style={{ color: '#92400e' }}>
            {(currentMonthData.wet_waste_kg || 0).toLocaleString('th-TH')}
          </div>
          <div className="kpi-unit">กก. (สุนัข + หมู)</div>
        </div>

        <div className="kpi-card" style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}>
          <div className="kpi-label" style={{ color: '#047857' }}>ยอดขาย Recycle เดือนนี้</div>
          <div className="kpi-value" style={{ color: '#065f46' }}>
            ฿{(currentMonthData.recycle_revenue || 0).toLocaleString('th-TH')}
          </div>
          <div className="kpi-unit">บาท</div>
        </div>

        <div className="kpi-card" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
          <div className="kpi-label" style={{ color: '#475569' }}>ขยะรวมทั้งหมด เดือนนี้</div>
          <div className="kpi-value" style={{ color: '#1e293b' }}>
            {(currentMonthData.total_kg || 0).toLocaleString('th-TH')}
          </div>
          <div className="kpi-unit">กก. ({(currentMonthData.total_tons || 0)} ตัน)</div>
        </div>
      </div>

      {/* Grid Row 1 */}
      <div className="grid-2" style={{ gap: 'var(--space-6)' }}>
        <div className="card">
          <div className="card-header flex-between">
            <div>
              <h3 className="card-title">แนวโน้มขยะ RDF รายวัน ({thaiMonthLabel(period)})</h3>
              <span className="text-xs text-secondary">ปริมาณขยะ RDF สะสมแต่ละวัน (กก.)</span>
            </div>
            <span className="badge badge-blue">รายวัน</span>
          </div>
          <div className="card-body">
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <ComposedChart data={dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day_num" tickFormatter={d => `วันที่ ${d}`} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(val) => [`${val.toLocaleString('th-TH')} กก.`, 'ขยะ RDF']} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="ขยะ RDF (กก.)" />
                  <Line type="monotone" dataKey="value" stroke="#1d4ed8" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex-between">
            <div>
              <h3 className="card-title">สัดส่วนขยะเปียกรายเดือน (อาหารสุนัข vs อาหารหมู)</h3>
              <span className="text-xs text-secondary">เปรียบเทียบอาหารสุนัข (ยอดจริง) + อาหารหมู (ค่าประมาณ)</span>
            </div>
            <span className="badge badge-purple">สูตรคำนวณ</span>
          </div>
          <div className="card-body">
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month_num" tickFormatter={m => THAI_MONTHS_SHORT[m - 1]} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(val, name) => [`${val.toLocaleString('th-TH')} กก.`, name]} />
                  <Legend />
                  <Bar dataKey="dog_food_kg" stackId="a" fill="#f59e0b" name="อาหารสุนัข (ยอดจริง)" />
                  <Bar dataKey="pig_feed_kg" stackId="a" fill="#8b5cf6" name="อาหารหมู (ประมาณการ)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Row 2 */}
      <div className="grid-2" style={{ gap: 'var(--space-6)' }}>
        <div className="card">
          <div className="card-header flex-between">
            <div>
              <h3 className="card-title">ยอดขายขยะรีไซเคิลแยกตามประเภท ({thaiMonthLabel(period)})</h3>
              <span className="text-xs text-secondary">ยอดขายจริง (บาท) แต่ละหมวดหมู่</span>
            </div>
            <span className="badge badge-green">9 หมวดหมู่</span>
          </div>
          <div className="card-body">
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <BarChart data={categorySeries} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis
                    type="category"
                    dataKey="category_code"
                    tickFormatter={code => {
                      const found = recycleCategories.find(c => c.code === code)
                      return found ? found.name_th : code
                    }}
                    stroke="#94a3b8"
                    width={140}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      name === 'amount' ? `฿${val.toLocaleString('th-TH')}` : `${val.toLocaleString('th-TH')} กก.`,
                      name === 'amount' ? 'รายได้' : 'น้ำหนัก'
                    ]}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} name="รายได้ (บาท)">
                    {categorySeries.map((entry, index) => {
                      const cat = recycleCategories.find(c => c.code === entry.category_code)
                      return <Cell key={`cell-${index}`} fill={cat?.color || '#10b981'} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header flex-between">
            <div>
              <h3 className="card-title">เปรียบเทียบปริมาณขยะรวม 12 เดือน (ปี พ.ศ. {selectedYear + 543})</h3>
              <span className="text-xs text-secondary">ขยะ RDF vs ขยะเปียก vs Recycle vs รวมทั้งหมด (กก.)</span>
            </div>
            <span className="badge badge-blue">เปรียบเทียบปี</span>
          </div>
          <div className="card-body">
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <ComposedChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month_num" tickFormatter={m => THAI_MONTHS_SHORT[m - 1]} stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(val, name) => [`${val.toLocaleString('th-TH')} กก.`, name]} />
                  <Legend />
                  <Bar dataKey="rdf_kg" fill="#3b82f6" name="ขยะ RDF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="wet_waste_kg" fill="#f59e0b" name="ขยะเปียก" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recycle_kg" fill="#10b981" name="Recycle" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="total_kg" stroke="#0f172a" strokeWidth={2.5} name="ปริมาณรวม (กก.)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab 2: Custom Chart Studio View ──────────────────────────────────────────
function CustomChartStudioView({ selectedYear, period, rawEntries, recycleCategories, consumableCategories }) {
  // Granularity Modes: 'monthly' (1-12 เดือน) | 'quarterly' (Q1-Q4) | 'weekly' (สัปดาห์ 1-5) | 'half_month' (ครึ่งเดือน) | 'daily' (เส้นแนวโน้ม 1-31 วัน)
  const [granularity, setGranularity] = useState('monthly')

  // Month Range Selector (1-12)
  const [startMonthIdx, setStartMonthIdx] = useState(1)  // 1-12
  const [endMonthIdx, setEndMonthIdx] = useState(12)     // 1-12

  const [metric, setMetric] = useState('weight_kg')       // 'weight_kg' | 'quantity' | 'amount'
  const [chartType, setChartType] = useState('bar')       // 'bar' | 'line' | 'pie' | 'area'
  
  // Selected series list
  const [selectedSeries, setSelectedSeries] = useState(MODULE_ORDER)
  const [expandedModules, setExpandedModules] = useState(new Set(['recycle', 'black_bag']))

  const chartContainerRef = useRef(null)
  const [exporting, setExporting] = useState(false)

  // Map sub-categories by module
  const categoriesByModule = useMemo(() => {
    return {
      black_bag: FIXED_CATEGORIES.black_bag,
      tissue: FIXED_CATEGORIES.tissue,
      consumable: consumableCategories.length ? consumableCategories : [
        { code: 'consumable_foam_soap', name_th: 'สบู่โฟม', unit: 'แกลลอน' },
        { code: 'consumable_seat_cleaner', name_th: 'น้ำยาเช็ดฝาโถ', unit: 'แกลลอน' },
      ],
      recycle: recycleCategories.length ? recycleCategories : [
        { code: 'rc_brown_paper', name_th: 'กระดาษน้ำตาล', unit: 'กก.' },
        { code: 'rc_jap_jua', name_th: 'กระดาษจับจั้ว', unit: 'กก.' },
        { code: 'rc_tin_can', name_th: 'สังกะสีกระป๋อง', unit: 'กก.' },
        { code: 'rc_tin_can_2nd', name_th: 'สังกะสีกระป๋อง อีกราคา', unit: 'กก.' },
        { code: 'rc_pet', name_th: 'PET', unit: 'กก.' },
        { code: 'rc_plastic_mixed', name_th: 'พลาสติกรวม', unit: 'กก.' },
        { code: 'rc_plastic_mixed_2nd', name_th: 'พลาสติกรวม อีกราคา', unit: 'กก.' },
        { code: 'rc_alu_coke', name_th: 'อลู-โค๊ก', unit: 'กก.' },
        { code: 'rc_glass_mixed', name_th: 'แก้ว-รวมสี', unit: 'กก.' },
      ],
    }
  }, [recycleCategories, consumableCategories])

  function toggleExpandModule(mod) {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(mod)) next.delete(mod)
      else next.add(mod)
      return next
    })
  }

  function toggleModuleSelection(mod) {
    setSelectedSeries(prev => {
      const isSelected = prev.some(item => item === mod || item.startsWith(`${mod}~`))
      if (isSelected) {
        return prev.filter(item => item !== mod && !item.startsWith(`${mod}~`))
      } else {
        return [...prev, mod]
      }
    })
  }

  function toggleCategorySelection(mod, code) {
    const token = `${mod}~${code}`
    setSelectedSeries(prev => {
      if (prev.includes(token)) {
        return prev.filter(t => t !== token)
      } else {
        const cleaned = prev.filter(t => t !== mod)
        return [...cleaned, token]
      }
    })
  }

  function selectAll() { setSelectedSeries(MODULE_ORDER) }
  function clearAll() { setSelectedSeries([]) }

  function selectOnlyWithData() {
    const activeTokens = new Set()
    for (const r of rawEntries) {
      const val = Number(r[metric] ?? 0)
      if (val > 0) {
        activeTokens.add(r.module)
        if (r.category_code) {
          activeTokens.add(`${r.module}~${r.category_code}`)
        }
      }
    }
    setSelectedSeries(Array.from(activeTokens))
  }

  // Quick Preset Handlers
  function applyPreset(type) {
    if (type === 'all_year') {
      setGranularity('monthly')
      setStartMonthIdx(1)
      setEndMonthIdx(12)
    } else if (type === 'h1') {
      setGranularity('monthly')
      setStartMonthIdx(1)
      setEndMonthIdx(6)
    } else if (type === 'h2') {
      setGranularity('monthly')
      setStartMonthIdx(7)
      setEndMonthIdx(12)
    } else if (type === 'quarterly') {
      setGranularity('quarterly')
    } else if (type === 'weekly') {
      setGranularity('weekly')
    } else if (type === 'half_month') {
      setGranularity('half_month')
    } else if (type === 'q1') {
      setGranularity('monthly')
      setStartMonthIdx(1)
      setEndMonthIdx(3)
    } else if (type === 'q2') {
      setGranularity('monthly')
      setStartMonthIdx(4)
      setEndMonthIdx(6)
    } else if (type === 'q3') {
      setGranularity('monthly')
      setStartMonthIdx(7)
      setEndMonthIdx(9)
    } else if (type === 'q4') {
      setGranularity('monthly')
      setStartMonthIdx(10)
      setEndMonthIdx(12)
    }
  }

  // Ultra High-Res Export Handlers (PNG 3x & SVG)
  async function downloadHighResImage(format) {
    if (!chartContainerRef.current) return
    setExporting(true)
    try {
      const fileName = `CKAP_Chart_${selectedYear}_${granularity}_${Date.now()}`
      if (format === 'png') {
        const dataUrl = await toPng(chartContainerRef.current, {
          pixelRatio: 3,
          quality: 1.0,
          backgroundColor: '#ffffff',
        })
        const link = document.createElement('a')
        link.download = `${fileName}.png`
        link.href = dataUrl
        link.click()
      } else if (format === 'svg') {
        const dataUrl = await toSvg(chartContainerRef.current, {
          backgroundColor: '#ffffff',
        })
        const link = document.createElement('a')
        link.download = `${fileName}.svg`
        link.href = dataUrl
        link.click()
      }
    } catch (err) {
      alert(`ไม่สามารถส่งออกภาพได้: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  // Compute Custom Chart Series & Points Data
  const { chartSeries, chartPoints } = useMemo(() => {
    if (!selectedSeries.length) return { chartSeries: [], chartPoints: [] }

    const seriesList = []
    selectedSeries.forEach((token, idx) => {
      const color = COLOR_PALETTE[idx % COLOR_PALETTE.length]

      if (!token.includes('~')) {
        const mod = token
        seriesList.push({
          key: mod,
          label: MODULE_LABELS[mod] || mod,
          module: mod,
          category_code: null,
          color,
        })
      } else {
        const [mod, code] = token.split('~')
        const cats = categoriesByModule[mod] || []
        const catObj = cats.find(c => c.code === code)
        const catName = catObj ? catObj.name_th : code

        seriesList.push({
          key: token,
          label: `${MODULE_LABELS[mod] || mod} — ${catName}`,
          module: mod,
          category_code: code,
          color: catObj?.color || color,
        })
      }
    })

    let points = []

    if (granularity === 'monthly') {
      const s = Math.min(startMonthIdx, endMonthIdx)
      const e = Math.max(startMonthIdx, endMonthIdx)

      const targetMonths = Array.from({ length: e - s + 1 }, (_, i) => {
        const mNum = s + i
        const mStr = String(mNum).padStart(2, '0')
        return {
          month_num: mNum,
          period_month: `${selectedYear}-${mStr}-01`,
        }
      })

      points = targetMonths.map(tm => {
        const mRows = rawEntries.filter(r => r.period_month === tm.period_month)
        const point = { label: THAI_MONTHS_SHORT[tm.month_num - 1] }

        seriesList.forEach(ser => {
          let val = 0
          if (ser.module === 'pig_feed' && (metric === 'weight_kg' || metric === 'quantity')) {
            const pigRow = mRows.find(r => r.module === 'pig_feed')
            const dailyAvg = pigRow ? Number(pigRow.quantity ?? pigRow.weight_kg ?? 0) : 0
            val = Math.round(dailyAvg * daysInPeriodMonth(tm.period_month) * 100) / 100
          } else if (ser.module === 'wet_waste' && metric === 'weight_kg') {
            const dogWeight = mRows.filter(r => r.module === 'dog_food').reduce((sum, r) => sum + Number(r.weight_kg ?? 0), 0)
            const pigRow = mRows.find(r => r.module === 'pig_feed')
            const pigDailyAvg = pigRow ? Number(pigRow.quantity ?? pigRow.weight_kg ?? 0) : 0
            const pigWeight = Math.round(pigDailyAvg * daysInPeriodMonth(tm.period_month) * 100) / 100
            val = Math.round((dogWeight + pigWeight) * 100) / 100
          } else {
            const matched = mRows.filter(r => {
              if (r.module !== ser.module) return false
              if (ser.category_code && r.category_code !== ser.category_code) return false
              return true
            })
            val = matched.reduce((sum, r) => sum + Number(r[metric] ?? 0), 0)
          }
          point[ser.key] = Math.round(val * 100) / 100
        })
        return point
      })
    } else if (granularity === 'quarterly') {
      const quarters = [
        { label: 'Q1 (ม.ค.–มี.ค.)', months: [1, 2, 3] },
        { label: 'Q2 (เม.ย.–มิ.ย.)', months: [4, 5, 6] },
        { label: 'Q3 (ก.ค.–ก.ย.)', months: [7, 8, 9] },
        { label: 'Q4 (ต.ค.–ธ.ค.)', months: [10, 11, 12] },
      ]

      points = quarters.map(q => {
        const point = { label: q.label }
        const qPeriodMonths = q.months.map(m => `${selectedYear}-${String(m).padStart(2, '0')}-01`)
        const qRows = rawEntries.filter(r => qPeriodMonths.includes(r.period_month))

        seriesList.forEach(ser => {
          let totalVal = 0
          qPeriodMonths.forEach(pm => {
            const mRows = qRows.filter(r => r.period_month === pm)
            if (ser.module === 'pig_feed' && (metric === 'weight_kg' || metric === 'quantity')) {
              const pigRow = mRows.find(r => r.module === 'pig_feed')
              const dailyAvg = pigRow ? Number(pigRow.quantity ?? pigRow.weight_kg ?? 0) : 0
              totalVal += Math.round(dailyAvg * daysInPeriodMonth(pm) * 100) / 100
            } else if (ser.module === 'wet_waste' && metric === 'weight_kg') {
              const dogWeight = mRows.filter(r => r.module === 'dog_food').reduce((sum, r) => sum + Number(r.weight_kg ?? 0), 0)
              const pigRow = mRows.find(r => r.module === 'pig_feed')
              const pigDailyAvg = pigRow ? Number(pigRow.quantity ?? pigRow.weight_kg ?? 0) : 0
              const pigWeight = Math.round(pigDailyAvg * daysInPeriodMonth(pm) * 100) / 100
              totalVal += Math.round((dogWeight + pigWeight) * 100) / 100
            } else {
              const matched = mRows.filter(r => {
                if (r.module !== ser.module) return false
                if (ser.category_code && r.category_code !== ser.category_code) return false
                return true
              })
              totalVal += matched.reduce((sum, r) => sum + Number(r[metric] ?? 0), 0)
            }
          })
          point[ser.key] = Math.round(totalVal * 100) / 100
        })
        return point
      })
    } else if (granularity === 'weekly') {
      // 5 Clean Weekly Buckets for selected period
      const totalDays = daysInPeriodMonth(period)
      const targetMonthRows = rawEntries.filter(r => r.period_month === period)

      const weeks = [
        { label: 'สัปดาห์ที่ 1 (วันที่ 1–7)', start: 1, end: 7 },
        { label: 'สัปดาห์ที่ 2 (วันที่ 8–14)', start: 8, end: 14 },
        { label: 'สัปดาห์ที่ 3 (วันที่ 15–21)', start: 15, end: 21 },
        { label: 'สัปดาห์ที่ 4 (วันที่ 22–28)', start: 22, end: 28 },
        { label: `สัปดาห์ที่ 5 (วันที่ 29–${totalDays})`, start: 29, end: totalDays },
      ]

      points = weeks.map(w => {
        const point = { label: w.label }
        const wRows = targetMonthRows.filter(r => {
          if (!r.entry_date) return false
          const dNum = Number(r.entry_date.split('-')[2])
          return dNum >= w.start && dNum <= w.end
        })

        seriesList.forEach(ser => {
          let val = 0
          if (ser.module === 'wet_waste' && metric === 'weight_kg') {
            const dogWeight = wRows.filter(r => r.module === 'dog_food').reduce((sum, r) => sum + Number(r.weight_kg ?? 0), 0)
            val = Math.round(dogWeight * 100) / 100
          } else {
            const matched = wRows.filter(r => {
              if (r.module !== ser.module) return false
              if (ser.category_code && r.category_code !== ser.category_code) return false
              return true
            })
            val = matched.reduce((sum, r) => sum + Number(r[metric] ?? 0), 0)
          }
          point[ser.key] = Math.round(val * 100) / 100
        })
        return point
      })
    } else if (granularity === 'half_month') {
      // 2 Clean Half-Month Buckets
      const totalDays = daysInPeriodMonth(period)
      const targetMonthRows = rawEntries.filter(r => r.period_month === period)

      const halves = [
        { label: 'ครึ่งเดือนแรก (วันที่ 1–15)', start: 1, end: 15 },
        { label: `ครึ่งเดือนหลัง (วันที่ 16–${totalDays})`, start: 16, end: totalDays },
      ]

      points = halves.map(h => {
        const point = { label: h.label }
        const hRows = targetMonthRows.filter(r => {
          if (!r.entry_date) return false
          const dNum = Number(r.entry_date.split('-')[2])
          return dNum >= h.start && dNum <= h.end
        })

        seriesList.forEach(ser => {
          let val = 0
          if (ser.module === 'wet_waste' && metric === 'weight_kg') {
            const dogWeight = hRows.filter(r => r.module === 'dog_food').reduce((sum, r) => sum + Number(r.weight_kg ?? 0), 0)
            val = Math.round(dogWeight * 100) / 100
          } else {
            const matched = hRows.filter(r => {
              if (r.module !== ser.module) return false
              if (ser.category_code && r.category_code !== ser.category_code) return false
              return true
            })
            val = matched.reduce((sum, r) => sum + Number(r[metric] ?? 0), 0)
          }
          point[ser.key] = Math.round(val * 100) / 100
        })
        return point
      })
    } else {
      // Raw 1-31 Days (Daily Smooth Line Trend)
      const totalDays = daysInPeriodMonth(period)
      const [yStr, mStr] = period.split('-')
      const targetMonthRows = rawEntries.filter(r => r.period_month === period)

      points = Array.from({ length: totalDays }, (_, i) => {
        const dNum = i + 1
        const dateStr = `${yStr}-${mStr}-${String(dNum).padStart(2, '0')}`
        const dRows = targetMonthRows.filter(r => r.entry_date === dateStr)
        const point = { label: `${dNum}` }

        seriesList.forEach(ser => {
          let val = 0
          if (ser.module === 'wet_waste' && metric === 'weight_kg') {
            const dogWeight = dRows.filter(r => r.module === 'dog_food').reduce((sum, r) => sum + Number(r.weight_kg ?? 0), 0)
            val = Math.round(dogWeight * 100) / 100
          } else {
            const matched = dRows.filter(r => {
              if (r.module !== ser.module) return false
              if (ser.category_code && r.category_code !== ser.category_code) return false
              return true
            })
            val = matched.reduce((sum, r) => sum + Number(r[metric] ?? 0), 0)
          }
          point[ser.key] = Math.round(val * 100) / 100
        })
        return point
      })
    }

    return { chartSeries: seriesList, chartPoints: points }
  }, [selectedSeries, granularity, startMonthIdx, endMonthIdx, selectedYear, period, rawEntries, metric, categoriesByModule])

  const metricUnitLabel = metric === 'weight_kg' ? 'กก.' : metric === 'amount' ? 'บาท' : 'หน่วย'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* ── Studio Controls Panel ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header flex-between">
          <div>
            <h2 className="card-title">🎨 แผงควบคุมสร้างกราฟอิสระ (Custom Chart Studio Controls)</h2>
            <span className="text-xs text-secondary">ปรับแต่งสเกลช่วงเวลา (1–12 เดือน / ไตรมาส / รายสัปดาห์ / ครึ่งเดือน) ตัววัด และเลือกชุดข้อมูลเปรียบเทียบ</span>
          </div>
          {/* Export Action Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => downloadHighResImage('png')}
              disabled={exporting || !chartSeries.length}
            >
              📷 ดาวน์โหลด PNG (คมชัด 3x)
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => downloadHighResImage('svg')}
              disabled={exporting || !chartSeries.length}
            >
              📐 ดาวน์โหลด SVG (เวกเตอร์ไม่แตก)
            </button>
          </div>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Quick Presets Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
              ⚡ ทางลัดช่วงเวลา:
            </span>
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => applyPreset('all_year')}>
              ทั้งปี (12 เดือน)
            </button>
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => applyPreset('h1')}>
              ครึ่งปีแรก (ม.ค.–มิ.ย.)
            </button>
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => applyPreset('h2')}>
              ครึ่งปีหลัง (ก.ค.–ธ.ค.)
            </button>
            <button type="button" className="btn btn-xs btn-ghost text-primary" onClick={() => applyPreset('quarterly')}>
              📊 เปรียบเทียบรายไตรมาส (Q1–Q4)
            </button>
            <button type="button" className="btn btn-xs btn-ghost text-success" onClick={() => applyPreset('weekly')}>
              📅 รวบรายสัปดาห์ (สัปดาห์ 1–5)
            </button>
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => applyPreset('half_month')}>
              🌗 รวบครึ่งเดือน (ครึ่งแรก vs ครึ่งหลัง)
            </button>
          </div>

          {/* Row 1: Time Range Controls */}
          <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center', background: 'var(--gray-50)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <label className="form-label mb-1" style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>
                1. โหมดสเกลเวลา (Time Granularity):
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${granularity === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setGranularity('monthly')}
                >
                  📅 รายเดือน (สเกล 1-12 เดือน)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${granularity === 'quarterly' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setGranularity('quarterly')}
                >
                  📊 รายไตรมาส (Q1–Q4)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${granularity === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setGranularity('weekly')}
                >
                  📅 รายสัปดาห์ (5 สัปดาห์/เดือน)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${granularity === 'half_month' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setGranularity('half_month')}
                >
                  🌗 ครึ่งเดือน (ครึ่งแรก vs ครึ่งหลัง)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${granularity === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setGranularity('daily')
                    setChartType('line') // Auto switch to smooth line chart to avoid bar clutter
                  }}
                >
                  📈 เส้นแนวโน้มรายวัน (1–31 วัน)
                </button>
              </div>
            </div>

            {/* Custom Scale Range 1-12 Months */}
            {granularity === 'monthly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', background: '#ffffff', padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  สเกลเดือน:
                </span>
                <select
                  className="form-select text-xs"
                  style={{ width: 'auto', padding: '4px 8px' }}
                  value={startMonthIdx}
                  onChange={e => setStartMonthIdx(Number(e.target.value))}
                >
                  {THAI_MONTHS_SHORT.map((m, i) => (
                    <option key={i} value={i + 1}>เริ่ม {m}</option>
                  ))}
                </select>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>ถึง</span>
                <select
                  className="form-select text-xs"
                  style={{ width: 'auto', padding: '4px 8px' }}
                  value={endMonthIdx}
                  onChange={e => setEndMonthIdx(Number(e.target.value))}
                >
                  {THAI_MONTHS_SHORT.map((m, i) => (
                    <option key={i} value={i + 1}>ถึง {m}</option>
                  ))}
                </select>
                <span className="badge badge-blue">
                  {Math.abs(endMonthIdx - startMonthIdx) + 1} เดือน
                </span>
              </div>
            )}
          </div>

          {/* Row 2: Metric & Chart Type Controls */}
          <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label className="form-label mb-1" style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>
                2. ตัววัดผล (Metric):
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${metric === 'weight_kg' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMetric('weight_kg')}
                >
                  ⚖️ น้ำหนัก (กก.)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${metric === 'quantity' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMetric('quantity')}
                >
                  🔢 จำนวน
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${metric === 'amount' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMetric('amount')}
                >
                  💰 ยอดเงิน (บาท)
                </button>
              </div>
            </div>

            <div>
              <label className="form-label mb-1" style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>
                3. รูปแบบกราฟ (Chart Type):
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${chartType === 'bar' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setChartType('bar')}
                >
                  📊 แท่ง (Bar)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${chartType === 'line' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setChartType('line')}
                >
                  📈 เส้น (Line)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${chartType === 'pie' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setChartType('pie')}
                >
                  🍰 วงกลม (Pie)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${chartType === 'area' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setChartType('area')}
                >
                  ⛰️ พื้นที่ (Area)
                </button>
              </div>
            </div>
          </div>

          {/* Row 3: Data Series Selection */}
          <div>
            <div className="flex-between mb-3">
              <label className="form-label" style={{ fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
                4. เลือกชุดข้อมูลที่จะเปรียบเทียบ (Data Series Selection):
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn-sm btn-ghost" onClick={selectAll}>
                  ✓ เลือกทั้งหมด
                </button>
                <button type="button" className="btn btn-sm btn-ghost text-primary" onClick={selectOnlyWithData}>
                  ⚡ เลือกเฉพาะที่มีข้อมูล
                </button>
                <button type="button" className="btn btn-sm btn-ghost text-error" onClick={clearAll}>
                  ✕ ล้างทั้งหมด
                </button>
              </div>
            </div>

            {/* Grid of Module Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
              {MODULE_ORDER.map(mod => {
                const subCats = categoriesByModule[mod] || []
                const isModChecked = selectedSeries.includes(mod)
                const isExpanded = expandedModules.has(mod)
                const activeSubCount = subCats.filter(c => selectedSeries.includes(`${mod}~${c.code}`)).length

                return (
                  <div
                    key={mod}
                    style={{
                      border: `1px solid ${isModChecked || activeSubCount > 0 ? 'var(--primary)' : 'var(--border-default)'}`,
                      background: isModChecked || activeSubCount > 0 ? 'var(--blue-50)' : 'var(--surface)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 'var(--text-sm)' }}>
                        <input
                          type="checkbox"
                          checked={isModChecked}
                          onChange={() => toggleModuleSelection(mod)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                        <span>{MODULE_LABELS[mod] || mod}</span>
                      </label>

                      {subCats.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          style={{ padding: '2px 6px', fontSize: '10px' }}
                          onClick={() => toggleExpandModule(mod)}
                        >
                          {isExpanded ? '▲ ย่อ' : `▼ ย่อย (${subCats.length})`}
                        </button>
                      )}
                    </div>

                    {isExpanded && subCats.length > 0 && (
                      <div style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px dashed var(--border-default)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {subCats.map(cat => {
                          const catToken = `${mod}~${cat.code}`
                          const isCatChecked = selectedSeries.includes(catToken)

                          return (
                            <label
                              key={cat.code}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                cursor: 'pointer',
                                fontSize: '11px',
                                color: isCatChecked ? 'var(--primary-dark)' : 'var(--text-secondary)',
                                background: isCatChecked ? '#ffffff' : 'transparent',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isCatChecked}
                                onChange={() => toggleCategorySelection(mod, cat.code)}
                                style={{ width: 13, height: 13, cursor: 'pointer' }}
                              />
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {cat.name_th}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── High-Res Live Chart Canvas Container ──────────────────────────── */}
      <div className="card" ref={chartContainerRef} style={{ background: '#ffffff', padding: 'var(--space-4)' }}>
        <div className="card-header flex-between mb-4">
          <div>
            <h3 className="card-title" style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold' }}>
              📊 กราฟสรุปเปรียบเทียบสถิติ (
              {granularity === 'monthly' ? `ปี พ.ศ. ${selectedYear + 543} [${THAI_MONTHS_SHORT[startMonthIdx - 1]}–${THAI_MONTHS_SHORT[endMonthIdx - 1]}]` :
               granularity === 'quarterly' ? `ปี พ.ศ. ${selectedYear + 543} (รายไตรมาส Q1–Q4)` :
               granularity === 'weekly' ? `${thaiMonthLabel(period)} (รวบ 5 สัปดาห์)` :
               granularity === 'half_month' ? `${thaiMonthLabel(period)} (รวบครึ่งเดือน)` :
               `${thaiMonthLabel(period)} (เส้นแนวโน้มรายวัน)`}
              )
            </h3>
            <span className="text-xs text-secondary">
              ตัววัด: {metricUnitLabel} | รูปแบบ: {chartType.toUpperCase()} | เลือกทั้งหมด {chartSeries.length} ชุดข้อมูล
            </span>
          </div>
          <span className="badge badge-blue">Ultra-HD Canvas</span>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {!chartSeries.length ? (
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
              ⚠️ ยังไม่ได้เลือกชุดข้อมูล กรุณากดเลือกชุดข้อมูลจากแผงควบคุมด้านบน
            </div>
          ) : (
            <div style={{ width: '100%', height: 420 }}>
              <ResponsiveContainer>
                {chartType === 'line' ? (
                  <LineChart data={chartPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#475569" style={{ fontSize: 12, fontWeight: 'bold' }} />
                    <YAxis stroke="#475569" style={{ fontSize: 12, fontWeight: 'bold' }} />
                    <Tooltip formatter={(val, name) => [`${val.toLocaleString('th-TH')} ${metricUnitLabel}`, name]} />
                    <Legend wrapperStyle={{ paddingTop: 10, fontWeight: 'bold' }} />
                    {chartSeries.map(s => (
                      <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={3} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={chartPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#475569" style={{ fontSize: 12, fontWeight: 'bold' }} />
                    <YAxis stroke="#475569" style={{ fontSize: 12, fontWeight: 'bold' }} />
                    <Tooltip formatter={(val, name) => [`${val.toLocaleString('th-TH')} ${metricUnitLabel}`, name]} />
                    <Legend wrapperStyle={{ paddingTop: 10, fontWeight: 'bold' }} />
                    {chartSeries.map(s => (
                      <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} fill={s.color} stroke={s.color} fillOpacity={0.3} />
                    ))}
                  </AreaChart>
                ) : chartType === 'pie' ? (
                  <PieChart>
                    <Tooltip formatter={(val, name) => [`${val.toLocaleString('th-TH')} ${metricUnitLabel}`, name]} />
                    <Legend wrapperStyle={{ paddingTop: 10, fontWeight: 'bold' }} />
                    <Pie
                      data={chartSeries.map(s => ({
                        name: s.label,
                        value: chartPoints.reduce((sum, p) => sum + (p[s.key] || 0), 0),
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={140}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                    >
                      {chartSeries.map((s) => (
                        <Cell key={s.key} fill={s.color} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart data={chartPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#475569" style={{ fontSize: 12, fontWeight: 'bold' }} />
                    <YAxis stroke="#475569" style={{ fontSize: 12, fontWeight: 'bold' }} />
                    <Tooltip formatter={(val, name) => [`${val.toLocaleString('th-TH')} ${metricUnitLabel}`, name]} />
                    <Legend wrapperStyle={{ paddingTop: 10, fontWeight: 'bold' }} />
                    {chartSeries.map(s => (
                      <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Data Table ────────────────────────────────────────────── */}
      {chartSeries.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📋 ตารางสรุปตัวเลขสถิติประกอบกราฟ</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper" style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 160 }}>ช่วงเวลา</th>
                    {chartSeries.map(s => (
                      <th key={s.key} className="table-num" style={{ minWidth: 110 }}>{s.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartPoints.map((pt, i) => (
                    <tr key={i}>
                      <td><strong>{pt.label}</strong></td>
                      {chartSeries.map(s => (
                        <td key={s.key} className="table-num">
                          {pt[s.key] > 0 ? (
                            <span>{pt[s.key].toLocaleString('th-TH')} <small className="text-secondary">{metricUnitLabel}</small></span>
                          ) : (
                            <span className="text-secondary">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--gray-50)', fontWeight: 'bold' }}>
                    <td><strong>รวมทั้งสิ้น</strong></td>
                    {chartSeries.map(s => {
                      const totalSum = chartPoints.reduce((sum, p) => sum + (p[s.key] || 0), 0)
                      return (
                        <td key={s.key} className="table-num" style={{ color: 'var(--primary-dark)', fontSize: 'var(--text-base)' }}>
                          {totalSum.toLocaleString('th-TH')} <small>{metricUnitLabel}</small>
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
