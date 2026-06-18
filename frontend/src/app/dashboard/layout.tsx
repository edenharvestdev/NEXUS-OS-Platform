'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, logout } from '@/lib/users'

const NAV = [
  { id: 'dashboard', icon: '🏠', label: 'Dashboard', path: '/dashboard' },
  { id: 'people', icon: '👥', label: 'HR & People', path: '/dashboard/people', section: 'Modules' },
  { id: 'finance', icon: '💰', label: 'Finance Center', path: '/dashboard/finance' },
  { id: 'sales', icon: '🎯', label: 'Sales Copilot', path: '/dashboard/sales' },
  { id: 'marketing', icon: '📣', label: 'Marketing', path: '/dashboard/marketing' },
  { id: 'meeting', icon: '🎙️', label: 'Meeting Brain', path: '/dashboard/meeting', section: 'AI' },
  { id: 'gpt', icon: '🤖', label: 'Company GPT', path: '/dashboard/gpt' },
  { id: 'guardian', icon: '🛡️', label: 'Doc Guardian', path: '/dashboard/guardian' },
  { id: 'ai', icon: '⚡', label: 'AI Control Tower', path: '/dashboard/ai' },
  { id: 'settings', icon: '⚙️', label: 'Settings', path: '/dashboard/settings', section: 'System' },
]

const C = {
  bg: '#0F0A06', bg2: '#150E08', bg3: '#1C1209',
  border: 'rgba(255,255,255,0.08)',
  gold: '#C4956A', gold2: '#8B6F47',
  text: 'rgba(255,255,255,0.92)',
  text2: 'rgba(255,255,255,0.65)',
  text3: 'rgba(255,255,255,0.35)',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const u = getUser()
    if (!u) { router.push('/login'); return }
    setUser(u)
  }, [router])

  if (!user) return (
    <div style={{ width: '100vw', height: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.gold, fontFamily: 'Montserrat', fontSize: 14 }}>กำลังโหลด...</div>
    </div>
  )

  const handleLogout = () => { logout(); router.push('/login') }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: C.bg, fontFamily: 'Montserrat, sans-serif', overflow: 'hidden' }}>
      
      {/* SIDEBAR */}
      <div style={{
        width: collapsed ? 60 : 240,
        background: C.bg3,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 20px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #C4956A, #8B6F47)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 900, color: '#fff',
          }}>A</div>
          {!collapsed && <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>Auto<span style={{ color: C.gold }}>soft</span></span>}
        </div>

        {/* Nav Items */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 8px' }}>
          {NAV.map((item, i) => {
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
            const prevItem = NAV[i - 1]
            const showSection = item.section && item.section !== prevItem?.section
            return (
              <div key={item.id}>
                {showSection && !collapsed && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, letterSpacing: 1.5, padding: '10px 12px 4px', textTransform: 'uppercase' }}>
                    {item.section}
                  </div>
                )}
                <div
                  onClick={() => router.push(item.path)}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: collapsed ? 0 : 10,
                    padding: collapsed ? '10px' : '10px 12px',
                    borderRadius: 10, cursor: 'pointer',
                    background: isActive ? `rgba(196,149,106,0.15)` : 'transparent',
                    borderLeft: isActive ? `2px solid ${C.gold}` : '2px solid transparent',
                    color: isActive ? C.gold : C.text2,
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    transition: 'all 0.15s', marginBottom: 2,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* User + Logout */}
        <div style={{ padding: '12px 8px', borderTop: `1px solid ${C.border}` }}>
          {!collapsed && (
            <div style={{ padding: '8px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${user.color}, ${user.color}99)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>{user.avatar}</div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: C.text3 }}>{user.role}</div>
              </div>
            </div>
          )}
          <div
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 8,
              padding: collapsed ? '10px' : '8px 12px', borderRadius: 10,
              cursor: 'pointer', color: C.text3, fontSize: 12, fontWeight: 500,
              justifyContent: collapsed ? 'center' : 'flex-start',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.color = '#E74C3C'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(231,76,60,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.color = C.text3; (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          >
            <span>🚪</span>
            {!collapsed && <span>ออกจากระบบ</span>}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          height: 56, background: C.bg2,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12, flexShrink: 0,
        }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, fontSize: 18, padding: 4 }}>☰</button>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 13, color: C.text3 }}>🔔</div>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: `linear-gradient(135deg, ${user.color}, ${user.color}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
          }}>{user.avatar}</div>
        </div>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
