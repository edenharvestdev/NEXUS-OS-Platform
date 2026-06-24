'use client'

import { useEffect, useState } from 'react'
import { Field, Input, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function PayrollSettingsPage() {
  const { colors: C } = useApp()
  const [s, setS] = useState<any>({})
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  useEffect(() => {
    api.getPayrollSettings().then(r => setS(r.data || {})).catch(() => {})
  }, [])

  const save = async () => {
    try {
      await api.updatePayrollSettings({
        work_days_per_month: Number(s.work_days_per_month),
        hours_per_day: Number(s.hours_per_day),
        sso_employee_rate: Number(s.sso_employee_rate),
        sso_employer_rate: Number(s.sso_employer_rate),
        sso_salary_cap: Number(s.sso_salary_cap),
        tax_method: s.tax_method || 'progressive',
      })
      setToast({ msg: 'บันทึกการตั้งค่าเงินเดือนแล้ว', type: 'success' })
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
  }

  const field = (key: string, label: string) => (
    <Field label={label}>
      <Input type="number" value={s[key] ?? ''} onChange={e => setS({ ...s, [key]: e.target.value })} />
    </Field>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>ตั้งค่าเงินเดือน</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>วันทำงาน · ชม./วัน · SSO 5% · ภาษีก้าวหน้า</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, padding: 16, borderRadius: 14, background: C.surface, border: `1px solid ${C.border}` }}>
        {field('work_days_per_month', 'วันทำงาน/เดือน')}
        {field('hours_per_day', 'ชั่วโมง/วัน')}
        {field('sso_employee_rate', 'SSO ลูกจ้าง (0.05)')}
        {field('sso_employer_rate', 'SSO นายจ้าง (0.05)')}
        {field('sso_salary_cap', 'เพดาน SSO (บาท)')}
      </div>
      <button type="button" onClick={save} style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#B48648,#9C713B)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>บันทึก</button>
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}
