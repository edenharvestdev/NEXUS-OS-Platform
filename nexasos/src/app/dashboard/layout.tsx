'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Wallet, Target, Megaphone,
  Mic2, MessageSquare, ShieldCheck, Zap, Settings,
  Bell, ChevronLeft, ChevronRight,
  Sun, Moon, Languages, LogOut, Menu, ClipboardList,
  Upload, Award, Activity, Database, Sparkles, Brain, Sunrise,
} from 'lucide-react'
import { getUser, logout, refreshUser } from '@/lib/users'
import { canAccessModule, getDefaultRoute } from '@/lib/rbac'
import { useAppData } from '@/lib/data'
import { useApp } from '@/lib/theme'

const NAV_SECTIONS = [
  {
    titleKey: 'nav.section.daily',
    items: [
      { id: 'mydata', key: 'nav.mydata', Icon: Database, path: '/dashboard/my-data', roles: ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'] },
      { id: 'worklog', key: 'nav.worklog', Icon: ClipboardList, path: '/dashboard/worklog', roles: ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'] },
      { id: 'myai', key: 'nav.myai', Icon: MessageSquare, path: '/dashboard/my-ai', roles: ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'] },
      { id: 'deptai', key: 'nav.deptai', Icon: Users, path: '/dashboard/dept-ai', roles: ['admin', 'hr', 'finance', 'sales', 'marketing', 'it', 'staff'] },
      { id: 'skills', key: 'nav.skills', Icon: Award, path: '/dashboard/skills', roles: ['admin', 'hr', 'it', 'staff'] },
    ],
  },
  {
    titleKey: 'nav.section.dept',
    items: [
      { id: 'staff', key: 'nav.staff', Icon: LayoutDashboard, path: '/dashboard/staff', roles: ['staff'] },
      { id: 'people', key: 'nav.people', Icon: Users, path: '/dashboard/people', roles: ['admin', 'hr'] },
      { id: 'finance', key: 'nav.finance', Icon: Wallet, path: '/dashboard/finance', roles: ['admin', 'finance'] },
      { id: 'sales', key: 'nav.sales', Icon: Target, path: '/dashboard/sales', roles: ['admin', 'sales'] },
      { id: 'marketing', key: 'nav.marketing', Icon: Megaphone, path: '/dashboard/marketing', roles: ['admin', 'marketing'] },
    ],
  },
  {
    titleKey: 'nav.section.tools',
    items: [
      { id: 'meeting', key: 'nav.meeting', Icon: Mic2, path: '/dashboard/meeting', roles: ['admin', 'finance', 'hr', 'it', 'sales'] },
      { id: 'guardian', key: 'nav.guardian', Icon: ShieldCheck, path: '/dashboard/guardian', roles: ['admin', 'finance', 'it'] },
      { id: 'gpt', key: 'nav.gpt', Icon: MessageSquare, path: '/dashboard/gpt', roles: ['admin'] },
      { id: 'ai', key: 'nav.ai', Icon: Zap, path: '/dashboard/ai', roles: ['admin', 'it'] },
    ],
  },
  {
    titleKey: 'nav.section.admin',
    items: [
      { id: 'onboarding', key: 'nav.onboarding', Icon: Sparkles, path: '/dashboard/onboarding', roles: ['admin', 'hr', 'it'] },
      { id: 'readiness', key: 'nav.readiness', Icon: Sunrise, path: '/dashboard/readiness', roles: ['admin'] },
      { id: 'ingest', key: 'nav.ingest', Icon: Upload, path: '/dashboard/ingest', roles: ['admin', 'it', 'finance'] },
      { id: 'taxonomy', key: 'nav.taxonomy', Icon: Database, path: '/dashboard/taxonomy', roles: ['admin', 'it'] },
      { id: 'memory', key: 'nav.memory', Icon: Brain, path: '/dashboard/memory', roles: ['admin', 'it'] },
      { id: 'audit', key: 'nav.audit', Icon: Activity, path: '/dashboard/audit', roles: ['admin', 'it', 'hr'] },
      { id: 'settings', key: 'nav.settings', Icon: Settings, path: '/dashboard/settings', roles: ['admin', 'it'] },
    ],
  },
]

// ── Icon Button ───────────────────────────────────────────────────
function IconBtn({
  onClick, title, children, colors,
}: { onClick: () => void; title?: string; children: React.ReactNode; colors: any }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 36, height: 36, borderRadius: 10, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? colors.surface2 : colors.surface,
        border: `1px solid ${colors.border2}`,
        color: hover ? colors.text : colors.text2,
        transition: 'all 0.18s', flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ── Toggle Pill ───────────────────────────────────────────────────
function TogglePill({ labelA, labelB, active, onToggle, colors }: {
  labelA: string; labelB: string; active: 'a' | 'b';
  onToggle: () => void; colors: any;
}) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', borderRadius: 99, overflow: 'hidden',
      border: `1px solid ${colors.border2}`, cursor: 'pointer', background: 'transparent',
      padding: 2, gap: 0, transition: 'all 0.2s',
    }}>
      {[{ label: labelA, isActive: active === 'a' }, { label: labelB, isActive: active === 'b' }].map(({ label, isActive }) => (
        <span key={label} style={{
          padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
          background: isActive ? colors.gold : 'transparent',
          color: isActive ? '#fff' : colors.text3,
          transition: 'all 0.2s', fontFamily: 'Montserrat',
        }}>{label}</span>
      ))}
    </button>
  )
}

