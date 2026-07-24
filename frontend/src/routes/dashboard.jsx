import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { dashboard } from '../api/index.js'
import { useAuth } from '../hooks/useAuth.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import { currentPeriodMonth, thaiMonthLabel } from '../lib/periods.js'
import { MODULE_LABELS } from '../lib/modules.js'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

const PERIOD = currentPeriodMonth()

export function DashboardPage() {
  const { data: user } = useAuth()

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', PERIOD],
    queryFn: () => dashboard.summary({ period_month: PERIOD }),
    enabled: !!user,
  })

  return (
    <>
      <PageHeader title="แดชบอร์ด" subtitle={thaiMonthLabel(PERIOD)} />
      <div className="page-content">
        {isLoading && (
          <div className="page-loading">
            <span className="spinner spinner-lg" />
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
            ⚠️ {error.message}
          </div>
        )}

        {data && (
          <>
            {/* KPI Grid */}
            <div className="kpi-grid mb-6">
              {data.modules?.map(mod => (
                <KpiCard key={mod.module} mod={mod} />
              ))}
            </div>

            {/* Data Quality */}
            <DataQualitySection period={PERIOD} user={user} />
          </>
        )}
      </div>
    </>
  )
}

function KpiCard({ mod }) {
  const label = MODULE_LABELS[mod.module] ?? mod.module
  const value = (mod.current_total ?? 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })
  const momPct = mod.mom_pct

  let changeClass = 'flat'
  if (momPct !== null && momPct > 0) changeClass = 'up'
  if (momPct !== null && momPct < 0) changeClass = 'down'

  const scoreColor = mod.quality?.score >= 80 ? 'var(--color-success)'
    : mod.quality?.score >= 55 ? 'var(--color-warning)'
    : 'var(--color-danger)'

  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="kpi-label">{label}</div>
        {mod.quality && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--fw-semibold)',
              color: scoreColor,
            }}
            title={`คะแนนคุณภาพข้อมูล: ${mod.quality.score}`}
          >
            {mod.quality.score}%
          </span>
        )}
      </div>

      <div>
        <span className="kpi-value">{value}</span>
        <span className="kpi-unit" style={{ marginLeft: 'var(--space-1)' }}>kg</span>
      </div>

      {momPct !== null && (
        <div>
          <span className={`kpi-change ${changeClass}`}>
            {changeClass === 'up' ? '↑' : changeClass === 'down' ? '↓' : '→'}
            {' '}{Math.abs(momPct).toFixed(1)}% MoM
          </span>
        </div>
      )}
    </div>
  )
}

function DataQualitySection({ period, user }) {
  const { data } = useQuery({
    queryKey: ['data-quality', period],
    queryFn: () => dashboard.dataQuality({ period_month: period }),
    enabled: !!user,
  })

  if (!data?.scores?.length) return null

  const anomalies = data.scores.filter(s => s.anomaly)

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">คุณภาพข้อมูล</h2>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {thaiMonthLabel(period)}
        </span>
      </div>
      <div className="card-body">
        {anomalies.length > 0 && (
          <div className="alert alert-warning mb-4">
            ⚠️ พบ {anomalies.length} module ที่คุณภาพข้อมูลต่ำกว่า 55% — อาจส่งผลต่อความแม่นยำของรายงาน
          </div>
        )}
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Module</th>
                <th className="table-num">คะแนน</th>
                <th className="table-num">Coverage</th>
                <th className="table-num">Completeness</th>
                <th className="table-num">วันที่บันทึก</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {data.scores.map(s => (
                <tr key={s.module}>
                  <td>{MODULE_LABELS[s.module] ?? s.module}</td>
                  <td className="table-num" style={{ fontWeight: 'var(--fw-semibold)' }}>
                    {s.score}
                  </td>
                  <td className="table-num">{s.coverage}%</td>
                  <td className="table-num">{s.completeness}%</td>
                  <td className="table-num">{s.unique_days}/{s.expected_days}</td>
                  <td>
                    {s.anomaly ? (
                      <span className="badge badge-red">ข้อมูลไม่ครบ</span>
                    ) : s.score >= 80 ? (
                      <span className="badge badge-green">ดี</span>
                    ) : (
                      <span className="badge badge-yellow">ควรเพิ่มข้อมูล</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
