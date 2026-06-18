'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/users'
import { getDefaultRoute } from '@/lib/rbac'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    const user = getUser()
    router.replace(user ? getDefaultRoute(user.role) : '/login')
  }, [router])

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Montserrat, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: '#E2B989' }}>NEXUS OS</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 8, letterSpacing: 2 }}>Loading…</div>
      </div>
    </div>
  )
}
