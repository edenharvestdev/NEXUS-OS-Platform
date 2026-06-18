'use client'
import React, { useEffect, useState } from 'react'
import { useApp } from '@/lib/theme'

export default function AnimatedBackground() {
  const { theme, colors } = useApp()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isLight = theme === 'light'
  
  // Orbs follow a beautiful gold/copper/neutral palette
  const orb1 = isLight ? 'radial-gradient(circle, rgba(196,149,106,0.2) 0%, rgba(255,255,255,0) 70%)' : 'radial-gradient(circle, rgba(196,149,106,0.15) 0%, rgba(0,0,0,0) 70%)'
  const orb2 = isLight ? 'radial-gradient(circle, rgba(139,111,71,0.15) 0%, rgba(255,255,255,0) 70%)' : 'radial-gradient(circle, rgba(139,111,71,0.1) 0%, rgba(0,0,0,0) 70%)'
  const orb3 = isLight ? 'radial-gradient(circle, rgba(230,210,190,0.4) 0%, rgba(255,255,255,0) 70%)' : 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0) 70%)'

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, overflow: 'hidden', background: colors.bg }}>
      <video 
        autoPlay loop muted playsInline 
        src="https://cdn.pixabay.com/video/2021/08/11/84700-587870341_large.mp4" 
        style={{ position: 'absolute', top: '50%', left: '50%', width: '100vw', height: '100vh', objectFit: 'cover', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: -3 }} 
      />
      <div style={{ position: 'absolute', inset: 0, background: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', zIndex: -2 }} />
      <div style={{ position: 'absolute', inset: 0, background: isLight ? 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.9))' : 'linear-gradient(to bottom, transparent, rgba(10,7,5,0.9))', opacity: 0.8, zIndex: -1 }} />

      {/* Grid overlay for tech feel */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: isLight 
          ? 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)' 
          : 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        opacity: 0.5,
        maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
      }} />

      {/* Floating 3D Orbs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw',
        background: orb1,
        animation: 'float1 20s ease-in-out infinite alternate',
        filter: 'blur(40px)',
      }} />

      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw',
        background: orb2,
        animation: 'float2 25s ease-in-out infinite alternate-reverse',
        filter: 'blur(50px)',
      }} />

      <div style={{
        position: 'absolute', top: '20%', left: '30%', width: '40vw', height: '40vw',
        background: orb3,
        animation: 'float3 22s ease-in-out infinite alternate',
        filter: 'blur(60px)',
        mixBlendMode: isLight ? 'multiply' : 'screen',
      }} />

      {/* Extra subtle noise texture (optional but adds premium feel) */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: isLight ? 0.04 : 0.02,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
      }} />
    </div>
  )
}
