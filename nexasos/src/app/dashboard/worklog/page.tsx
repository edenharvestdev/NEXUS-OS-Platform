'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Ic, Badge, StatCard, Tabs, Field, Input, Select, Modal, Toast, EmptyState, ProgressBar,
} from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { useAppData } from '@/lib/data'
import { api } from '@/lib/api'
import { getUser } from '@/lib/users'

const ACTION_TYPES = [
  { value: 'accept', label: 'รับงาน' },
  { value: 'start', label: 'เริ่มงาน' },
  { value: 'submit', label: 'ส่งงาน' },
  { value: 'issue', label: 'แจ้งปัญหา' },
]

const STATUS_MAP: Record<string, { type: string; label: string }> = {
  pending:  { type: 'gold', label: 'รอตรวจ' },
  approved: { type: 'green', label: 'ผ่าน' },
  rejected: { type: 'red', label: 'ตีกลับ' },
  revision: { type: 'blue', label: 'ขอแก้ไข' },
  review:   { type: 'gold', label: 'รอตรวจ' },
}

const ACTION_LABEL: Record<string, string> = {
  accept: 'รับงาน', start: 'เริ่ม', submit: 'ส่งงาน', approve: 'อนุมัติ',
  reject: 'ปฏิเสธ', issue: 'ปัญหา', escalate: 'Escalate',
}

