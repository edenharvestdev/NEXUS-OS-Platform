'use client'
import { useState, useEffect } from 'react'
import { Input, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

const btn = (C: any, disabled = false): React.CSSProperties => ({
  padding: '10px 24px', borderRadius: 10, background: `linear-gradient(135deg,${C.gold},${C.gold2})`,
  border: 'none', color: '#fff', cursor: disabled ? 'default' : 'pointer', fontSize: 13, fontWeight: 700, opacity: disabled ? 0.6 : 1,
})

export default function SecurityPage() {
  const { colors: C } = useApp()
  const [status, setStatus] = useState<{ enrolled: boolean; enabled: boolean } | null>(null)
  const [enroll, setEnroll] = useState<{ otpauthUri: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  const load = () => api.mfaStatus().then(setStatus).catch(() => setStatus({ enrolled: false, enabled: false }))
  useEffect(() => { load() }, [])

  const startEnroll = async () => {
    setBusy(true)
    try { setEnroll(await api.mfaEnroll()); showToast('สร้างคีย์แล้ว — เพิ่มในแอป Authenticator') }
    catch (e: any) { showToast(e.message || 'ผิดพลาด', 'error') } finally { setBusy(false) }
  }
  const confirm = async () => {
    if (!/^\d{6}$/.test(code)) { showToast('กรอกรหัส 6 หลัก', 'error'); return }
    setBusy(true)
    try { await api.mfaConfirm(code); showToast('เปิด MFA สำเร็จ ✓'); setEnroll(null); setCode(''); load() }
    catch (e: any) { showToast(e.message === 'bad_code' ? 'รหัสไม่ถูกต้อง ลองใหม่' : (e.message || 'ผิดพลาด'), 'error') } finally { setBusy(false) }
  }

  const enabled = !!status?.enabled
  const pill: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
    background: enabled ? 'rgba(76,175,125,0.15)' : C.bg3, color: enabled ? '#4CAF7D' : C.text3,
  }

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 4 }}>ความปลอดภัย (Security)</div>
      <div style={{ fontSize: 12, color: C.text3, marginBottom: 20 }}>
        Two-factor (TOTP) — ใช้เป็น step-up ก่อนเข้าถึงข้อมูลอ่อนไหว (เงินเดือน/ประวัติคนไข้) และก่อนขอ break-glass
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>🔐 Two-Factor Authentication (TOTP)</div>
          <span style={pill}>{enabled ? 'เปิดใช้งาน' : 'ยังไม่เปิด'}</span>
        </div>

        {enabled ? (
          <div style={{ fontSize: 13, color: C.text3, lineHeight: 1.6 }}>
            บัญชีนี้เปิด MFA แล้ว ✓ จะถูกใช้เป็น step-up ก่อนเข้าถึงข้อมูล RESTRICTED และเป็นเงื่อนไขในการขอ break-glass
          </div>
        ) : !enroll ? (
          <div>
            <div style={{ fontSize: 13, color: C.text3, marginBottom: 14, lineHeight: 1.6 }}>
              เปิด MFA เพื่อปลดล็อกการเข้าถึงข้อมูลที่อ่อนไหว — จำเป็นสำหรับ break-glass
            </div>
            <button onClick={startEnroll} disabled={busy} style={btn(C, busy)}>เริ่มตั้งค่า MFA</button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>1. เพิ่มในแอป Authenticator ด้วยคีย์นี้ (กรอกแบบ manual key):</div>
            <div style={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: 1, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, wordBreak: 'break-all', marginBottom: 18 }}>
              {enroll.secret}
            </div>
            <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>2. กรอกรหัส 6 หลักจากแอปเพื่อยืนยัน:</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" style={{ fontFamily: 'monospace', letterSpacing: 6, width: 150, textAlign: 'center' }} />
              <button onClick={confirm} disabled={busy} style={btn(C, busy)}>ยืนยัน</button>
            </div>
          </div>
        )}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
