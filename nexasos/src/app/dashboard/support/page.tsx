'use client'
import { useApp } from '@/lib/theme'

export default function SupportPage() {
  const { colors: C, t } = useApp()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.support')}</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>คู่มือและช่องทางติดต่อ</div>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, fontSize: 13, color: C.text2, lineHeight: 1.8 }}>
        <p><strong>อีเมล:</strong> support@nexus-os.app</p>
        <p><strong>Line:</strong> @nexusos</p>
        <p style={{ marginTop: 12 }}>สำหรับปัญหาเร่งด่วน ติดต่อผู้ดูแลระบบ IT ขององค์กร</p>
      </div>
    </div>
  )
}
