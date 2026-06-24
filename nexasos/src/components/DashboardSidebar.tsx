'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, LogOut, Settings, X } from 'lucide-react'
import { useApp } from '@/lib/theme'
import { logout } from '@/lib/users'
import { canAccessModule } from '@/lib/rbac'
import {
  visibleNavSections,
  resolveNavPath,
  isLinkActive,
  isGroupChildActive,
  isGroupActive,
  type NavLink,
  type NavGroup,
} from '@/lib/nav-config'

type Props = {
  user: any
  collapsed: boolean
  isMobile: boolean
  drawerOpen: boolean
  onCloseDrawer: () => void
}

export default function DashboardSidebar({ user, collapsed, isMobile, drawerOpen, onCloseDrawer }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const { colors: C, t } = useApp()
  const role = user.role?.toLowerCase() || 'staff'
  const sections = visibleNavSections(role)
  const showLabels = !collapsed || isMobile
  const showSettings = canAccessModule(role, 'settings')

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const section of sections) {
      for (const entry of section.entries) {
        if (entry.kind === 'group' && isGroupActive(entry, pathname)) {
          next[entry.id] = true
        }
      }
    }
    setExpanded(prev => ({ ...prev, ...next }))
  }, [pathname, role, sections])

  const navTo = (path: string) => {
    onCloseDrawer()
    router.push(path)
  }

  const toggleGroup = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const renderLink = (entry: NavLink) => {
    const path = resolveNavPath(entry, role)
    const active = isLinkActive(entry, pathname, role)
    const { Icon, key, id } = entry
    return (
      <button
        key={id}
        type="button"
        title={!showLabels ? t(key) : undefined}
        onClick={() => navTo(path)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: showLabels ? '10px 20px' : '10px 0',
          justifyContent: showLabels ? 'flex-start' : 'center',
          cursor: 'pointer',
          border: 'none',
          background: active ? C.goldLight : 'transparent',
          borderRight: active ? `3px solid ${C.gold}` : '3px solid transparent',
          minHeight: 44,
          textAlign: 'left',
        }}
      >
        <Icon size={18} style={{ color: active ? C.gold : C.text3, flexShrink: 0 }} />
        {showLabels && (
          <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? C.gold : C.text2 }}>
            {t(key)}
          </span>
        )}
      </button>
    )
  }

  const renderGroup = (entry: NavGroup) => {
    const open = expanded[entry.id] ?? isGroupActive(entry, pathname)
    const groupActive = isGroupActive(entry, pathname)
    const { Icon, key, id } = entry
    const visibleChildren = entry.children

    if (!showLabels) {
      return (
        <button
          key={id}
          type="button"
          title={t(key)}
          onClick={() => visibleChildren[0] && navTo(visibleChildren[0].path)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 0',
            border: 'none',
            background: groupActive ? C.goldLight : 'transparent',
            borderRight: groupActive ? `3px solid ${C.gold}` : '3px solid transparent',
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          <Icon size={18} style={{ color: groupActive ? C.gold : C.text3 }} />
        </button>
      )
    }

    return (
      <div key={id}>
        <button
          type="button"
          onClick={() => toggleGroup(id)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 20px',
            border: 'none',
            background: groupActive ? `${C.gold}11` : 'transparent',
            cursor: 'pointer',
            minHeight: 44,
            textAlign: 'left',
          }}
        >
          <Icon size={18} style={{ color: groupActive ? C.gold : C.text3, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: groupActive ? 600 : 500, color: groupActive ? C.gold : C.text2 }}>
            {t(key)}
          </span>
          <ChevronDown
            size={16}
            style={{
              color: C.text3,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
              flexShrink: 0,
            }}
          />
        </button>
        {open && visibleChildren.map(child => {
          const active = isGroupChildActive(child.path, pathname)
          return (
            <button
              key={child.id}
              type="button"
              onClick={() => navTo(child.path)}
              style={{
                width: '100%',
                display: 'block',
                padding: '9px 20px 9px 50px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                background: active ? C.goldLight : 'transparent',
                borderRadius: active ? '0 8px 8px 0' : 0,
                marginRight: active ? 8 : 0,
              }}
            >
              <span style={{
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? C.gold : C.text2,
              }}>
                {t(child.key)}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <aside
      className={`dashboard-sidebar${isMobile && drawerOpen ? ' dashboard-sidebar--open' : ''}${!isMobile && collapsed ? ' dashboard-sidebar--collapsed' : ''}`}
      style={{
        width: isMobile ? undefined : (collapsed ? 72 : 260),
        background: C.sidebar,
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRight: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Brand row */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '0 16px' : (collapsed ? '0 16px' : '0 20px'),
        paddingTop: isMobile ? 'var(--safe-top)' : 0,
        borderBottom: `1px solid ${C.border}`,
        gap: 12,
        flexShrink: 0,
        justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #B48648, #9C713B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 900, color: '#fff',
          }}>N</div>
          {showLabels && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: 1.2 }}>NEXUS OS</div>
              <div style={{ fontSize: 8, color: C.text3, letterSpacing: 1.2, marginTop: 2 }}>Data First → AI Later</div>
            </div>
          )}
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onCloseDrawer}
            aria-label="ปิดเมนู"
            style={{ background: 'none', border: 'none', color: C.text3, padding: 8, cursor: 'pointer', display: 'flex' }}
          >
            <X size={22} />
          </button>
        )}
      </div>

      {/* Profile header — HumanSoft pattern */}
      {showLabels && (
        <div style={{
          padding: '14px 20px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.4 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>Role: {user.role || 'staff'}</div>
          {showSettings && (
            <button
              type="button"
              onClick={() => navTo('/dashboard/settings')}
              style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 99,
                border: `1px solid ${C.border2}`,
                background: C.surface,
                color: C.text2,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Settings size={14} />
              {t('nav.settings')}
            </button>
          )}
        </div>
      )}

      {/* Company */}
      {showLabels && (
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.text3, letterSpacing: 2, marginBottom: 4 }}>
            {t('header.company').toUpperCase()}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.companies?.name || '—'}
          </div>
        </div>
      )}

      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px 0', WebkitOverflowScrolling: 'touch' }}>
        {sections.map(section => (
          <div key={section.titleKey} style={{ marginBottom: 6 }}>
            {showLabels && (
              <div style={{ padding: '8px 20px 4px', fontSize: 9, fontWeight: 700, color: C.text3, letterSpacing: 2 }}>
                {t(section.titleKey)}
              </div>
            )}
            {section.entries.map(entry => (
              entry.kind === 'link' ? renderLink(entry) : renderGroup(entry)
            ))}
          </div>
        ))}
      </nav>

      <div style={{
        padding: collapsed && !isMobile ? '16px 0' : '14px 20px',
        paddingBottom: isMobile ? 'calc(14px + var(--safe-bottom))' : undefined,
        borderTop: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
        background: C.surface,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${user.color || '#B48648'}, ${user.color || '#B48648'}90)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#fff',
        }}>
          {(user.avatar || user.name || 'U').slice(0, 2)}
        </div>
        {showLabels && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            </div>
            <button
              type="button"
              onClick={() => { logout(); router.push('/login') }}
              title={t('common.logout')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, padding: 8, display: 'flex' }}
            >
              <LogOut size={18} />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
