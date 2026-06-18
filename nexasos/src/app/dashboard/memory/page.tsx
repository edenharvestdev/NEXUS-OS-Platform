'use client'
import { useState } from 'react'
import { Field, Input, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function MemoryPage() {
  const { colors: C } = useApp()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [explain, setExplain] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  const search = async () => {
    if (!q.trim()) return
    setLoading(true)
    try {
      const r = await api.searchMemory(q)
      setResults(r.data || [])
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
    setLoading(false)
  }

  const askWhy = async () => {
    if (!q.trim()) return
    setLoading(true)
    try {
      const r = await api.explainMemory(q)
      setExplain(r)
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Memory Search (L3)</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>§7 — ค้นหาเหตุผล เช่น &quot;ทำไมยอดสาขาลด?&quot;</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label=""><Input value={q} onChange={e => setQ(e.target.value)} placeholder="ทำไม no-show สูง / ทำไมยอดลด" /></Field>
        <button onClick={search} disabled={loading} style={{ alignSelf: 'flex-end', padding: '10px 18px', borderRadius: 10, border: 'none', background: C.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>ค้นหา</button>
        <button onClick={askWhy} disabled={loading} style={{ alignSelf: 'flex-end', padding: '10px 18px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text2, fontWeight: 600, cursor: 'pointer' }}>AI อธิบาย</button>
      </div>
      {results.map((r, i) => (
        <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 700 }}>{r.source} · {r.layer}</div>
          <div style={{ fontWeight: 600, color: C.text, marginTop: 4 }}>{r.title}</div>
          <div style={{ fontSize: 12, color: C.text2, marginTop: 6 }}>{String(r.content).slice(0, 300)}</div>
        </div>
      ))}
      {explain?.ai_summary && (
        <div style={{ background: C.goldLight, border: `1px solid ${C.gold}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 700, color: C.gold, marginBottom: 8 }}>AI Analysis</div>
          <div style={{ fontSize: 13, color: C.text2, whiteSpace: 'pre-wrap' }}>{explain.ai_summary}</div>
        </div>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
