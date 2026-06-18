'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser } from '@/lib/users'
import { C, Ic, StatCard, MiniChart, Toast } from '@/lib/ui'

export default function DashboardPage() {
  const router = useRouter()
  const [time, setTime] = useState(new Date())
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})
  const [tasks, setTasks] = useState([
    {id:1,text:'Review Q1 Report',done:false,priority:'high'},
    {id:2,text:'อนุมัติค่าใช้จ่าย ฿12,400',done:false,priority:'high'},
    {id:3,text:'ประชุม Sales 14:00',done:true,priority:'med'},
    {id:4,text:'ส่ง HR Policy Update',done:false,priority:'low'},
  ])

  useEffect(()=>{ setUser(getUser()) },[])
  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t);},[])

  const greeting = time.getHours()<12?'สวัสดีตอนเช้า':time.getHours()<18?'สวัสดีตอนบ่าย':'สวัสดีตอนเย็น'
  const toggleTask = (id:number) => setTasks(ts=>ts.map(t=>t.id===id?{...t,done:!t.done}:t))

  const nav = (id:string) => router.push(id==='dashboard'?'/dashboard':`/dashboard/${id}`)

  const modules = [
    {id:'people',icon:'users',label:'HR & People',desc:'247 พนักงาน',color:C.green,stat:'+3'},
    {id:'finance',icon:'dollar',label:'Finance',desc:'฿2.4M รายได้',color:C.gold,stat:'+12%'},
    {id:'sales',icon:'target',label:'Sales CRM',desc:'18 deals',color:C.blue,stat:'฿4.9M'},
    {id:'marketing',icon:'mail',label:'Marketing',desc:'5 campaigns',color:C.purple,stat:'124K reach'},
    {id:'meeting',icon:'video',label:'Meeting Brain',desc:'3 pending',color:C.orange,stat:'AI Ready'},
    {id:'gpt',icon:'msg',label:'Company GPT',desc:'AI ตอบคำถาม',color:C.gold,stat:'Online'},
    {id:'guardian',icon:'shield',label:'Doc Guardian',desc:'12 เอกสาร',color:C.red,stat:'2 risks'},
    {id:'ai',icon:'cpu',label:'AI Tower',desc:'1,247 actions',color:C.teal,stat:'฿3.4K'},
  ]
  const aiActivity = [
    {icon:'zap',color:C.gold,text:'Meeting Brain สรุปประชุม Marketing เสร็จ — 12 action items',time:'2 นาที'},
    {icon:'dollar',color:C.green,text:'Finance อนุมัติค่าใช้จ่าย ฿12,400 อัตโนมัติ',time:'15 นาที'},
    {icon:'shield',color:C.red,text:'Doc Guardian พบ 2 ความเสี่ยงในสัญญา ABC Corp',time:'1 ชม.'},
    {icon:'users',color:C.blue,text:'HR AI Onboard พนักงานใหม่ 3 คนสำเร็จ',time:'3 ชม.'},
    {icon:'target',color:C.gold,text:'Sales Copilot คาด Win rate 82% — XYZ Corp',time:'5 ชม.'},
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:18,animation:'fadeIn 0.3s ease'}}>
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,${C.bg3},${C.bg2})`,border:`1px solid ${C.border}`,borderRadius:16,padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-30,top:-30,width:180,height:180,borderRadius:'50%',background:`radial-gradient(circle,${C.gold}18,transparent 70%)`}}/>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.text,marginBottom:4}}>{greeting}, {user?.name||'...'} 👋</div>
          <div style={{fontSize:13,color:C.text2}}>จันทร์ 5 พฤษภาคม 2026 · วันนี้มี <span style={{color:C.gold,fontWeight:600}}>{tasks.filter(t=>!t.done).length} งาน</span> รอดำเนินการ</div>
          <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>nav('gpt')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,boxShadow:`0 4px 14px ${C.gold}44`}}><Ic n="msg" s={13}/>ถาม AI</button>
            <button onClick={()=>nav('meeting')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border2}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}><Ic n="mic" s={13}/>สรุปประชุม</button>
            <button onClick={()=>nav('finance')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border2}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}><Ic n="upload" s={13}/>อัพโหลดใบเสร็จ</button>
          </div>
        </div>
        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:30,fontWeight:500,color:C.gold,letterSpacing:2,flexShrink:0,textShadow:`0 0 20px ${C.gold}44`}}>
          {time.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon="users" label="พนักงานทั้งหมด" value="247" trend={3} color={C.green} chart={[30,35,32,40,38,42,45,40,47]} onClick={()=>nav('people')}/>
        <StatCard icon="dollar" label="รายได้เดือนนี้" value="฿2.4M" trend={12} color={C.gold} chart={[40,55,45,60,58,65,70,68,80]} onClick={()=>nav('finance')}/>
        <StatCard icon="target" label="Sales Pipeline" value="฿8.9M" sub="18 deals active" color={C.blue} chart={[20,30,25,40,35,50,45,55,60]} onClick={()=>nav('sales')}/>
        <StatCard icon="cpu" label="AI Actions วันนี้" value="342" sub="ประหยัด ฿24K" trend={15} color={C.teal} chart={[10,20,15,30,25,40,35,50,45]} onClick={()=>nav('ai')}/>
      </div>

      <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
        {/* Modules */}
        <div style={{flex:2,minWidth:300}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>Modules</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {modules.map(m=>(
              <div key={m.id} onClick={()=>nav(m.id)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 12px',cursor:'pointer',transition:'all 0.2s',display:'flex',flexDirection:'column',gap:8}}
                onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=`${m.color}14`;(e.currentTarget as HTMLDivElement).style.borderColor=`${m.color}44`;(e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background=C.surface;(e.currentTarget as HTMLDivElement).style.borderColor=C.border;(e.currentTarget as HTMLDivElement).style.transform='';}}>
                <div style={{width:36,height:36,borderRadius:10,background:`${m.color}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n={m.icon} s={18} c={m.color}/></div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:C.text}}>{m.label}</div>
                  <div style={{fontSize:10,color:C.text3,marginTop:1}}>{m.desc}</div>
                </div>
                <div style={{fontSize:10,fontWeight:600,color:m.color}}>{m.stat}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{flex:1,minWidth:260,display:'flex',flexDirection:'column',gap:12}}>
          {/* Tasks */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
            <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:700,color:C.text}}>Tasks วันนี้</span>
              <span style={{fontSize:11,color:C.text3}}>{tasks.filter(t=>t.done).length}/{tasks.length}</span>
            </div>
            {tasks.map(task=>(
              <div key={task.id} onClick={()=>toggleTask(task.id)} style={{display:'flex',gap:10,alignItems:'center',padding:'10px 14px',borderBottom:`1px solid ${C.border}`,cursor:'pointer',transition:'background 0.15s'}}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)'}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${task.done?C.green:C.border2}`,background:task.done?C.green:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s'}}>
                  {task.done&&<Ic n="check" s={11} c="#fff"/>}
                </div>
                <span style={{flex:1,fontSize:12,color:task.done?C.text3:C.text,textDecoration:task.done?'line-through':'none'}}>{task.text}</span>
                <div style={{width:6,height:6,borderRadius:'50%',background:task.priority==='high'?C.red:task.priority==='med'?C.gold:C.green,flexShrink:0}}/>
              </div>
            ))}
          </div>

          {/* AI Feed */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
            <div style={{padding:'12px 14px',borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:13,fontWeight:700,color:C.text}}>AI Activity</span>
            </div>
            {aiActivity.map((a,i)=>(
              <div key={i} style={{padding:'10px 14px',borderBottom:i<aiActivity.length-1?`1px solid ${C.border}`:'none',display:'flex',gap:10,alignItems:'flex-start'}}>
                <div style={{width:26,height:26,borderRadius:8,background:`${a.color}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic n={a.icon} s={12} c={a.color}/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,color:C.text,lineHeight:1.5}}>{a.text}</div>
                  <div style={{fontSize:10,color:C.text3,marginTop:2}}>{a.time}ที่แล้ว</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
