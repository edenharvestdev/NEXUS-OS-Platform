'use client'
import { useEffect, useState } from 'react'
import { Badge, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

const STATUS_LABEL: Record<string, string> = {
  pending: 'ยังไม่เริ่ม',
  in_progress: 'กำลังทำ',
  done: 'เสร็จแล้ว',
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'default',
  in_progress: 'gold',
  done: 'green',
}

export default function OnboardingPage() {
  const { colors: C } = useApp()
  const [state, setState] = useState<any>(null)
  const [selected, setSelected] = useState('clinic')
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  const load = () => api.getOnboarding().then(setState).catch(e => showToast(e.message, 'error'))
  useEffect(() => { load() }, [])

  const apply = async () => {
    try {
      await api.selectIndustry(selected)
      await api.applyIndustryTemplate(selected)
      showToast('นำ Workbook Template เข้าระบบ — Dictionary 10 ตัว + แผนก + SOP')
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const toggleTask = async (taskId: string, current: string) => {
    const next = current === 'done' ? 'pending' : 'done'
    try {
      await api.updateOnboardingTask(taskId, next)
      load()
    } catch (e: any) { showToast(e.message, 'error') }
  }

  if (!state) return null
  const board = state.task_board
  const done = board?.doneCount || 0
  const total = board?.total || 15

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 920 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Implementation Workbook · Tab 3</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>
          {state.workbook?.subtitle} · ความคืบหน้า {done}/{total} งาน ({board?.progress_pct || 0}%)
        </div>
      </div>

      <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}33`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 8 }}>หลักการ Data First → AI Later</div>
        {(state.workbook?.principles || []).map((p: string, i: number) => (
          <div key={i} style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>• {p}</div>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 8 }}>Phase 0: เลือกอุตสาหกรรม + นำ Template (Tab 1)</div>
        <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>คลินิก = Data Dictionary 10 ตัวตาม Workbook</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
          {(state.templates || []).map((t: any) => (
            <button key={t.id} onClick={() => setSelected(t.id)}
              style={{
                padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                border: `2px solid ${selected === t.id ? C.gold : C.border}`,
                background: selected === t.id ? C.goldLight : C.surface2,
                color: C.text, fontWeight: 600, fontSize: 13,
              }}>
              {t.name_th}<br /><span style={{ fontSize: 10, color: C.text3 }}>{t.name}</span>
            </button>
          ))}
        </div>
        <button onClick={apply} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.gold2})`, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          นำ Workbook Template เข้าระบบ
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { l: 'Dictionary', v: state.progress?.dictionary, target: 10 },
          { l: 'Departments', v: state.progress?.departments, target: 7 },
          { l: 'People', v: state.progress?.users, target: 2 },
          { l: 'SOP/Knowledge', v: state.progress?.knowledge, target: 3 },
          { l: 'Work Logs', v: state.progress?.work_logs, target: 1 },
        ].map(p => (
          <div key={p.l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.gold }}>{p.v || 0}<span style={{ fontSize: 12, color: C.text3 }}>/{p.target}</span></div>
            <div style={{ fontSize: 11, color: C.text3 }}>{p.l}</div>
          </div>
        ))}
      </div>

      {(board?.phases || []).map((phase: any) => (
        <div key={phase.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: C.text }}>{phase.label}</div>
            <Badge type={phase.done === phase.total ? 'green' : 'gold'}>{phase.done}/{phase.total}</Badge>
          </div>
          {phase.tasks.map((t: any) => (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px', gap: 8, padding: '12px 18px', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.title}</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{t.owner} · {t.reference}</div>
              </div>
              <span style={{ fontSize: 11, color: C.text3 }}>auto: {STATUS_LABEL[t.auto_status] || t.auto_status}</span>
              <Badge type={(STATUS_BADGE[t.status] || 'default') as any}>{STATUS_LABEL[t.status] || t.status}</Badge>
              <button onClick={() => toggleTask(t.id, t.status)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface2, color: C.text2, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                {t.status === 'done' ? '↩ ยกเลิก' : '✓ เสร็จ'}
              </button>
            </div>
          ))}
        </div>
      ))}

      {state.completed || done >= total ? (
        <div style={{ padding: 16, borderRadius: 12, background: `${C.green}20`, color: C.green, fontWeight: 700 }}>
          ✅ Onboarding Workbook ครบแล้ว — ไป My Data / Work Log ต่อ
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={async () => { try { await api.advanceOnboardingStep(Math.min((state.step || 0) + 1, 6)); load() } catch (e: any) { showToast(e.message, 'error') } }}
            style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
          >
            ขั้นถัดไป (Step {(state.step || 0) + 1}/6)
          </button>
          <button
            onClick={() => window.location.href = '/dashboard/settings'}
            style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.gold}44`, background: C.goldLight, color: C.gold, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
          >
            ตั้ง Decision Rights → Settings
          </button>
          <button
            onClick={() => window.location.href = '/dashboard/ingest'}
            style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface2, color: C.text2, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
          >
            นำเข้าข้อมูล (P5)
          </button>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
