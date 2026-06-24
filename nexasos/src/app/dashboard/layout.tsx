'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Bell, ChevronLeft, Menu, Settings,
  Sun, Moon,
} from 'lucide-react'
import { refreshSession } from '@/lib/users'
import { canAccessModule, getDefaultRoute, setExtraModules } from '@/lib/rbac'
import { findActiveTitleKey, moduleFromPathname } from '@/lib/nav-config'
import DashboardSidebar from '@/components/DashboardSidebar'
import { getBottomTabs, resolveBottomTabActive } from '@/lib/mobile-nav'
import { useIsMobile } from '@/lib/use-breakpoint'
import { useApp } from '@/lib/theme'
import AnimatedBackground from '@/components/AnimatedBackground'
import ImpersonationBar from '@/components/ImpersonationBar'

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
        width: 40, height: 40, borderRadius: 10, cursor: 'pointer',
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { theme, lang, toggleTheme, toggleLang, t, colors } = useApp()
  const [user, setUser] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [sessionKey, setSessionKey] = useState(0)

  const reloadSession = () => {
    refreshSession().then(result => {
      if (!result) { router.push('/login'); return }
      setUser(result.user)
      setSessionKey(k => k + 1)
      import('@/lib/api').then(({ api }) => {
        api.getMyModules().then(r => setExtraModules(r.data || [])).catch(() => {})
      })
    })
  }

  useEffect(() => {
    refreshSession().then(result => {
      if (!result) { router.push('/login'); return }
      const u = result.user
      setUser(u)
      import('@/lib/api').then(({ api }) => {
        api.getMyModules().then(r => setExtraModules(r.data || [])).catch(() => {})
      })
      const segment = moduleFromPathname(pathname)
      if (!canAccessModule(u.role, segment)) {
        router.push(getDefaultRoute(u.role))
        return
      }
      if (pathname === '/dashboard') {
        router.push(getDefaultRoute(u.role))
        return
      }
    })
  }, [router, pathname])

  useEffect(() => {
    setDrawerOpen(false)
    setNotifOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMobile) return
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen, isMobile])

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

  const role = user.role?.toLowerCase() || 'staff'
  const pageTitle = findActiveTitleKey(pathname, role, t)
  const showSettings = canAccessModule(role, 'settings')
  const bottomTabs = getBottomTabs(role)
  const activeTabId = resolveBottomTabActive(pathname, role, drawerOpen)

  const navTo = (path: string) => {
    setDrawerOpen(false)
    router.push(path)
  }

  return (
    <div
      className={`dashboard-shell${isMobile ? ' dashboard-shell--mobile' : ''}`}
      style={{
        background: 'transparent',
        fontFamily: 'Montserrat, sans-serif',
        transition: 'background 0.3s',
        ['--nav-bg' as string]: colors.sidebar,
        ['--nav-border' as string]: colors.border,
      }}
    >
      <AnimatedBackground />

      {isMobile && drawerOpen && (
        <div
          className="sidebar-backdrop sidebar-backdrop--open"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      <DashboardSidebar
        user={user}
        collapsed={collapsed}
        isMobile={isMobile}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
      />

      {/* ══ MAIN ══════════════════════════════════════════════════ */}
      <div className="dashboard-main">

        <header
          className="dashboard-header"
          style={{
            background: colors.bg2,
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {isMobile ? (
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="เปิดเมนู"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text3, padding: 8, display: 'flex', flexShrink: 0, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Menu size={22} />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text3, padding: 6, display: 'flex', flexShrink: 0 }}
            >
              {collapsed ? <Menu size={22} /> : <ChevronLeft size={22} />}
            </button>
          )}

          <span style={{
            fontSize: isMobile ? 15 : 16, fontWeight: 700, color: colors.text,
            flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {t(pageTitle)}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, flexShrink: 0 }}>
            <div className="header-hide-mobile">
              <TogglePill labelA="TH" labelB="EN" active={lang === 'th' ? 'a' : 'b'} onToggle={toggleLang} colors={colors} />
            </div>

            {!isMobile && <div style={{ width: 1, height: 24, background: colors.border2 }} />}

            <IconBtn onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} colors={colors}>
              {theme === 'dark' ? <Sun size={18} style={{ color: colors.gold }} /> : <Moon size={18} style={{ color: colors.gold }} />}
            </IconBtn>

            <div style={{ position: 'relative' }}>
              <IconBtn onClick={() => setNotifOpen(v => !v)} title="Notifications" colors={colors}>
                <Bell size={18} />
              </IconBtn>
              {unread > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 99,
                  background: colors.gold, border: `2px solid ${colors.bg2}`, fontSize: 9, fontWeight: 800,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
              {notifOpen && (
                <div style={{
                  position: 'absolute', top: 44, right: 0,
                  width: isMobile ? 'min(300px, calc(100vw - 32px))' : 320,
                  maxHeight: 360, overflowY: 'auto',
                  background: colors.surface, border: `1px solid ${colors.border}`,
                  borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 100,
                }}>
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

            {showSettings && (
              <div className="header-hide-mobile">
                <IconBtn onClick={() => router.push('/dashboard/settings')} title={t('nav.settings')} colors={colors}>
                  <Settings size={18} />
                </IconBtn>
              </div>
            )}
          </div>
        </header>

        <ImpersonationBar key={sessionKey} user={user} onSessionChange={reloadSession} />

        <main className="dashboard-content">
          <div className="dashboard-content-inner">
            {children}
          </div>
        </main>
      </div>

      {/* ══ BOTTOM NAV (mobile) ═════════════════════════════════════ */}
      {isMobile && (
        <nav className="mobile-bottom-nav" aria-label="เมนูหลัก">
          <div className="mobile-bottom-nav__inner">
            {bottomTabs.map(tab => {
              const isActive = tab.id === activeTabId
              const color = isActive ? colors.gold : colors.text3
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="mobile-bottom-nav__btn"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => {
                    if (tab.action === 'menu') {
                      setDrawerOpen(v => !v)
                      return
                    }
                    if (tab.path) navTo(tab.path)
                  }}
                  style={{ color }}
                >
                  <tab.Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                  <span className="mobile-bottom-nav__label">{t(tab.key)}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
