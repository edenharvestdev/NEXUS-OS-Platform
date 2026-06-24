'use client'
import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { useApp } from '@/lib/theme'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'nexus_pwa_install_dismissed'

export default function PWARegister() {
  const { colors: C } = useApp()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [showAndroidBanner, setShowAndroidBanner] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    if ((navigator as Navigator & { standalone?: boolean }).standalone) {
      setInstalled(true)
      return
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined)
    }

    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      if (!localStorage.getItem(DISMISS_KEY)) setShowAndroidBanner(true)
    }

    const onInstalled = () => {
      setInstalled(true)
      setShowAndroidBanner(false)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent)
    if (isIos && isSafari && !localStorage.getItem(DISMISS_KEY)) {
      setShowIosHint(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setShowAndroidBanner(false)
    setShowIosHint(false)
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferred(null)
    setShowAndroidBanner(false)
  }

  if (installed) return null

  if (showAndroidBanner && deferred) {
    return (
      <div
        style={{
          position: 'fixed',
          left: 16,
          right: 16,
          bottom: 'calc(16px + var(--safe-bottom, 0px) + var(--bottom-nav-h, 0px))',
          zIndex: 80,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '14px 16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          animation: 'slideUp 0.35s ease',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg, #D4A96A, #8B6F47)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 900, fontSize: 20,
        }}>N</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>ติดตั้ง NEXUS OS</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>เปิดใช้แบบแอปบนหน้าจอหลัก</div>
        </div>
        <button
          onClick={install}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${C.gold}, ${C.gold2})`,
            color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0,
          }}
        >
          <Download size={16} /> ติดตั้ง
        </button>
        <button onClick={dismiss} aria-label="ปิด" style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 6, display: 'flex' }}>
          <X size={18} />
        </button>
      </div>
    )
  }

  if (showIosHint) {
    return (
      <div
        style={{
          position: 'fixed',
          left: 16,
          right: 16,
          bottom: 'calc(16px + var(--safe-bottom, 0px) + var(--bottom-nav-h, 0px))',
          zIndex: 80,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '14px 16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.35s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>ติด NEXUS บนหน้าจอหลัก</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 6, lineHeight: 1.55 }}>
              แตะ <strong style={{ color: C.gold }}>แชร์</strong> แล้วเลือก <strong style={{ color: C.gold }}>Add to Home Screen</strong>
            </div>
          </div>
          <button onClick={dismiss} aria-label="ปิด" style={{ background: 'none', border: 'none', color: C.text3, cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
      </div>
    )
  }

  return null
}
