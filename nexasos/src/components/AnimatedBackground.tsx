'use client'
import React, { useEffect, useState } from 'react'
import { useApp } from '@/lib/theme'

const inert = { pointerEvents: 'none' as const }

/** Decorative background for login only — never blocks clicks */
export default function AnimatedBackground() {
  const { theme, colors } = useApp()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isLight = theme === 'light'
  const orb1 = isLight ? 'radial-gradient(circle, rgba(196,149,106,0.2) 0%, rgba(255,255,255,0) 70%)' : 'radial-gradient(circle, rgba(196,149,106,0.15) 0%, rgba(0,0,0,0) 70%)'
  const orb2 = isLight ? 'radial-gradient(circle, rgba(139,111,71,0.15) 0%, rgba(255,255,255,0) 70%)' : 'radial-gradient(circle, rgba(139,111,71,0.1) 0%, rgba(0,0,0,0) 70%)'
  const orb3 = isLight ? 'radial-gradient(circle, rgba(230,210,190,0.4) 0%, rgba(255,255,255,0) 70%)' : 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 70%)'

  return (
    <div aria-hidden style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, overflow: 'hidden', background: colors.bg, ...inert }}>
      <div style={{ position: 'absolute', inset: 0, background: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', ...inert }} />
      <div style={{ position: 'absolute', inset: 0, background: isLight ? 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.9))' : 'linear-gradient(to bottom, transparent, rgba(10,7,5,0.9))', opacity: 0.8, ...inert }} />
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', background: orb1, animation: 'float1 20s ease-in-out infinite alternate', filter: 'blur(40px)', ...inert }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw', background: orb2, animation: 'float2 25s ease-in-out infinite alternate-reverse', filter: 'blur(50px)', ...inert }} />
      <div style={{ position: 'absolute', top: '20%', left: '30%', width: '40vw', height: '40vw', background: orb3, animation: 'float3 22s ease-in-out infinite alternate', filter: 'blur(60px)', mixBlendMode: isLight ? 'multiply' : 'screen', ...inert }} />
    </div>
  )
}
