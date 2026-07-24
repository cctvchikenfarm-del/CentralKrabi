import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { imports } from '../../api/index.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { currentPeriodMonth, thaiMonthLabel } from '../../lib/periods.js'

export const Route = createFileRoute('/imports/daily-handwritten')({
  component: DailyHandwrittenImportPage,
})

export function DailyHandwrittenImportPage() {
  const [period, setPeriod] = useState(currentPeriodMonth())
  const [file, setFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [parsedResult, setParsedResult] = useState(null)
  const [items, setItems] = useState([])
  const [successMessage, setSuccessMessage] = useState(null)

  function handleFileSelect(e) {
    const selected = e.target.files[0]
    if (!selected) return
    setFile(selected)
    setFilePreviewUrl(URL.createObjectURL(selected))
    setParsedResult(null)
    setItems([])
    setSuccessMessage(null)
  }

  async function handleParseImage() {
    if (!file) return alert('กรุณาเลือกไฟล์ภาพถ่ายกระดาษจดรายวัน')
    setParsing(true)
    setSuccessMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('period_month', period)

      const res = await imports.dailyHandwrittenParse(formData)
      setParsedResult(res)
      setItems(res.items || [])
    } catch (err) {
      alert(`เกิดข้อผิดพลาดในการสกัดข้อมูล: ${err.message}`)
    } finally {
      setParsing(false)
    }
  }

  // Re-evaluate validation state when editing a row
  function handleItemValueChange(index, field, newValue) {
    const next = [...items]
    const current = { ...next[index], [field]: newValue }

    // Re-validate row
    const num = Number(current.value)
    if (isNaN(num) || num < 0) {
      current.status = 'needs_review'
      current.issue = 'ตัวเลขไม่ถูกต้อง'
    } else {
      current.status = 'ready'
      current.issue = null
    }

    next[index] = current
    setItems(next)
  }

  async function handleConfirmImport() {
    if (!items.length) return
    setConfirming(true)

    try {
      const payload = {
        period_month: period,
        file_hash: parsedResult?.file_hash,
        filename: file?.name || 'daily_handwritten.jpg',
        items,
      }

      const res = await imports.dailyHandwrittenConfirm(payload)
      setSuccessMessage(res.message)
      setItems([])
      setParsedResult(null)
      setFile(null)
      setFilePreviewUrl(null)
    } catch (err) {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`)
    } finally {
      setConfirming(false)
    }
  }

  const readyCount = items.filter(i => i.status === 'ready').length
  const reviewCount = items.filter(i => i.status === 'needs_review').length

  return (
    <>
      <PageHeader
        title="ใบบันทึกรายวัน (แบบลายมือ)"
        subtitle={`อัปโหลดภาพถ่ายกระดาษจดลายมือรายวันประจำเดือน ${thaiMonthLabel(period)} (รวมอาหารสุนัข กก.)`}
      />

      <div className="page-content">
        {/* Upload Card */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">1. เลือกเดือนรายงานและอัปโหลดภาพถ่าย</h3>
          </div>
          <div className="card-body">
            <div className="flex-between" style={{ gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <label className="form-label mb-0">เดือนรายงาน:</label>
                <input
                  type="month"
                  className="form-input"
                  style={{ width: 'auto' }}
                  value={period.slice(0, 7)}
                  onChange={e => e.target.value && setPeriod(`${e.target.value}-01`)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="form-input"
                  style={{ width: 'auto' }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleParseImage}
                  disabled={!file || parsing}
                >
                  {parsing ? 'กำลังอ่านข้อมูล OCR...' : '🔍 อ่านข้อมูลจากภาพถ่าย'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="alert alert-success mb-6">
            ✅ {successMessage}
          </div>
        )}

        {/* Side-by-side Preview Container */}
        {filePreviewUrl && items.length > 0 && (
          <div className="grid-2 mb-6" style={{ gap: 'var(--space-6)', alignItems: 'start' }}>
            {/* Left: Original Image Preview */}
            <div className="card">
              <div className="card-header flex-between">
                <h3 className="card-title">🖼️ ภาพถ่ายต้นฉบับ (กระดาษจดลายมือ)</h3>
                <span className="badge badge-gray">{file?.name}</span>
              </div>
              <div className="card-body" style={{ textAlign: 'center', background: '#0f172a', padding: 'var(--space-4)' }}>
                <img
                  src={filePreviewUrl}
                  alt="ภาพถ่ายใบบันทึกรายวัน"
                  style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 'var(--radius-md)', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* Right: Editable Preview Table */}
            <div className="card">
              <div className="card-header flex-between">
                <div>
                  <h3 className="card-title">📋 ผลการอ่านข้อมูล (Side-by-side Table)</h3>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: 4 }}>
                    หัวข้อสกัดได้: {parsedResult?.headers?.map(h => h.name).join(', ')} (รวมอาหารสุนัข กก.)
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <span className="badge badge-green">พร้อม {readyCount}</span>
                  {reviewCount > 0 && <span className="badge badge-yellow">ต้องตรวจ {reviewCount}</span>}
                </div>
              </div>

              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrapper" style={{ maxHeight: 420, overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>โมดูล / หัวข้อ</th>
                        <th className="table-num">จำนวน / น้ำหนัก</th>
                        <th style={{ textAlign: 'center' }}>หน่วย</th>
                        <th style={{ textAlign: 'center' }}>สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} style={{ background: item.status === 'needs_review' ? '#fefce8' : undefined }}>
                          <td>{item.entry_date}</td>
                          <td>
                            <strong>{item.material_name}</strong>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                              {item.module} ({item.category_code})
                            </div>
                          </td>
                          <td className="table-num">
                            <input
                              type="number"
                              className="form-input form-input-sm table-num-input"
                              style={{ width: 90 }}
                              value={item.value}
                              onChange={e => handleItemValueChange(idx, 'value', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>{item.unit}</td>
                          <td style={{ textAlign: 'center' }}>
                            {item.status === 'ready' ? (
                              <span className="badge badge-green">พร้อม</span>
                            ) : (
                              <span className="badge badge-yellow" title={item.issue || 'ต้องตรวจสอบ'}>
                                ตรวจสอบ
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card-footer flex-between" style={{ padding: 'var(--space-4)' }}>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
                    รวมทั้งหมด {items.length} แถว
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmImport}
                    disabled={confirming || reviewCount > 0}
                  >
                    {confirming ? 'กำลังบันทึกข้อมูล...' : `✅ ยืนยันบันทึกข้อมูลเข้าสู่ระบบ (${readyCount} แถว)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
