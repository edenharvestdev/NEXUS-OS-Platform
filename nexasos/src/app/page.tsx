'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/users'
import AnimatedBackground from '@/components/AnimatedBackground'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      const user = getUser()
      router.push(user ? '/dashboard' : '/login')
    }, 3500)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }} className="perspective-container">
      
      {/* Main Content Container with 3D Float effect */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28,
        animation: 'fadeUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        zIndex: 10
      }} className="rotate-3d-hover">
        
        {/* 3D Animated Logo Icon */}
        <div style={{
          width: 140, height: 140, 
          perspective: 1000, 
          position: 'relative',
          marginBottom: 10
        }}>
          <div style={{
            width: '100%', height: '100%',
            transformStyle: 'preserve-3d',
            animation: 'spin3D 8s infinite linear',
            position: 'absolute',
          }}>
            {/* Back Glow Layer */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 36,
              background: 'linear-gradient(135deg, #E2B989, #B48648)',
              transform: 'translateZ(-20px) scale(0.9)',
              filter: 'blur(20px)', opacity: 0.8
            }}/>
            
            {/* Middle Glass Layer */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 36,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              transform: 'translateZ(-10px)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 0 20px rgba(0,0,0,0.2)'
            }}/>

            {/* Front Solid Layer */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 36,
              background: 'linear-gradient(135deg, #E2B989, #B48648)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 64, fontWeight: 900, color: '#fff',
              boxShadow: '0 10px 30px rgba(180,134,72,0.4), inset 0 2px 0 rgba(255,255,255,0.4)',
              textShadow: '0 4px 10px rgba(0,0,0,0.2)',
              fontFamily: 'Montserrat, sans-serif',
              transform: 'translateZ(10px)',
              backfaceVisibility: 'hidden',
            }}>
              N
              <div style={{
                position: 'absolute', inset: 0, borderRadius: 36,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
              }}/>
            </div>
            
            {/* Front Extruded Letter Shadow */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 64, fontWeight: 900, color: 'rgba(0,0,0,0.2)',
              fontFamily: 'Montserrat, sans-serif',
              transform: 'translateZ(5px)',
              pointerEvents: 'none'
            }}>
              N
            </div>
          </div>
        </div>

        {/* Text Area */}
        <div style={{ textAlign: 'center' }}>
          {/* Name */}
          <div style={{
            fontSize: 52, fontWeight: 900, color: '#FFFFFF',
            fontFamily: 'Montserrat, sans-serif',
            letterSpacing: -1.5,
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            NEXUS<span style={{ color: '#E2B989' }}> OS</span>
          </div>

          {/* Tagline */}
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.75)',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 600,
            letterSpacing: 3, textTransform: 'uppercase',
            marginTop: 10,
            textShadow: '0 2px 10px rgba(0,0,0,0.2)',
          }}>
            Enterprise Intelligence Platform
          </div>
          <div style={{
            fontSize: 11, color: 'rgba(226,185,137,0.85)',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
            letterSpacing: 2, textTransform: 'uppercase',
            marginTop: 6,
          }}>
            Data First → AI Later
          </div>
        </div>

        {/* Loading dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: '#E2B989',
              boxShadow: '0 0 10px rgba(226,185,137,0.5)',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}/>
          ))}
        </div>

      </div>
    </div>
  )
}
