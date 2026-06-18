'use client'
import { useEffect, useState } from 'react'
import { Badge, Tabs, Field, Input, Select, Textarea, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

const LAYERS = ['People', 'Customer', 'Financial', 'Operation', 'Knowledge', 'Performance']

export default function MyDataPage() {
  const { colors: C } = useApp()
  const [hub, setHub] = useState<any>(null)
  const [tab, setTab] = useState('profile')
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  const [profile, setProfile] = useState({ name: '', phone: '', department: '', hours_per_day: 8, workload_score: 50 })
  const [dictForm, setDictForm] = useState({ layer: 'Performance', metric_key: '', name: '', definition: '', formula: '', source: 'manual', owner: '' })
  const [kpiForm, setKpiForm] = useState({ metric_key: '', metric_name: '', value: '', note: '' })
  const [knowForm, setKnowForm] = useState({ title: '', content: '', layer: 'Knowledge', category: 'SOP' })
  const [skillForm, setSkillForm] = useState({ skill_key: '', note: '' })
  const [patientForm, setPatientForm] = useState({ name: '', phone: '', medical_notes: '', visit_date: '', consent_given: false })
  const [deptName, setDeptName] = useState('')

  const load = () => api.getSelfHub().then(setHub).catch(e => showToast(e.message, 'error'))

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (hub?.profile) {
      setProfile(p => ({
        ...p,
        name: hub.profile.name || '',
        phone: hub.profile.phone || '',
        department: hub.profile.department || '',
        hours_per_day: hub.capacity?.hours_per_day || 8,
        workload_score: hub.capacity?.workload_score || 50,
      }))
    }
  }, [hub])

  const saveProfile = async () => {
    try {
      await api.updateSelfProfile(profile)
      showToast('บันทึกโปรไฟล์ & ความจุแล้ว')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const saveDict = async () => {
    if (!dictForm.metric_key || !dictForm.name || !dictForm.definition) return showToast('กรอก metric_key, name, definition', 'error')
    try {
      await api.createDictionaryEntry(dictForm)
      setDictForm({ layer: 'Performance', metric_key: '', name: '', definition: '', formula: '', source: 'manual', owner: '' })
      showToast('เพิ่ม Data Dictionary แล้ว')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const saveKpi = async () => {
    if (!kpiForm.metric_key || !kpiForm.value) return showToast('กรอก metric และ value', 'error')
    try {
      await api.addSelfKpi({ ...kpiForm, value: Number(kpiForm.value) })
      setKpiForm({ metric_key: '', metric_name: '', value: '', note: '' })
      showToast('บันทึก KPI แล้ว')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const saveKnowledge = async () => {
    if (!knowForm.title || !knowForm.content) return showToast('กรอก title และ content', 'error')
    try {
      await api.addSelfKnowledge(knowForm)
      setKnowForm({ title: '', content: '', layer: 'Knowledge', category: 'SOP' })
      showToast('บันทึก SOP/Knowledge แล้ว')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const saveSkill = async () => {
    if (!skillForm.skill_key) return showToast('ระบุ skill_key', 'error')
    try {
      await api.addSelfSkillEvidence(skillForm)
      showToast('เพิ่ม skill evidence แล้ว')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const savePatient = async () => {
    if (!patientForm.name || !patientForm.consent_given) return showToast('ต้องมีชื่อและยินยอม PDPA', 'error')
    try {
      await api.addPatient(patientForm)
      setPatientForm({ name: '', phone: '', medical_notes: '', visit_date: '', consent_given: false })
      showToast('บันทึกข้อมูลลูกค้า/คนไข้ (T3) แล้ว')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const saveDept = async () => {
    if (!deptName.trim()) return
    try {
      await api.createSelfDepartment(deptName.trim())
      showToast('สร้างแผนกและอัปเดตแผนกของคุณแล้ว')
      setDeptName('')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const completeTask = async (id: string) => {
    try {
      await api.completeDailyTask(id)
      showToast('ทำงาน L2 สำเร็จ')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const genTasks = async () => {
    try {
      await api.getDailyTasks()
      showToast('AI มอบหมายงานวันนี้แล้ว')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const tabs = [
    { id: 'profile', label: 'L1 People' },
    { id: 'dictionary', label: 'L0 Dictionary' },
    { id: 'kpi', label: 'L0 KPI' },
    { id: 'knowledge', label: 'L3 Knowledge' },
    { id: 'skills', label: 'L4 Skills' },
    { id: 'patient', label: 'L0 Customer T3' },
    { id: 'tasks', label: 'L2 Daily Tasks' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>My Data — กรอกข้อมูลทั้งระบบเอง</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>ทุกพนักงานกรอกได้ครบ 6 Layer · ไม่ต้องรอ Admin</div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: 'grid', gap: 12, maxWidth: 560 }}>
          <Field label="ชื่อ"><Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></Field>
          <Field label="โทรศัพท์"><Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></Field>
          <Field label="แผนก"><Input value={profile.department} onChange={e => setProfile({ ...profile, department: e.target.value })} /></Field>
          <Field label="ชั่วโมงทำงาน/วัน"><Input type="number" value={profile.hours_per_day} onChange={e => setProfile({ ...profile, hours_per_day: Number(e.target.value) })} /></Field>
          <Field label="Workload (0-100)"><Input type="number" value={profile.workload_score} onChange={e => setProfile({ ...profile, workload_score: Number(e.target.value) })} /></Field>
          <Field label="สร้างแผนกใหม่ (ถ้ายังไม่มี)">
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={deptName} onChange={e => setDeptName(e.target.value)} placeholder="ชื่อแผนก" />
              <button onClick={saveDept} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.gold, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>สร้าง</button>
            </div>
          </Field>
          <button onClick={saveProfile} style={{ padding: 12, borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.gold2})`, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>บันทึก L1</button>
        </div>
      )}

      {tab === 'dictionary' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: 'grid', gap: 10 }}>
            <Field label="Layer"><Select value={dictForm.layer} onChange={e => setDictForm({ ...dictForm, layer: e.target.value })} options={LAYERS.map(l => ({ value: l, label: l }))} /></Field>
            <Field label="metric_key"><Input value={dictForm.metric_key} onChange={e => setDictForm({ ...dictForm, metric_key: e.target.value })} placeholder="no_show_rate" /></Field>
            <Field label="ชื่อ KPI"><Input value={dictForm.name} onChange={e => setDictForm({ ...dictForm, name: e.target.value })} /></Field>
            <Field label="คำนิยาม"><Textarea value={dictForm.definition} onChange={e => setDictForm({ ...dictForm, definition: e.target.value })} rows={3} /></Field>
            <Field label="สูตร"><Input value={dictForm.formula} onChange={e => setDictForm({ ...dictForm, formula: e.target.value })} /></Field>
            <button onClick={saveDict} style={{ padding: 12, borderRadius: 10, border: 'none', background: C.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>+ เพิ่ม Dictionary</button>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, color: C.text }}>รายการในองค์กร</div>
            {(hub?.layers?.L0_dictionary || []).slice(0, 12).map((d: any) => (
              <div key={d.id} style={{ padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                <Badge type="gold">{d.layer}</Badge> <strong>{d.name}</strong> — {d.metric_key}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'kpi' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, maxWidth: 520, display: 'grid', gap: 10 }}>
          <Field label="metric_key"><Input value={kpiForm.metric_key} onChange={e => setKpiForm({ ...kpiForm, metric_key: e.target.value })} /></Field>
          <Field label="ชื่อ"><Input value={kpiForm.metric_name} onChange={e => setKpiForm({ ...kpiForm, metric_name: e.target.value })} /></Field>
          <Field label="ค่า"><Input type="number" value={kpiForm.value} onChange={e => setKpiForm({ ...kpiForm, value: e.target.value })} /></Field>
          <Field label="หมายเหตุ"><Input value={kpiForm.note} onChange={e => setKpiForm({ ...kpiForm, note: e.target.value })} /></Field>
          <button onClick={saveKpi} style={{ padding: 12, borderRadius: 10, border: 'none', background: C.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>บันทึก KPI</button>
          {(hub?.layers?.L0_kpi_entries || []).slice(0, 8).map((k: any) => (
            <div key={k.id} style={{ fontSize: 12, color: C.text2 }}>{k.metric_key}: {k.value} ({k.period})</div>
          ))}
        </div>
      )}

      {tab === 'knowledge' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, maxWidth: 640, display: 'grid', gap: 10 }}>
          <Field label="หัวข้อ SOP"><Input value={knowForm.title} onChange={e => setKnowForm({ ...knowForm, title: e.target.value })} /></Field>
          <Field label="เนื้อหา"><Textarea value={knowForm.content} onChange={e => setKnowForm({ ...knowForm, content: e.target.value })} rows={5} /></Field>
          <button onClick={saveKnowledge} style={{ padding: 12, borderRadius: 10, border: 'none', background: C.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>บันทึก Knowledge</button>
        </div>
      )}

      {tab === 'skills' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, maxWidth: 480, display: 'grid', gap: 10 }}>
          <Field label="skill_key"><Input value={skillForm.skill_key} onChange={e => setSkillForm({ ...skillForm, skill_key: e.target.value })} placeholder="patient_care" /></Field>
          <Field label="หลักฐาน/หมายเหตุ"><Input value={skillForm.note} onChange={e => setSkillForm({ ...skillForm, note: e.target.value })} /></Field>
          <button onClick={saveSkill} style={{ padding: 12, borderRadius: 10, border: 'none', background: C.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>+ Skill Evidence</button>
          {(hub?.layers?.L4_skills || []).map((s: any) => (
            <div key={s.skill_key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.text2 }}>
              <span>{s.skill_name}</span><Badge type="gold">{Math.round(s.score)}</Badge>
            </div>
          ))}
        </div>
      )}

      {tab === 'patient' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, maxWidth: 520, display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>T3 PDPA — ต้องยินยอมก่อนบันทึก · เข้ารหัส AES-256</div>
          <Field label="ชื่อ"><Input value={patientForm.name} onChange={e => setPatientForm({ ...patientForm, name: e.target.value })} /></Field>
          <Field label="โทร"><Input value={patientForm.phone} onChange={e => setPatientForm({ ...patientForm, phone: e.target.value })} /></Field>
          <Field label="วันนัด"><Input type="date" value={patientForm.visit_date} onChange={e => setPatientForm({ ...patientForm, visit_date: e.target.value })} /></Field>
          <Field label="บันทึกทางการแพทย์"><Textarea value={patientForm.medical_notes} onChange={e => setPatientForm({ ...patientForm, medical_notes: e.target.value })} rows={3} /></Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.text2 }}>
            <input type="checkbox" checked={patientForm.consent_given} onChange={e => setPatientForm({ ...patientForm, consent_given: e.target.checked })} />
            ลูกค้า/คนไข้ยินยอมให้เก็บข้อมูล (PDPA)
          </label>
          <button onClick={savePatient} style={{ padding: 12, borderRadius: 10, border: 'none', background: C.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>บันทึก Customer T3</button>
        </div>
      )}

      {tab === 'tasks' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <button onClick={genTasks} style={{ marginBottom: 16, padding: '10px 18px', borderRadius: 10, border: 'none', background: C.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>รับงาน AI วันนี้ (L2)</button>
          {(hub?.layers?.L2_daily_tasks || []).map((t: any) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.title}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{t.reason || t.skill_key}</div>
              </div>
              <button onClick={() => completeTask(t.id)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.gold}`, background: 'transparent', color: C.gold, cursor: 'pointer', fontWeight: 600 }}>เสร็จ</button>
            </div>
          ))}
          {!(hub?.layers?.L2_daily_tasks || []).length && <div style={{ color: C.text3, fontSize: 13 }}>กดปุ่มด้านบนเพื่อรับงานจาก AI Agent</div>}
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