import AnimatedBackground from '@/components/AnimatedBackground'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, lang, toggleTheme, toggleLang, t, colors } = useApp()
  const [user, setUser] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    refreshUser().then(u => {
      if (!u) { router.push('/login'); return }
      setUser(u)
      const segment = pathname === '/dashboard' ? 'dashboard' : pathname.replace('/dashboard/', '').split('/')[0]
      if (!canAccessModule(u.role, segment)) {
        router.push(getDefaultRoute(u.role))
        return
      }
      if (u.role?.toLowerCase() === 'staff' && pathname === '/dashboard') {
        router.push('/dashboard/staff')
      }
      if (u.role?.toLowerCase() === 'admin' && pathname === '/dashboard') {
        router.push('/dashboard/readiness')
      }
    })
  }, [router, pathname])

  useEffect(() => {
    if (!user) return
    const loadNotif = () => {
      import('@/lib/api').then(({ api }) => {
        api.getUnreadNotifications().then(r => setUnread(r.count || 0)).catch(() => {})
        if (notifOpen) api.getNotifications().then(r => setNotifications(r.data || [])).catch(() => {})
      })
    }
    loadNotif()
    const iv = setInterval(loadNotif, 30000)
    return () => clearInterval(iv)
  }, [user, notifOpen])

  if (!user) return null

  const allItems = NAV_SECTIONS.flatMap(s => s.items)
  const activeItem = allItems.find(i => {
    if (i.id === 'dashboard') return pathname === '/dashboard'
    return pathname.startsWith(i.path)
  }) ?? allItems[0]

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'transparent',
      fontFamily: 'Montserrat, sans-serif',
      overflow: 'hidden',
      transition: 'background 0.3s',
      position: 'relative',
    }}>
      <AnimatedBackground />

      {/* ══ SIDEBAR ═══════════════════════════════════════════════ */}
      <aside style={{
        width: collapsed ? 72 : 240,
        background: colors.sidebar,
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRight: `1px solid ${colors.border}`,
        display: 'flex', flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        zIndex: 20,
      }}>

        {/* Brand Row */}
        <div style={{
          height: 64, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 16px' : '0 24px',
          borderBottom: `1px solid ${colors.border}`,
          gap: 12, flexShrink: 0,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #B48648, #9C713B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900, color: '#fff',
            boxShadow: '0 4px 12px rgba(180,134,72,0.25)',
          }}>N</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: colors.text, letterSpacing: 1.5, whiteSpace: 'nowrap', lineHeight: 1.2 }}>NEXUS OS</div>
              <div style={{ fontSize: 8, color: colors.text3, letterSpacing: 1.5, whiteSpace: 'nowrap', marginTop: 2 }}>Data First → AI Later</div>
            </div>
          )}
        </div>

        {/* Company */}
        {!collapsed && (
          <div style={{ padding: '16px 24px 12px', borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: colors.text3, letterSpacing: 2, marginBottom: 4 }}>{t('header.company').toUpperCase()}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.companies?.name || 'บริษัท ABC จำกัด'}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 0' }}>
          {NAV_SECTIONS.map(section => {
            const visibleItems = section.items.filter(item =>
              user.role?.toLowerCase() === 'admin' || item.roles.includes(user.role?.toLowerCase())
            )
            if (visibleItems.length === 0) return null

            return (
              <div key={section.titleKey} style={{ marginBottom: 8 }}>
                {!collapsed && (
                  <div style={{ padding: '12px 24px 4px', fontSize: 9, fontWeight: 700, color: colors.text3, letterSpacing: 2 }}>
                    {t(section.titleKey)}
                  </div>
                )}
                {visibleItems.map(({ id, key, Icon, path }) => {
                  const isActive = activeItem.id === id
                  return (
                    <div key={id} onClick={() => router.push(path)}
                      title={collapsed ? t(key) : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: collapsed ? '12px 0' : '10px 24px',
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: isActive ? colors.goldLight : 'transparent',
                        borderRight: isActive ? `3px solid ${colors.gold}` : '3px solid transparent',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = colors.surface2 }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      <Icon size={18} style={{ color: isActive ? colors.gold : colors.text3, flexShrink: 0, transition: 'color 0.2s' }} />
                      {!collapsed && (
                        <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 500, color: isActive ? colors.gold : colors.text2, whiteSpace: 'nowrap', transition: 'color 0.2s' }}>
                          {t(key)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* User Footer */}
        <div style={{
          padding: collapsed ? '16px 0' : '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
          justifyContent: collapsed ? 'center' : 'flex-start',
          background: colors.surface,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${user.color || '#B48648'}, ${user.color || '#B48648'}90)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: '#fff',
          }}>
            {(user.avatar || user.name || 'U').slice(0, 2)}
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 10.5, color: colors.text3, marginTop: 2 }}>{user.role || 'Administrator'}</div>
              </div>
              <button onClick={() => { logout(); router.push('/login') }} title={t('common.logout')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text3, padding: 6, display: 'flex', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = colors.red}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = colors.text3}>
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ══ MAIN ══════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── HEADER ── */}
        <header style={{
          height: 64, flexShrink: 0,
          background: colors.bg2,
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px',
          zIndex: 10,
        }}>
          {/* Collapse */}
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text3, padding: 6, display: 'flex', transition: 'color 0.2s', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = colors.text}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = colors.text3}>
            {collapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
          </button>

          {/* Page Title */}
          <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, flexShrink: 0, letterSpacing: 0.5 }}>
            {t(activeItem.key)}
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* Language Toggle */}
            <TogglePill
              labelA="TH" labelB="EN"
              active={lang === 'th' ? 'a' : 'b'}
              onToggle={toggleLang}
              colors={colors}
            />

            <div style={{ width: 1, height: 24, background: colors.border2, margin: '0 4px' }} />

            {/* Theme Toggle */}
            <IconBtn onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'} colors={colors}>
              {theme === 'dark'
                ? <Sun size={18} style={{ color: colors.gold }} />
                : <Moon size={18} style={{ color: colors.gold }} />
              }
            </IconBtn>

            {/* Notification */}
            <div style={{ position: 'relative' }}>
              <IconBtn onClick={() => setNotifOpen(v => !v)} title="Notifications" colors={colors}>
                <Bell size={18} />
              </IconBtn>
              {unread > 0 && (
                <span style={{ position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 99, background: colors.gold, border: `2px solid ${colors.bg2}`, fontSize: 9, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
              {notifOpen && (
                <div style={{ position: 'absolute', top: 44, right: 0, width: 320, maxHeight: 400, overflowY: 'auto', background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 100 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 20, fontSize: 12, color: colors.text3, textAlign: 'center' }}>ไม่มีการแจ้งเตือน</div>
                  ) : notifications.map(n => (
                    <div key={n.id} style={{ padding: '12px 14px', borderBottom: `1px solid ${colors.border}`, opacity: n.read_flag ? 0.6 : 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: colors.text3, marginTop: 4 }}>{n.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <IconBtn onClick={() => router.push('/dashboard/settings')} title={t('nav.settings')} colors={colors}>
              <Settings size={18} />
            </IconBtn>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 32, transition: 'background 0.3s' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
