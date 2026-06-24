'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AIChatPanel from '@/components/AIChatPanel'

function MyAIContent() {
  const search = useSearchParams()
  const q = search.get('q') || undefined
  return (
    <AIChatPanel
      scope="personal"
      title="ถาม AI — งาน + HR"
      subtitle="รู้ข้อมูลลา สลิป ลงเวลา และงานของคุณจากระบบจริง (Grounded RAG)"
      initialPrompt={q}
    />
  )
}

export default function MyAIPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <MyAIContent />
    </Suspense>
  )
}
