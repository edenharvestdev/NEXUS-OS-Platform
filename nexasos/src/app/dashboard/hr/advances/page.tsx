'use client'

import { useEffect, useState } from 'react'
import { Badge, Field, Input, Modal, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function AdvancesPage() {
  const { colors: C, t } = useApp()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '' })
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  const load = () => {
    api.getHrAdvances()
      .then(r => setItems(r.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.description.trim() || !form.amount) {
      showToast('กรอกรายละเอียดและจำนวนเงิน', 'error')
      return
    }
    try {
      await api.createHrAdvance({ amount: Number(form.amount), reason: form.description })
      setShowForm(false)
      setForm({ description: '', amount: '' })
      showToast('ส่งคำขอเบิกล่วงหน้าแล้ว')
      setLoading(true)
      load()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const review = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api.reviewHrAdvance(id, status)
      showToast(status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว')
      load()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  const totalPending = items.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.advances')}</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
            คำขอเบิกล่วงหน้า — รออนุมัติ ฿{totalPending.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #B48648, #9C713B)', color: '#fff', fontSize: 12, fontWeight: 700,
          }}
        >
          + ขอเบิกล่วงหน้า
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: C.text3, fontSize: 13, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}` }}>
          ยังไม่มีคำขอเบิกล่วงหน้า
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{item.reason || item.description}</div>
                <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
                  {item.employee_name} · ฿{Number(item.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <Badge type={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'gold'}>
                {item.status || 'pending'}
              </Badge>
              {item.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => review(item.id, 'approved')} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: C.greenL, color: C.green, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>อนุมัติ</button>
                  <button type="button" onClick={() => review(item.id, 'rejected')} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: C.redL, color: C.red, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>ปฏิเสธ</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="ขอเบิกล่วงหน้า" onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="รายละเอียด" required>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="เช่น เบิกค่าเดินทาง" />
            </Field>
            <Field label="จำนวนเงิน (฿)" required>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
            </Field>
            <button type="button" onClick={submit} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${C.gold},${C.gold2})`, color: '#fff', fontWeight: 700 }}>
              ส่งคำขอ
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}
