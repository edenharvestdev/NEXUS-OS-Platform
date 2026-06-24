'use client'

import { useEffect, useState } from 'react'
import { Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function LeaveWorkflowPage() {
  const { colors: C } = useApp()
  const [levels, setLevels] = useState<any[]>([])
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  const load = () => api.getLeaveApprovalConfig().then(r => setLevels(r.data || [])).catch(() => {})

  useEffect(() => { load() }, [])

  const toggle = (level: number) => {
    setLevels(prev => prev.map(l => l.level === level ? { ...l, enabled: l.enabled ? 0 : 1 } : l))
  }

  const save = async () => {
    try {
      await api.updateLeaveApprovalConfig(levels.map(l => ({ level: l.level, enabled: !!l.enabled, approver_role: l.approver_role, label_th: l.label_th })))
      setToast({ msg: 'บันทึก workflow ลาแล้ว', type: 'success' })
      load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>อนุมัติลา 8 ขั้น (01–08)</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>เปิด/ปิดแต่ละขั้น — HumanSoft CCS workflow</div>
      </div>
      {levels.map(l => (
        <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, background: C.surface, border: `1px solid ${l.enabled ? C.gold + '66' : C.border}` }}>
          <button type="button" onClick={() => toggle(l.level)} style={{
            width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
            background: l.enabled ? C.gold : C.surface2, position: 'relative',
          }}>
            <span style={{ position: 'absolute', top: 3, left: l.enabled ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: C.text }}>{l.label_th}</div>
            <div style={{ fontSize: 11, color: C.text3 }}>role: {l.approver_role}</div>
          </div>
        </div>
      ))}
      <button type="button" onClick={save} style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#B48648,#9C713B)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>บันทึก</button>
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}
