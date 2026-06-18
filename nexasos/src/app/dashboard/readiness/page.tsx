'use client'
import { useEffect, useState } from 'react'
import { Badge, StatCard, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function ReadinessPage() {
  const { colors: C } = useApp()
  const [data, setData] = useState<any>(null)
  const [ceo, setCeo] = useState<any>(null)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  useEffect(() => {
    api.getReadiness().then(setData).catch(e => setToast({ msg: e.message, type: 'error' }))
    api.getCeoBrief().then(setCeo).catch(() => {})
  }, [])

  if (!data) return null
  const readinessColor = data.readiness === 'ready' ? C.green : data.readiness === 'caution' ? C.gold : C.red

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Daily Readiness (L6)</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>§10 — สถานะพร้อมตัดสินใจขององค์กร</div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon="target" label="Health Score" value={String(data.organization_health_score)} color={readinessColor} />
        <StatCard icon="zap" label="Readiness" value={data.readiness} color={readinessColor} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Object.values(data.dimensions || {}).map((d: any) => (
          <div key={d.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: C.text3 }}>{d.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.gold }}>{d.score}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: C.text }}>Checklist</div>
        {(data.checklist || []).map((c: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
            <span style={{ color: C.text2 }}>{c.ok ? '✅' : '⏳'} {c.item}</span>
            <Badge type={c.ok ? 'green' : 'gold'}>{c.detail}</Badge>
          </div>
        ))}
        <div style={{ marginTop: 16, fontSize: 13, color: C.text2 }}>{data.recommendation}</div>
      </div>

      {ceo?.brief && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: C.text }}>CEO Agent Brief</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: C.text2, fontFamily: 'inherit', margin: 0 }}>{ceo.brief}</pre>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
