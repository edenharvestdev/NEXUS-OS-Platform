'use client'
import { useEffect, useState } from 'react'
import AIChatPanel from '@/components/AIChatPanel'
import { Badge, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'
import { getUser } from '@/lib/users'

export default function DeptAIPage() {
  const { colors: C } = useApp()
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [assignTitle, setAssignTitle] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const user = getUser()
  const isManager = user && !['staff'].includes(user.role?.toLowerCase())

  useEffect(() => {
    if (isManager) {
      api.recommendEmployees().then(r => setRecommendations(r.data || [])).catch(() => {})
    }
  }, [isManager])

  const assign = async () => {
    if (!selectedUser || !assignTitle.trim()) return
    const rec = recommendations.find(r => r.user_id === selectedUser)
    try {
      await api.assignTask({
        assigned_to: selectedUser,
        title: assignTitle,
        match_score: rec?.match_score,
        due_date: new Date().toISOString().slice(0, 10),
      })
      setToast({ msg: 'มอบหมายงานแล้ว — AI แจ้งพนักงาน', type: 'success' })
      setAssignTitle('')
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' })
    }
  }

  return (
    <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: isManager ? '1fr 320px' : '1fr', gap: 20 }}>
      <AIChatPanel
        scope="department"
        title={`AI แผนก · ${user?.department || 'แผนก'}`}
        subtitle="ข้อมูลเฉพาะแผนก · หัวหน้ามอบหมายงานจาก Skill + KPI รายเดือน"
      />
      {isManager && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, height: 'fit-content' }}>
          <div style={{ fontWeight: 800, color: C.text, marginBottom: 12 }}>มอบหมายงาน (Skill Match)</div>
          <input
            value={assignTitle}
            onChange={e => setAssignTitle(e.target.value)}
            placeholder="ชื่องาน / โปรเจกต์"
            style={{ width: '100%', padding: 10, borderRadius: 10, border: `1px solid ${C.border2}`, background: C.surface2, color: C.text, marginBottom: 12, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
            {recommendations.map(r => (
              <button
                key={r.user_id}
                onClick={() => setSelectedUser(r.user_id)}
                style={{
                  textAlign: 'left', padding: 12, borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${selectedUser === r.user_id ? C.gold : C.border}`,
                  background: selectedUser === r.user_id ? C.goldLight : C.surface2,
                }}
              >
                <div style={{ fontWeight: 700, color: C.text, fontSize: 13 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
                  Match {r.match_score}% · KPI {r.kpi_avg} · Skill {r.skill_score}
                </div>
                {r.strengths?.length > 0 && <Badge type="green">{r.strengths[0]}</Badge>}
              </button>
            ))}
          </div>
          <button onClick={assign} style={{ width: '100%', marginTop: 14, padding: 12, borderRadius: 10, border: 'none', background: C.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            มอบหมาย + แจ้งพนักงาน
          </button>
        </div>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
