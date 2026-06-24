'use client'

import { useEffect, useState } from 'react'
import { Field, Input, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function ShiftsSettingsPage() {
  const { colors: C, t } = useApp()
  const [shifts, setShifts] = useState<any[]>([])
  const [form, setForm] = useState({ code: '', name: '', start_time: '09:00', end_time: '18:00', break_minutes: '60' })
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  const load = () => api.getShifts().then(r => setShifts(r.data || [])).catch(() => {})

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.code || !form.name) return
    try {
      await api.createShift({ ...form, break_minutes: Number(form.break_minutes) })
      setForm({ code: '', name: '', start_time: '09:00', end_time: '18:00', break_minutes: '60' })
      load()
      setToast({ msg: 'เพิ่มกะแล้ว', type: 'success' })
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>กะการทำงาน</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>6 ประเภทกะ — HumanSoft pattern</div>
      </div>
      {shifts.map(s => (
        <div key={s.id} style={{ padding: 14, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, color: C.text }}>{s.code} — {s.name}</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>{s.start_time} – {s.end_time} · พัก {s.break_minutes} นาที</div>
        </div>
      ))}
      <div style={{ padding: 16, borderRadius: 14, background: C.surface, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: C.text }}>เพิ่มกะใหม่</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <Field label="รหัส"><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="ชื่อ"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="เริ่ม"><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></Field>
          <Field label="เลิก"><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></Field>
        </div>
        <button type="button" onClick={create} style={{ marginTop: 12, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#B48648,#9C713B)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>บันทึก</button>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}
