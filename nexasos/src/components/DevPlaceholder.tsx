'use client'

import { Badge } from '@/lib/ui'
import { useApp } from '@/lib/theme'

export default function DevPlaceholder({
  title,
  description,
  phase = 2,
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
          {description || 'ฟีเจอร์นี้อยู่ในแผนพัฒนา — โครงเมนูและสิทธิ์การเข้าถึงพร้อมแล้ว'}
        </div>
      </div>
      <Badge type="gold">Phase {phase} — กำลังพัฒนา</Badge>
    </div>
  )
}
