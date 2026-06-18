'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/users'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = getUser()
      router.push(user ? '/dashboard' : '/login')
    }, 3000)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#0F0A06',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow background */}
      <div style={{
        position: 'absolute', width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(196,149,106,0.15), transparent 70%)',
        animation: 'glow 2s ease-in-out infinite',
      }}/>

      {/* Logo */}
      <div style={{
        width: 96, height: 96, borderRadius: 28,
        background: 'linear-gradient(135deg, #C4956A, #8B6F47)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 44, fontWeight: 900, color: '#fff',
        boxShadow: '0 0 40px rgba(196,149,106,0.4)',
        animation: 'fadeUp 0.6s ease forwards',
        fontFamily: 'Montserrat, sans-serif',
      }}>A</div>

      {/* Name */}
      <div style={{
        fontSize: 42, fontWeight: 800, color: '#fff',
        fontFamily: 'Montserrat, sans-serif',
        letterSpacing: -1,
        animation: 'fadeUp 0.6s ease 0.2s both',
      }}>
        Auto<span style={{ color: '#C4956A' }}>soft</span>
      </div>

      {/* Tagline */}
      <div style={{
        fontSize: 14, color: 'rgba(255,255,255,0.45)',
        fontFamily: 'Montserrat, sans-serif',
        animation: 'fadeUp 0.6s ease 0.4s both',
        letterSpacing: 2, textTransform: 'uppercase',
      }}>
        AI Operating System
      </div>

      {/* Loading dots */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 16,
        animation: 'fadeUp 0.6s ease 0.6s both',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#C4956A',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}/>
        ))}
      </div>
    </div>
  )
}
