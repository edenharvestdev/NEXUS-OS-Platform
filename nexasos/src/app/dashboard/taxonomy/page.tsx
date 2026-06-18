'use client'
import { useEffect, useState } from 'react'
import { Badge, Tabs, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

const PRIORITY_COLOR: Record<string, string> = {
  basic: 'green',
  intermediate: 'gold',
  advanced: 'red',
}

export default function TaxonomyPage() {
  const { colors: C } = useApp()
  const [data, setData] = useState<any>(null)
  const [domain, setDomain] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    api.getTamadaTaxonomy(domain || undefined).then(setData).catch(e => showToast(e.message, 'error'))
  }, [domain])

  const metrics = data?.metrics || []
  const domains = data?.domains || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease', maxWidth: 960 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>L0 · Tamada Data Taxonomy v2.0</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
          Single Source จาก PDF — {data?.total || 59} metrics · 10 domains · Tamada + SDX + Franchise
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
        <button onClick={() => setDomain('')}
          style={{ padding: 12, borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: `2px solid ${!domain ? C.gold : C.border}`, background: !domain ? C.goldLight : C.surface }}>
          <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>ทั้งหมด</div>
          <div style={{ fontSize: 11, color: C.text3 }}>{data?.total || 59} metrics</div>
        </button>
        {domains.map((d: any) => (
          <button key={d.id} onClick={() => setDomain(d.id)}
            style={{ padding: 12, borderRadius: 12, cursor: 'pointer', textAlign: 'left', border: `2px solid ${domain === d.id ? C.gold : C.border}`, background: domain === d.id ? C.goldLight : C.surface }}>
            <div style={{ fontWeight: 700, color: C.text, fontSize: 12 }}>{d.label.split(' — ')[0]}</div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>{d.count} · {d.layer}</div>
          </button>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: C.text }}>{domain ? domains.find((d: any) => d.id === domain)?.label : 'All Domains'}</span>
          <Badge type="gold">{metrics.length} shown</Badge>
        </div>
        {metrics.map((m: any) => (
          <div key={m.metric_key} style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{m.name}</span>
              <Badge type={(PRIORITY_COLOR[m.priority] || 'default') as any}>{m.priority}</Badge>
              <Badge type="default">{m.entity}</Badge>
              <span style={{ fontSize: 10, color: C.text3, fontFamily: 'monospace' }}>{m.metric_key}</span>
            </div>
            <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>{m.definition}</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 6 }}>
              {m.nexus_layer} · {m.layer} · {m.security_tier} · {m.update_frequency} · {m.owner}
            </div>
            {m.formula && (
              <div style={{ fontSize: 11, color: C.gold, marginTop: 4, fontFamily: 'monospace' }}>{m.formula}</div>
            )}
          </div>
        ))}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
