import { Link, useLocation } from '@tanstack/react-router'
import { useLogout } from '../../hooks/useAuth.js'

const NAV = [
  {
    section: 'หลัก',
    items: [
      { to: '/dashboard',   label: 'แดชบอร์ด',       icon: '📊', perm: 'dashboard.read' },
      { to: '/data-entry',  label: 'บันทึกข้อมูล',    icon: '📝', perm: 'entries.read' },
      { to: '/ledger',      label: 'รายงานรายปี',     icon: '📋', perm: 'entries.read' },
      { to: '/analytics',   label: 'วิเคราะห์ข้อมูล', icon: '📈', perm: 'charts.read' },
      { to: '/export',      label: 'ส่งออก PPT',      icon: '📤', perm: 'reports.preview' },
    ],
  },
  {
    section: 'นำเข้าข้อมูล',
    items: [
      { to: '/imports/daily-handwritten', label: 'ใบบันทึกรายวัน (แบบลายมือ)', icon: '📝', perm: 'entries.import' },
      { to: '/imports/recycle-voucher',   label: 'ใบสำคัญจ่าย (รีไซเคิล)',    icon: '🧾', perm: 'entries.import' },
    ],
  },
  {
    section: 'ระบบ',
    items: [
      { to: '/settings/users',      label: 'ผู้ใช้และสิทธิ์',   icon: '👥', perm: 'users.read' },
      { to: '/settings/categories', label: 'หมวดหมู่',           icon: '🏷️', perm: 'settings.manage' },
    ],
  },
]

export default function Sidebar({ user }) {
  const location = useLocation()
  const logout = useLogout()

  function isActive(to) {
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  function canSee(perm) {
    if (!user) return false
    if (user.role === 'owner') return true
    return user.permissions?.includes(perm) ?? false
  }

  return (
    <aside className="sidebar" id="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">CK</div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">CKAP v4</div>
          <div className="sidebar-logo-sub">ศูนย์คัดแยกกระบี่</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="เมนูหลัก">
        {NAV.map(group => {
          const visible = group.items.filter(item => canSee(item.perm))
          if (!visible.length) return null

          return (
            <div key={group.section}>
              <div className="sidebar-section-label">{group.section}</div>
              {visible.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`sidebar-item${isActive(item.to) ? ' active' : ''}`}
                  aria-current={isActive(item.to) ? 'page' : undefined}
                >
                  <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                  <span className="sidebar-item-text">{item.label}</span>
                </Link>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer — user info + logout */}
      <div className="sidebar-footer">
        {user && (
          <div
            style={{
              padding: 'var(--space-2) var(--space-3)',
              marginBottom: 'var(--space-1)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--fw-semibold)',
                color: 'var(--gray-100)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.display_name}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
              {user.role}
            </div>
          </div>
        )}
        <button
          className="sidebar-item"
          style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }}
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <span className="sidebar-icon" aria-hidden="true">🚪</span>
          <span className="sidebar-item-text">
            {logout.isPending ? 'กำลังออก...' : 'ออกจากระบบ'}
          </span>
        </button>
      </div>
    </aside>
  )
}
