'use client'

import { Badge } from '@/lib/ui'
import { useApp } from '@/lib/theme'

export default function ReportPlaceholder({
  title,
  description,
  phase = 3,
}: {
  title: string
  description?: string
  phase?: number
}) {
  const { colors: C } = useApp()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{title}</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 6, lineHeight: 1.6 }}>
          {description || 'รายงานนี้จะเชื่อมกับ Payroll Engine ใน Phase ถัดไป — โครงเมนูพร้อมแล้ว'}
        </div>
      </div>
      <Badge type="gold">Phase {phase} — กำลังพัฒนา</Badge>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 20,
        fontSize: 13,
        color: C.text2,
        lineHeight: 1.7,
      }}>
        โครงสร้างเมนูและสิทธิ์การเข้าถึงตั้งค่าแล้ว ขั้นต่อไปคือเชื่อมข้อมูลจริงจากระบบลงเวลา ลา และคำนวณเงินเดือน
      </div>
    </div>
  )
}