export default function WorkLogPage() {
  const { colors: C, lang } = useApp()
  const { tasks } = useAppData()
  const [user, setUser] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const [form, setForm] = useState({
    action_type: 'submit',
    object: '',
    task_id: '',
    evidence_url: '',
    security_tier: 'T1',
    kpi_impact: '0',
  })

  const showToast = (msg: string, type = 'success') => setToast({ msg, type })
  const isManager = ['admin', 'hr', 'finance', 'sales', 'marketing', 'it'].includes(user?.role?.toLowerCase())

  const loadLogs = useCallback(async () => {
    try {
      const data = await api.getWorkLogs()
      setLogs(Array.isArray(data) ? data : [])
    } catch {
      showToast(lang === 'th' ? 'โหลด Work Log ไม่สำเร็จ' : 'Failed to load work logs', 'error')
    } finally {
      setLoading(false)
    }
  }, [lang])

  useEffect(() => {
    setUser(getUser())
    loadLogs()
  }, [loadLogs])

  const submitLog = async () => {
    if (!form.object.trim()) {
      showToast(lang === 'th' ? 'กรุณาระบุสิ่งที่ทำ' : 'Describe the work', 'error')
      return
    }
    try {
      await api.createWorkLog({
        action_type: form.action_type,
        object: form.object,
        task_id: form.task_id || undefined,
        evidence_url: form.evidence_url || undefined,
        security_tier: form.security_tier,
        kpi_impact: Number(form.kpi_impact) || 0,
        status: form.action_type === 'submit' ? 'review' : 'pending',
      })
      setShowForm(false)
      setForm({ action_type: 'submit', object: '', task_id: '', evidence_url: '', security_tier: 'T1', kpi_impact: '0' })
      showToast(lang === 'th' ? 'บันทึก Work Log แล้ว' : 'Work log saved')
      loadLogs()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const reviewLog = async (id: string, status: string) => {
    try {
      await api.reviewWorkLog(id, status)
      showToast(status === 'approved' ? 'อนุมัติแล้ว' : status === 'rejected' ? 'ตีกลับแล้ว' : 'ขอแก้ไขแล้ว')
      loadLogs()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  const handleEvidenceFile = (file: File | null) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      showToast('ไฟล์ใหญ่เกิน 2MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm(f => ({ ...f, evidence_url: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const today = new Date().toISOString().slice(0, 10)
  const filtered = logs.filter(l => {
    if (activeTab === 'today') return (l.timestamp || '').slice(0, 10) === today
    if (activeTab === 'pending') return ['pending', 'review'].includes(l.status)
    if (activeTab === 'mine') return l.user_id === user?.id
    return true
  })

  const pendingReview = logs.filter(l => ['pending', 'review'].includes(l.status)).length
  const approvedToday = logs.filter(l => l.status === 'approved' && (l.timestamp || '').slice(0, 10) === today).length

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>L5 · Workflow & Work Log</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>
            Workbook Tab 5 · log_id · org_id · dept · kpi_impact · reviewed_by
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg,${C.gold},${C.gold2})`, color: '#fff',
            fontSize: 13, fontWeight: 700,
          }}
        >
          + {lang === 'th' ? 'บันทึกงาน' : 'Log Work'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon="zap" label="Log วันนี้" value={logs.filter(l => (l.timestamp || '').slice(0, 10) === today).length.toString()} color={C.gold} />
        <StatCard icon="check" label="อนุมัติวันนี้" value={approvedToday.toString()} color={C.green} />
        <StatCard icon="clock" label="รอตรวจ" value={pendingReview.toString()} color={C.blue} />
        <StatCard icon="shield" label="Security" value="T0–T3" sub="Audit Trail" color={C.purple} />
      </div>

      <Tabs
        tabs={[
          { id: 'today', icon: 'zap', label: lang === 'th' ? 'วันนี้' : 'Today' },
          { id: 'pending', icon: 'clock', label: lang === 'th' ? 'รอตรวจ' : 'Pending' },
          { id: 'mine', icon: 'users', label: lang === 'th' ? 'ของฉัน' : 'Mine' },
          { id: 'all', icon: 'grid', label: lang === 'th' ? 'ทั้งหมด' : 'All' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div className="table-scroll-x" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ minWidth: 640 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isManager ? '120px 1fr 100px 100px 60px 80px auto' : '120px 1fr 100px 100px 60px 80px',
          padding: '10px 16px', borderBottom: `1px solid ${C.border}`, gap: 8,
        }}>
          {['เวลา', 'งาน / หลักฐาน', 'Action', 'Status', 'KPI', 'Tier', ...(isManager ? [''] : [])].map(h => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: C.text3 }}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon="zap" title="ยังไม่มี Work Log" sub="กด บันทึกงาน เพื่อส่งงานพร้อมหลักฐาน" />
        ) : filtered.map(log => (
          <div
            key={log.log_id}
            style={{
              display: 'grid',
              gridTemplateColumns: isManager ? '120px 1fr 100px 100px 60px 80px auto' : '120px 1fr 100px 100px 60px 80px',
              padding: '14px 16px', borderBottom: `1px solid ${C.border}`, gap: 8, alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 10, color: C.text3, fontFamily: 'JetBrains Mono, monospace' }}>
              {new Date(log.timestamp).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{log.object}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                {log.user_name || log.user_id?.slice(0, 8)} · {log.dept || log.role}
                {log.reviewed_by && <span style={{ marginLeft: 8, color: C.green }}>✓ {log.reviewed_by.slice(0, 8)}</span>}
                {log.evidence_url && (
                  <a href={log.evidence_url} target="_blank" rel="noreferrer" style={{ marginLeft: 8, color: C.gold }}>
                    📎 หลักฐาน
                  </a>
                )}
              </div>
            </div>
            <Badge type="blue">{ACTION_LABEL[log.action_type] || log.action_type}</Badge>
            <Badge type={(STATUS_MAP[log.status]?.type || 'gold') as any}>{STATUS_MAP[log.status]?.label || log.status}</Badge>
            <span style={{ fontSize: 11, fontWeight: 700, color: log.kpi_impact > 0 ? C.green : log.kpi_impact < 0 ? C.red : C.text3 }}>
              {log.kpi_impact > 0 ? `+${log.kpi_impact}` : log.kpi_impact || '0'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: log.security_tier === 'T3' ? C.red : C.text2 }}>{log.security_tier}</span>
            {isManager && ['pending', 'review'].includes(log.status) && (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => reviewLog(log.log_id, 'approved')} style={{ padding: '4px 8px', borderRadius: 6, background: C.green + '22', border: `1px solid ${C.green}44`, color: C.green, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>✓</button>
                <button onClick={() => reviewLog(log.log_id, 'rejected')} style={{ padding: '4px 8px', borderRadius: 6, background: C.red + '22', border: `1px solid ${C.red}44`, color: C.red, cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>✗</button>
              </div>
            )}
          </div>
        ))}
        </div>
      </div>

      {showForm && (
        <Modal title={lang === 'th' ? 'บันทึก Work Log (L5)' : 'Work Log (L5)'} onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="ประเภท">
              <Select
                value={form.action_type}
                onChange={e => setForm({ ...form, action_type: e.target.value })}
                options={ACTION_TYPES.map(a => ({ value: a.value, label: a.label }))}
              />
            </Field>
            <Field label="สิ่งที่ทำ" required>
              <Input value={form.object} onChange={e => setForm({ ...form, object: e.target.value })} placeholder="เช่น ส่งรายงาน KPI แผนก Sales" />
            </Field>
            <Field label="ผูก Task (optional)">
              <Select
                value={form.task_id}
                onChange={e => setForm({ ...form, task_id: e.target.value })}
                options={[{ value: '', label: '— ไม่ผูก —' }, ...(tasks || []).map((t: any) => ({ value: t.id, label: t.title }))]}
              />
            </Field>
            <Field label="หลักฐาน (รูป/เอกสาร)">
              <input type="file" accept="image/*,.pdf" onChange={e => handleEvidenceFile(e.target.files?.[0] || null)} style={{ fontSize: 12, color: C.text2 }} />
              {form.evidence_url && <div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>✓ แนบหลักฐานแล้ว</div>}
            </Field>
            <Field label="Security Tier">
              <Select
                value={form.security_tier}
                onChange={e => setForm({ ...form, security_tier: e.target.value })}
                options={['T0', 'T1', 'T2', 'T3'].map(t => ({ value: t, label: t }))}
              />
            </Field>
            <Field label="KPI Impact (+/-)">
              <Input type="number" value={form.kpi_impact} onChange={e => setForm({ ...form, kpi_impact: e.target.value })} placeholder="0" />
            </Field>
            <button
              onClick={submitLog}
              style={{
                width: '100%', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg,${C.gold},${C.gold2})`, color: '#fff', fontWeight: 700,
              }}
            >
              {lang === 'th' ? 'ส่ง Work Log' : 'Submit Work Log'}
            </button>
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
