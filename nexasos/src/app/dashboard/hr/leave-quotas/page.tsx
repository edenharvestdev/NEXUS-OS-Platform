'use client'

import { useEffect, useState } from 'react'
import { Field, Input, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function LeaveQuotasPage() {
  const { colors: C, t } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  const load = () => {
    setLoading(true)
    api.getLeaveQuotas(year).then(r => setRows(r.data || [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [year])

  const save = async (id: string, quota: number) => {
    try {
      await api.updateLeaveQuota(id, quota)
      setToast({ msg: 'อัปเดตโควตาแล้ว', type: 'success' })
      load()
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>โควตาการลา</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>รายคน · รายประเภท · รายปี</div>
        </div>
        <Field label="ปี">
          <Input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 100 }} />
        </Field>
      </div>
      <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 14, background: C.surface }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['พนักงาน', 'ประเภท', 'โควตา', 'ใช้แล้ว', 'คงเหลือ', ''].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, color: C.text3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const remain = Number(r.quota_days) - Number(r.used_days)
              return (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '10px 12px', color: C.text }}>{r.employee_name}</td>
                  <td style={{ padding: '10px 12px', color: C.text2 }}>{r.leave_name}</td>
                  <td style={{ padding: '10px 12px' }}>{r.quota_days}</td>
                  <td style={{ padding: '10px 12px' }}>{r.used_days}</td>
                  <td style={{ padding: '10px 12px', color: remain < 0 ? C.red : C.green }}>{remain}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button type="button" onClick={() => save(r.id, Number(r.quota_days) + 1)} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.border2}`, background: C.surface, cursor: 'pointer' }}>+1 โควตา</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}
