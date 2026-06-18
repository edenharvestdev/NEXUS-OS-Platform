'use client'
import { useEffect, useState } from 'react'
import { Badge, StatCard, Field, Input, Toast, ProgressBar } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function FeasibilityPage() {
  const { colors: C } = useApp()
  const [health, setHealth] = useState<any>(null)
  const [form, setForm] = useState({ scenario: 'new_branch', investment: 500000, monthly_revenue: 800000 })
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  useEffect(() => { api.getHealthScore().then(setHealth).catch(() => {}) }, [])

  const run = async () => {
    setLoading(true)
    try {
      const res = await api.simulateFeasibility(form)
      setResult(res)
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease', maxWidth: 720 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>L6 · Feasibility Simulation</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>ถ้าเปิดสาขาใหม่คุ้มไหม? — แสดงสมมติฐาน + ช่วงความเชื่อมั่น (ไม่ใช่ความน่าจะเป็นเป๊ะ)</div>
      </div>
      {health && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard icon="target" label="Org Health" value={`${health.organization_health_score}/100`} color={C.gold} />
          {Object.values(health.dimensions || {}).map((d: any) => (
            <StatCard key={d.label} icon="zap" label={d.label} value={`${d.score}`} color={C.blue} />
          ))}
        </div>
      )}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <Field label="Scenario"><Input value={form.scenario} onChange={e => setForm({ ...form, scenario: e.target.value })} /></Field>
        <Field label="Investment (฿)"><Input type="number" value={form.investment} onChange={e => setForm({ ...form, investment: parseInt(e.target.value) || 0 })} /></Field>
        <Field label="Projected Monthly Revenue (฿)"><Input type="number" value={form.monthly_revenue} onChange={e => setForm({ ...form, monthly_revenue: parseInt(e.target.value) || 0 })} /></Field>
        <button onClick={run} disabled={loading} style={{ marginTop: 8, padding: '12px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.gold2})`, color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>
      {result && (
        <div style={{ background: C.goldLight, border: `1px solid ${C.gold}44`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.gold }}>{result.success_probability_pct}%</div>
          <div style={{ fontSize: 13, color: C.text2, marginBottom: 8 }}>โอกาสสำเร็จ (ช่วง {result.confidence_range?.[0]}–{result.confidence_range?.[1]}%)</div>
          <ProgressBar pct={result.success_probability_pct} color={C.gold} height={10} />
          <div style={{ marginTop: 16 }}>
            <Badge type="blue">Decision Rights: คนตัดสิน — AI เสนอ % เท่านั้น</Badge>
          </div>
          <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 12, color: C.text2, lineHeight: 1.8 }}>
            {(result.assumptions || []).map((a: string, i: number) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
