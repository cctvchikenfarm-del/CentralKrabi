import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { imports } from '../../api/index.js'
import PageHeader from '../../components/layout/PageHeader.jsx'

export const Route = createFileRoute('/imports/excel')({
  component: ExcelImportPage,
})

export function ExcelImportPage() {
  const queryClient = useQueryClient()
  const [successMessage, setSuccessMessage] = useState(null)

  // Query Batch History
  const { data: batchData, isLoading } = useQuery({
    queryKey: ['import-batches'],
    queryFn: () => imports.batchList(),
  })

  // Rollback Mutation
  const rollbackMutation = useMutation({
    mutationFn: (id) => imports.batchRollback(id),
    onSuccess: (res) => {
      setSuccessMessage(res.message)
      queryClient.invalidateQueries({ queryKey: ['import-batches'] })
    },
    onError: (err) => alert(`เกิดข้อผิดพลาดในการย้อนกลับ: ${err.message}`),
  })

  const batches = batchData?.batches || []

  return (
    <>
      <PageHeader
        title="นำเข้าไฟล์ Excel & ประวัติชุดนำเข้า (Batch History)"
        subtitle="ตรวจสอบประวัติชุดข้อมูลนำเข้าและกดย้อนกลับ (Rollback) ข้อมูลทั้งชุดได้อย่างปลอดภัย"
      />

      <div className="page-content">
        {successMessage && (
          <div className="alert alert-success mb-6">
            ✅ {successMessage}
          </div>
        )}

        <div className="card">
          <div className="card-header flex-between">
            <h3 className="card-title">📜 ประวัติชุดนำเข้าข้อมูลย้อนหลัง (Import Batches)</h3>
            <span className="badge badge-gray">ทั้งหมด {batches.length} ชุด</span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {isLoading ? (
              <div className="page-loading" style={{ minHeight: 200 }}>
                <span className="spinner spinner-lg" />
                <span>กำลังโหลดประวัติชุดนำเข้า...</span>
              </div>
            ) : batches.length === 0 ? (
              <div className="table-empty" style={{ padding: 'var(--space-8)' }}>
                ไม่มีประวัติชุดนำเข้าข้อมูลในระบบ
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>วันที่นำเข้า</th>
                      <th>ประเภทเอกสาร (Source Type)</th>
                      <th>ชื่อไฟล์เดิม</th>
                      <th>เดือนรายงาน</th>
                      <th className="table-num">จำนวนแถว</th>
                      <th style={{ textAlign: 'center' }}>สถานะ</th>
                      <th style={{ textAlign: 'right' }}>การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontSize: 'var(--text-xs)' }}>
                          {new Date(b.created_at).toLocaleString('th-TH')}
                        </td>
                        <td>
                          <strong>{b.source_type}</strong>
                        </td>
                        <td>{b.original_filename || '—'}</td>
                        <td>{b.period_month || '—'}</td>
                        <td className="table-num">{b.row_count_committed || b.row_count_preview || 0}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${
                            b.status === 'committed' ? 'badge-green' :
                            b.status === 'rolled_back' ? 'badge-red' : 'badge-yellow'
                          }`}>
                            {b.status === 'committed' ? 'บันทึกแล้ว' :
                             b.status === 'rolled_back' ? 'ย้อนกลับแล้ว' : b.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {b.status === 'committed' && (
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => {
                                if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการย้อนกลับชุดข้อมูลนำเข้านี้? (${b.original_filename})`)) {
                                  rollbackMutation.mutate(b.id)
                                }
                              }}
                              disabled={rollbackMutation.isPending}
                            >
                              ↩️ ย้อนกลับทั้งชุด
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
