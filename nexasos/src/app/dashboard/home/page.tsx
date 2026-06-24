'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, StatCard, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'
import { getUser } from '@/lib/users'

const HR_PROMPTS = [
  'ลาพักร้อนเหลือกี่วัน?',
  'เดือนนี้หักภาษีเท่าไหร่?',
  'สรุปงานที่ต้องทำวันนี้',
]

export default function UnifiedHomePage() {
  const { colors: C, t } = useApp()
  const router = useRouter()
  const [hub, setHub] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const user = getUser()
  const role = user?.role?.toLowerCase() || 'staff'
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    api.getSelfHub()
      .then(setHub)
      .catch(() => showToast('โหลดหน้าหลักไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const clockIn = async () => {
    try {
      let lat: number | undefined
      let lng: number | undefined
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 }),
          )
          lat = pos.coords.latitude
          lng = pos.coords.longitude
        } catch { /* no gps */ }
      }
      await api.clockIn({ source: lat != null ? 'gps' : 'web', lat, lng })
      showToast('ลงเวลาเข้าแล้ว')
      api.getSelfHub().then(setHub)
    } catch (e: any) { showToast(e.message, 'error') }
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>กำลังโหลด NEXUS OS...</div>

  const hr = hub?.hr || {}
  const att = hr.attendance_today
  const skills = hub?.layers?.L4_skills || []
  const tasks = hub?.layers?.L2_daily_tasks || []
  const logs = hub?.layers?.L5_work_logs || []
  const totalSkill = skills.reduce((s: number, k: any) => s + Number(k.score || 0), 0)
  const slip = hr.latest_payslip
  const isHrAdmin = ['admin', 'hr', 'finance'].includes(role)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.3s ease', maxWidth: 960 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1, textTransform: 'uppercase' }}>NEXUS OS</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginTop: 4 }}>
          สวัสดี {hub?.profile?.name?.split(' ')[0] || user?.name?.split(' ')[0]} 👋
        </div>
        <div style={{ fontSize: 13, color: C.text3, marginTop: 6, lineHeight: 1.6 }}>
          งาน · HR · AI ในที่เดียว — ข้อมูลจริงจากองค์กรของคุณ
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <StatCard icon="clock" label="ลงเวลาวันนี้" value={att?.clock_in ? (att.clock_out ? 'ครบ' : 'เข้าแล้ว') : 'ยังไม่ลง'} color={att?.clock_in ? C.green : C.gold} />
        <StatCard icon="check" label="งาน AI วันนี้" value={String(tasks.length)} color={C.blue} />
        <StatCard icon="target" label="Skill Score" value={String(Math.round(totalSkill))} color={C.green} />
        {slip && (
          <StatCard icon="wallet" label={`สลิป ${slip.month}/${slip.year}`} value={`฿${Number(slip.net).toLocaleString()}`} color={C.gold} />
        )}
      </div>

      {/* HR Quick Actions */}
      <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 12 }}>👤 HR & เวลางาน</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!att?.clock_in && (
            <button type="button" onClick={clockIn} style={actionBtn(C)}>ลงเวลาเข้า</button>
          )}
          {att?.clock_in && !att?.clock_out && (
            <button type="button" onClick={() => api.clockOut().then(() => { showToast('ลงเวลาออกแล้ว'); api.getSelfHub().then(setHub) }).catch((e: any) => showToast(e.message, 'error'))} style={actionBtn(C)}>ลงเวลาออก</button>
          )}
          <button type="button" onClick={() => router.push('/dashboard/hr/attendance')} style={ghostBtn(C)}>ลงเวลา / QR</button>
          <button type="button" onClick={() => router.push('/dashboard/hr/leave')} style={ghostBtn(C)}>ขอลา</button>
          <button type="button" onClick={() => router.push('/dashboard/hr/overtime')} style={ghostBtn(C)}>ขอ OT</button>
          {slip && (
            <button type="button" onClick={() => router.push(`/dashboard/hr/payroll/${user?.id}?period=${slip.period_id}`)} style={ghostBtn(C)}>ดูสลิป</button>
          )}
        </div>
        {hr.leave_quotas?.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {hr.leave_quotas.slice(0, 4).map((q: any) => (
              <span key={q.leave_name} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 99, background: C.bg3, color: C.text2 }}>
                {q.leave_name}: {Number(q.quota_days) - Number(q.used_days)} วัน
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Work + AI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 12 }}>📋 งาน & ข้อมูล</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button type="button" onClick={() => router.push('/dashboard/worklog')} style={ghostBtn(C)}>บันทึกงาน</button>
            <button type="button" onClick={() => router.push('/dashboard/my-data')} style={ghostBtn(C)}>ข้อมูลของฉัน</button>
            <button type="button" onClick={() => router.push('/dashboard/work/todos')} style={ghostBtn(C)}>Todo</button>
          </div>
          {tasks.length === 0 ? (
            <div style={{ fontSize: 12, color: C.text3 }}>ไม่มีงาน AI แนะนำวันนี้</div>
          ) : tasks.slice(0, 3).map((task: any) => (
            <div key={task.id} style={{ fontSize: 12, color: C.text2, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>{task.title || task.task}</div>
          ))}
          {logs[0] && (
            <div style={{ fontSize: 11, color: C.text3, marginTop: 10 }}>ล่าสุด: {logs[0].object?.slice(0, 60)}</div>
          )}
        </section>

        <section style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 12 }}>✨ ถาม AI (รู้ข้อมูล HR + งาน)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {HR_PROMPTS.map(p => (
              <button key={p} type="button" onClick={() => router.push(`/dashboard/my-ai?q=${encodeURIComponent(p)}`)} style={{
                textAlign: 'left', padding: '10px 12px', borderRadius: 10, border: `1px solid ${C.border2}`,
                background: C.bg3, color: C.text2, fontSize: 12, cursor: 'pointer',
              }}>{p}</button>
            ))}
          </div>
          <button type="button" onClick={() => router.push('/dashboard/my-ai')} style={{ ...actionBtn(C), marginTop: 12, width: '100%' }}>เปิดแชท AI</button>
        </section>
      </div>

      {/* HR Admin strip */}
      {isHrAdmin && hr.admin && (
        <section style={{ background: C.goldLight, border: `1px solid ${C.gold}44`, borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.gold, marginBottom: 12 }}>🏢 ภาพรวม HR / เงินเดือน</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge type="gold">รออนุมัติลา {hr.admin.pending_leave}</Badge>
            <Badge type="gold">รอ OT {hr.admin.pending_ot}</Badge>
            {hr.admin.payroll_period && (
              <Badge type="green">งวด {hr.admin.payroll_period.month}/{hr.admin.payroll_period.year} · {hr.admin.payroll_period.status}</Badge>
            )}
            <button type="button" onClick={() => router.push('/dashboard/hr/payroll')} style={ghostBtn(C)}>เงินเดือน</button>
            <button type="button" onClick={() => router.push('/dashboard/hr/leave')} style={ghostBtn(C)}>อนุมัติลา</button>
            {role === 'admin' && (
              <button type="button" onClick={() => router.push('/dashboard/readiness')} style={ghostBtn(C)}>สุขภาพองค์กร</button>
            )}
          </div>
        </section>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}

function actionBtn(C: any): React.CSSProperties {
  return {
    padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg, #B48648, #9C713B)', color: '#fff', fontWeight: 700, fontSize: 12,
  }
}

function ghostBtn(C: any): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.border2}`,
    background: 'transparent', color: C.text2, fontWeight: 600, fontSize: 12, cursor: 'pointer',
  }
}
