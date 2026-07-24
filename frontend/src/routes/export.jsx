import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reports } from '../api/index.js'
import { api } from '../api/client.js'
import { useAuth } from '../hooks/useAuth.js'
import PageHeader from '../components/layout/PageHeader.jsx'
import { currentPeriodMonth, thaiMonthLabel } from '../lib/periods.js'

import ThaiMonthPicker from '../components/common/ThaiMonthPicker.jsx'

export const Route = createFileRoute('/export')({
  component: ExportPage,
})

export function ExportPage() {
  const { data: user } = useAuth()
  const currentADYear = new Date().getFullYear()

  const [period, setPeriod] = useState(currentPeriodMonth())
  const [selectedYear, setSelectedYear] = useState(currentADYear)
  const [downloading, setDownloading] = useState(false)
  const [activeSlide, setActiveSlide] = useState(1)

  // Query Report Preview
  const { data: previewData, isLoading } = useQuery({
    queryKey: ['report-preview', period],
    queryFn: () => reports.preview({ period_month: period }),
    enabled: !!user,
  })

  const slides = previewData?.slides || [
    { id: 1, title: 'หน้าปกรายงาน (Title Cover)', type: 'cover' },
    { id: 2, title: 'สรุปภาพรวมสถิติประจำเดือน (Executive Summary Table)', type: 'summary' },
    { id: 3, title: 'สถิติเปรียบเทียบขยะ 12 เดือน (Monthly Waste Comparison)', type: 'chart' },
    { id: 4, title: 'สรุปสูตรการคำนวณขยะเปียก 3 ส่วน (Wet Waste Breakdown)', type: 'formula' },
    { id: 5, title: 'รายงานยอดขายขยะรีไซเคิล 9 หมวดหมู่ (Recycle 9 Categories)', type: 'recycle' },
    { id: 6, title: 'สรุปของใช้สิ้นเปลืองและถุงขยะ (Consumables & Black Bags)', type: 'consumables' },
  ]

  const yearOptions = [currentADYear, currentADYear - 1, currentADYear - 2]

  // Handle PowerPoint (.pptx) file download
  async function handleDownloadPowerPoint() {
    setDownloading(true)
    try {
      const response = await fetch('/api/reports/powerpoint', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
        body: JSON.stringify({ period_month: period }),
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error || 'ไม่สามารถสร้างรายงาน PowerPoint ได้')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `CKAP_PowerPoint_Report_${period.slice(0, 7)}.pptx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`ข้อผิดพลาดในการดาวน์โหลด: ${err.message}`)
    } finally {
      setDownloading(false)
    }
  }

  const [downloadingExcel, setDownloadingExcel] = useState(false)

  // Handle Excel (.xlsx) file download
  async function handleDownloadExcel() {
    setDownloadingExcel(true)
    try {
      const blob = await api.download('/reports/excel', { period_month: period })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `CKAP_Excel_Report_${period}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert(`ข้อผิดพลาดในการดาวน์โหลด Excel: ${err.message}`)
    } finally {
      setDownloadingExcel(false)
    }
  }

  return (
    <>
      <PageHeader
        title="ส่งออกรายงาน PowerPoint (.pptx) & Excel (.xlsx)"
        subtitle={`สร้างสไลด์นำเสนอและชุดข้อมูลวิเคราะห์ประจำเดือน ${thaiMonthLabel(period)}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <ThaiMonthPicker
              value={period}
              onChange={val => {
                setPeriod(val)
                const y = Number(val.split('-')[0])
                if (!isNaN(y)) setSelectedYear(y)
              }}
            />
            <button
              type="button"
              className="btn btn-lg"
              style={{ background: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 'bold' }}
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
            >
              {downloadingExcel ? (
                <>
                  <span className="spinner spinner-sm" style={{ marginRight: 8 }} />
                  กำลังสร้างไฟล์ Excel...
                </>
              ) : (
                '📗 ดาวน์โหลด Excel (.xlsx)'
              )}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleDownloadPowerPoint}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <span className="spinner spinner-sm" style={{ marginRight: 8 }} />
                  กำลังสร้างไฟล์ PowerPoint...
                </>
              ) : (
                '📊 ดาวน์โหลด PowerPoint (.pptx)'
              )}
            </button>
          </div>
        }
      />

      <div className="page-content">
        {/* Banner */}
        <div className="alert alert-info mb-6" style={{ background: '#f0f9ff', borderColor: '#bae6fd', color: '#0369a1' }}>
          ℹ️ <strong>ระบบส่งออกรายงาน PowerPoint (.pptx) และ Excel (.xlsx):</strong> ท่านสามารถดาวน์โหลดไฟล์ Excel เพื่อนำข้อมูลดิบไปกรอง สร้าง Pivot Table และวิเคราะห์กราฟต่อใน Microsoft Excel หรือ Power BI ได้ทันที
        </div>

        {isLoading ? (
          <div className="page-loading" style={{ minHeight: 300 }}>
            <span className="spinner spinner-lg" />
            <span>กำลังเตรียมพรีวิวสไลด์...</span>
          </div>
        ) : (
          <div className="grid-2" style={{ gap: 'var(--space-6)', alignItems: 'start' }}>
            {/* Left Column: Slide Navigation List */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📑 โครงสร้างสไลด์นำเสนอ (6 สไลด์หลัก)</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {slides.map(slide => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setActiveSlide(slide.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        padding: 'var(--space-4)',
                        border: 'none',
                        borderBottom: '1px solid var(--border-default)',
                        background: activeSlide === slide.id ? 'var(--blue-50)' : 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span className="badge badge-blue" style={{ minWidth: 28, textAlign: 'center' }}>
                          {slide.id}
                        </span>
                        <span style={{ fontWeight: activeSlide === slide.id ? 'bold' : 'normal', color: activeSlide === slide.id ? 'var(--primary-dark)' : 'var(--text-primary)' }}>
                          {slide.title}
                        </span>
                      </div>
                      {activeSlide === slide.id && <span style={{ color: 'var(--primary)' }}>➔</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Slide Mockup Card Preview */}
            <div className="card">
              <div className="card-header flex-between">
                <h3 className="card-title">👁️ ตัวอย่างหน้าสไลด์ที่ {activeSlide}</h3>
                <span className="badge badge-gray">สเกล 16:9 HD</span>
              </div>
              <div className="card-body" style={{ padding: 'var(--space-6)', background: '#f8fafc', minHeight: 380, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <SlideMockupPreview slideId={activeSlide} period={period} selectedYear={selectedYear} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Slide Mockup Component ──────────────────────────────────────────────────
function SlideMockupPreview({ slideId, period, selectedYear }) {
  const thaiYear = selectedYear + 543
  const periodLabel = thaiMonthLabel(period, 'full')

  if (slideId === 1) {
    return (
      <div style={{ background: '#0f172a', padding: 'var(--space-8)', borderRadius: 'var(--radius-lg)', color: '#ffffff', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', marginBottom: 'var(--space-3)' }}>
          รายงานสรุปสถิติการจัดการขยะและของใช้สิ้นเปลือง
        </div>
        <div style={{ fontSize: 'var(--text-lg)', color: '#60a5fa', marginBottom: 'var(--space-4)' }}>
          ประจำเดือน {periodLabel} (พ.ศ. {thaiYear})
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: '#94a3b8' }}>
          สถานีสรุปข้อมูลสถิติการจัดการขยะและทรัพยากร | CKAP System v4
        </div>
      </div>
    )
  }

  if (slideId === 2) {
    return (
      <div style={{ background: '#ffffff', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
        <h4 style={{ fontSize: 'var(--text-base)', color: '#1e40af', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>
          1. สรุปภาพรวมสถิติประจำเดือน — {periodLabel}
        </h4>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr style={{ background: '#1e40af', color: '#ffffff' }}>
                <th>โมดูลการดำเนินงาน</th>
                <th className="table-num">ปริมาณรวม</th>
                <th style={{ textAlign: 'center' }}>หน่วย</th>
                <th style={{ textAlign: 'center' }}>สถานะบันทึก</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>ขยะ RDF</td><td className="table-num">12,450</td><td style={{ textAlign: 'center' }}>กก.</td><td style={{ textAlign: 'center' }}><span className="badge badge-green">บันทึกแล้ว</span></td></tr>
              <tr><td>อาหารสุนัข</td><td className="table-num">850</td><td style={{ textAlign: 'center' }}>กก.</td><td style={{ textAlign: 'center' }}><span className="badge badge-green">บันทึกแล้ว</span></td></tr>
              <tr><td>อาหารหมู</td><td className="table-num">3,100</td><td style={{ textAlign: 'center' }}>กก./วัน</td><td style={{ textAlign: 'center' }}><span className="badge badge-purple">ค่าประมาณ</span></td></tr>
              <tr><td>ขยะเปียกรวม</td><td className="table-num">3,950</td><td style={{ textAlign: 'center' }}>กก.</td><td style={{ textAlign: 'center' }}><span className="badge badge-yellow">คำนวณแล้ว</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (slideId === 3) {
    return (
      <div style={{ background: '#ffffff', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
        <h4 style={{ fontSize: 'var(--text-base)', color: '#1e40af', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>
          2. สถิติเปรียบเทียบขยะรายเดือน — ปี พ.ศ. {thaiYear} (Native Bar Chart)
        </h4>
        <div style={{ height: 200, background: '#f1f5f9', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 'bold' }}>
          📊 [กราฟเวกเตอร์ความละเอียดสูง 12 เดือน (RDF vs ขยะเปียก vs Recycle)]
        </div>
      </div>
    )
  }

  if (slideId === 4) {
    return (
      <div style={{ background: '#ffffff', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
        <h4 style={{ fontSize: 'var(--text-base)', color: '#6b21a8', fontWeight: 'bold', marginBottom: 'var(--space-3)' }}>
          3. สรุปสูตรการคำนวณขยะเปียก — {periodLabel}
        </h4>
        <div style={{ background: '#f3e8ff', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', color: '#581c87', fontWeight: 'bold', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
          สูตรคำนวณ: ขยะเปียกรวม = อาหารสุนัข (ยอดจริง) + อาหารหมู (ประมาณการ)
        </div>
        <table className="table">
          <thead>
            <tr style={{ background: '#6b21a8', color: '#ffffff' }}>
              <th>ส่วนประกอบ</th>
              <th className="table-num">ปริมาณ (กก.)</th>
              <th>รายละเอียดสูตรคำนวณ</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1. อาหารสุนัข (ยอดจริง)</td><td className="table-num">850</td><td>ยอดบันทึกจริงประจำเดือน</td></tr>
            <tr><td>2. อาหารหมู (ค่าประมาณ)</td><td className="table-num">3,100</td><td>ค่าเฉลี่ย 100 กก./วัน × 31 วัน</td></tr>
            <tr style={{ background: '#dcfce7', fontWeight: 'bold' }}><td>3. ขยะเปียกรวม (ผลคำนวณ)</td><td className="table-num" style={{ color: '#14532d' }}>3,950</td><td style={{ color: '#14532d' }}>ยอดรวมขยะเปียกส่งต่อกำจัด</td></tr>
          </tbody>
        </table>
      </div>
    )
  }

  if (slideId === 5) {
    return (
      <div style={{ background: '#ffffff', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
        <h4 style={{ fontSize: 'var(--text-base)', color: '#15803d', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>
          4. รายงานยอดขายขยะรีไซเคิล 9 หมวดหมู่ — {periodLabel}
        </h4>
        <table className="table">
          <thead>
            <tr style={{ background: '#15803d', color: '#ffffff' }}>
              <th>หมวดหมู่รีไซเคิล</th>
              <th className="table-num">น้ำหนัก (กก.)</th>
              <th className="table-num">ยอดเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>กระดาษน้ำตาล</td><td className="table-num">1,200</td><td className="table-num">฿4,800</td></tr>
            <tr><td>PET</td><td className="table-num">850</td><td className="table-num">฿8,500</td></tr>
            <tr><td>พลาสติกรวม</td><td className="table-num">950</td><td className="table-num">฿3,800</td></tr>
            <tr style={{ background: '#ecfdf5', fontWeight: 'bold' }}><td>รวมยอดขายรีไซเคิลทั้งหมด</td><td className="table-num">3,000</td><td className="table-num" style={{ color: '#065f46' }}>฿17,100</td></tr>
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ background: '#ffffff', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
      <h4 style={{ fontSize: 'var(--text-base)', color: '#475569', fontWeight: 'bold', marginBottom: 'var(--space-4)' }}>
        5. สรุปของใช้สิ้นเปลืองและถุงขยะ — {periodLabel}
      </h4>
      <table className="table">
        <thead>
          <tr style={{ background: '#475569', color: '#ffffff' }}>
            <th>รายการทรัพยากร / ของใช้</th>
            <th style={{ textAlign: 'center' }}>โมดูล</th>
            <th className="table-num">จำนวนที่ใช้</th>
            <th style={{ textAlign: 'center' }}>หน่วย</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>ถุงใหญ่ 30×40 สีดำ</td><td style={{ textAlign: 'center' }}>ถุงดำ</td><td className="table-num">500</td><td style={{ textAlign: 'center' }}>ใบ</td></tr>
          <tr><td>สบู่โฟม</td><td style={{ textAlign: 'center' }}>ของใช้สิ้นเปลือง</td><td className="table-num">12</td><td style={{ textAlign: 'center' }}>แกลลอน</td></tr>
          <tr><td>น้ำยาเช็ดฝาโถ</td><td style={{ textAlign: 'center' }}>ของใช้สิ้นเปลือง</td><td className="table-num">8</td><td style={{ textAlign: 'center' }}>แกลลอน</td></tr>
          <tr><td>กระดาษทิชชู่ ม้วน</td><td style={{ textAlign: 'center' }}>ทิชชู่</td><td className="table-num">300</td><td style={{ textAlign: 'center' }}>ม้วน</td></tr>
        </tbody>
      </table>
    </div>
  )
}
