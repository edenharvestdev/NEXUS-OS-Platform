'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ClipboardList, ListTodo, Database, MessageSquare, ArrowRight } from 'lucide-react'
import { useApp } from '@/lib/theme'

/**
 * Shared landing page for a department/role workspace. Keeps to broadly
 * available actions (no privileged endpoints) so any department role gets a
 * working "home of their own" without 403s. Enrich per-department later.
 */
type Props = {
  titleTh: string
  titleEn: string
  subtitleTh?: string
  Icon: LucideIcon
}

const ACTIONS: Array<{ href: string; th: string; en: string; descTh: string; Icon: LucideIcon }> = [
  { href: '/dashboard/worklog',    th: 'บันทึกงาน',      en: 'Work Log',      descTh: 'บันทึกงานที่ทำในแต่ละวัน',     Icon: ClipboardList },
  { href: '/dashboard/work/todos', th: 'งานที่ต้องทำ',    en: 'To-dos',        descTh: 'งานค้างและงานที่ได้รับมอบหมาย', Icon: ListTodo },
  { href: '/dashboard/my-data',    th: 'ข้อมูลของฉัน',    en: 'My Data',       descTh: 'ข้อมูลส่วนตัวและ HR ของฉัน',   Icon: Database },
  { href: '/dashboard/dept-ai',    th: 'AI ของแผนก',     en: 'Department AI', descTh: 'ถาม AI เรื่องงานของแผนก',      Icon: MessageSquare },
]

export default function DepartmentWorkspace({ titleTh, titleEn, subtitleTh, Icon }: Props) {
  const { colors: C, lang } = useApp()
  const isTh = lang === 'th'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: 20, borderRadius: 16,
        background: `linear-gradient(135deg, ${C.gold}14, ${C.surface})`,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: `linear-gradient(135deg, ${C.gold}, ${C.gold}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <Icon size={26} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>
            {isTh ? titleTh : titleEn}
          </h1>
          <div style={{ fontSize: 13, color: C.text3, marginTop: 4 }}>
            {subtitleTh || (isTh ? 'พื้นที่ทำงานของแผนก' : 'Department workspace')}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {ACTIONS.map(a => (
          <Link
            key={a.href}
            href={a.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: 16, borderRadius: 14,
              background: C.surface, border: `1px solid ${C.border}`,
              textDecoration: 'none', minHeight: 76,
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
              background: C.goldLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <a.Icon size={20} style={{ color: C.gold }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{isTh ? a.th : a.en}</div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{a.descTh}</div>
            </div>
            <ArrowRight size={16} style={{ color: C.text3, flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
