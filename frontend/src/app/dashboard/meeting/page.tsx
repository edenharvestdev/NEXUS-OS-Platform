'use client'
import { useState } from 'react'
import { C, Ic, Badge, ProgressBar, Toast } from '@/lib/ui'

async function callClaude(message: string): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  const data = await res.json()
  return data.text
}

export default function MeetingPage() {
  const [stage, setStage] = useState<'upload'|'processing'|'done'>('upload')
  const [progress, setProgress] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [summaryText, setSummaryText] = useState('')
  const [editSummary, setEditSummary] = useState(false)
  const [actions, setActions] = useState([
    {id:1,task:'จัดทำ Campaign brief สำหรับ Q2',person:'สมชาย',due:'15 พ.ค.',priority:'high',done:false},
    {id:2,task:'ส่งรายงาน Q1 ให้ผู้บริหาร',person:'วิไล',due:'10 พ.ค.',priority:'med',done:false},
    {id:3,task:'อนุมัติงบโฆษณา ฿500,000',person:'ประภา',due:'8 พ.ค.',priority:'high',done:true},
  ])
  const [newAction, setNewAction] = useState('')
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const examples = ['ประชุม Marketing Q2 Review','Product Roadmap Planning','Daily Standup','Sales Pipeline Review']

  const process = async (exTitle?: string) => {
    setStage('processing'); setProgress(0); setGenerating(true)
    const iv = setInterval(()=>setProgress(p=>{if(p>=100){clearInterval(iv);return 100;}return p+6;}),80)
    try {
      const prompt = `สร้างสรุปการประชุม "${exTitle||'Marketing Q2 Review'}" ภาษาไทย 4-5 ประเด็นหลัก ในรูปแบบ bullet points ขึ้นต้นด้วย • แต่ละประเด็นสั้นๆ ชัดเจน`
      const r = await callClaude(prompt)
      setSummaryText(r)
    } catch {
      setSummaryText('• ยอดขาย Q1 เติบโต 12% เกินเป้าหมาย\n• วางแผน Campaign สำหรับ Q2 งบประมาณ ฿500,000\n• อนุมัติจ้าง Digital Agency ภายนอก\n• กำหนด KPI ใหม่: ROAS > 3x และ CAC < ฿2,000')
    }
    setGenerating(false)
    setTimeout(()=>setStage('done'),500)
  }

  const toggleAction = (id:number) => setActions(a=>a.map(x=>x.id===id?{...x,done:!x.done}:x))
  const deleteAction = (id:number) => setActions(a=>a.filter(x=>x.id!==id))
  const addAction = () => {
    if(!newAction.trim()) return
    setActions(a=>[...a,{id:Date.now(),task:newAction,person:'ยังไม่กำหนด',due:'TBD',priority:'med',done:false}])
    setNewAction(''); showToast('เพิ่ม Action Item แล้ว')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>Meeting Brain</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>อัพโหลดเสียง/วิดีโอ → AI สรุปพร้อม Action Items</div></div>
        {stage==='done'&&(
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>showToast('Export PDF สำเร็จ')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border2}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}><Ic n="download" s={13}/>PDF</button>
            <button onClick={()=>showToast('แชร์ Link แล้ว')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border2}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}><Ic n="send" s={13}/>แชร์</button>
            <button onClick={()=>setStage('upload')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700}}><Ic n="plus" s={13}/>ประชุมใหม่</button>
          </div>
        )}
      </div>

      {stage==='upload'&&(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div onClick={()=>process()} style={{minHeight:160,border:`2px dashed ${C.border2}`,borderRadius:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,cursor:'pointer',padding:32,transition:'all 0.2s'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.gold;(e.currentTarget as HTMLDivElement).style.background=`${C.gold}08`;}}
            onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border2;(e.currentTarget as HTMLDivElement).style.background='transparent';}}>
            <div style={{width:64,height:64,borderRadius:20,background:C.surface,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="mic" s={32} c={C.text3}/></div>
            <div style={{fontSize:15,fontWeight:700,color:C.text2}}>อัพโหลดไฟล์เสียง / วิดีโอ</div>
            <div style={{fontSize:12,color:C.text3,textAlign:'center'}}>MP3, M4A, WAV, MP4 — หรือวางข้อความการประชุมโดยตรง</div>
            <button style={{padding:'10px 24px',borderRadius:12,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:8}}><Ic n="upload" s={16}/>เลือกไฟล์</button>
          </div>
          <div style={{textAlign:'center',fontSize:12,color:C.text3}}>หรือเลือกตัวอย่างด้านล่าง</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {examples.map(ex=>(
              <button key={ex} onClick={()=>process(ex)} style={{flex:'1 1 auto',padding:'10px 14px',borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all 0.15s'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=C.goldLight;(e.currentTarget as HTMLButtonElement).style.borderColor=C.gold+'44';(e.currentTarget as HTMLButtonElement).style.color=C.gold;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background=C.surface;(e.currentTarget as HTMLButtonElement).style.borderColor=C.border;(e.currentTarget as HTMLButtonElement).style.color=C.text2;}}>
                <Ic n="video" s={13}/>{ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage==='processing'&&(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20,padding:'60px 0',background:C.surface,borderRadius:16,border:`1px solid ${C.border}`}}>
          <div style={{width:72,height:72,borderRadius:22,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center',animation:'glow 2s ease infinite'}}><Ic n="cpu" s={36} c={C.gold}/></div>
          <div style={{fontSize:16,fontWeight:700,color:C.text}}>AI กำลังวิเคราะห์...</div>
          <div style={{width:'100%',maxWidth:400,padding:'0 40px'}}>
            <ProgressBar pct={progress} color={C.gold} height={8}/>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}>
              {['ถอดเสียง','วิเคราะห์','สรุป','Action Items'].map((s,i)=>(
                <span key={s} style={{fontSize:11,color:progress>(i*25)?C.gold:C.text3,fontWeight:progress>(i*25)?700:400}}>
                  {progress>(i*25+25)?<Ic n="check" s={11} c={C.gold}/>:null}{s}
                </span>
              ))}
            </div>
          </div>
          {generating&&<div style={{fontSize:12,color:C.text3}}>🤖 Claude AI กำลังสร้างสรุป...</div>}
        </div>
      )}

      {stage==='done'&&(
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          <div style={{flex:2,minWidth:300,display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>📋 สรุปการประชุม</div>
                <button onClick={()=>setEditSummary(!editSummary)} style={{display:'flex',alignItems:'center',gap:4,padding:'5px 10px',borderRadius:8,background:editSummary?C.goldLight:'rgba(255,255,255,0.05)',border:`1px solid ${editSummary?C.gold+'44':C.border}`,color:editSummary?C.gold:C.text3,cursor:'pointer',fontSize:11,fontWeight:600}}>
                  <Ic n="edit" s={12}/>{editSummary?'บันทึก':'แก้ไข'}
                </button>
              </div>
              <div style={{fontSize:11,color:C.text3,marginBottom:12}}>5 พ.ค. 2026 · 14:00–15:30 · 8 ผู้เข้าร่วม</div>
              {editSummary?(
                <textarea value={summaryText} onChange={e=>setSummaryText(e.target.value)} style={{width:'100%',minHeight:120,background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border2}`,borderRadius:10,padding:'10px 14px',color:C.text,fontFamily:'Montserrat',fontSize:13,outline:'none',resize:'vertical',lineHeight:1.7}}/>
              ):(
                <div style={{fontSize:13,color:C.text2,lineHeight:1.8,whiteSpace:'pre-wrap'}}>{summaryText}</div>
              )}
            </div>

            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>✅ Action Items ({actions.filter(a=>!a.done).length} รายการค้าง)</div>
              {actions.map(a=>(
                <div key={a.id} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:`1px solid ${C.border}`,alignItems:'center'}}>
                  <div onClick={()=>toggleAction(a.id)} style={{width:20,height:20,borderRadius:6,border:`2px solid ${a.done?C.green:C.border2}`,background:a.done?C.green:'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,transition:'all 0.2s'}}>
                    {a.done&&<Ic n="check" s={12} c="#fff"/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:a.done?C.text3:C.text,textDecoration:a.done?'line-through':'none',fontWeight:500}}>{a.task}</div>
                    <div style={{fontSize:10,color:C.text3,marginTop:2}}>{a.person} · {a.due}</div>
                  </div>
                  <Badge type={a.priority==='high'?'red':'gold'}>{a.priority==='high'?'🔴':'🟡'}</Badge>
                  <button onClick={()=>deleteAction(a.id)} style={{background:'none',border:'none',cursor:'pointer',color:C.text3,padding:2}}><Ic n="trash" s={13}/></button>
                </div>
              ))}
              <div style={{display:'flex',gap:8,marginTop:12}}>
                <input placeholder="เพิ่ม Action Item..." value={newAction} onChange={e=>setNewAction(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addAction()}
                  style={{flex:1,background:'rgba(255,255,255,0.04)',border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',color:C.text,fontFamily:'Montserrat',fontSize:12,outline:'none'}}/>
                <button onClick={addAction} style={{padding:'8px 14px',borderRadius:8,background:`${C.gold}22`,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:12,fontWeight:700}}>+</button>
              </div>
            </div>
          </div>

          <div style={{flex:1,minWidth:200,display:'flex',flexDirection:'column',gap:12}}>
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:12}}>ข้อมูล</div>
              {([['ระยะเวลา','90 นาที'],['ผู้เข้าร่วม','8 คน'],['Action Items',`${actions.length} รายการ`],['เสร็จแล้ว',`${actions.filter(a=>a.done).length}/${actions.length}`]] as [string,string][]).map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:11,color:C.text3}}>{k}</span>
                  <span style={{fontSize:11,color:C.text,fontWeight:700}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:`${C.gold}10`,border:`1px solid ${C.gold}30`,borderRadius:14,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:8}}>🔑 Key Decisions</div>
              {['อนุมัติงบ ฿500K Q2','จ้าง Digital Agency','ROAS target ≥ 3x'].map((d,i)=>(
                <div key={i} style={{fontSize:11,color:C.text2,padding:'3px 0',display:'flex',gap:6,alignItems:'center'}}><div style={{width:4,height:4,borderRadius:'50%',background:C.gold,flexShrink:0}}/>{d}</div>
              ))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {['📤 ส่งให้ทีม','📄 Export PDF','💾 บันทึก','🔗 แชร์ Link'].map(a=>(
                <button key={a} onClick={()=>showToast(`${a} สำเร็จ`)} style={{width:'100%',padding:'10px',borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:500,textAlign:'left',transition:'all 0.15s'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.07)';(e.currentTarget as HTMLButtonElement).style.color=C.text;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background=C.surface;(e.currentTarget as HTMLButtonElement).style.color=C.text2;}}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
