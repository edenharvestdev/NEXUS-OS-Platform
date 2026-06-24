'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Sun, Moon, Languages, Cpu, Shield, Zap } from 'lucide-react'
import { login, register } from '@/lib/users'
import { getPostLoginRoute } from '@/lib/rbac'
import { api } from '@/lib/api'
import { useAppData } from '@/lib/data'
import { useApp } from '@/lib/theme'
import AnimatedBackground from '@/components/AnimatedBackground'

const FEATURES = [
  { Icon: Cpu,    titleKey: 'feat.ai_title',    subKey: 'feat.ai_sub',    dot: '#C4956A' },
  { Icon: Shield, titleKey: 'feat.sec_title',   subKey: 'feat.sec_sub',   dot: '#4CAF7D' },
  { Icon: Zap,    titleKey: 'feat.setup_title', subKey: 'feat.setup_sub', dot: '#4A9EDB' },
]

// ── Pill Toggle ────────────────────────────────────────────────────
function PillToggle({ labelA, labelB, active, onToggle, C }: {
  labelA: string; labelB: string; active: 'a' | 'b'; onToggle: () => void; C: any
}) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', borderRadius: 99, overflow: 'hidden',
      border: `1px solid ${C.border2}`, cursor: 'pointer', background: 'transparent', padding: 2,
      backdropFilter: 'blur(10px)',
    }}>
      {[{ l: labelA, k: 'a' }, { l: labelB, k: 'b' }].map(({ l, k }) => (
        <span key={k} style={{
          padding: '6px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: active === k ? C.gold : 'transparent',
          color: active === k ? '#fff' : C.text, transition: 'all 0.2s', fontFamily: 'Montserrat',
        }}>{l}</span>
      ))}
    </button>
  )
}

