'use client'
import { useState, useEffect, useRef } from 'react'
import { Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

type Scope = 'personal' | 'department' | 'company'

const INTRO: Record<Scope, string> = {
  personal: 'สวัสดีครับ ผม AI ส่วนตัวของคุณ 🤖\n\n• รู้ข้อมูล HR จริง: ลา สลิป ลงเวลา โควตา\n• จำงาน KPI Skill Work Log\n• ช่วยวางแผนรายวัน',
  department: 'สวัสดีครับ ผม AI แผนก 🤖\n\n• ติดตามงานรออนุมัติในแผนก\n• แนะนำมอบหมายงานจาก Skill + KPI\n• สรุปสถานะทีม',
  company: 'สวัสดีครับ ผม CEO / Command AI 🤖\n\n• มองทั้งองค์กร\n• ตรวจ API/KPI รวม\n• วางแผนระบบ',
}

const MODEL_LABEL: Record<Scope, string> = {
  personal: 'GPT-4o · multi-provider',
  department: 'Typhoon 2.5 · fallback',
  company: 'Claude · OpenAI fallback',
}

export default function AIChatPanel({ scope, title, subtitle, initialPrompt }: { scope: Scope; title: string; subtitle?: string; initialPrompt?: string }) {
  const { colors: C } = useApp()
  const [messages, setMessages] = useState<any[]>([{ role: 'ai', content: INTRO[scope], sources: [] }])
  const [input, setInput] = useState(initialPrompt || '')
  const [loading, setLoading] = useState(false)
  const [modelLabel, setModelLabel] = useState(MODEL_LABEL[scope])
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const autoSent = useRef(false)

  useEffect(() => {
    api.getChatHistory(scope).then(res => {
      if (res.data?.length) setMessages(res.data.map((m: any) => ({ role: m.role, content: m.content, sources: [] })))
    }).catch(() => {})
    api.getChatAgents().then(res => {
      const s = res.scopes?.find((x: any) => x.scope === scope)
      if (s?.agent?.modelHint) setModelLabel(s.agent.modelHint)
    }).catch(() => {})
  }, [scope])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (q: string) => {
    if (!q.trim() || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await api.sendMessage(q, scope)
      if (res.provider && res.model) setModelLabel(`${res.provider} · ${res.model}`)
      setMessages(m => [...m, { role: 'ai', content: res.text, sources: res.sources || [] }])
    } catch (e: any) {
      setToast({ msg: e.message, type: 'error' })
      setMessages(m => [...m, { role: 'ai', content: 'ขออภัย ระบบขัดข้องชั่วคราว', sources: [] }])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (initialPrompt && !autoSent.current) {
      autoSent.current = true
      sendMessage(initialPrompt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt])

  const send = async () => {
    await sendMessage(input)
  }

  const clear = async () => {
    try {
      await api.clearChatHistory(scope)
      setMessages([{ role: 'ai', content: INTRO[scope], sources: [] }])
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
  }

  return (
    <div className="chat-panel-height" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>{subtitle}</div>}
          <div style={{ fontSize: 10, color: C.gold, marginTop: 6, fontWeight: 700 }}>{modelLabel}</div>
        </div>
        <button onClick={clear} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.text2, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          ล้างแชท
        </button>
      </div>

      <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{
              padding: '12px 16px', borderRadius: 14,
              background: m.role === 'user' ? C.goldLight : C.bg3,
              border: `1px solid ${m.role === 'user' ? C.gold + '33' : C.border}`,
              color: C.text, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
            {m.sources?.length > 0 && (
              <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>sources: {m.sources.join(', ')}</div>
            )}
          </div>
        ))}
        {loading && <div style={{ fontSize: 12, color: C.text3 }}>AI กำลังคิด...</div>}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="พิมพ์ข้อความ..."
          style={{ flex: 1, minHeight: 52, padding: 14, borderRadius: 12, border: `1px solid ${C.border2}`, background: C.surface2, color: C.text, fontFamily: 'Montserrat', fontSize: 13, resize: 'none', outline: 'none' }}
        />
        <button onClick={send} disabled={loading} style={{ padding: '0 24px', borderRadius: 12, border: 'none', background: C.gold, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          ส่ง
        </button>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
