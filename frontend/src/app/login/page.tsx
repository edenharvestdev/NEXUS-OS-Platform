'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/users'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      setError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 800))
    const result = login(form.username, form.password)
    if (result.success) {
      router.push('/dashboard')
    } else {
      setError(result.error || 'เกิดข้อผิดพลาด')
      setLoading(false)
    }
  }

  const demoUsers = [
    { label: 'CEO', username: 'admin@autosoft.com', password: 'admin1234', color: '#C4956A' },
    { label: 'HR', username: 'hr@autosoft.com', password: 'hr1234', color: '#6B8E6E' },
    { label: 'Finance', username: 'finance@autosoft.com', password: 'finance1234', color: '#3498DB' },
    { label: 'Sales', username: 'sales@autosoft.com', password: 'sales1234', color: '#9B59B6' },
    { label: 'Staff', username: 'staff@autosoft.com', password: 'staff1234', color: '#E67E22' },
  ]

  const C = {
    bg: '#0F0A06', bg2: '#150E08', bg3: '#1C1209',
    surface: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
    border2: 'rgba(255,255,255,0.14)',
    gold: '#C4956A', gold2: '#8B6F47',
    text: 'rgba(255,255,255,0.92)',
    text2: 'rgba(255,255,255,0.65)',
    text3: 'rgba(255,255,255,0.35)',
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: 'Montserrat, sans-serif',
    }}>
      {/* Glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(196,149,106,0.08), transparent 70%)',
        pointerEvents: 'none',
      }}/>

      <div style={{
        width: '100%', maxWidth: 440,
        background: C.bg2,
        border: `1px solid ${C.border2}`,
        borderRadius: 24, padding: '40px 36px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.5s ease',
        position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #C4956A, #8B6F47)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: '#fff',
            boxShadow: '0 8px 24px rgba(196,149,106,0.3)',
          }}>A</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>
            Auto<span style={{ color: C.gold }}>soft</span>
          </div>
          <div style={{ fontSize: 13, color: C.text3, marginTop: 4 }}>
            เข้าสู่ระบบเพื่อจัดการทั้งองค์กร
          </div>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.text3, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Email / Username
            </label>
            <input
              placeholder="admin@autosoft.com"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${C.border2}`,
                borderRadius: 12, color: C.text,
                fontFamily: 'Montserrat', fontSize: 13, outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.gold}20` }}
              onBlur={e => { e.target.style.borderColor = C.border2; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.text3, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{
                  width: '100%', padding: '12px 44px 12px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${C.border2}`,
                  borderRadius: 12, color: C.text,
                  fontFamily: 'Montserrat', fontSize: 13, outline: 'none',
                }}
                onFocus={e => { e.target.style.borderColor = C.gold; e.target.style.boxShadow = `0 0 0 3px ${C.gold}20` }}
                onBlur={e => { e.target.style.borderColor = C.border2; e.target.style.boxShadow = 'none' }}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: C.text3, fontSize: 12,
                }}
              >{showPass ? '🙈' : '👁️'}</button>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 12, color: '#E74C3C', textAlign: 'center',
            }}>{error}</div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? 'rgba(196,149,106,0.5)' : 'linear-gradient(135deg, #C4956A, #8B6F47)',
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Montserrat',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(196,149,106,0.4)',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> กำลังเข้าสู่ระบบ...</>
            ) : 'เข้าสู่ระบบ →'}
          </button>
        </div>

        {/* Demo users */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.text3, textAlign: 'center', marginBottom: 12, letterSpacing: 1 }}>
            DEMO ACCOUNTS
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {demoUsers.map(u => (
              <button
                key={u.label}
                onClick={() => setForm({ username: u.username, password: u.password })}
                style={{
                  padding: '6px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                  background: `${u.color}18`, border: `1px solid ${u.color}44`,
                  color: u.color, cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'Montserrat',
                }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = `${u.color}30` }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = `${u.color}18` }}
              >{u.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
