'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Badge, Tabs } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'
import { getToken } from '@/lib/users'

async function openPayslipExport(userId: string, periodId: string) {
  const token = getToken()
  const url = api.exportPayslipUrl(userId, periodId)
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const html = await res.text()
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function EmployeePayrollPage() {
  const { colors: C } = useApp()
  const params = useParams()
  const search = useSearchParams()
  const userId = String(params.userId)
  const periodId = search.get('period') || ''
  const [tab, setTab] = useState('calendar')
  const [calendar, setCalendar] = useState<any[]>([])
  const [slip, setSlip] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loads: Promise<any>[] = [
      api.getEmployeeCalendar(userId, periodId || undefined).then(r => setCalendar(r.data || [])),
    ]
    if (periodId) loads.push(api.getPayslip(userId, periodId).then(r => setSlip(r.data)))
    Promise.all(loads).finally(() => setLoading(false))
  }, [userId, periodId])

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{slip?.employee_name || 'พนักงาน'}</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>ปฏิทินรายวัน + สลิปเงินเดือน</div>
        </div>
        {periodId && (
          <button type="button" onClick={() => openPayslipExport(userId, periodId)} style={{
            padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.border2}`, background: C.surface,
            color: C.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>พิมพ์สลิป</button>
        )}
      </div>

      <Tabs tabs={[
        { id: 'calendar', icon: 'calendar', label: 'ตารางเวลา' },
        { id: 'summary', icon: 'wallet', label: 'สรุปผล' },
        { id: 'tax', icon: 'file', label: 'ภาษี' },
      ]} active={tab} onChange={setTab} />

      {tab === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
          {calendar.map(d => (
            <div key={d.id} style={{
              padding: 10, borderRadius: 10, fontSize: 11,
              background: d.day_type === 'weekly_off' ? C.bg3 : C.surface,
              border: `1px solid ${d.absence_hours > 0 ? C.red + '66' : C.border}`,
            }}>
              <div style={{ fontWeight: 700, color: C.text }}>{d.work_date?.slice(8)}</div>
              <div style={{ color: C.text3, marginTop: 4 }}>{d.hours_worked || 0}ชม.</div>
              {d.anomalies?.length > 0 && <Badge type="red">!</Badge>}
            </div>
          ))}
        </div>
      )}

      {tab === 'summary' && slip && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.gold }}>฿{Number(slip.net).toLocaleString()}</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>เงินเดือนสุทธิ</div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(slip.items || []).map((it: any) => (
              <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: C.text2 }}>{it.name}</span>
                <span style={{ color: it.item_type === 'deduction' ? C.red : C.green }}>
                  {it.item_type === 'deduction' ? '-' : '+'}฿{Number(it.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'tax' && slip && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>ภาษีหัก ณ ที่จ่าย (ภงด.1)</span>
            <strong>฿{Number(slip.tax_wht).toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>ประกันสังคม</span>
            <strong>฿{Number(slip.sso_employee).toLocaleString()}</strong>
          </div>
        </div>
      )}
    </div>
  )
}
