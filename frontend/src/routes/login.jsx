import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { auth } from '../api/index.js'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

export function LoginPage() {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const loginMutation = useMutation({
    mutationFn: () => auth.login(email, password),
    onSuccess: (res) => {
      if (res?.access_token) {
        localStorage.setItem('access_token', res.access_token)
      }
      qc.invalidateQueries({ queryKey: ['me'] })
      window.location.href = '/dashboard'
    },
    onError: (err) => {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ')
    },
  })

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) return setError('กรุณากรอกอีเมลและรหัสผ่าน')
    loginMutation.mutate()
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo Header */}
        <div className="login-logo" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              border: '2px solid #d4af37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 3,
              boxShadow: '0 6px 20px rgba(212, 175, 55, 0.3)',
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
          <div>
            <div style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a', letterSpacing: '0.3px', lineHeight: 1.2 }}>
              CENTRAL <span style={{ background: 'linear-gradient(135deg, #AA7C11 0%, #D4AF37 50%, #B8924B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>KRABI</span>
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              ศูนย์คัดแยกขยะกระบี่ (CKAP v4)
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--fw-bold)', marginBottom: 'var(--space-2)' }}>
          เข้าสู่ระบบ
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          ระบบจัดการข้อมูลสมรรถนะการดำเนินงาน
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label htmlFor="email" className="form-label form-label-required">อีเมล</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loginMutation.isPending}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label form-label-required">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loginMutation.isPending}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loginMutation.isPending}
            style={{ marginTop: 'var(--space-2)', width: '100%' }}
          >
            {loginMutation.isPending ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> กำลังเข้าสู่ระบบ...</>
            ) : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-5)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          CKAP v4.0 — ระบบปฏิบัติการภายใน
        </p>
      </div>
    </div>
  )
}
