'use client'

import { useEffect, useState } from 'react'
import { Field, Input, Select, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'
import { MODULE_ACCESS, ROLES } from '@/lib/rbac'

const ROLE_LABELS: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ', hr: 'HR', finance: 'การเงิน', sales: 'ขาย',
  marketing: 'การตลาด', it: 'IT', staff: 'พนักงาน',
}

export default function UserGroupsPage() {
  const { colors: C, t } = useApp()
  const [groups, setGroups] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [members, setMembers] = useState<Record<string, any[]>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [assignUser, setAssignUser] = useState('')
  const [name, setName] = useState('')
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const modules = Object.keys(MODULE_ACCESS).sort()

  const load = async () => {
    const [gRes, uRes] = await Promise.all([api.getPermissionGroups(), api.getEmployees()])
    setGroups(gRes.data || [])
    setUsers(uRes.data || [])
  }

  useEffect(() => { load().catch(() => {}) }, [])

  const loadMembers = async (groupId: string) => {
    const r = await api.getGroupMembers(groupId)
    setMembers(prev => ({ ...prev, [groupId]: r.data || [] }))
    setExpanded(groupId)
  }

  const toggleMod = (m: string) => {
    setSelectedModules(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  const create = async () => {
    if (!name.trim()) return
    try {
      await api.createPermissionGroup({ name, modules: selectedModules })
      setName('')
      setSelectedModules([])
      load()
      setToast({ msg: 'สร้างกลุ่มแล้ว', type: 'success' })
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' })
    }
  }

  const assign = async (groupId: string) => {
    if (!assignUser) return
    try {
      await api.assignPermissionGroup(groupId, assignUser)
      setAssignUser('')
      loadMembers(groupId)
      setToast({ msg: 'มอบหมายกลุ่มแล้ว', type: 'success' })
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
  }

  const unassign = async (groupId: string, userId: string) => {
    try {
      await api.unassignPermissionGroup(groupId, userId)
      loadMembers(groupId)
      setToast({ msg: 'ถอดออกจากกลุ่มแล้ว', type: 'success' })
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.userGroups')}</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>CCS Permission Groups — มอบหมายผู้ใช้ + modules เสริม</div>
      </div>

      {groups.map(g => (
        <div key={g.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, color: C.text }}>{g.name}</div>
            <button type="button" onClick={() => loadMembers(g.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.border2}`, background: C.surface, cursor: 'pointer', color: C.text2 }}>
              สมาชิก ({members[g.id]?.length ?? '…'})
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {(g.modules || []).map((m: string) => (
              <span key={m} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 99, background: C.goldLight, color: C.gold }}>{m}</span>
            ))}
          </div>
          {expanded === g.id && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              {(members[g.id] || []).map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: C.text2 }}>{m.name} · {m.role}</span>
                  <button type="button" onClick={() => unassign(g.id, m.id)} style={{ color: C.red, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11 }}>ถอน</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <Select value={assignUser} onChange={e => setAssignUser(e.target.value)} options={[{ value: '', label: 'เลือกผู้ใช้' }, ...users.map(u => ({ value: u.id, label: u.name }))]} />
                <button type="button" onClick={() => assign(g.id)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: C.gold, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>เพิ่ม</button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 12 }}>สร้างกลุ่มใหม่</div>
        <Field label="ชื่อกลุ่ม"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {modules.map(m => (
            <button key={m} type="button" onClick={() => toggleMod(m)} style={{
              padding: '6px 10px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
              border: `1px solid ${selectedModules.includes(m) ? C.gold : C.border2}`,
              background: selectedModules.includes(m) ? C.goldLight : 'transparent',
              color: selectedModules.includes(m) ? C.gold : C.text3,
            }}>{m}</button>
          ))}
        </div>
        <button type="button" onClick={create} style={{ marginTop: 14, padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#B48648,#9C713B)', color: '#fff', fontWeight: 700 }}>สร้างกลุ่ม</button>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 14, background: C.surface }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', color: C.text3 }}>Module</th>
              {ROLES.map(role => (
                <th key={role} style={{ padding: '10px 8px', textAlign: 'center', color: C.text3 }}>{ROLE_LABELS[role] || role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map(mod => (
              <tr key={mod} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 12px', color: C.text2, fontWeight: 600 }}>{mod}</td>
                {ROLES.map(role => {
                  const allowed = role === 'admin' || MODULE_ACCESS[mod]?.includes(role)
                  return (
                    <td key={role} style={{ padding: '10px 8px', textAlign: 'center', color: allowed ? C.green : C.text3 }}>{allowed ? '✓' : '—'}</td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}
