import { useState, useEffect } from 'react'
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

  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'theme-central-gold'
  })

  useEffect(() => {
    document.body.className = currentTheme
    localStorage.setItem('app-theme', currentTheme)
  }, [currentTheme])

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
      {/* Logo Header */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
        <div
          className="sidebar-logo-mark"
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1.5px solid #d4af37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
            boxShadow: '0 4px 14px rgba(212, 175, 55, 0.25)',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <img
            src="/central-krabi-logo.png"
            alt="Central Krabi Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none'
              if (e.target.parentNode) e.target.parentNode.innerText = 'CK'
            }}
          />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title" style={{ fontWeight: 800, fontSize: '15px', color: '#ffffff', letterSpacing: '0.3px', lineHeight: 1.2 }}>
            CENTRAL <span style={{ background: 'linear-gradient(135deg, #AA7C11 0%, #D4AF37 50%, #F3E7C4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>KRABI</span>
          </div>
          <div className="sidebar-logo-sub" style={{ fontSize: '11px', color: 'var(--gray-400)', fontWeight: 600, marginTop: 2 }}>
            CKAP v4 | ศูนย์คัดแยกกระบี่
          </div>
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

      {/* Footer — Theme selector + user info + logout */}
      <div className="sidebar-footer">
        <div style={{ padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-2)' }}>
          <label style={{ fontSize: '10px', color: 'var(--gray-400)', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>
            🎨 เลือกธีมระบบ
          </label>
          <select
            value={currentTheme}
            onChange={e => setCurrentTheme(e.target.value)}
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgb(255 255 255 / 0.1)',
              color: '#ffffff',
              border: '1px solid rgb(255 255 255 / 0.2)',
              cursor: 'pointer',
            }}
          >
            <option value="theme-central-gold" style={{ color: '#000' }}>👑 Central Gold (สีทองสแคลด์)</option>
            <option value="theme-gold-mint" style={{ color: '#000' }}>🌿 Gold Mint (มิ้นท์ทอง)</option>
            <option value="theme-krabi-coastal" style={{ color: '#000' }}>🌊 Krabi Coastal (ฟ้าครามกระบี่)</option>
            <option value="theme-andaman-prism" style={{ color: '#000' }}>🔮 Andaman Prism (ม่วงอันดามัน)</option>
          </select>
        </div>

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
