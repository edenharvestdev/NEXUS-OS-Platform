'use client'
import { useState, useEffect } from 'react'
import { Ic, Avatar, Badge, StatCard, Modal, Field, Input, Select, Tabs, ProgressBar, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { useAppData } from '@/lib/data'
import { api } from '@/lib/api'

type DeptDef = { name: string; systemRole: string; label_th: string }

export default function PeoplePage() {
  const { colors: C } = useApp()
  const { employees, setEmployees } = useAppData()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [showLeave, setShowLeave] = useState<any>(null)
  const [deptDefs, setDeptDefs] = useState<DeptDef[]>([])
  const [newEmp, setNewEmp] = useState({ name: '', email: '', password: '', department: 'HR', phone: '', salary: '' })
  const [leaveForm, setLeaveForm] = useState({ type: 'ลาพักร้อน', days: 1, reason: '', startDate: '' })
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    api.getDepartments()
      .then(res => {
        const defs = res.definitions || []
        setDeptDefs(defs)
        if (defs.length && !defs.some(d => d.name === newEmp.department)) {
          setNewEmp(e => ({ ...e, department: defs[0].name }))
        }
      })
      .catch(() => {})
  }, [])

  const deptLabel = (deptName: string) =>
    deptDefs.find(d => d.name === deptName)?.label_th || deptName

  const filtered = (employees || []).filter(e => {
    const dept = e.dept || e.department || ''
    const m = (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
              dept.toLowerCase().includes(search.toLowerCase()) ||
              (e.email || '').toLowerCase().includes(search.toLowerCase())
    if (activeTab === 'all') return m
    if (activeTab === 'active') return m && e.status === 'active'
    return m && e.status === 'leave'
  })

  const addEmployee = async () => {
    if (!newEmp.name || !newEmp.email || !newEmp.password || !newEmp.department) {
      showToast('กรุณากรอก ชื่อ, อีเมล, รหัสผ่าน, แผนก', 'error')
      return
    }
    try {
      const res = await api.createEmployee({
        name: newEmp.name,
        email: newEmp.email,
        password: newEmp.password,
        department: newEmp.department,
        phone: newEmp.phone || undefined,
        salary: newEmp.salary || undefined,
      })
      setEmployees(e => [res.data, ...e])
      setNewEmp({ name: '', email: '', password: '', department: deptDefs[0]?.name || 'HR', phone: '', salary: '' })
      setShowModal(false)
      showToast('เพิ่มพนักงานสำเร็จ')
    } catch (err: any) {
      showToast(err.message || 'เพิ่มไม่สำเร็จ', 'error')
    }
  }

  const deleteEmployee = async (id: string) => {
    try {
      await api.deleteEmployee(id)
      setEmployees(e => e.filter(x => x.id !== id))
      setShowDetail(null)
      showToast('ลบพนักงานแล้ว')
    } catch (err: any) {
      showToast(err.message || 'ลบไม่สำเร็จ', 'error')
    }
  }

  const [showReview, setShowReview] = useState<any>(null)
  const [reviewing, setReviewing] = useState(false)

  const requestLeave = async () => {
    if (!showLeave?.id) return
    try {
      await api.createLeaveRequest({
        user_id: showLeave.id,
        type: leaveForm.type,
        days: leaveForm.days,
        reason: leaveForm.reason,
        start_date: leaveForm.startDate || new Date().toISOString().slice(0, 10),
      })
      setShowLeave(null)
      showToast('ส่งคำขอลาไปยัง HR แล้ว')
    } catch (err: any) {
      showToast(err.message || 'ส่งคำขอลาไม่สำเร็จ', 'error')
    }
  }

  const runPerformanceReview = async (id: string) => {
    setReviewing(true)
    try {
      const res = await api.reviewEmployee(id)
      setShowReview({ ...res.data, empId: id })
      setShowDetail(null)
    } catch (err: any) {
      showToast('AI ประเมินผลล้มเหลว', 'error')
    } finally {
      setReviewing(false)
    }
  }

  const deptOptions = deptDefs.length
    ? deptDefs.map(d => d.name)
    : ['Management', 'Finance', 'HR', 'Sales', 'Marketing', 'IT', 'Operation']

  const activeDepts = [...new Set((employees || []).map(e => e.dept || e.department))].filter(Boolean)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>HR & People Hub</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>
            จัดการพนักงานแยกตามแผนก · {employees.length} คน · 7 แผนกมาตรฐาน
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => showToast('กำลังเตรียมรายงาน...')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border2}`, color: C.text2, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}><Ic n="download" s={13} />Export CSV</button>
          <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 12, background: C.gold, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: `0 4px 12px ${C.gold}33` }}><Ic n="plus" s={14} />เพิ่มพนักงาน</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon="users" label="พนักงานทั้งหมด" value={employees.length} color={C.blue} />
        <StatCard icon="calendar" label="ลาพักผ่อนวันนี้" value={employees.filter(e => e.status === 'leave').length} color={C.gold} />
        <StatCard icon="zap" label="แผนกที่มีคน" value={activeDepts.length} color={C.purple} />
        <StatCard icon="trending" label="แผนกมาตรฐาน" value={deptDefs.length || 7} sub="Management → Operation" color={C.green} />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', background: C.surface, padding: '10px 14px', borderRadius: 16, border: `1px solid ${C.border}` }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
          <Ic n="search" s={14} c={C.text3} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input placeholder="ค้นหาด้วยชื่อ, อีเมล หรือแผนก..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border2}`, borderRadius: 12, padding: '10px 14px 10px 40px', color: C.text, fontFamily: 'Montserrat', fontSize: 13, outline: 'none', width: '100%' }} />
        </div>
        <Tabs tabs={[{ id: 'all', label: 'ทั้งหมด' }, { id: 'active', label: 'กำลังทำงาน' }, { id: 'leave', label: 'อยู่ระหว่างลา' }]} active={activeTab} onChange={setActiveTab} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
        {filtered.map((emp, i) => (
          <div key={emp.id} onClick={() => setShowDetail(emp)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: 18, cursor: 'pointer', transition: 'all 0.25s', animation: `fadeIn 0.3s ease ${i * 0.04}s both`, boxShadow: `0 4px 15px rgba(0,0,0,0.1)` }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.gold + '44'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.transform = '' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
              <Avatar name={emp.name} size={48} color={emp.color || C.gold} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2, fontWeight: 500 }}>{deptLabel(emp.dept || emp.department)}</div>
                <div style={{ marginTop: 6 }}><Badge type="gold">{emp.dept || emp.department}</Badge></div>
              </div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: emp.status === 'active' ? C.green : C.gold, marginTop: 4, boxShadow: emp.status === 'active' ? `0 0 10px ${C.green}55` : `0 0 10px ${C.gold}55` }} />
            </div>
            <div style={{ marginBottom: 12, background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: C.text3, fontWeight: 600 }}>วันลาพักร้อนคงเหลือ</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: C.gold }}>{(emp.leave || 15) - (emp.leaveUsed || 0)}/{(emp.leave || 15)} วัน</span>
              </div>
              <ProgressBar pct={(((emp.leave || 15) - (emp.leaveUsed || 0)) / (emp.leave || 15)) * 100} color={C.gold} height={5} />
            </div>
            <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowLeave(emp)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 10, background: C.goldLight, border: `1px solid ${C.gold}33`, color: C.gold, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                <Ic n="calendar" s={12} />ทำเรื่องลา
              </button>
              <button onClick={() => setShowDetail(emp)} style={{ padding: '8px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer' }}>
                <Ic n="eye" s={14} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ gridColumn: '1/-1', padding: 60, textAlign: 'center', color: C.text3, fontSize: 14, border: `1px dashed ${C.border}`, borderRadius: 18 }}>ไม่พบพนักงานที่ค้นหา</div>}
      </div>

      {showModal && (
        <Modal title="ลงทะเบียนพนักงานใหม่" onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.6 }}>
              เลือกแผนก → ระบบกำหนดสิทธิ์และโมดูลอัตโนมัติ (Finance → การเงิน, Sales → ขาย, ฯลฯ)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="ชื่อ-นามสกุล" required><Input placeholder="เช่น สมชาย ใจดี" value={newEmp.name} onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} /></Field>
              <Field label="อีเมลเข้าระบบ" required><Input placeholder="name@company.com" type="email" value={newEmp.email} onChange={e => setNewEmp({ ...newEmp, email: e.target.value })} /></Field>
              <Field label="รหัสผ่านเริ่มต้น" required><Input placeholder="อย่างน้อย 6 ตัวอักษร" type="password" value={newEmp.password} onChange={e => setNewEmp({ ...newEmp, password: e.target.value })} /></Field>
              <Field label="แผนกต้นสังกัด" required>
                <Select value={newEmp.department} onChange={e => setNewEmp({ ...newEmp, department: e.target.value })} options={deptOptions} />
              </Field>
              <Field label="สิทธิ์ระบบ (อัตโนมัติ)">
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border2}`, fontSize: 13, color: C.gold, fontWeight: 700 }}>
                  {deptLabel(newEmp.department)}
                </div>
              </Field>
              <Field label="เงินเดือน (฿)"><Input placeholder="0.00" type="number" value={newEmp.salary} onChange={e => setNewEmp({ ...newEmp, salary: e.target.value })} /></Field>
              <Field label="เบอร์โทรศัพท์"><Input placeholder="08x-xxx-xxxx" value={newEmp.phone} onChange={e => setNewEmp({ ...newEmp, phone: e.target.value })} /></Field>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 24px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>ยกเลิก</button>
              <button onClick={addEmployee} style={{ padding: '10px 24px', borderRadius: 12, background: C.gold, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>ยืนยันเพิ่มพนักงาน</button>
            </div>
          </div>
        </Modal>
      )}

      {showDetail && (
        <Modal title="โปรไฟล์พนักงาน" onClose={() => setShowDetail(null)} width={550}>
          <div style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'center', background: C.bg3, padding: 20, borderRadius: 18, border: `1px solid ${C.border}` }}>
            <Avatar name={showDetail.name} size={72} color={showDetail.color || C.gold} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.text }}>{showDetail.name}</div>
              <div style={{ fontSize: 14, color: C.text3, marginTop: 4 }}>
                {deptLabel(showDetail.dept || showDetail.department)} · <span style={{ color: C.gold, fontWeight: 700 }}>{showDetail.dept || showDetail.department}</span>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <Badge type={showDetail.status === 'active' ? 'green' : 'gold'}>{showDetail.status === 'active' ? 'Working Now' : 'On Leave'}</Badge>
                <Badge type="blue">Employee ID: {showDetail.id?.slice(-4) || 'NEW'}</Badge>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              ['อีเมลพนักงาน', showDetail.email || '-', 'mail'],
              ['เบอร์ติดต่อ', showDetail.phone || '-', 'phone'],
              ['เงินเดือนปัจจุบัน', `฿${Number(showDetail.salary || 0).toLocaleString()}`, 'dollar'],
              ['วันลาคงเหลือ', `${(showDetail.leave || 15) - (showDetail.leaveUsed || 0)} / ${(showDetail.leave || 15)} วัน`, 'calendar'],
            ].map(([l, v, icon]: any) => (
              <div key={l} style={{ background: C.surface, borderRadius: 12, padding: '14px', display: 'flex', gap: 12, alignItems: 'center', border: `1px solid ${C.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.gold}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ic n={icon} s={16} c={C.gold} /></div>
                <div><div style={{ fontSize: 10, color: C.text3, marginBottom: 2 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{v}</div></div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <button onClick={() => runPerformanceReview(showDetail.id)} disabled={reviewing} style={{ flex: 2, padding: '12px', borderRadius: 12, background: C.purpleL, border: `1px solid ${C.purple}33`, color: C.purple, cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {reviewing ? <div style={{ animation: 'spin 1s linear infinite' }}><Ic n="cpu" s={14} /></div> : <Ic n="zap" s={14} />}
              {reviewing ? 'AI กำลังวิเคราะห์...' : 'ประเมินผลด้วย Gemini AI'}
            </button>
            <button onClick={() => { setShowLeave(showDetail); setShowDetail(null) }} style={{ flex: 1, padding: '12px', borderRadius: 12, background: C.goldLight, border: `1px solid ${C.gold}33`, color: C.gold, cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Ic n="calendar" s={14} />จัดการวันลา</button>
            <button onClick={() => deleteEmployee(showDetail.id)} style={{ padding: '12px 18px', borderRadius: 12, background: C.redL, border: `1px solid ${C.red}33`, color: C.red, cursor: 'pointer' }} title="ลบออกจากระบบ"><Ic n="trash" s={18} /></button>
          </div>
        </Modal>
      )}

      {showLeave && (
        <Modal title={`คำขอลาหยุด — ${showLeave.name}`} onClose={() => setShowLeave(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="ประเภทการลา">
              <Select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })} options={['ลาพักร้อน (Annual)', 'ลาป่วย (Sick)', 'ลากิจ (Personal)', 'ลาอื่นๆ (Other)']} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="วันที่เริ่มต้น"><Input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} /></Field>
              <Field label="จำนวนวันลาทั้งหมด"><Input type="number" placeholder="1" value={leaveForm.days} onChange={e => setLeaveForm({ ...leaveForm, days: parseInt(e.target.value) || 1 })} /></Field>
            </div>
            <Field label="ระบุเหตุผลการลา">
              <textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="ระบุรายละเอียดเพื่อให้หัวหน้างานพิจารณา..." style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border2}`, borderRadius: 14, padding: 14, color: C.text, fontFamily: 'inherit', fontSize: 13, outline: 'none', width: '100%', minHeight: 100, resize: 'vertical', lineHeight: 1.6 }} />
            </Field>
            <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}33`, borderRadius: 14, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: C.text2, fontWeight: 600 }}>วันลาคงเหลือปัจจุบัน:</span>
              <span style={{ fontSize: 14, color: C.gold, fontWeight: 900 }}>{(showLeave.leave || 15) - (showLeave.leaveUsed || 0)} วัน</span>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={() => setShowLeave(null)} style={{ padding: '10px 24px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>ยกเลิก</button>
              <button onClick={requestLeave} style={{ padding: '12px 30px', borderRadius: 12, background: C.gold, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>ยืนยันการลา</button>
            </div>
          </div>
        </Modal>
      )}

      {showReview && (
        <Modal title={`AI Performance Insights — ${employees.find(e => e.id === showReview.empId)?.name}`} onClose={() => setShowReview(null)} width={600}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: `${C.purple}10`, border: `1px solid ${C.purple}33`, borderRadius: 20, padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid ${C.purple}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: C.purple, background: '#fff' }}>
                {showReview.rating}<span style={{ fontSize: 14 }}>/5</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.purple, marginBottom: 6 }}>Gemini Performance Rating</div>
                <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{showReview.summary}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: C.surface, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.green, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Ic n="check" s={14} c={C.green} /> จุดแข็ง</div>
                {showReview.strengths?.map((s: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 8, paddingLeft: 14, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: C.green }}>•</span> {s}
                  </div>
                ))}
              </div>
              <div style={{ background: C.surface, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Ic n="trending" s={14} c={C.gold} /> ประเด็นที่ควรพัฒนา</div>
                {showReview.improvements?.map((s: string, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: C.text, marginBottom: 8, paddingLeft: 14, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: C.gold }}>•</span> {s}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: `${C.gold}10`, borderLeft: `4px solid ${C.gold}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, marginBottom: 8 }}>คำแนะนำสำหรับการเติบโต (Career Path)</div>
              <p style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>{showReview.advice}</p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={() => setShowReview(null)} style={{ padding: '12px 30px', borderRadius: 12, background: C.purple, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>ปิดการประเมิน</button>
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
