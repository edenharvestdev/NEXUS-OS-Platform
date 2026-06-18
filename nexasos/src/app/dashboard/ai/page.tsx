'use client'
import { useState, useEffect, useCallback } from 'react'
import { Ic, Badge, StatCard, Toggle, Tabs, EmptyState, MiniChart, DonutChart, ProgressBar, Modal, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

const AGENT_DEFS = [
  { id: 1, name: 'Meeting Brain', module: 'meeting', match: 'Meeting' },
  { id: 2, name: 'Finance OCR', module: 'finance', match: 'Finance' },
  { id: 3, name: 'Company GPT', module: 'gpt', match: 'Company GPT' },
  { id: 4, name: 'Doc Guardian', module: 'guardian', match: 'Doc Guardian' },
  { id: 5, name: 'Sales Copilot', module: 'sales', match: 'Sales' },
  { id: 6, name: 'HR Assistant', module: 'people', match: 'HR' },
]

export default function AIControlPage() {
  const { colors: C } = useApp()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState<any>(null)
  const [agents, setAgents] = useState(AGENT_DEFS.map(a => ({ ...a, status: 'active', actions: 0, cost: 0, acc: 100 })))
  const [log, setLog] = useState<any[]>([])
  const [budget, setBudget] = useState(5000)
  const [routerStatus, setRouterStatus] = useState<any>(null)
  const [routerPrompt, setRouterPrompt] = useState('')
  const [routerTask, setRouterTask] = useState('general')
  const [routerResult, setRouterResult] = useState<any>(null)
  const [routing, setRouting] = useState(false)
  const [showAgentDetail, setShowAgentDetail] = useState<any>(null)
  const [liveLog, setLiveLog] = useState(true)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [command, setCommand] = useState<any>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  useEffect(() => { api.getAICommandCenter().then(setCommand).catch(() => {}) }, [])

  const loadStats = useCallback(async () => {
    try {
      const res = await api.getAIStats()
      const data = res.data
      setStats(data)
      setLog((data.logs || []).map((l: any) => ({
        time: new Date(l.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        agent: l.agent,
        event: l.action,
        type: 'info',
      })))
      setAgents(AGENT_DEFS.map(a => {
        const key = Object.keys(data.by_agent || {}).find(k => k.includes(a.match)) || a.name
        const agentData = data.by_agent?.[key] || { count: 0, cost: 0 }
        return { ...a, status: agentData.count > 0 ? 'active' : 'idle', actions: agentData.count, cost: agentData.cost, acc: 100 }
      }))
    } catch {
      showToast('โหลด AI stats ไม่สำเร็จ', 'error')
    }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => {
    api.getAIRouterStatus().then(setRouterStatus).catch(() => {})
  }, [])
  useEffect(() => {
    if (!liveLog) return
    const iv = setInterval(loadStats, 15000)
    return () => clearInterval(iv)
  }, [liveLog, loadStats])

  const runRouter = async () => {
    if (!routerPrompt.trim()) { showToast('ใส่ prompt', 'error'); return }
    setRouting(true)
    try {
      const res = await api.routeAI(routerPrompt, routerTask, true)
      setRouterResult(res)
      showToast(`Routed → ${res.provider}`)
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setRouting(false) }
  }

  const toggleAgent = (id: number) => {
    setAgents(a => a.map(x => x.id === id ? { ...x, status: x.status === 'active' ? 'idle' : 'active' } : x))
    showToast('อัพเดท Agent สำเร็จ')
  }

  const totalCost = stats?.total_cost ?? agents.reduce((s,a)=>s+a.cost,0)
  const totalActions = stats?.total_actions ?? agents.reduce((s,a)=>s+a.actions,0)
  const activeCount = agents.filter(a=>a.status==='active').length
  const avgAcc = Math.round(agents.reduce((s,a)=>s+a.acc,0)/agents.length)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>AI Command Tower · CEO</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>มองทั้งระบบ · API/KPI/Skill · วางแผน AI ทั้งองค์กร</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <Toggle val={liveLog} onChange={setLiveLog}/>
          <span style={{fontSize:12,color:liveLog?C.green:C.text3,fontWeight:600}}>Live Feed</span>
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:C.red+'22',border:`1px solid ${C.red}44`,borderRadius:99}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:C.red,animation:'pulse 1.5s ease infinite'}}/>
            <span style={{fontSize:11,fontWeight:700,color:C.red}}>Live</span>
          </div>
        </div>
      </div>

      {command && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>ภาพรวมองค์กร (CEO View)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
            <div style={{ padding: 12, background: C.bg3, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: C.text3 }}>งานรออนุมัติ</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.gold }}>{command.pending_work_logs?.length || 0}</div>
            </div>
            <div style={{ padding: 12, background: C.bg3, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: C.text3 }}>แผนก</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{command.departments?.length || 0}</div>
            </div>
            <div style={{ padding: 12, background: C.bg3, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: C.text3 }}>AI Configured</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: command.ai_configured ? C.green : C.red }}>{command.ai_configured ? '✓' : '✗'}</div>
            </div>
          </div>
          {command.api_usage?.length > 0 && (
            <div style={{ marginTop: 14, fontSize: 12, color: C.text2 }}>
              API ต่อคน: {command.api_usage.slice(0, 5).map((u: any) => `${u.name} (${u.calls})`).join(' · ')}
            </div>
          )}
        </div>
      )}

      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon="cpu" label="Actions วันนี้" value={totalActions.toLocaleString()} trend={23} color={C.blue} chart={[10,20,15,30,25,40,35,50,45]}/>
        <StatCard icon="dollar" label="API Cost" value={`฿${totalCost.toLocaleString()}`} sub={`/ ฿${budget.toLocaleString()} limit`} color={C.gold}/>
        <StatCard icon="zap" label="AI Agents" value={`${activeCount}/${agents.length}`} sub="Active" color={C.green}/>
        <StatCard icon="target" label="Avg Accuracy" value={`${avgAcc}%`} trend={2} color={C.blue}/>
      </div>

      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:12,fontWeight:700,color:C.text}}>API Cost Budget</span>
            <span style={{fontSize:12,fontWeight:700,color:totalCost/budget>0.8?C.red:C.gold}}>฿{totalCost.toLocaleString()} / ฿{budget.toLocaleString()}</span>
          </div>
          <ProgressBar pct={Math.min(totalCost/budget*100,100)} color={totalCost/budget>0.8?C.red:C.gold} height={8}/>
          {totalCost/budget>0.7&&<div style={{fontSize:11,color:C.red,marginTop:4}}>⚠️ ใกล้ถึง limit แล้ว</div>}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
          <span style={{fontSize:12,color:C.text3}}>ปรับ Budget:</span>
          <input type="range" min={1000} max={20000} step={500} value={budget} onChange={e=>setBudget(parseInt(e.target.value))} style={{width:120,accentColor:C.gold}}/>
          <span style={{fontSize:12,fontWeight:700,color:C.gold,minWidth:60}}>฿{budget.toLocaleString()}</span>
        </div>
      </div>

      <Tabs tabs={[{id:'overview',icon:'grid',label:'ภาพรวม'},{id:'router',icon:'cpu',label:'Model Router'},{id:'agents',icon:'cpu',label:'AI Agents'},{id:'permissions',icon:'lock',label:'สิทธิ์'},{id:'log',icon:'zap',label:'Live Log'}]} active={activeTab} onChange={setActiveTab}/>

      {activeTab==='overview'&&(
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:2,minWidth:300,background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Module Activity (7 วัน)</div>
            {agents.map(a=>{
              const pct = totalActions ? Math.round((a.actions / totalActions) * 100) : 0
              return (
              <div key={a.name} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:12,color:C.text2}}>{a.name}</span>
                  <div style={{display:'flex',gap:8}}>
                    <span style={{fontSize:11,color:C.text3}}>{a.actions} actions</span>
                    <span style={{fontSize:12,fontWeight:700,color:C.gold}}>{pct}%</span>
                  </div>
                </div>
                <ProgressBar pct={pct} color={C.gold}/>
              </div>
            )})}
          </div>
          <div style={{flex:1,minWidth:200}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16,display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text}}>Cost Breakdown</div>
              <DonutChart pct={Math.round(totalCost/budget*100)} color={totalCost/budget>0.8?C.red:C.gold} size={100} label={`${Math.round(totalCost/budget*100)}%`} sub="Used"/>
              {agents.map(a=>(
                <div key={a.id} style={{display:'flex',justifyContent:'space-between',width:'100%',padding:'4px 0',borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:11,color:C.text2,display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:a.status==='active'?C.gold:C.text3,flexShrink:0}}/>{a.name}</span>
                  <span style={{fontSize:11,fontWeight:700,color:C.gold}}>฿{a.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab==='router'&&(
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:C.goldLight,border:`1px solid ${C.gold}33`,borderRadius:12,padding:14,fontSize:12,color:C.text2}}>
            <strong style={{color:C.gold}}>AI Connector Layer</strong> — Claude (strategy) · GPT (automation) · Gemini (research) · Typhoon (Thai) · Copilot ไม่ใช่ Autopilot
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
            {(routerStatus?.routes||[]).map((r:any)=>(
              <div key={r.task_type} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
                <div style={{fontSize:11,color:C.text3,textTransform:'uppercase'}}>{r.task_type}</div>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginTop:4}}>{r.provider} / {r.model}</div>
                <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                  <Badge type={r.configured?'green':'red'}>{r.configured?'Ready':'No Key'}</Badge>
                  <Badge type="blue">{r.decision_rights}</Badge>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>ทดสอบ Model Router</div>
            <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
              {['general','strategy','automation','research','thai_market'].map(t=>(
                <button key={t} onClick={()=>setRouterTask(t)} style={{padding:'6px 12px',borderRadius:8,border:`1px solid ${routerTask===t?C.gold:C.border}`,background:routerTask===t?C.goldLight:'transparent',color:routerTask===t?C.gold:C.text3,cursor:'pointer',fontSize:11,fontWeight:600}}>{t}</button>
              ))}
            </div>
            <textarea value={routerPrompt} onChange={e=>setRouterPrompt(e.target.value)} placeholder="ถาม AI ด้วย grounding จากข้อมูลองค์กร..." rows={3} style={{width:'100%',padding:12,borderRadius:10,background:C.bg3,border:`1px solid ${C.border}`,color:C.text,fontSize:13,resize:'vertical',boxSizing:'border-box'}}/>
            <button onClick={runRouter} disabled={routing} style={{marginTop:10,padding:'10px 20px',borderRadius:10,border:'none',cursor:'pointer',background:`linear-gradient(135deg,${C.gold},${C.gold2})`,color:'#fff',fontWeight:700,opacity:routing?0.7:1}}>
              {routing?'Routing...':'Route + Ground'}
            </button>
            {routerResult&&(
              <div style={{marginTop:14,padding:14,background:C.bg3,borderRadius:10,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:11,color:C.text3,marginBottom:6}}>{routerResult.provider} · {routerResult.model} · {routerResult.decision_rights}</div>
                <div style={{fontSize:13,color:C.text2,whiteSpace:'pre-wrap',lineHeight:1.6}}>{routerResult.response}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab==='agents'&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',padding:'10px 16px',borderBottom:`1px solid ${C.border}`,gap:12}}>
            {['Agent','Status','Actions','Cost','Accuracy',''].map((h,i)=><div key={i} style={{fontSize:11,fontWeight:700,color:C.text3}}>{h}</div>)}
          </div>
          {agents.map(a=>(
            <div key={a.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',padding:'14px 16px',borderBottom:`1px solid ${C.border}`,gap:12,alignItems:'center',transition:'background 0.15s',cursor:'pointer'}}
              onClick={()=>setShowAgentDetail(a)}
              onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)'}
              onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:a.status==='active'?C.green:C.text3,flexShrink:0,animation:a.status==='active'?'pulse 2s ease infinite':''}}/>
                <span style={{fontSize:13,fontWeight:600,color:C.text}}>{a.name}</span>
              </div>
              <Badge type={a.status==='active'?'green':'gold'}>{a.status}</Badge>
              <span style={{fontSize:12,color:C.text2,fontWeight:600}}>{a.actions.toLocaleString()}</span>
              <span style={{fontSize:12,color:C.gold,fontWeight:700}}>฿{a.cost}</span>
              <div>
                <span style={{fontSize:12,fontWeight:700,color:a.acc>97?C.green:a.acc>90?C.gold:C.red}}>{a.acc}%</span>
                <ProgressBar pct={a.acc} color={a.acc>97?C.green:C.gold} height={3}/>
              </div>
              <div onClick={e=>e.stopPropagation()}>
                <button onClick={()=>toggleAgent(a.id)} style={{padding:'5px 10px',borderRadius:7,background:a.status==='active'?C.red+'22':C.green+'22',border:`1px solid ${a.status==='active'?C.red+'44':C.green+'44'}`,color:a.status==='active'?C.red:C.green,cursor:'pointer',fontSize:10,fontWeight:600}}>
                  {a.status==='active'?'หยุด':'เริ่ม'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab==='permissions'&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:24,textAlign:'center'}}>
          <div style={{fontSize:14,color:C.text2}}>สิทธิ์ AI ถูกควบคุมผ่าน Role ในระบบ (admin, hr, finance, sales, it, marketing)</div>
          <div style={{fontSize:12,color:C.text3,marginTop:8}}>ดูการตั้งค่าได้ที่ Settings → Modules</div>
        </div>
      )}

      {activeTab==='log'&&(
        <div style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
          <div style={{padding:'10px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,fontWeight:700,color:C.text}}>Live Activity Log</span>
            <div style={{display:'flex',gap:8}}>
              {liveLog&&<div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:C.green}}><div style={{width:5,height:5,borderRadius:'50%',background:C.green,animation:'pulse 1.5s ease infinite'}}/> Live</div>}
              <button onClick={()=>setLog([])} style={{padding:'4px 10px',borderRadius:6,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer',fontSize:11}}>ล้าง</button>
            </div>
          </div>
          <div style={{maxHeight:400,overflowY:'auto'}}>
            {log.map((l,i)=>(
              <div key={i} style={{display:'flex',gap:12,padding:'9px 16px',borderBottom:`1px solid ${C.border}`,alignItems:'center',animation:i===0&&liveLog?'fadeIn 0.3s ease':'none'}}>
                <span style={{fontSize:10,color:C.text3,fontFamily:'JetBrains Mono,monospace',flexShrink:0}}>{l.time}</span>
                <Badge type={l.type==='success'?'green':l.type==='warning'?'red':'blue'}>{l.agent}</Badge>
                <span style={{fontSize:11,color:C.text2,flex:1}}>{l.event}</span>
                <div style={{width:6,height:6,borderRadius:'50%',background:l.type==='success'?C.green:l.type==='warning'?C.red:C.blue,flexShrink:0}}/>
              </div>
            ))}
            {log.length===0&&<EmptyState icon="zap" title="ไม่มี Log" sub="เปิด Live Feed เพื่อดูกิจกรรม AI"/>}
          </div>
        </div>
      )}

      {showAgentDetail&&(
        <Modal title={`Agent: ${showAgentDetail.name}`} onClose={()=>setShowAgentDetail(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <Badge type={showAgentDetail.status==='active'?'green':'gold'}>{showAgentDetail.status}</Badge>
              <Badge type="gold">{showAgentDetail.actions} actions</Badge>
              <Badge type="blue">฿{showAgentDetail.cost} today</Badge>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {([['Accuracy',`${showAgentDetail.acc}%`],['Actions',showAgentDetail.actions],['Cost Today',`฿${showAgentDetail.cost}`],['Module',showAgentDetail.module]] as [string,string|number][]).map(([k,v])=>(
                <div key={k} style={{background:C.surface,borderRadius:10,padding:'12px 14px'}}>
                  <div style={{fontSize:10,color:C.text3}}>{k}</div>
                  <div style={{fontSize:16,fontWeight:800,color:C.gold,marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>Performance (7 วัน)</div>
              <MiniChart data={[60,70,65,80,75,90,showAgentDetail.acc]} color={C.gold} h={60}/>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{toggleAgent(showAgentDetail.id);setShowAgentDetail(null);}} style={{flex:1,padding:'10px',borderRadius:10,background:showAgentDetail.status==='active'?C.red+'22':C.green+'22',border:`1px solid ${showAgentDetail.status==='active'?C.red+'44':C.green+'44'}`,color:showAgentDetail.status==='active'?C.red:C.green,cursor:'pointer',fontSize:12,fontWeight:700}}>
                {showAgentDetail.status==='active'?'หยุด Agent':'เริ่ม Agent'}
              </button>
              <button onClick={()=>showToast('Reset Agent สำเร็จ')} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}>Reset</button>
            </div>
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
