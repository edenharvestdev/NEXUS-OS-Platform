'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge, StatCard, Tabs, Field, Input, Select, Modal, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { useAppData } from '@/lib/data'
import { api } from '@/lib/api'
import { getUser } from '@/lib/users'

export default function StaffHomePage() {
  const { colors: C } = useApp()
  const router = useRouter()
  const { tasks } = useAppData()
  const [user, setUser] = useState<any>(null)
  const [skills, setSkills] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [showLog, setShowLog] = useState(false)
  const [form, setForm] = useState({ object: '', action_type: 'submit' })
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    const u = getUser()
    setUser(u)
    api.getSkillWallet().then(r => setSkills(r.data || [])).catch(() => {})
    api.getWorkLogs().then(all => setLogs((all || []).filter((l: any) => l.user_id === u?.id).slice(0, 5))).catch(() => {})
  }, [])

  const myTasks = (tasks || []).filter((t: any) => !t.done && t.done !== 1)
  const totalSkill = skills.reduce((s, k) => s + Number(k.score || 0), 0)

  const submit = async () => {
    if (!form.object.trim()) return showToast('ระบุงานที่ทำ', 'error')
    try {
      await api.createWorkLog({ action_type: 'submit', object: form.object, status: 'review' })
      setShowLog(false)
      setForm({ object: '', action_type: 'submit' })
      showToast('ส่งงานแล้ว — รอหัวหน้าตรวจ')
      api.getWorkLogs().then(all => setLogs((all || []).filter((l: any) => l.user_id === user?.id).slice(0, 5)))
    } catch (e: any) { showToast(e.message, 'error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>สวัสดี {user?.name?.split(' ')[0]} 👋</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>L5 Workspace — งานวันนี้ · KPI · ส่งงานพร้อมหลักฐาน</div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon="zap" label="งานค้าง" value={myTasks.length.toString()} color={C.gold} />
        <StatCard icon="target" label="Skill Score" value={Math.round(totalSkill).toString()} color={C.green} />
        <StatCard icon="check" label="Log ล่าสุด" value={logs.length.toString()} color={C.blue} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => setShowLog(true)} style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.gold2})`, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>+ ส่งงาน</button>
        <button onClick={() => router.push('/dashboard/worklog')} style={{ padding: '12px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text2, fontWeight: 600, cursor: 'pointer' }}>Work Log ทั้งหมด</button>
        <button onClick={() => router.push('/dashboard/my-data')} style={{ padding: '12px 20px', borderRadius: 10, border: `1px solid ${C.gold}`, background: C.goldLight, color: C.gold, fontWeight: 700, cursor: 'pointer' }}>My Data — กรอกทั้งระบบ</button>
        <button onClick={() => router.push('/dashboard/onboarding')} style={{ padding: '12px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text2, fontWeight: 600, cursor: 'pointer' }}>Setup Wizard</button>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>งานวันนี้</div>
        {myTasks.length === 0 ? <div style={{ color: C.text3, fontSize: 13 }}>ไม่มีงานค้าง 🎉</div> : myTasks.map((t: any) => (
          <div key={t.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.text2 }}>{t.title}</div>
        ))}
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Skill Wallet (L4)</div>
        {skills.map(s => (
          <div key={s.skill_key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.text2 }}>{s.skill_name}</span>
            <Badge type="gold">{Math.round(s.score)} pts</Badge>
          </div>
        ))}
      </div>
      {showLog && (
        <Modal title="ส่งงาน (L5)" onClose={() => setShowLog(false)}>
          <Field label="สิ่งที่ทำ" required><Input value={form.object} onChange={e => setForm({ ...form, object: e.target.value })} placeholder="อธิบายงานที่ทำเสร็จ" /></Field>
          <button onClick={submit} style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.gold2})`, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>ส่ง Work Log</button>
        </Modal>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
