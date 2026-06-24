'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, UserCog, X } from 'lucide-react'
import { api } from '@/lib/api'
import {
  canUseImpersonation,
  getImpersonation,
  startImpersonate,
  stopImpersonate,
} from '@/lib/users'
import { getDefaultRoute } from '@/lib/rbac'
import { useApp } from '@/lib/theme'

type Target = { id: string; name: string; email: string; role: string; department: string }

const ROLE_LABELS: Record<string, string> = {
  admin: 'ผู้ดูแล',
  hr: 'HR',
  finance: 'การเงิน',
  sales: 'ขาย',
  marketing: 'การตลาด',
  it: 'IT',
  staff: 'พนักงาน',
}

export default function ImpersonationBar({
  user,
  onSessionChange,
}: {
  user: any
  onSessionChange: () => void
}) {
  const router = useRouter()
  const { colors, t } = useApp()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [targets, setTargets] = useState<Target[]>([])
  const impersonation = getImpersonation()

  const showBar = canUseImpersonation(impersonation)

  useEffect(() => {
    if (!showBar || !open) return
    api.getImpersonateTargets()
      .then(r => setTargets(r.data || []))
      .catch(() => setTargets([]))
  }, [showBar, open])

  const grouped = useMemo(() => {
    const map = new Map<string, Target[]>()
    for (const target of targets) {
      const dept = target.department || 'อื่นๆ'
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(target)
    }
    return [...map.entries()]
  }, [targets])

  if (!showBar) return null

  const active = impersonation?.active

  const handleSwitch = async (userId: string) => {
    if (loading || userId === user.id) {
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await startImpersonate(userId)
      setOpen(false)
      onSessionChange()
      router.push(getDefaultRoute(res.user.role))
      router.refresh()
    } catch (e: any) {
      alert(e.message || 'สลับผู้ใช้ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await stopImpersonate()
      setOpen(false)
      onSessionChange()
      router.push(getDefaultRoute(res.user.role))
      router.refresh()
    } catch (e: any) {
      alert(e.message || 'ออกจากโหมดสวมสิทธิ์ไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 90,
        background: active ? 'linear-gradient(90deg, #9C713B, #B48648)' : colors.surface2,
        borderBottom: `1px solid ${active ? 'rgba(255,255,255,0.2)' : colors.border}`,
        color: active ? '#fff' : colors.text2,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        fontSize: 12,
      }}
    >
      <UserCog size={16} style={{ flexShrink: 0, opacity: 0.9 }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        {active ? (
          <>
            {t('impersonate.active')}: <strong>{user.name}</strong>
            {impersonation?.actor?.name ? (
              <span style={{ opacity: 0.85 }}> · {impersonation.actor.name}</span>
            ) : null}
          </>
        ) : (
          t('impersonate.adminHint')
        )}
      </span>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          disabled={loading}
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            border: `1px solid ${active ? 'rgba(255,255,255,0.35)' : colors.border2}`,
            background: active ? 'rgba(255,255,255,0.12)' : colors.surface,
            color: active ? '#fff' : colors.text,
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {t('impersonate.switch')}
          <ChevronDown size={14} />
        </button>

        {open && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 98 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: 'min(320px, calc(100vw - 32px))',
                maxHeight: 360,
                overflowY: 'auto',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                zIndex: 99,
              }}
            >
              {grouped.length === 0 ? (
                <div style={{ padding: 16, color: colors.text3, textAlign: 'center' }}>
                  {loading ? '...' : t('impersonate.empty')}
                </div>
              ) : grouped.map(([dept, members]) => (
                <div key={dept}>
                  <div style={{
                    padding: '8px 12px 4px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: colors.text3,
                    letterSpacing: 1,
                  }}>
                    {dept}
                  </div>
                  {members.map(m => {
                    const isCurrent = m.id === user.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={loading || isCurrent}
                        onClick={() => handleSwitch(m.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          border: 'none',
                          borderBottom: `1px solid ${colors.border}`,
                          background: isCurrent ? colors.surface2 : 'transparent',
                          cursor: isCurrent ? 'default' : 'pointer',
                          opacity: isCurrent ? 0.7 : 1,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: colors.text3, marginTop: 2 }}>
                          {ROLE_LABELS[m.role?.toLowerCase()] || m.role} · {m.email}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {active && (
        <button
          type="button"
          disabled={loading}
          onClick={handleStop}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.35)',
            background: 'rgba(0,0,0,0.15)',
            color: '#fff',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <X size={14} />
          {t('impersonate.stop')}
        </button>
      )}
    </div>
  )
}
