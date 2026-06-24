'use client'

import { useEffect, useState } from 'react'
import { Badge, Field, Input, Modal, Select, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'
import { getUser } from '@/lib/users'

const FLAG_LABEL: Record<string, string> = { '01': 'รออนุมัติ', '02': 'อนุมัติแล้ว', '03': 'ปฏิเสธ' }

export default function HrLeavePage() {
  const { colors: C, t } = useApp()
  const [items, setItems] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'ลาพักร้อน', days: '1', reason: '', start_date: '' })
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const user = getUser()
  const role = user?.role?.toLowerCase() || ''
  const canApprove = ['admin', 'hr', 'finance'].includes(role)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  const load = () => {
    Promise.all([
      api.getHrLeaveRequests(),
      api.getLeaveTypes(),
    ])
      .then(([leaveRes, typesRes]) => {
        setItems(leaveRes.data || [])
        setTypes(typesRes.data || [])
      })
      .catch(() => showToast('โหลดไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.start_date || !form.type) { showToast('กรอกวันที่และประเภทลา', 'error'); return }
    const typeName = form.type
    try {
      await api.createHrLeaveRequest({
        type: typeName,
        days: Number(form.days),
        reason: form.reason,
        start_date: form.start_date,
      })
      setShowForm(false)
      showToast('ส่งคำขอลาแล้ว')
      setLoading(true)
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const approve = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.approveHrLeaveStep(id, action)
      showToast(action === 'approve' ? 'อนุมัติขั้นตอนแล้ว' : 'ปฏิเสธแล้ว')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  const typeOptions = types.length ? types.map(tp => tp.name) : ['ลาพักร้อน', 'ลาป่วย', 'ลากิจ']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.hrLeave')}</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>อนุมัติ 8 ขั้น (01–08) — HumanSoft workflow</div>
        </div>
        <button type="button" onClick={() => setShowForm(true)} style={primaryBtn}>+ ขอลา</button>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: C.text3, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}` }}>ไม่มีคำขอลา</div>
      ) : items.map(item => (
        <div key={item.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700, color: C.text }}>{item.employee_name}</div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>{item.type} · {item.days} วัน · {item.start_date}</div>
            </div>
            <Badge type={item.approve_flag === '02' ? 'green' : item.approve_flag === '03' ? 'red' : 'gold'}>
              {FLAG_LABEL[item.approve_flag] || item.status}
            </Badge>
          </div>
          {item.approval_steps?.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {item.approval_steps.map((s: any) => {
                const code = String(s.level).padStart(2, '0')
                const done = s.status === 'approved'
                const rej = s.status === 'rejected'
                return (
                  <span key={s.id} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 99,
                    background: done ? C.greenL : rej ? C.redL : C.bg3,
                    color: done ? C.green : rej ? C.red : C.text2,
                    border: `1px solid ${done ? C.green + '44' : rej ? C.red + '44' : C.border}`,
                  }}>
                    {code} {s.approver_role}: {s.status}
                  </span>
                )
              })}
            </div>
          )}
          {canApprove && item.approve_flag === '01' && item.status === 'pending' && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => approve(item.id, 'approve')} style={{ ...primaryBtn, padding: '6px 12px', fontSize: 11 }}>อนุมัติ</button>
              <button type="button" onClick={() => approve(item.id, 'reject')} style={{ padding: '6px 12px', fontSize: 11, borderRadius: 8, border: `1px solid ${C.red}`, background: C.redL, color: C.red, cursor: 'pointer' }}>ปฏิเสธ</button>
            </div>
          )}
        </div>
      ))}

      {showForm && (
        <Modal title="ขอลา" onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="ประเภท">
              <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} options={typeOptions} />
            </Field>
            <Field label="วันเริ่ม"><Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="จำนวนวัน"><Input type="number" value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} /></Field>
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
