import { Outlet, Navigate, useLocation } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth.js'
import Sidebar from '../components/layout/Sidebar.jsx'

export function RootLayout() {
  const { data: user, isLoading, isError } = useAuth()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login' || location.pathname === '/set-password'

  if (isLoginPage) return <Outlet />

  if (isLoading) {
    return (
      <div className="page-loading" style={{ minHeight: '100vh' }}>
        <span className="spinner spinner-lg" />
        <span>กำลังโหลดระบบ...</span>
      </div>
    )
  }

  // Unauthenticated — redirect to login cleanly without page refresh loop
  if (!user || isError) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="app-shell">
      <Sidebar user={user} />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
