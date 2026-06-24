'use client'
import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

const QUERIES = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
} as const

function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  if (window.matchMedia(QUERIES.mobile).matches) return 'mobile'
  if (window.matchMedia(QUERIES.tablet).matches) return 'tablet'
  return 'desktop'
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('desktop')

  useEffect(() => {
    const update = () => setBp(getBreakpoint())
    update()
    const mqls = Object.values(QUERIES).map(q => {
      const mql = window.matchMedia(q)
      mql.addEventListener('change', update)
      return mql
    })
    return () => mqls.forEach(mql => mql.removeEventListener('change', update))
  }, [])

  return bp
}

export function useIsMobile(): boolean {
  const bp = useBreakpoint()
  return bp === 'mobile'
}
