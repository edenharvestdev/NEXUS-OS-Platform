'use client'
import AIChatPanel from '@/components/AIChatPanel'

export default function MyAIPage() {
  return (
    <AIChatPanel
      scope="personal"
      title="AI ส่วนตัว · 1 User = 1 AI"
      subtitle="ความจำ KPI Skill ไฟล์ของคุณเท่านั้น · อัปเดต Work Log แล้วแจ้งหัวหน้าอัตโนมัติ"
    />
  )
}
