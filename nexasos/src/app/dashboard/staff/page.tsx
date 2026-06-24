'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Legacy route — unified home is now /dashboard/home */
export default function StaffRedirectPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/home') }, [router])
  return null
}
