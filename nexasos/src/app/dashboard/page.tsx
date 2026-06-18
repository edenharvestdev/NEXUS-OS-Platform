'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, Wallet, Target, Megaphone, Mic2, MessageSquare, ShieldCheck, Zap,
  TrendingUp, CheckCircle2, Circle, Bot, Zap as ZapIcon,
} from 'lucide-react'
import { getUser } from '@/lib/users'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const h = 38
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${h - (v / max) * h}`).join(' ')
  const fill = pts + ` 100,${h} 0,${h}`
  const id = `gc${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg width="100%" height={h} viewBox={`0 0 100 ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TASK_DEFS: any[] = []

const AI_ACTIVITY: any[] = []

const ACT_TEXTS: Record<string, Record<string, string>> = {
  th: {
    'act.1': 'Meeting Brain สรุปประชุม Marketing เสร็จ',
    'act.2': 'Doc Guardian วิเคราะห์ Contract ABC Corp',
    'act.3': 'Company GPT ตอบ 23 คำถาม HR วันนี้',
    'act.4': 'AI ปฏิเสธ Request ผิดนโยบาย 2 รายการ',
  },
  en: {
    'act.1': 'Meeting Brain summarized Marketing meeting',
    'act.2': 'Doc Guardian analyzed ABC Corp Contract',
    'act.3': 'Company GPT answered 23 HR questions today',
    'act.4': 'AI rejected 2 policy-violating requests',
  },
}

const TASK_EN: Record<string, string> = {
  'Review Q1 Report':           'Review Q1 Report',
  'อนุมัติค่าใช้จ่าย ฿12,400': 'Approve Expense ฿12,400',
  'ประชุม Sales 14:00':          'Sales Meeting 14:00',
  'ส่ง HR Policy Update':        'Send HR Policy Update',
}

import { useAppData } from '@/lib/data'

export default function DashboardPage() {
  const router = useRouter()
  const { colors, t, lang, theme } = useApp()
  const { employees, transactions, tasks, setTasks, deals, campaigns, meetingActions, docs } = useAppData()
  const [user, setUser] = useState<any>(null)
  const [time, setTime] = useState('')
  const [aiStats, setAiStats] = useState<any>(null)
  const [healthScore, setHealthScore] = useState<any>(null)

  const toggleTask = async (task: any) => {
    if (!task.id) return
    try {
      const res = await api.updateTask(task.id, { done: (task.done || task.done === 1) ? 0 : 1 })
      setTasks(ts => ts.map(t => t.id === task.id ? res.data : t))
    } catch { /* ignore */ }
  }

  useEffect(() => {
    const u = getUser()
    if (u) setUser(u)
    api.getAIStats().then(r => setAiStats(r.data)).catch(() => {})
    api.getHealthScore().then(setHealthScore).catch(() => {})
    const tick = () => setTime(new Date().toLocaleTimeString(lang === 'th' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [lang])

  const dateStr = new Date().toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const pendingCount = tasks.filter((t:any) => !t.done && t.done !== 1).length
  const greeting = user?.name?.split(' ')[0] || (lang === 'th' ? 'คุณ' : 'User')

  const totalIncome = transactions.filter((t:any) => t.type === 'income').reduce((sum:number, t:any) => sum + (Number(t.amount)||0), 0)
  const incomeStr = totalIncome > 1000000 ? `฿${(totalIncome / 1000000).toFixed(1)}M` : `฿${(totalIncome / 1000).toFixed(0)}K`

  const totalDeals = deals ? deals.reduce((sum:number, d:any) => sum + (Number(d.value)||0), 0) : 0
  const dealsStr = totalDeals > 1000000 ? `฿${(totalDeals / 1000000).toFixed(1)}M` : `฿${(totalDeals / 1000).toFixed(0)}K`

  const aiLogsCount = aiStats?.total_actions ?? 0
  const aiSavings = Math.floor(Number(aiStats?.total_cost ?? 0) * 100)

  const kpis = [
    { Icon: Users,        labelKey: 'kpi.employees', value: employees ? employees.length.toString() : '0', subKey: '',          trend: '+2',  colorKey: 'green',  chart: [10,12,15,14,18,22,25] },
    { Icon: Wallet,       labelKey: 'kpi.revenue',   value: incomeStr,                   subKey: '',          trend: '+12%', colorKey: 'gold',   chart: [50,60,45,70,85,90,110] },
    { Icon: Target,       labelKey: 'kpi.pipeline',  value: dealsStr,                    subKey: 'kpi.deals', trend: '+8%',     colorKey: 'blue',   chart: [30,40,35,50,65,60,80] },
    { Icon: ZapIcon,      labelKey: 'kpi.ai_actions',value: aiLogsCount.toString(),                       subKey: 'kpi.save',  trend: 'Active', colorKey: 'purple', chart: [5,10,15,20,35,45,60] },
  ]

  const pendingActions = meetingActions ? meetingActions.filter((a:any) => !a.done).length : 0
  
  const MODULE_DEFS = [
    { id: 'people',    Icon: Users,         labelKey: 'nav.people',   stat: `${employees ? employees.length : 0} พนักงาน`, sub: 'AI Review Ready',      path: '/dashboard/people',   colorKey: 'gold'   },
    { id: 'finance',   Icon: Wallet,        labelKey: 'nav.finance',  stat: incomeStr,     sub: 'Gemini OCR Active',   path: '/dashboard/finance',  colorKey: 'green'  },
    { id: 'sales',     Icon: Target,        labelKey: 'nav.sales',    stat: `${deals ? deals.length : 0} ดีลเข้าระบบ`, sub: dealsStr,  path: '/dashboard/sales',    colorKey: 'blue'   },
    { id: 'marketing', Icon: Megaphone,     labelKey: 'nav.marketing',stat: `${campaigns ? campaigns.length : 0} แคมเปญ`, sub: campaigns?.length ? 'Active' : '—',  path: '/dashboard/marketing',colorKey: 'purple' },
    { id: 'meeting',   Icon: Mic2,          labelKey: 'nav.meeting',  stat: `${pendingActions} งานค้าง`,   sub: 'Auto-Summary',path: '/dashboard/meeting', colorKey: 'gold'   },
    { id: 'gpt',       Icon: MessageSquare, labelKey: 'nav.gpt',      stat: 'Online',      sub: 'Context Aware (RAG)', path: '/dashboard/gpt',      colorKey: 'green'  },
    { id: 'guardian',  Icon: ShieldCheck,   labelKey: 'nav.guardian', stat: `${docs ? docs.length : 0} เอกสาร`,     sub: 'Risk Scan 100%',path: '/dashboard/guardian', colorKey: 'red'    },
    { id: 'ai',        Icon: Zap,           labelKey: 'nav.ai',       stat: 'Gemini 2.0',       sub: '฿' + aiSavings.toLocaleString(),  path: '/dashboard/ai',       colorKey: 'blue'   },
  ]

  const getColor = (key: string) => (colors as any)[key] ?? colors.gold
  const cardShadow = theme === 'light' ? colors.shadow : 'none'

  const AI_ACT: { Icon: typeof Zap; text: string; time: string; color: string }[] = (aiStats?.logs || []).slice(0, 4).map((log: any, i: number) => ({
    Icon: [Zap, ShieldCheck, Mic2, Wallet][i % 4] as typeof Zap,
    text: `${log.agent}: ${log.action}`,
    time: new Date(log.created_at).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US'),
    color: [colors.gold, colors.red, colors.blue, colors.green][i % 4],
  }))

  return (
    <div style={{ display: 'flex', gap: 24, animation: 'fadeIn 0.3s ease', fontFamily: 'Montserrat, sans-serif' }}>
      {/* ── LEFT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>

        {/* Welcome Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.goldLight}, rgba(0,0,0,0))`,
          border: `1px solid ${colors.gold}33`,
          borderRadius: 20, padding: '28px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
          boxShadow: cardShadow,
        }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.text, marginBottom: 6, letterSpacing: -0.5 }}>
              {t('dash.greeting')} {greeting} 👋
            </div>
            <div style={{ fontSize: 13, color: colors.text2, marginBottom: 20 }}>
              {dateStr} <span style={{ margin: '0 8px', color: colors.border2 }}>|</span> <span style={{ color: colors.gold, fontWeight: 600 }}>{pendingCount + pendingActions} {t('dash.pending')}</span>
              {healthScore && (
                <>
                  <span style={{ margin: '0 8px', color: colors.border2 }}>|</span>
                  <span style={{ fontWeight: 600, color: healthScore.organization_health_score >= 70 ? colors.green : colors.gold }}>
                    L6 Health {healthScore.organization_health_score}/100
                  </span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: t('dash.ask_ai'),    Icon: MessageSquare, path: '/dashboard/gpt' },
                { label: t('dash.summarize'), Icon: Mic2,          path: '/dashboard/meeting' },
                { label: t('dash.upload'),    Icon: Wallet,        path: '/dashboard/finance' },
                { label: 'L6 Feasibility',      Icon: TrendingUp,    path: '/dashboard/feasibility' },
              ].map(({ label, Icon, path }) => (
                <button key={label} onClick={() => router.push(path)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                  borderRadius: 10, background: colors.surface, border: `1px solid ${colors.border2}`,
                  color: colors.text2, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  fontFamily: 'Montserrat', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = colors.surface2; (e.currentTarget as HTMLButtonElement).style.color = colors.text; (e.currentTarget as HTMLButtonElement).style.borderColor = colors.gold }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = colors.surface; (e.currentTarget as HTMLButtonElement).style.color = colors.text2; (e.currentTarget as HTMLButtonElement).style.borderColor = colors.border2 }}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>
          {/* Live Clock */}
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 40, fontWeight: 700, color: colors.gold, letterSpacing: 1.5, flexShrink: 0, textShadow: `0 2px 10px ${colors.gold}22` }}>
            {time}
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {kpis.map(({ Icon, labelKey, value, subKey, trend, colorKey, chart }, i) => {
            const col = getColor(colorKey)
            return (
              <div key={i} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '20px 24px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden', boxShadow: cardShadow }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 24px ${col}15` }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = cardShadow }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${col}, transparent)` }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: `${col}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} style={{ color: col }} />
                  </div>
                  {trend && (
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: colors.green, background: colors.greenL, border: `1px solid ${colors.green}40`, padding: '4px 8px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TrendingUp size={12} /> {trend}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: colors.text, lineHeight: 1.1, letterSpacing: -0.5 }}>{value}</div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: colors.text3, marginTop: 4 }}>{t(labelKey)}</div>
                {subKey && <div style={{ fontSize: 12, color: colors.text2, marginTop: 2 }}>{t(subKey)}</div>}
                <div style={{ marginTop: 14 }}><MiniChart data={chart} color={col} /></div>
              </div>
            )
          })}
        </div>

        {/* Modules Grid */}
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: colors.text, marginBottom: 16, letterSpacing: -0.2 }}>{t('dash.modules')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {MODULE_DEFS.map(({ id, Icon, labelKey, stat, sub, path, colorKey }) => {
              const col = getColor(colorKey)
              return (
                <div key={id} onClick={() => router.push(path)} style={{
                  background: colors.surface, border: `1px solid ${colors.border}`,
                  borderRadius: 16, padding: '20px', cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden', boxShadow: cardShadow
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = `${col}55`; el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 8px 20px ${col}10` }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = colors.border; el.style.transform = ''; el.style.boxShadow = cardShadow }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${col}, transparent)` }} />
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${col}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Icon size={20} style={{ color: col }} />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: colors.text }}>{t(labelKey)}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.text2, marginTop: 4 }}>{stat}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: id === 'guardian' ? colors.red : id === 'gpt' ? colors.green : colors.text3, marginTop: 4 }}>{sub}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Tasks */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, boxShadow: cardShadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: colors.text }}>{t('dash.tasks')}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.text3, background: colors.surface2, padding: '2px 8px', borderRadius: 99 }}>{tasks.length + pendingActions} items</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tasks.concat(meetingActions.filter((a:any)=>!a.done).map((a:any)=>({title:a.task,done:false,dotKey:'blue'}))).slice(0,6).map((task:any, i:number) => {
              const taskLabel = lang === 'en' ? (TASK_EN[task.title || task.text] || task.title || task.text) : (task.title || task.text)
              return (
                <div key={task.id || i} onClick={() => task.id && toggleTask(task)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0', cursor: task.id ? 'pointer' : 'default' }}>
                  {task.done || task.done === 1
                    ? <CheckCircle2 size={18} style={{ color: colors.green, flexShrink: 0 }} />
                    : <Circle size={18} style={{ color: colors.border2, flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: (task.done || task.done === 1) ? colors.text3 : colors.text, flex: 1, textDecoration: (task.done || task.done === 1) ? 'line-through' : 'none' }}>{taskLabel}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: (task.done || task.done === 1) ? colors.text3 : getColor(task.dotKey || 'gold'), flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Activity */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 24, boxShadow: cardShadow }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: colors.text, marginBottom: 16 }}>{t('dash.ai_activity')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {AI_ACT.length === 0 && (
              <div style={{ fontSize: 12, color: colors.text3 }}>{lang === 'th' ? 'ยังไม่มีกิจกรรม AI' : 'No AI activity yet'}</div>
            )}
            {AI_ACT.map(({ Icon, text, time, color }, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} style={{ color: color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: colors.text, lineHeight: 1.5 }}>{text}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: colors.text3, marginTop: 4 }}>{time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Savings */}
        <div style={{ background: colors.goldLight, border: `1px solid ${colors.gold}33`, borderRadius: 20, padding: 24, boxShadow: cardShadow }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap size={16} style={{ color: colors.gold }} fill={colors.gold} />
            <span style={{ fontSize: 12, fontWeight: 800, color: colors.gold }}>{t('dash.ai_saved')}</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: colors.text, lineHeight: 1, letterSpacing: -0.5 }}>฿{aiSavings.toLocaleString()}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: colors.text3, marginTop: 6 }}>{aiLogsCount} {t('dash.ai_actions')}</div>
          <div style={{ marginTop: 16, height: 4, background: colors.surface2, borderRadius: 99 }}>
            <div style={{ height: '100%', width: '42%', background: `linear-gradient(90deg, ${colors.gold}, ${colors.gold2})`, borderRadius: 99, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: colors.text3, marginTop: 6 }}>฿10,000 {t('dash.target')}</div>
        </div>
      </div>
    </div>
  )
}
