'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, StatCard, Toast } from '@/lib/ui'
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

async function openTaxForm(type: string, periodId: string) {
  const token = getToken()
  const url = api.exportTaxFormUrl(type, periodId)
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const html = await res.text()
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function PayrollPage() {
  const { colors: C, t } = useApp()
  const router = useRouter()
  const [periods, setPeriods] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  const load = async () => {
    try {
      const [pRes, sRes] = await Promise.all([api.getPayrollPeriods(), api.getPayrollSettings()])
      setPeriods(pRes.data || [])
      setSettings(sRes.data)
      if (!selected && pRes.data?.length) {
        setSelected(pRes.data[0])
      }
    } catch {
      showToast('โหลดข้อมูลเงินเดือนไม่สำเร็จ', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selected?.id) return
    api.getPayrollPeriod(selected.id).then(setDashboard).catch(() => {})
  }, [selected?.id])

  const createPeriod = async () => {
    const now = new Date()
    try {
      const res = await api.createPayrollPeriod(now.getFullYear(), now.getMonth() + 1)
      showToast('สร้างงวดแล้ว')
      setSelected(res.data)
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const calculate = async () => {
    if (!selected?.id) return
    try {
      await api.calculatePayrollPeriod(selected.id)
      showToast('คำนวณเงินเดือนแล้ว')
      const dash = await api.getPayrollPeriod(selected.id)
      setDashboard(dash)
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const finish = async () => {
    if (!selected?.id) return
    try {
      await api.finishPayrollPeriod(selected.id)
      showToast('ปิดงวดแล้ว')
      load()
      const dash = await api.getPayrollPeriod(selected.id)
      setDashboard(dash)
    } catch (e: any) { showToast(e.message, 'error') }
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  const summary = dashboard?.summary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.payroll')}</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
            Payroll Engine — วันทำงาน {settings?.work_days_per_month || 26} วัน · SSO {((settings?.sso_employee_rate || 0.05) * 100).toFixed(0)}%
          </div>
        </div>
        <button type="button" onClick={createPeriod} style={primaryBtn}>+ งวดเดือนนี้</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {periods.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p)}
            style={{
              padding: '8px 14px', borderRadius: 99, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              border: `1px solid ${selected?.id === p.id ? C.gold : C.border2}`,
              background: selected?.id === p.id ? C.goldLight : C.surface,
              color: selected?.id === p.id ? C.gold : C.text2,
            }}
          >
            {p.year}/{String(p.month).padStart(2, '0')} · {p.status}
          </button>
        ))}
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <StatCard icon="users" label="พนักงาน" value={String(summary.employees)} />
          <StatCard icon="chart" label="รายได้รวม" value={`฿${Number(summary.gross).toLocaleString()}`} />
          <StatCard icon="wallet" label="สุทธิรวม" value={`฿${Number(summary.net).toLocaleString()}`} />
          <StatCard icon="alert" label="Anomaly" value={String(summary.anomalies)} />
        </div>
      )}

      {selected && dashboard?.payslips?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: C.text3, alignSelf: 'center' }}>พิมพ์แบบฟอร์ม:</span>
          {[
            { type: 'pnd1', label: 'ภงด.1' },
            { type: 'pnd1k', label: 'ภงด.1ก' },
            { type: 'pnd3', label: 'ภงด.3' },
            { type: 'kt20', label: 'กท.20' },
            { type: 'sso-monthly', label: 'SSO' },
          ].map(f => (
            <button key={f.type} type="button" onClick={() => openTaxForm(f.type, selected.id)} style={{ ...secondaryBtn(C), padding: '6px 10px', fontSize: 11 }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {selected && dashboard?.payslips?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: C.text3, alignSelf: 'center' }}>พิมพ์แบบฟอร์ม:</span>
          {[
            { type: 'pnd1', label: 'ภงด.1' },
            { type: 'pnd1k', label: 'ภงด.1ก' },
            { type: 'pnd3', label: 'ภงด.3' },
            { type: 'kt20', label: 'กท.20' },
            { type: 'sso-monthly', label: 'SSO' },
          ].map(f => (
            <button key={f.type} type="button" onClick={() => openTaxForm(f.type, selected.id)} style={{ ...secondaryBtn(C), padding: '6px 10px', fontSize: 11 }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={calculate} style={primaryBtn} disabled={selected.status === 'closed'}>คำนวณงวด</button>
          <button type="button" onClick={finish} style={secondaryBtn(C)} disabled={selected.status === 'closed'}>ปิดงวด (Finish Month)</button>
        </div>
      )}

      {dashboard?.anomalies?.length > 0 && (
        <div style={{ background: C.redL, border: `1px solid ${C.red}44`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginBottom: 8 }}>แจ้งเตือนก่อนปิดงวด</div>
          {dashboard.anomalies.slice(0, 5).map((a: any) => (
            <div key={a.id} style={{ fontSize: 12, color: C.text2 }}>{a.employee_name} — {a.work_date}: ขาด {a.absence_hours} ชม.</div>
          ))}
        </div>
      )}

      {dashboard?.payslips?.length > 0 && (
        <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 14, background: C.surface }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['พนักงาน', 'รายได้', 'หัก', 'สุทธิ', 'SSO', 'ภาษี', 'สลิป', 'พิมพ์'].map(h => (
                  <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, color: C.text3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboard.payslips.map((s: any) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: C.text }}>{s.employee_name}</td>
                  <td style={{ padding: '11px 14px' }}>฿{Number(s.gross).toLocaleString()}</td>
                  <td style={{ padding: '11px 14px' }}>฿{Number(s.deductions).toLocaleString()}</td>
                  <td style={{ padding: '11px 14px', color: C.gold, fontWeight: 700 }}>฿{Number(s.net).toLocaleString()}</td>
                  <td style={{ padding: '11px 14px' }}>฿{Number(s.sso_employee).toLocaleString()}</td>
                  <td style={{ padding: '11px 14px' }}>฿{Number(s.tax_wht).toLocaleString()}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <button type="button" onClick={() => router.push(`/dashboard/hr/payroll/${s.user_id}?period=${s.period_id}`)} style={{ ...secondaryBtn(C), padding: '6px 10px', fontSize: 11 }}>
                      สลิป
                    </button>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <button type="button" onClick={() => openPayslipExport(s.user_id, s.period_id)} style={{ ...secondaryBtn(C), padding: '6px 10px', fontSize: 11 }}>
                      พิมพ์
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #B48648, #9C713B)', color: '#fff', fontWeight: 700, fontSize: 13,
}

function secondaryBtn(C: any): React.CSSProperties {
  return {
    padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
    border: `1px solid ${C.border2}`, background: C.surface, color: C.text2, fontWeight: 600, fontSize: 13,
  }
}
