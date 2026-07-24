import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { users } from '../../api/index.js'
import PageHeader from '../../components/layout/PageHeader.jsx'

export const Route = createFileRoute('/settings/users')({
  component: UsersPage,
})

export function UsersPage() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState('viewer')
  const [successMessage, setSuccessMessage] = useState(null)

  // Fetch Users
  const { data: usersRes, isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => users.list(),
  })

  // Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: (body) => users.create(body),
    onSuccess: () => {
      setSuccessMessage('เพิ่มผู้ใช้ใหม่เรียบร้อยแล้ว')
      setShowAddModal(false)
      setEmail('')
      setDisplayName('')
      setRole('viewer')
      queryClient.invalidateQueries({ queryKey: ['users-list'] })
    },
    onError: (err) => alert(`เกิดข้อผิดพลาดในการสร้างผู้ใช้: ${err.message}`),
  })

  // Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }) => users.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] })
    },
    onError: (err) => alert(`เกิดข้อผิดพลาดในการอัปเดต: ${err.message}`),
  })

  const userList = usersRes?.data || []

  function getRoleBadge(roleKey) {
    switch (roleKey) {
      case 'owner':
        return <span className="badge badge-purple">Owner (ผู้ดูแลสูงสุด)</span>
      case 'admin':
        return <span className="badge badge-blue">Admin (ผู้ดูแลระบบ)</span>
      case 'editor':
        return <span className="badge badge-green">Editor (แก้ไขข้อมูล)</span>
      default:
        return <span className="badge badge-gray">Viewer (ดูเท่านั้น)</span>
    }
  }

  return (
    <>
      <PageHeader
        title="ผู้ใช้และสิทธิ์การใช้งาน (Users & Roles)"
        subtitle="จัดการรายชื่อผู้ใช้งาน ระดับสิทธิ์ และการเข้าถึงระบบ CKAP System v4"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            ➕ เพิ่มผู้ใช้ใหม่
          </button>
        }
      />

      <div className="page-content">
        {successMessage && (
          <div className="alert alert-success mb-6">
            ✅ {successMessage}
          </div>
        )}

        <div className="grid-2 mb-6" style={{ gap: 'var(--space-6)', alignItems: 'start' }}>
          {/* User List Table Card */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="card-header flex-between">
              <h3 className="card-title">👥 รายชื่อผู้ใช้ทั้งหมดในระบบ</h3>
              <span className="badge badge-gray">ทั้งหมด {userList.length} คน</span>
            </div>

            <div className="card-body" style={{ padding: 0 }}>
              {isLoading ? (
                <div className="page-loading" style={{ minHeight: 200 }}>
                  <span className="spinner spinner-lg" />
                  <span>กำลังโหลดรายชื่อผู้ใช้...</span>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ชื่อผู้ใช้งาน (Display Name)</th>
                        <th>ระดับสิทธิ์ (Role)</th>
                        <th style={{ textAlign: 'center' }}>สถานะการใช้งาน</th>
                        <th>วันที่ลงทะเบียน</th>
                        <th style={{ textAlign: 'right' }}>จัดการสิทธิ์</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userList.map(u => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.display_name}</strong>
                          </td>
                          <td>{getRoleBadge(u.role)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${u.active ? 'badge-green' : 'badge-red'}`}>
                              {u.active ? 'เปิดใช้งาน' : 'ระงับใช้งาน'}
                            </span>
                          </td>
                          <td style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                            {new Date(u.created_at).toLocaleDateString('th-TH')}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <select
                              className="form-select form-select-sm"
                              style={{ width: 'auto', display: 'inline-block' }}
                              value={u.role}
                              disabled={u.role === 'owner'}
                              onChange={e => {
                                updateUserMutation.mutate({
                                  id: u.id,
                                  updates: { role: e.target.value },
                                })
                              }}
                            >
                              <option value="owner">Owner</option>
                              <option value="admin">Admin</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
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

        {/* Create User Modal */}
        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div className="card" style={{ width: 480, maxWidth: '90%' }}>
              <div className="card-header flex-between">
                <h3 className="card-title">➕ เพิ่มผู้ใช้ใหม่</h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowAddModal(false)}
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault()
                  createUserMutation.mutate({ email, display_name: displayName, role })
                }}
              >
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div>
                    <label className="form-label">อีเมลผู้ใช้งาน (Email):</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>

                  <div>
                    <label className="form-label">ชื่อที่แสดง (Display Name):</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="สมชาย ใจดี"
                    />
                  </div>

                  <div>
                    <label className="form-label">ระดับสิทธิ์ (Role):</label>
                    <select
                      className="form-select"
                      value={role}
                      onChange={e => setRole(e.target.value)}
                    >
                      <option value="viewer">Viewer (ดูได้อย่างเดียว)</option>
                      <option value="editor">Editor (บันทึก/แก้ไขข้อมูล)</option>
                      <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                    </select>
                  </div>
                </div>

                <div className="card-footer flex-between">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? 'กำลังบันทึก...' : 'บันทึกผู้ใช้'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
