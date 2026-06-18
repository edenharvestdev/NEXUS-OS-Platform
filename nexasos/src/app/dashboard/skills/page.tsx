'use client'
import { useEffect, useState } from 'react'
import { Badge, StatCard, ProgressBar, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function SkillsPage() {
  const { colors: C } = useApp()
  const [all, setAll] = useState<any[]>([])
  const [mine, setMine] = useState<any>(null)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  useEffect(() => {
    api.getSkills().then(r => setAll(r.data || [])).catch(() => {})
    api.getSkillWallet().then(r => setMine(r)).catch(() => {})
  }, [])

  const byUser = all.reduce((acc: Record<string, any[]>, s) => {
    const k = s.user_name || s.user_id
    if (!acc[k]) acc[k] = []
    acc[k].push(s)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>L4 · Skill Wallet</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>คะแนนจากงานจริง + KPI + หลักฐาน — ไม่ให้กรอกเอง</div>
      </div>
      {mine?.recommendations && (
        <div style={{ background: C.goldLight, border: `1px solid ${C.gold}33`, borderRadius: 12, padding: 16, fontSize: 13, color: C.text2 }}>
          <strong style={{ color: C.gold }}>AI แนะนำ:</strong> คอร์ส — {mine.recommendations.course} · Mentor — {mine.recommendations.mentor}
        </div>
      )}
      {Object.entries(byUser).map(([name, skills]) => {
        const total = (skills as any[]).reduce((s, k) => s + Number(k.score || 0), 0)
        return (
          <div key={name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{name}</span>
              <Badge type="gold">{Math.round(total)} pts</Badge>
            </div>
            {(skills as any[]).map(s => (
              <div key={s.skill_key} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.text2, marginBottom: 4 }}>
                  <span>{s.skill_name}</span>
                  <span>{Math.round(s.score)} · {s.evidence_count} evidence</span>
                </div>
                <ProgressBar pct={Math.min(Number(s.score), 100)} color={C.green} height={4} />
              </div>
            ))}
          </div>
        )
      })}
      {all.length === 0 && <div style={{ color: C.text3, padding: 24 }}>ยังไม่มี skill score — อนุมัติ Work Log เพื่อสะสมคะแนน</div>}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