// ── Input ──────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, onKeyDown, C }: {
  label?: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; onKeyDown?: (e: React.KeyboardEvent) => void; C: any
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, display: 'block', marginBottom: 8, letterSpacing: 0.5 }}>{label}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '14px 16px', boxSizing: 'border-box',
          background: focused ? C.surface2 : C.surface, 
          borderRadius: 12, color: C.text,
          fontFamily: 'Montserrat', fontSize: 14, outline: 'none',
          border: `1px solid ${focused ? C.gold : C.border2}`,
          boxShadow: focused ? `0 0 0 3px ${C.gold}20` : 'inset 0 2px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s',
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { theme, lang, toggleTheme, toggleLang, t, colors: C } = useApp()

  const { refresh } = useAppData()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [supEmail, setSupEmail] = useState('')
  const [supPass, setSupPass] = useState('')
  const [upLoading, setUpLoading] = useState(false)

  const handleSignIn = async () => {
    if (!email || !password) { setError(lang === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill all fields'); return }
    setLoading(true); setError('')
    const result = await login(email, password)
    if (result.success) {
      await refresh()
      let dest = getPostLoginRoute(result.user?.role)
      try {
        const ob = await api.getOnboarding()
        dest = getPostLoginRoute(result.user?.role, ob)
      } catch { /* use default */ }
      router.push(dest)
    } else {
      setError(result.error || 'เข้าสู่ระบบไม่ได้')
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    if (!name || !supEmail || !company || !supPass) {
      setError(lang === 'th' ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill all fields')
      return
    }
    setUpLoading(true); setError('')
    const result = await register(supEmail, supPass, name, company)
    setUpLoading(false)
    if (result.success) {
      setTab('signin')
      setEmail(supEmail)
      setError('')
    } else {
      setError(result.error || 'สมัครสมาชิกไม่ได้')
    }
  }


  const goldBtn: React.CSSProperties = {
    width: '100%', padding: '16px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #C4956A, #8B6F47)', color: '#fff',
    fontSize: 15, fontWeight: 800, fontFamily: 'Montserrat',
    boxShadow: '0 8px 24px rgba(196,149,106,0.3)', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }

  return (
    <div className="login-shell perspective-container" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      
      {/* 3D Animated Background is now globally applied via AppProvider */}

      {/* Top Controls (floating) */}
      <div className="login-controls">
        <PillToggle labelA="TH" labelB="EN" active={lang === 'th' ? 'a' : 'b'} onToggle={toggleLang} C={C} />
        <button onClick={toggleTheme} style={{
          width: 40, height: 40, borderRadius: 99, border: `1px solid ${C.border2}`,
          background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold,
          backdropFilter: 'blur(10px)', transition: 'all 0.2s',
        }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* ══ LEFT ══════════════════════════════════════════════════ */}
      <div className="login-hero">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, animation: 'slideInL 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #C4956A, #8B6F47)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', boxShadow: '0 8px 24px rgba(196,149,106,0.3)' }}>N</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: 2 }}>NEXUS OS</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: 3, marginTop: 2 }}>{t('login.tagline')}</div>
          </div>
        </div>

        {/* Hero */}
        <div style={{ animation: 'slideInL 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s both' }}>
          <div className="login-hero-title" style={{ fontSize: 48, fontWeight: 900, color: C.text, lineHeight: 1.15, marginBottom: 16, letterSpacing: -1 }}>
            {t('login.hero1')}<br />
            <span style={{ color: C.gold, textShadow: `0 0 40px ${C.gold}44` }}>{t('login.hero2').replace('ด้วย ', '').includes('AI') ? <>ด้วย <span>AI</span> อัจฉริยะ</> : t('login.hero2')}</span>
          </div>
          <div style={{ fontSize: 16, color: C.text2, lineHeight: 1.6, maxWidth: 460, fontWeight: 500 }}>{t('login.desc')}</div>
        </div>

        {/* Feature cards */}
        <div className="login-features" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {FEATURES.map(({ Icon, titleKey, subKey, dot }, i) => (
            <div key={i} className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 16, animation: `slideInL 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) ${0.2 + i * 0.1}s both`, transition: 'transform 0.3s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateX(10px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'translateX(0)')}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${dot}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} style={{ color: dot }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t(titleKey)}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text3, marginTop: 4 }}>{t(subKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Separator ── */}
      <div className="login-separator" style={{ background: `linear-gradient(to bottom, transparent, ${C.border2}, transparent)` }} />

      {/* ══ RIGHT ═════════════════════════════════════════════════ */}
      <div className="login-form-col">
        
        {/* Floating 3D Glass Form Container */}
        <div className="glass-panel rotate-3d-hover login-form-card" style={{ 
            width: '100%', maxWidth: 440, padding: 40, borderRadius: 32,
            animation: 'fadeUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s both',
        }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 4, background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 14, padding: 4, marginBottom: 32 }}>
            {(['signin', 'signup'] as const).map(tabId => (
              <button key={tabId} onClick={() => setTab(tabId)} style={{
                flex: 1, padding: '12px 8px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Montserrat',
                background: tab === tabId ? `linear-gradient(135deg, rgba(196,149,106,0.25), rgba(139,111,71,0.2))` : 'transparent',
                color: tab === tabId ? C.gold : C.text3,
                border: tab === tabId ? `1px solid ${C.gold}44` : '1px solid transparent',
              }}>
                {t(tabId === 'signin' ? 'login.tab_in' : 'login.tab_up')}
              </button>
            ))}
          </div>

          {/* ── SIGN IN ── */}
          {tab === 'signin' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>{t('login.welcome')}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text3, marginTop: 6 }}>{t('login.sub')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <Field label={t('login.email')} value={email} onChange={setEmail} placeholder="your@company.com" onKeyDown={e => e.key === 'Enter' && handleSignIn()} C={C} />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: C.text3, letterSpacing: 0.5 }}>{t('login.password')}</label>
                    <button style={{ background: 'none', border: 'none', color: C.gold, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Montserrat', padding: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>{t('login.forgot')}</button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Field type={showPass ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSignIn()} C={C} />
                    <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.text3, display: 'flex', transition: 'color 0.2s' }} onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.text3)}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', marginTop: 4 }}>
                  <div onClick={() => setRemember(!remember)} style={{ width: 18, height: 18, borderRadius: 6, border: `1.5px solid ${remember ? C.gold : C.border2}`, background: remember ? C.goldLight : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 }}>
                    {remember && <span style={{ color: C.gold, fontSize: 12, lineHeight: 1, fontWeight: 800 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text2 }}>{t('login.remember')}</span>
                </label>

                {error && (
                  <div style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: 10, padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.red, textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>{error}</div>
                )}

                <button onClick={handleSignIn} disabled={loading} style={{ ...goldBtn, opacity: loading ? 0.7 : 1, marginTop: 8 }}>
                  {loading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> {t('login.loading')}</> : t('login.btn_in')}
                </button>
              </div>
            </div>
          )}

          {/* ── SIGN UP ── */}
          {tab === 'signup' && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>{t('login.signup_title')}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: C.text3, marginTop: 6 }}>{t('login.signup_sub')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label={t('login.name')}    value={name}     onChange={setName}     placeholder={lang === 'th' ? 'สมชาย จันทร์' : 'John Smith'} C={C} />
                <Field label={t('login.email')}   value={supEmail} onChange={setSupEmail} placeholder="your@company.com" C={C} />
                <Field label={t('login.company')} value={company}  onChange={setCompany}  placeholder={lang === 'th' ? 'บริษัท ABC จำกัด' : 'ABC Co., Ltd.'} C={C} />
                <Field label={t('login.password')} type="password" value={supPass} onChange={setSupPass} placeholder={lang === 'th' ? 'ขั้นต่ำ 8 ตัวอักษร' : 'Min 8 characters'} C={C} />

                <button onClick={handleSignUp} disabled={upLoading} style={{ ...goldBtn, marginTop: 12, opacity: upLoading ? 0.7 : 1 }}>
                  {upLoading ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> {lang === 'th' ? 'กำลังสร้างบัญชี...' : 'Creating account...'}</> : t('login.btn_up')}
                </button>

                <div style={{ fontSize: 12, color: C.text3, textAlign: 'center', lineHeight: 1.8, marginTop: 8, fontWeight: 500 }}>
                  {t('login.terms')}{' '}<span style={{ color: C.gold, cursor: 'pointer', fontWeight: 600 }}>{t('login.tos')}</span>{' '}{t('login.and')}{' '}<span style={{ color: C.gold, cursor: 'pointer', fontWeight: 600 }}>{t('login.privacy')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
