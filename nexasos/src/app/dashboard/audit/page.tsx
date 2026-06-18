'use client'
import { useEffect, useState } from 'react'
import { Badge, EmptyState } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function AuditPage() {
  const { colors: C } = useApp()
  const [logs, setLogs] = useState<any[]>([])
  const [checklist, setChecklist] = useState<any[]>([])
  const [workbook, setWorkbook] = useState<any>(null)

  useEffect(() => {
    api.getAuditLogs().then(r => setLogs(r.data || [])).catch(() => {})
    api.getSecurityChecklist().then(r => setChecklist(r.data || [])).catch(() => {})
    api.getWorkbookTemplate().then(setWorkbook).catch(() => {})
  }, [])

  const tiers = workbook?.security_tiers || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Security & Audit · Workbook Tab 2 + 6</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>Least Privilege · T0–T3 · PDPA · Audit Trail</div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text }}>
          Tab 2 · Log Collection Checklist (Security)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px', gap: 8, padding: '10px 18px', borderBottom: `1px solid ${C.border}` }}>
          {['หมวดข้อมูล', 'Tier', 'PDPA', 'สถานะ'].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: C.text3 }}>{h}</div>
          ))}
        </div>
        {checklist.map(item => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px', gap: 8, padding: '12px 18px', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.category}</div>
              <div style={{ fontSize: 11, color: C.text3 }}>{item.example} · {item.access}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: item.tier === 'T3' ? C.red : C.gold }}>{item.tier}</span>
            <span style={{ fontSize: 11, color: C.text2 }}>{item.pdpa ? 'PDPA' : '—'}</span>
            <Badge type={item.status === 'done' ? 'green' : 'default'}>{item.status_label}</Badge>
          </div>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text }}>
          Tab 6 · Security Reference T0–T3
        </div>
        {tiers.map((t: any) => (
          <div key={t.tier} style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 800, color: t.tier === 'T3' ? C.red : C.gold }}>{t.tier}</span>
              <span style={{ fontWeight: 700, color: C.text }}>{t.name}</span>
            </div>
            <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
              {t.definition} · ตัวอย่าง: {t.examples}<br />
              ควบคุม: {t.controls} · เข้าถึง: {t.access}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontWeight: 700, color: C.text }}>
          Audit Trail (การเข้าถึง T2/T3)
        </div>
        {logs.length === 0 ? (
          <EmptyState icon="shield" title="ยังไม่มี Audit Log" sub="จะบันทึกเมื่อมีการสร้าง/แก้ไข work log, dictionary, import" />
        ) : logs.map(l => (
          <div key={l.id} style={{ display: 'grid', gridTemplateColumns: '140px 120px 1fr 80px', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: C.text3, fontFamily: 'JetBrains Mono,monospace' }}>{new Date(l.created_at).toLocaleString('th-TH')}</span>
            <Badge type="blue">{l.action}</Badge>
            <span style={{ fontSize: 12, color: C.text2 }}>{l.resource}{l.resource_id ? ` · ${l.resource_id.slice(0, 8)}` : ''} · {l.user_name || 'system'}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>{l.security_tier || 'T1'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
