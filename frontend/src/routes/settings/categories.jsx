import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { dashboard } from '../../api/index.js'
import PageHeader from '../../components/layout/PageHeader.jsx'

export const Route = createFileRoute('/settings/categories')({
  component: CategoriesPage,
})

export function CategoriesPage() {
  const { data: categoriesRes, isLoading } = useQuery({
    queryKey: ['master-categories'],
    queryFn: () => dashboard.categories(),
  })

  const categories = categoriesRes?.data || [
    { module: 'rdf', code: 'rdf_general', name_th: 'ขยะ RDF', unit: 'กก.', color: '#3b82f6' },
    { module: 'dog_food', code: 'df_general', name_th: 'อาหารสุนัข', unit: 'กก.', color: '#f59e0b' },
    { module: 'pig_feed', code: 'pf_general', name_th: 'อาหารหมู', unit: 'กก./วัน', color: '#8b5cf6' },
    { module: 'black_bag', code: 'black_bag_large', name_th: 'ถุงใหญ่ 30×40 สีดำ', unit: 'ใบ', color: '#1f2937' },
    { module: 'black_bag', code: 'black_bag_medium', name_th: 'ถุงกลาง 28×36 สีชา', unit: 'ใบ', color: '#92400e' },
    { module: 'black_bag', code: 'black_bag_small', name_th: 'ถุงเล็ก 18×20 สีดำ', unit: 'ใบ', color: '#374151' },
    { module: 'consumable', code: 'consumable_foam_soap', name_th: 'สบู่โฟม', unit: 'แกลลอน', color: '#0ea5e9' },
    { module: 'consumable', code: 'consumable_seat_cleaner', name_th: 'น้ำยาเช็ดฝาโถ', unit: 'แกลลอน', color: '#06b6d4' },
    { module: 'tissue', code: 'tissue_roll', name_th: 'กระดาษทิชชู่ ม้วน', unit: 'ม้วน', color: '#10b981' },
    { module: 'tissue', code: 'tissue_hand', name_th: 'กระดาษทิชชู่ เช็ดมือ', unit: 'แพ็ค', color: '#059669' },
    { module: 'tissue', code: 'tissue_popup', name_th: 'กระดาษทิชชู่ ป๊อปอัพ', unit: 'แพ็ค', color: '#047857' },
    { module: 'recycle', code: 'rc_brown_paper', name_th: 'กระดาษน้ำตาล', unit: 'กก.', color: '#b45309' },
    { module: 'recycle', code: 'rc_jap_jua', name_th: 'กระดาษจับจั้ว', unit: 'กก.', color: '#d97706' },
    { module: 'recycle', code: 'rc_tin_can', name_th: 'สังกะสีกระป๋อง', unit: 'กก.', color: '#64748b' },
    { module: 'recycle', code: 'rc_tin_can_2nd', name_th: 'สังกะสีกระป๋อง อีกราคา', unit: 'กก.', color: '#475569' },
    { module: 'recycle', code: 'rc_pet', name_th: 'PET', unit: 'กก.', color: '#0284c7' },
    { module: 'recycle', code: 'rc_plastic_mixed', name_th: 'พลาสติกรวม', unit: 'กก.', color: '#16a34a' },
    { module: 'recycle', code: 'rc_plastic_mixed_2nd', name_th: 'พลาสติกรวม อีกราคา', unit: 'กก.', color: '#15803d' },
    { module: 'recycle', code: 'rc_alu_coke', name_th: 'อลู-โค๊ก', unit: 'กก.', color: '#eab308' },
    { module: 'recycle', code: 'rc_glass_mixed', name_th: 'แก้ว-รวมสี', unit: 'กก.', color: '#2563eb' },
  ]

  return (
    <>
      <PageHeader
        title="หมวดหมู่ขยะและทรัพยากร (Master Categories)"
        subtitle="ตรวจสอบรายชื่อหมวดหมู่ย่อย สีประจำหมวดหมู่ และหน่วยวัดมาตรฐานของทั้ง 8 โมดูล"
      />

      <div className="page-content">
        <div className="card">
          <div className="card-header flex-between">
            <h3 className="card-title">🏷️ รายชื่อหมวดหมู่ย่อยมาตรฐาน (Master Categories)</h3>
            <span className="badge badge-gray">ทั้งหมด {categories.length} รายการ</span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {isLoading ? (
              <div className="page-loading" style={{ minHeight: 200 }}>
                <span className="spinner spinner-lg" />
                <span>กำลังโหลดหมวดหมู่ข้อมูล...</span>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>โมดูลหลัก</th>
                      <th>รหัสหมวดหมู่ (Code)</th>
                      <th>ชื่อหมวดหมู่ (Thai Name)</th>
                      <th style={{ textAlign: 'center' }}>หน่วยวัด (Unit)</th>
                      <th style={{ textAlign: 'center' }}>สีประจำหมวด</th>
                      <th style={{ textAlign: 'center' }}>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className="badge badge-blue">{c.module}</span>
                        </td>
                        <td>
                          <code>{c.code}</code>
                        </td>
                        <td>
                          <strong>{c.name_th}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>{c.unit}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              background: c.color,
                              border: '1px solid #cbd5e1',
                              verticalAlign: 'middle',
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-green">เปิดใช้งาน</span>
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
