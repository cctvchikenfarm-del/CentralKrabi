import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { imports } from '../../api/index.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { currentPeriodMonth, thaiMonthLabel } from '../../lib/periods.js'

import ThaiMonthPicker from '../../components/common/ThaiMonthPicker.jsx'

export const Route = createFileRoute('/imports/recycle-voucher')({
  component: RecycleVoucherImportPage,
})

export function RecycleVoucherImportPage() {
  const [period, setPeriod] = useState(currentPeriodMonth())
  const [file, setFile] = useState(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState(null)
  const [isPdf, setIsPdf] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [parsedResult, setParsedResult] = useState(null)
  const [items, setItems] = useState([])
  const [successMessage, setSuccessMessage] = useState(null)
  const [batches, setBatches] = useState([])
  const [relocatingId, setRelocatingId] = useState(null)
  const [targetRelocateMonth, setTargetRelocateMonth] = useState('')

  // Detected document month from OCR / Voucher Number (e.g. PV2606... -> 2026-06, PV2607... -> 2026-07)
  const detectedDocMonth = parsedResult?.voucher_number?.startsWith('PV2606') ? '2026-06'
    : parsedResult?.voucher_number?.startsWith('PV2607') ? '2026-07'
    : null;
  const isMonthMismatch = detectedDocMonth && detectedDocMonth !== period;

  const loadBatches = async () => {
    try {
      const res = await imports.batchList()
      setBatches(res.batches || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadBatches()
  }, [])

  function handleFileSelect(e) {
    const selected = e.target.files[0]
    if (!selected) return
    setFile(selected)
    const pdfFlag = selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf')
    setIsPdf(pdfFlag)
    setFilePreviewUrl(URL.createObjectURL(selected))
    setParsedResult(null)
    setItems([])
    setSuccessMessage(null)
  }

  async function handleParseVoucher() {
    if (!file) return alert('กรุณาเลือกไฟล์ PDF หรือรูปภาพใบสำคัญจ่าย')
    setParsing(true)
    setSuccessMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('period_month', period)

      const res = await imports.recycleVoucherParse(formData)
      setParsedResult(res)
      setItems(res.items || [])
    } catch (err) {
      alert(`เกิดข้อผิดพลาดในการสกัดข้อมูลใบสำคัญจ่าย: ${err.message}`)
    } finally {
      setParsing(false)
    }
  }

  // Handle manual edits (preserves user entered Amount!)
  function handleItemValueChange(index, field, newValue) {
    const next = [...items]
    const current = { ...next[index], [field]: Number(newValue) || 0 }

    // Re-verify math logic cleanly
    const calc = Math.round((current.weight_kg || 0) * (current.unit_price || 0) * 100) / 100
    const diff = Math.abs(calc - current.amount)

    if (diff <= 0.50) {
      current.status = 'ready'
      current.issue = null
    } else {
      current.status = 'needs_review'
      current.issue = `จำนวนเงินไม่ตรงกับ น้ำหนัก × ราคา (ต่างกัน ${diff.toFixed(2)} บาท)`
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
        filename: file?.name || 'recycle_voucher.pdf',
        voucher_number: parsedResult?.voucher_number || 'PV2605001',
        gross_total: parsedResult?.gross_total || 0,
        items,
      }

      const res = await imports.recycleVoucherConfirm(payload)
      setSuccessMessage(res.message)
      setItems([])
      setParsedResult(null)
      setFile(null)
      setFilePreviewUrl(null)
      loadBatches()
    } catch (err) {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`)
    } finally {
      setConfirming(false)
    }
  }

  async function handleRelocateBatch(batchId, newMonth) {
    if (!newMonth) return;
    try {
      const res = await imports.batchRelocate(batchId, { target_period_month: newMonth })
      alert(`✅ ${res.message}`)
      setRelocatingId(null)
      loadBatches()
    } catch (e) {
      alert(`เกิดข้อผิดพลาดในการย้ายเดือน: ${e.message}`)
    }
  }

  const readyCount = items.filter(i => i.status === 'ready').length
  const reviewCount = items.filter(i => i.status === 'needs_review').length
  const sumAmount = items.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return (
    <>
      <PageHeader
        title="ใบสำคัญจ่าย (รีไซเคิล)"
        subtitle={`นำเข้าข้อมูลวัสดุรีไซเคิลจากไฟล์ PDF หรือรูปภาพใบสำคัญจ่าย ประจำเดือน ${thaiMonthLabel(period)}`}
      />

      <div className="page-content">
        {/* Upload Card */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">1. เลือกเดือนรายงานและอัปโหลดไฟล์ (PDF / JPG / PNG / WebP)</h3>
          </div>
          <div className="card-body">
            <div className="flex-between" style={{ gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <ThaiMonthPicker
                  label="เดือนรายงาน:"
                  value={period}
                  onChange={val => setPeriod(val)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="form-input"
                  style={{ width: 'auto' }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleParseVoucher}
                  disabled={!file || parsing}
                >
                  {parsing ? 'กำลังอ่านข้อมูล PDF / OCR...' : '🧾 สกัดข้อมูลจากใบสำคัญจ่าย'}
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

        {/* Month Mismatch Warning Alert */}
        {isMonthMismatch && (
          <div className="alert alert-warning mb-6 flex-between" style={{ background: '#fff7ed', borderColor: '#fdba74', color: '#c2410c' }}>
            <div>
              <strong>⚠️ แจ้งเตือนเดือนเอกสารไม่ตรงกัน:</strong> เอกสารใบสำคัญจ่ายนี้เป็นของเดือน <strong>{thaiMonthLabel(detectedDocMonth)}</strong> แต่คุณกำลังเลือกเดือนรายงานเป็น <strong>{thaiMonthLabel(period)}</strong>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              style={{ background: '#ea580c', color: '#ffffff', fontWeight: 'bold', border: 'none' }}
              onClick={() => setPeriod(detectedDocMonth)}
            >
              🔄 สลับเป็นเดือน {thaiMonthLabel(detectedDocMonth)} อัตโนมัติ
            </button>
          </div>
        )}

        {/* Audit Gross Total Header Banner */}
        {parsedResult && (
          <div className="alert alert-info mb-6 flex-between mb-6" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
            <div>
              <strong>🧾 เลขที่เอกสาร: {parsedResult.voucher_number}</strong> | ยอดสุทธิรวมบนเอกสาร (Gross Total): <strong>฿{parsedResult.gross_total?.toLocaleString('th-TH')}</strong>
            </div>
            <div>
              <span className={`badge ${parsedResult.gross_total_valid ? 'badge-green' : 'badge-yellow'}`}>
                {parsedResult.gross_total_valid ? '✓ ตรวจสอบยอดสุทธิผ่าน' : '⚠️ ยอดรวมต่างจากเอกสาร'}
              </span>
            </div>
          </div>
        )}

        {/* Side-by-side Preview Container */}
        {filePreviewUrl && items.length > 0 && (
          <div className="grid-2 mb-6" style={{ gap: 'var(--space-6)', alignItems: 'start' }}>
            {/* Left: PDF or Image Viewer */}
            <div className="card">
              <div className="card-header flex-between">
                <h3 className="card-title">📄 เอกสารต้นฉบับ ({isPdf ? 'PDF File' : 'Image File'})</h3>
                <span className="badge badge-gray">{file?.name}</span>
              </div>
              <div className="card-body" style={{ textAlign: 'center', background: '#0f172a', padding: 'var(--space-4)', minHeight: 480 }}>
                {isPdf ? (
                  <iframe
                    src={filePreviewUrl}
                    title="PDF Viewer"
                    style={{ width: '100%', height: 480, border: 'none', borderRadius: 'var(--radius-md)' }}
                  />
                ) : (
                  <img
                    src={filePreviewUrl}
                    alt="ภาพถ่ายใบสำคัญจ่าย"
                    style={{ maxWidth: '100%', maxHeight: 480, borderRadius: 'var(--radius-md)', objectFit: 'contain' }}
                  />
                )}
              </div>
            </div>

            {/* Right: Editable Items Table */}
            <div className="card">
              <div className="card-header flex-between">
                <div>
                  <h3 className="card-title">📋 สรุปรายการขยะรีไซเคิล</h3>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: 4 }}>
                    รองรับ 2 เกรดราคาอัตโนมัติ (เช่น พลาสติกรวม 3.50 บาท vs พลาสติกรวม อีกราคา 2.00 บาท)
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
                        <th>รายการวัสดุ</th>
                        <th>หมวดหมู่ (Master Category)</th>
                        <th className="table-num">น้ำหนัก (กก.)</th>
                        <th className="table-num">ราคา (บาท/กก.)</th>
                        <th className="table-num">จำนวนเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} style={{ background: item.category_code.endsWith('_2nd') ? '#f0fdf4' : undefined }}>
                          <td>
                            <strong>{item.material_name}</strong>
                            {item.category_code.endsWith('_2nd') && (
                              <span className="badge badge-purple" style={{ marginLeft: 6, fontSize: 10 }}>
                                อีกราคา
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-blue">{item.category_code}</span>
                          </td>
                          <td className="table-num">
                            <input
                              type="number"
                              step="0.01"
                              className="form-input form-input-sm table-num-input"
                              style={{ width: 85 }}
                              value={item.weight_kg}
                              onChange={e => handleItemValueChange(idx, 'weight_kg', e.target.value)}
                            />
                          </td>
                          <td className="table-num">
                            <input
                              type="number"
                              step="0.01"
                              className="form-input form-input-sm table-num-input"
                              style={{ width: 75 }}
                              value={item.unit_price}
                              onChange={e => handleItemValueChange(idx, 'unit_price', e.target.value)}
                            />
                          </td>
                          <td className="table-num">
                            <input
                              type="number"
                              step="0.01"
                              className="form-input form-input-sm table-num-input"
                              style={{ width: 95 }}
                              value={item.amount}
                              onChange={e => handleItemValueChange(idx, 'amount', e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card-footer flex-between" style={{ padding: 'var(--space-4)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>
                      รวมยอดเงินที่สกัดได้: ฿{sumAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmImport}
                    disabled={confirming || reviewCount > 0}
                  >
                    {confirming ? 'กำลังบันทึกข้อมูล...' : `✅ ยืนยันบันทึกเข้าเดือน [${thaiMonthLabel(period)}] (${readyCount} รายการ)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Batch Import History & Relocation Tool */}
        <div className="card mt-6">
          <div className="card-header flex-between">
            <div>
              <h3 className="card-title">📜 ประวัติชุดนำเข้าข้อมูล & เครื่องมือย้ายเดือน (Batch Relocation Tool)</h3>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)', marginTop: 2 }}>
                หากบันทึกผิดเดือน สามารถกดปุ่ม "🔄 ย้ายเดือน" เพื่อเปลี่ยนเดือนประจำรายงานได้ทันทีใน 1 คลิก
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>วันเวลาบันทึก</th>
                    <th>ประเภทเอกสาร</th>
                    <th>ชื่อไฟล์</th>
                    <th>เดือนรายงาน</th>
                    <th>จำนวนรายการ</th>
                    <th>สถานะ</th>
                    <th className="text-center">เครื่องมือจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-secondary">
                        ยังไม่มีประวัติการนำเข้าข้อมูล
                      </td>
                    </tr>
                  ) : (
                    batches.map(b => (
                      <tr key={b.id}>
                        <td>{new Date(b.created_at).toLocaleString('th-TH')}</td>
                        <td>
                          <span className="badge badge-blue">{b.source_type}</span>
                        </td>
                        <td><strong>{b.original_filename}</strong></td>
                        <td>
                          <span className="badge badge-green" style={{ fontSize: 'var(--text-xs)' }}>
                            📅 {thaiMonthLabel(b.period_month)}
                          </span>
                        </td>
                        <td>{b.row_count_committed || b.row_count_preview} รายการ</td>
                        <td>
                          <span className={`badge ${b.status === 'committed' ? 'badge-green' : b.status === 'rolled_back' ? 'badge-gray' : 'badge-yellow'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="text-center">
                          {b.status === 'committed' && (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                              {relocatingId === b.id ? (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                  <ThaiMonthPicker
                                    value={targetRelocateMonth || b.period_month}
                                    onChange={val => setTargetRelocateMonth(val)}
                                    alignRight={true}
                                  />
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleRelocateBatch(b.id, targetRelocateMonth || b.period_month)}
                                    style={{ whiteSpace: 'nowrap' }}
                                  >
                                    บันทึกย้าย
                                  </button>
                                  <button
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => setRelocatingId(null)}
                                    style={{ whiteSpace: 'nowrap' }}
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  style={{ color: '#d97706', borderColor: '#fcd34d' }}
                                  onClick={() => {
                                    setRelocatingId(b.id)
                                    setTargetRelocateMonth(b.period_month)
                                  }}
                                >
                                  🔄 ย้ายเดือน
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
