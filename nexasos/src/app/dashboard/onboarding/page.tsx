'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Loader2, SkipForward } from 'lucide-react'
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

const TASK_ACTIONS: Record<string, { label: string; path: string }> = {
  p1_sources: { label: 'ไปนำเข้าข้อมูล', path: '/dashboard/ingest' },
  p5_system: { label: 'ไปบันทึกงาน', path: '/dashboard/worklog' },
  p5_rbac: { label: 'ตั้งสิทธิ์ผู้ใช้', path: '/dashboard/settings/user-groups' },
  p6_decision: { label: 'ตั้งค่า AI', path: '/dashboard/settings' },
  p2_define: { label: 'ดู Data Dictionary', path: '/dashboard/dictionary' },
  p3_org: { label: 'จัดองค์กร', path: '/dashboard/hr/org' },
  p4_people: { label: 'เพิ่มพนักงาน', path: '/dashboard/settings/users' },
}

export default function OnboardingPage() {
  const router = useRouter()
  const { colors: C } = useApp()
  const [state, setState] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('tamada')
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.getOnboarding()
      setState(data)
      if (data?.industry) setSelected(data.industry)
    } catch (e: any) {
      showToast(e.message || 'โหลดข้อมูลไม่ได้', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } catch (e: any) {
      showToast(e.message || 'ดำเนินการไม่สำเร็จ', 'error')
    } finally {
      setBusy(null)
    }
  }

  const apply = () => runAction('apply', async () => {
    await api.selectIndustry(selected)
    const res = await api.applyIndustryTemplate(selected)
    showToast(`นำเทมเพลตเข้าระบบแล้ว — Dictionary ${res.dictionary ?? res.total_metrics ?? 0} รายการ`)
    await load()
  })

  const toggleTask = (taskId: string, current: string) => runAction(`task-${taskId}`, async () => {
    const next = current === 'done' ? 'pending' : 'done'
    await api.updateOnboardingTask(taskId, next)
    await load()
  })

  const skipToHome = () => runAction('skip', async () => {
    await api.completeOnboarding()
    showToast('ข้ามการตั้งค่าแล้ว — ไปหน้าหลักได้เลย')
    router.push('/dashboard/home')
  })

  const board = state?.task_board
  const done = board?.doneCount || 0
  const total = board?.total || 15
  const pct = board?.progress_pct || 0
  const pendingTasks = (board?.phases || []).flatMap((p: any) =>
    p.tasks.filter((t: any) => t.status !== 'done'),
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 920 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>ตั้งค่าองค์กร</div>
          <div style={{ fontSize: 13, color: C.text3, marginTop: 6 }}>
            ขั้นตอนนี้ไม่บังคับ — ใช้งานระบบได้ทันทีจากเมนู <strong style={{ color: C.text2 }}>หน้าหลัก</strong>
          </div>
        </div>
        <button
          type="button"
          disabled={!!busy}
          onClick={skipToHome}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 10, cursor: busy ? 'wait' : 'pointer',
            border: `1px solid ${C.border}`, background: C.surface2, color: C.text,
            fontWeight: 700, fontSize: 13, opacity: busy ? 0.7 : 1,
          }}
        >
          {busy === 'skip' ? <Loader2 size={16} className="spin" /> : <SkipForward size={16} />}
          ข้ามไปหน้าหลัก
        </button>
      </div>

      {loading && !state ? (
        <div style={{ padding: 48, textAlign: 'center', color: C.text3, fontSize: 14 }}>
          <Loader2 size={28} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          กำลังโหลด...
        </div>
      ) : state ? (
        <>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13, color: C.text2 }}>
              <span>ความคืบหน้า</span>
              <span style={{ fontWeight: 700, color: C.gold }}>{done}/{total} ({pct}%)</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: C.surface2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${C.gold},${C.gold2})`, transition: 'width 0.4s' }} />
            </div>
          </div>

          {pendingTasks.length > 0 && !state.completed && (
            <div style={{ background: `${C.gold}10`, border: `1px solid ${C.gold}33`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12 }}>
                งานที่เหลือ ({pendingTasks.length} รายการ) — กดปุ่มด้านขวาเพื่อทำต่อ
              </div>
              {pendingTasks.map((t: any) => {
                const action = TASK_ACTIONS[t.id]
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{t.owner}</div>
                    </div>
                    {action && (
                      <button
                        type="button"
                        onClick={() => router.push(action.path)}
                        style={{
                          padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.gold}55`,
                          background: C.goldLight, color: C.gold, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {action.label} →
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy === `task-${t.id}`}
                      onClick={() => toggleTask(t.id, t.status)}
                      style={{
                        padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`,
                        background: C.surface2, color: C.text2, cursor: busy ? 'wait' : 'pointer',
                        fontSize: 11, fontWeight: 600, minWidth: 72,
                      }}
                    >
                      {busy === `task-${t.id}` ? '...' : '✓ เสร็จ'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 700, color: C.text, marginBottom: 8 }}>ขั้นที่ 1: เลือกอุตสาหกรรม + นำเทมเพลต</div>
            <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>
              กดเลือกอุตสาหกรรม แล้วกดปุ่มด้านล่างเพื่อสร้างแผนก + Data Dictionary อัตโนมัติ
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
              {(state.templates || []).map((t: any) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  style={{
                    padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${selected === t.id ? C.gold : C.border}`,
                    background: selected === t.id ? C.goldLight : C.surface2,
                    color: C.text, fontWeight: 600, fontSize: 13,
                  }}
                >
                  {t.name_th}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!!busy}
              onClick={apply}
              style={{
                padding: '12px 24px', borderRadius: 10, border: 'none',
                background: `linear-gradient(135deg,${C.gold},${C.gold2})`,
                color: '#fff', fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, opacity: busy && busy !== 'apply' ? 0.6 : 1,
              }}
            >
              {busy === 'apply' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              นำเทมเพลตเข้าระบบ
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {[
              { l: 'Dictionary', v: state.progress?.dictionary, target: state.progress?.dictionary_target || 10 },
              { l: 'แผนก', v: state.progress?.departments, target: state.progress?.departments_target || 7 },
              { l: 'คน', v: state.progress?.users, target: 2 },
              { l: 'ความรู้', v: state.progress?.knowledge, target: 3 },
              { l: 'Work Log', v: state.progress?.work_logs, target: 1 },
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
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '12px 18px', borderBottom: `1px solid ${C.border}`, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{t.owner}</div>
                  </div>
                  <Badge type={(STATUS_BADGE[t.status] || 'default') as any}>{STATUS_LABEL[t.status] || t.status}</Badge>
                  <button
                    type="button"
                    disabled={busy === `task-${t.id}`}
                    onClick={() => toggleTask(t.id, t.status)}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`,
                      background: C.surface2, color: C.text2, cursor: busy ? 'wait' : 'pointer', fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {t.status === 'done' ? '↩ ยกเลิก' : '✓ เสร็จ'}
                  </button>
                </div>
              ))}
            </div>
          ))}

          {state.completed || done >= total ? (
            <div style={{ padding: 20, borderRadius: 12, background: `${C.green}20`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle2 size={24} color={C.green} />
              <div>
                <div style={{ fontWeight: 700, color: C.green }}>ตั้งค่าเสร็จแล้ว</div>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/home')}
                  style={{ marginTop: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                >
                  ไปหน้าหลัก <ArrowRight size={14} style={{ verticalAlign: 'middle' }} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => router.push('/dashboard/home')}
                style={{ padding: '12px 22px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.gold2})`, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
              >
                ไปหน้าหลักใช้งานเลย
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/settings')}
                style={{ padding: '12px 22px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface2, color: C.text, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                ตั้งค่าระบบ
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: 32, textAlign: 'center', color: C.red, fontSize: 14 }}>
          โหลดข้อมูลไม่ได้ — ลองรีเฟรชหน้าหรือเข้าสู่ระบบใหม่
          <div style={{ marginTop: 16 }}>
            <button type="button" onClick={() => router.push('/dashboard/home')} style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface2, cursor: 'pointer', fontWeight: 600 }}>
              ไปหน้าหลัก
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
