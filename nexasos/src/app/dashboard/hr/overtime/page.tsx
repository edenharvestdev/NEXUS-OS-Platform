'use client'

import { useEffect, useState } from 'react'
import { Badge, Field, Input, Modal, Select, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'
import { getUser } from '@/lib/users'

export default function OvertimePage() {
  const { colors: C, t } = useApp()
  const [types, setTypes] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ work_date: '', hours: '1', ot_type_id: '', reason: '' })
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const role = getUser()?.role?.toLowerCase() || ''
  const canApprove = ['admin', 'hr', 'finance'].includes(role)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  const load = () => {
    Promise.all([api.getOtTypes(), api.getOtRequests()])
      .then(([tRes, iRes]) => {
        setTypes(tRes.data || [])
        setItems(iRes.data || [])
        if (tRes.data?.[0] && !form.ot_type_id) setForm(f => ({ ...f, ot_type_id: tRes.data[0].id }))
      })
      .catch(() => showToast('โหลดไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.work_date || !form.hours || !form.ot_type_id) { showToast('กรอกข้อมูลให้ครบ', 'error'); return }
    try {
      await api.createOtRequest(form)
      setShowForm(false)
      showToast('ส่งคำขอ OT แล้ว')
      setLoading(true)
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const approve = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.approveOtStep(id, action)
      showToast(action === 'approve' ? 'อนุมัติขั้นตอน OT' : 'ปฏิเสธ OT')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.overtime')}</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>8 การ์ด OT · อนุมัติ 3 ขั้น HR→Finance→Admin</div>
        </div>
        <button type="button" onClick={() => setShowForm(true)} style={primaryBtn}>+ ขอ OT</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
        {types.map(ot => (
          <div key={ot.id} style={{ padding: 12, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, fontSize: 12 }}>
            <div style={{ fontWeight: 700, color: C.gold }}>{ot.code}</div>
            <div style={{ color: C.text2, marginTop: 4 }}>{ot.name}</div>
            <div style={{ color: C.text3, marginTop: 4 }}>×{ot.multiplier}</div>
          </div>
        ))}
      </div>

      {items.map(item => (
        <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: C.text }}>{item.employee_name}</div>
              <div style={{ fontSize: 12, color: C.text3 }}>{item.work_date} · {item.hours} ชม. · {item.ot_type_name} (×{item.multiplier})</div>
            </div>
            <Badge type={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'gold'}>{item.status}</Badge>
          </div>
          {item.approval_steps?.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {item.approval_steps.map((s: any) => (
                <span key={s.id} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 99, background: C.bg3, color: C.text2 }}>
                  {s.label_th || `L${s.level}`}: {s.status}
                </span>
              ))}
            </div>
          )}
          {canApprove && item.status === 'pending' && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => approve(item.id, 'approve')} style={{ ...primaryBtn, padding: '6px 10px', fontSize: 11 }}>อนุมัติ</button>
              <button type="button" onClick={() => approve(item.id, 'reject')} style={{ padding: '6px 10px', fontSize: 11, borderRadius: 8, border: `1px solid ${C.red}`, background: C.redL, color: C.red, cursor: 'pointer' }}>ปฏิเสธ</button>
            </div>
          )}
        </div>
      ))}

      {showForm && (
        <Modal title="ขอล่วงเวลา" onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="วันที่"><Input type="date" value={form.work_date} onChange={e => setForm({ ...form, work_date: e.target.value })} /></Field>
            <Field label="ชั่วโมง"><Input type="number" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} /></Field>
            <Field label="ประเภท OT">
              <Select value={form.ot_type_id} onChange={e => setForm({ ...form, ot_type_id: e.target.value })} options={types.map(ot => ({ value: ot.id, label: `${ot.code} — ${ot.name}` }))} />
            </Field>
            <Field label="เหตุผล"><Input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></Field>
            <button type="button" onClick={submit} style={primaryBtn}>ส่งคำขอ</button>
          </div>
        </Modal>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #B48648, #9C713B)', color: '#fff', fontWeight: 700, fontSize: 13,
}
