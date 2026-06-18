'use client'
import { useState, useEffect } from 'react'
import { C, Ic, Badge, StatCard, Toggle, Tabs, EmptyState, MiniChart, DonutChart, ProgressBar, Modal, Toast } from '@/lib/ui'

export default function AIControlPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [agents, setAgents] = useState([
    {id:1,name:'Meeting Brain',status:'active',actions:342,cost:1240,acc:98,module:'meeting'},
    {id:2,name:'Finance OCR',status:'active',actions:89,cost:320,acc:99,module:'finance'},
    {id:3,name:'Company GPT',status:'active',actions:456,cost:890,acc:96,module:'gpt'},
    {id:4,name:'Doc Guardian',status:'idle',actions:12,cost:80,acc:100,module:'guardian'},
    {id:5,name:'Sales Copilot',status:'active',actions:167,cost:620,acc:94,module:'sales'},
    {id:6,name:'HR Assistant',status:'active',actions:78,cost:290,acc:97,module:'people'},
  ])
  const [log, setLog] = useState([
    {time:'09:42:18',agent:'Company GPT',event:'ตอบคำถาม HR — นโยบายลาป่วย',type:'info'},
    {time:'09:41:55',agent:'Finance OCR',event:'ประมวลผลใบเสร็จ Receipt-001.pdf',type:'success'},
    {time:'09:40:32',agent:'Meeting Brain',event:'สรุปประชุม Marketing Q2 — 90 นาที',type:'success'},
    {time:'09:38:10',agent:'Doc Guardian',event:'ตรวจพบความเสี่ยง 2 รายการ ในสัญญา ABC',type:'warning'},
    {time:'09:35:44',agent:'Sales Copilot',event:'Win Rate analysis — XYZ Corp: 82%',type:'info'},
  ])
  const [perms, setPerms] = useState<Record<string,Record<string,boolean>>>({
    CEO:{hr:true,finance:true,sales:true,gpt:true,meeting:true,tower:true},
    'HR Manager':{hr:true,finance:false,sales:false,gpt:true,meeting:true,tower:false},
    Finance:{hr:false,finance:true,sales:false,gpt:false,meeting:false,tower:false},
    Sales:{hr:false,finance:false,sales:true,gpt:true,meeting:false,tower:false},
    Staff:{hr:false,finance:false,sales:false,gpt:true,meeting:false,tower:false},
  })
  const [budget, setBudget] = useState(5000)
  const [showAgentDetail, setShowAgentDetail] = useState<any>(null)
  const [liveLog, setLiveLog] = useState(true)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  useEffect(()=>{
    if(!liveLog) return
    const msgs=['Company GPT ตอบคำถามใหม่','Finance ประมวลผลใบเสร็จ','Sales วิเคราะห์ deal ใหม่','HR ประมวลผลคำขอลา']
    const aNames=['Company GPT','Finance OCR','Sales Copilot','HR Assistant']
    const iv=setInterval(()=>{
      const idx=Math.floor(Math.random()*msgs.length)
      const now=new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
      setLog(l=>[{time:now,agent:aNames[idx],event:msgs[idx],type:'info'},...l.slice(0,19)])
      setAgents(a=>a.map(x=>x.status==='active'?{...x,actions:x.actions+Math.floor(Math.random()*3)}:x))
    },4000)
    return()=>clearInterval(iv)
  },[liveLog])

  const toggleAgent = (id:number) => { setAgents(a=>a.map(x=>x.id===id?{...x,status:x.status==='active'?'idle':'active'}:x)); showToast('อัพเดท Agent สำเร็จ') }
  const togglePerm = (role:string, mod:string) => { setPerms(p=>({...p,[role]:{...p[role],[mod]:!p[role][mod]}})); showToast('อัพเดทสิทธิ์สำเร็จ') }

  const totalCost = agents.reduce((s,a)=>s+a.cost,0)
  const totalActions = agents.reduce((s,a)=>s+a.actions,0)
  const activeCount = agents.filter(a=>a.status==='active').length
  const avgAcc = Math.round(agents.reduce((s,a)=>s+a.acc,0)/agents.length)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>AI Control Tower</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>Monitor · Permissions · Cost Analytics</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <Toggle val={liveLog} onChange={setLiveLog}/>
          <span style={{fontSize:12,color:liveLog?C.green:C.text3,fontWeight:600}}>Live Feed</span>
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:C.redLight,border:`1px solid ${C.red}44`,borderRadius:99}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:C.red,animation:'pulse 1.5s ease infinite'}}/>
            <span style={{fontSize:11,fontWeight:700,color:C.red}}>Live</span>
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon="cpu" label="Actions วันนี้" value={totalActions.toLocaleString()} trend={23} color={C.teal} chart={[10,20,15,30,25,40,35,50,45]}/>
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

      <Tabs tabs={[{id:'overview',icon:'grid',label:'ภาพรวม'},{id:'agents',icon:'cpu',label:'AI Agents'},{id:'permissions',icon:'lock',label:'สิทธิ์'},{id:'log',icon:'zap',label:'Live Log'}]} active={activeTab} onChange={setActiveTab}/>

      {activeTab==='overview'&&(
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:2,minWidth:300,background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Module Activity (7 วัน)</div>
            {([['Company GPT',90,C.gold,456],['Meeting Brain',80,C.teal,342],['Finance OCR',60,C.blue,89],['Sales Copilot',75,C.green,167],['Doc Guardian',40,C.red,12],['HR Assistant',55,C.purple,78]] as [string,number,string,number][]).map(([name,pct,col,acts])=>(
              <div key={name} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontSize:12,color:C.text2}}>{name}</span>
                  <div style={{display:'flex',gap:8}}>
                    <span style={{fontSize:11,color:C.text3}}>{acts} actions</span>
                    <span style={{fontSize:12,fontWeight:700,color:col}}>{pct}%</span>
                  </div>
                </div>
                <ProgressBar pct={pct} color={col}/>
              </div>
            ))}
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
                <button onClick={()=>toggleAgent(a.id)} style={{padding:'5px 10px',borderRadius:7,background:a.status==='active'?C.redLight:C.greenLight,border:`1px solid ${a.status==='active'?C.red+'44':C.green+'44'}`,color:a.status==='active'?C.red:C.green,cursor:'pointer',fontSize:10,fontWeight:600}}>
                  {a.status==='active'?'หยุด':'เริ่ม'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab==='permissions'&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:'140px repeat(6,1fr)',padding:'12px 16px',borderBottom:`1px solid ${C.border}`,gap:8,minWidth:600}}>
            <span style={{fontSize:11,fontWeight:700,color:C.text3}}>Role</span>
            {['hr','finance','sales','gpt','meeting','tower'].map(m=><span key={m} style={{fontSize:11,fontWeight:700,color:C.text3,textAlign:'center',textTransform:'uppercase'}}>{m}</span>)}
          </div>
          {Object.entries(perms).map(([role,mods])=>(
            <div key={role} style={{display:'grid',gridTemplateColumns:'140px repeat(6,1fr)',padding:'12px 16px',borderBottom:`1px solid ${C.border}`,gap:8,alignItems:'center',minWidth:600}}
              onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.02)'}
              onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
              <span style={{fontSize:12,fontWeight:700,color:C.text}}>{role}</span>
              {['hr','finance','sales','gpt','meeting','tower'].map(mod=>(
                <div key={mod} style={{display:'flex',justifyContent:'center'}}>
                  <div onClick={()=>togglePerm(role,mod)} style={{width:28,height:28,borderRadius:8,background:mods[mod]?C.greenLight:C.redLight,border:`1px solid ${mods[mod]?C.green+'44':C.red+'44'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.transform='scale(1.15)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.transform='scale(1)'}>
                    {mods[mod]?<Ic n="check" s={13} c={C.green}/>:<Ic n="x" s={13} c={C.red}/>}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div style={{padding:'10px 16px',fontSize:11,color:C.text3}}>💡 คลิกที่ ✓/✗ เพื่อเปลี่ยนสิทธิ์</div>
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
              <button onClick={()=>{toggleAgent(showAgentDetail.id);setShowAgentDetail(null);}} style={{flex:1,padding:'10px',borderRadius:10,background:showAgentDetail.status==='active'?C.redLight:C.greenLight,border:`1px solid ${showAgentDetail.status==='active'?C.red+'44':C.green+'44'}`,color:showAgentDetail.status==='active'?C.red:C.green,cursor:'pointer',fontSize:12,fontWeight:700}}>
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
