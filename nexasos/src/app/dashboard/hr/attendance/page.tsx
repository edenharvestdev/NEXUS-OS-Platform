'use client'

import { useEffect, useState } from 'react'
import { Field, Input, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function AttendancePage() {
  const { colors: C, t } = useApp()
  const [rows, setRows] = useState<any[]>([])
  const [today, setToday] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'web' | 'qr'>('web')
  const [qrToken, setQrToken] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  const load = () => {
    api.getAttendance()
      .then(r => {
        const data = r.data || []
        setRows(data)
        const d = new Date().toISOString().slice(0, 10)
        setToday(data.find((x: any) => x.work_date === d))
      })
      .catch(() => showToast('โหลดข้อมูลลงเวลาไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const getGps = async () => {
    if (!navigator.geolocation) return {}
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
      )
      return { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch { return {} }
  }

  const clockIn = async () => {
    try {
      const gps = await getGps()
      await api.clockIn({ source: gps.lat != null ? 'gps' : 'web', ...gps })
      showToast(gps.lat != null ? 'ลงเวลาเข้าแล้ว (GPS)' : 'ลงเวลาเข้าแล้ว')
      setLoading(true)
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const clockInQr = async () => {
    if (!qrToken.trim()) { showToast('สแกนหรือวาง QR token', 'error'); return }
    try {
      const gps = await getGps()
      await api.clockInQr({ qr_token: qrToken.trim(), ...gps })
      showToast('ลงเวลาเข้าแล้ว (QR)')
      setQrToken('')
      setLoading(true)
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const clockOut = async () => {
    try {
      await api.clockOut()
      showToast('ลงเวลาออกแล้ว')
      setLoading(true)
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.attendance')}</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>Web · GPS · QR — HumanSoft mobile pattern</div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {(['web', 'qr'] as const).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)} style={{
            padding: '8px 14px', borderRadius: 99, border: `1px solid ${mode === m ? C.gold : C.border2}`,
            background: mode === m ? C.goldLight : 'transparent', color: mode === m ? C.gold : C.text3,
            fontWeight: 600, fontSize: 12, cursor: 'pointer',
          }}>{m === 'web' ? 'ลงเวลาปกติ' : 'สแกน QR'}</button>
        ))}
      </div>

      {mode === 'web' ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={clockIn} disabled={!!today?.clock_in} style={btnStyle(C, !today?.clock_in)}>ลงเวลาเข้า (GPS)</button>
          <button type="button" onClick={clockOut} disabled={!today?.clock_in || !!today?.clock_out} style={btnStyle(C, today?.clock_in && !today?.clock_out)}>ลงเวลาออก</button>
        </div>
      ) : (
        <div style={{ padding: 16, borderRadius: 14, background: C.surface, border: `1px solid ${C.border}` }}>
          <Field label="QR Token (จากสแกน QR ที่จุดลงเวลา)">
            <Input value={qrToken} onChange={e => setQrToken(e.target.value)} placeholder="วาง token หรือสแกนด้วยแอปอ่าน QR" />
          </Field>
          <button type="button" onClick={clockInQr} disabled={!!today?.clock_in} style={{ ...btnStyle(C, !today?.clock_in), marginTop: 12 }}>ลงเวลาเข้า (QR)</button>
        </div>
      )}

      <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 14, background: C.surface }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['วันที่', 'พนักงาน', 'เข้า', 'ออก', 'ชม.', 'แหล่ง'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, color: C.text3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map(r => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '11px 14px', color: C.text2 }}>{r.work_date}</td>
                <td style={{ padding: '11px 14px', color: C.text }}>{r.employee_name || '—'}</td>
                <td style={{ padding: '11px 14px' }}>{r.clock_in || '—'}</td>
                <td style={{ padding: '11px 14px' }}>{r.clock_out || '—'}</td>
                <td style={{ padding: '11px 14px' }}>{r.hours_worked || 0}</td>
                <td style={{ padding: '11px 14px', fontSize: 11, color: C.text3 }}>{r.source || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}

function btnStyle(C: any, enabled?: boolean) {
  return {
    padding: '10px 18px', borderRadius: 10, border: 'none', cursor: enabled ? 'pointer' : 'not-allowed',
    background: enabled ? 'linear-gradient(135deg, #B48648, #9C713B)' : C.surface2,
    color: enabled ? '#fff' : C.text3, fontWeight: 700, fontSize: 13, opacity: enabled ? 1 : 0.6,
  } as const
}
