'use client'
import { useState, useEffect, useRef } from 'react'
import { Ic, Modal, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function GPTPage() {
  const { colors: C } = useApp()
  const [messages, setMessages] = useState<any[]>([
    {role:'ai',content:'สวัสดีครับ ผม Company GPT ของ NEXUS OS 🤖\n\nผมตอบจากข้อมูลจริงขององค์กร (Grounding/RAG) ถามได้เลยเกี่ยวกับ:\n• นโยบาย HR และการลา\n• ขั้นตอนการเงินและเบิกค่าใช้จ่าย\n• KPI และ Data Dictionary\n• กฎระเบียบ/SOP บริษัท',sources:[] as string[]},
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [docs, setDocs] = useState<string[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [modelLabel, setModelLabel] = useState('Claude Sonnet 4 → Gemini fallback')
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  useEffect(()=>{ 
    loadHistory();
    api.getDocuments().then(r => setDocs((r.data || []).map((d: any) => d.name))).catch(() => {})
    api.getChatAgents().then(r => {
      const s = r.scopes?.find((x: any) => x.scope === 'company')
      if (s?.agent?.modelHint) setModelLabel(s.agent.modelHint)
    }).catch(() => {})
  }, []);

  useEffect(()=>{ 
    endRef.current?.scrollIntoView({behavior:'smooth'}) 
  }, [messages]);

  const loadHistory = async () => {
    try {
      const res = await api.getChatHistory('company');
      if (res.data && res.data.length > 0) {
        setMessages(res.data);
      }
    } catch (err) {
      console.warn('Failed to load chat history');
    }
  };

  const send = async () => {
    if(!input.trim()||loading) return
    const q = input.trim()
    setInput('')
    
    const userMsg = {role:'user',content:q};
    setMessages(m=>[...m, userMsg])
    setLoading(true)
    
    try {
      const res = await api.sendMessage(q, 'company');
      const sources = (res.sources || []).map((s: string) => `${s}`)
      if (res.provider && res.model) setModelLabel(`${res.provider} · ${res.model}`)
      setMessages(m=>[...m, {role:'ai', content:res.text, sources}])
    } catch (err: any) {
      showToast(err.message || 'ระบบขัดข้อง กรุณาลองใหม่', 'error');
      setMessages(m=>[...m, {role:'ai', content:'ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง', sources:[]}])
    }
    setLoading(false)
    setTimeout(()=>inputRef.current?.focus(),100)
  }

  const clearChat = async () => {
    try {
      await api.clearChatHistory('company');
      setMessages([{role:'ai', content:'เริ่มการสนทนาใหม่ครับ มีอะไรให้ช่วยไหมครับ?', sources:[]}]);
      showToast('ล้างการสนทนาแล้ว');
    } catch (err) {
      showToast('ล้างไม่สำเร็จ', 'error');
    }
  }

  const chips = ['นโยบายลาพักร้อน','วันลาคงเหลือของฉัน','ขั้นตอนเบิกค่าใช้จ่าย','สวัสดิการมีอะไรบ้าง','วันหยุดประจำปี']

  return (
    <div style={{display:'flex',height:'calc(100vh - 120px)',gap:0,minHeight:0,animation:'fadeIn 0.3s ease'}}>
      {/* Sidebar */}
      <div style={{width:220,background:C.bg3,borderRadius:'16px 0 0 16px',border:`1px solid ${C.border}`,borderRight:'none',display:'flex',flexDirection:'column',padding:'14px 12px',flexShrink:0}}>
        <button onClick={clearChat} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,width:'100%',padding:'12px',borderRadius:12,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,marginBottom:16,boxShadow:`0 4px 10px ${C.gold}33`}}>
          <Ic n="plus" s={14}/>เริ่มการสนทนาใหม่
        </button>
        
        <div style={{fontSize:11,fontWeight:800,color:C.text3,letterSpacing:1,padding:'4px 8px',marginBottom:8,textTransform:'uppercase'}}>เอกสารความรู้ ({docs.length})</div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
          {docs.map((d,i)=>(
            <div key={i} style={{display:'flex',gap:8,alignItems:'center',padding:'8px 10px',borderRadius:10,background:C.surface,border:`1px solid ${C.border}`}}>
              <Ic n="file" s={14} c={C.gold}/>
              <span style={{fontSize:11,color:C.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{d}</span>
            </div>
          ))}
          <button onClick={()=>setShowUpload(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'8px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px dashed ${C.border2}`,color:C.text3,cursor:'pointer',fontSize:11, transition:'all 0.2s'}}
            onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.borderColor=C.gold}
            onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.borderColor=C.border2}>
            <Ic n="upload" s={13}/>อัปโหลดคู่มือบริษัท
          </button>
        </div>

        <div style={{flex:1}}/>
        <div style={{padding:'10px', background:`${C.gold}10`, borderRadius:12, border:`1px solid ${C.gold}22`}}>
           <div style={{fontSize:11, fontWeight:800, color:C.gold, marginBottom:4, display:'flex', alignItems:'center', gap:4}}>
              <Ic n="zap" s={12} c={C.gold}/> {modelLabel}
           </div>
           <div style={{fontSize:10, color:C.text2, lineHeight:1.4}}>CEO AI — วิเคราะห์เชิงกลยุทธ์จากข้อมูลองค์กรจริง (RAG)</div>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{flex:1,display:'flex',flexDirection:'column',background:C.bg2,borderRadius:'0 16px 16px 0',border:`1px solid ${C.border}`,minHeight:0,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
          <div style={{width:38,height:38,borderRadius:12,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="msg" s={18} c={C.gold}/></div>
          <div><div style={{fontSize:14,fontWeight:800,color:C.text}}>Company GPT</div><div style={{fontSize:11,color:C.text3}}>เชื่อมต่อฐานข้อมูลบริษัทแบบ Real-time</div></div>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:C.green,animation:'pulse 2s ease infinite'}}/>
            <span style={{fontSize:12,color:C.green,fontWeight:700}}>Ready</span>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'20px',display:'flex',flexDirection:'column',gap:16,minHeight:0}}>
          {messages.map((m,i)=>(
            <div key={i} style={{display:'flex',flexDirection:'column',gap:6,alignItems:m.role==='user'?'flex-end':'flex-start',animation:'fadeIn 0.3s ease'}}>
              {m.role!=='user'&&(
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                  <div style={{width:24,height:24,borderRadius:8,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="cpu" s={14} c={C.gold}/></div>
                  <span style={{fontSize:11,color:C.text3,fontWeight:700}}>Company GPT</span>
                </div>
              )}
              <div style={{background:m.role==='user'?`linear-gradient(135deg,${C.gold2},${C.gold})`:'rgba(255,255,255,0.06)',border:m.role!=='user'?`1px solid ${C.border}`:'none',borderRadius:m.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px',padding:'12px 16px',maxWidth:'80%',color:m.role==='user'?'#fff':C.text,fontSize:14,lineHeight:1.7,whiteSpace:'pre-wrap', boxShadow:m.role==='user'?`0 4px 12px ${C.gold}44`:'none'}}>
                {m.content || m.text}
              </div>
              {m.sources?.length>0&&(
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                  {m.sources.map((s:string,j:number)=>(
                    <div key={j} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:C.text3,background:C.surface,padding:'4px 10px',borderRadius:99,border:`1px solid ${C.border}`}}>
                      <Ic n="file" s={11}/>อ้างอิง: {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading&&(
            <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
              <div style={{width:24,height:24,borderRadius:8,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic n="cpu" s={14} c={C.gold}/></div>
              <div style={{background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,borderRadius:'18px 18px 18px 4px',padding:'14px 18px',display:'flex',gap:6,alignItems:'center'}}>
                {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:'50%',background:C.gold,animation:`pulse 1.2s ease ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        <div style={{padding:'0 20px 12px',display:'flex',gap:8,flexWrap:'wrap'}}>
          {chips.map(c=>(
            <div key={c} onClick={()=>{setInput(c);inputRef.current?.focus();}} style={{padding:'6px 14px',borderRadius:99,fontSize:11,fontWeight:600,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer',transition:'all 0.2s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=C.goldLight;(e.currentTarget as HTMLDivElement).style.borderColor=C.gold+'44';(e.currentTarget as HTMLDivElement).style.color=C.gold;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.05)';(e.currentTarget as HTMLDivElement).style.borderColor=C.border;(e.currentTarget as HTMLDivElement).style.color=C.text3;}}>
              {c}
            </div>
          ))}
        </div>

        <div style={{padding:'12px 20px 20px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,flexShrink:0, background:C.bg3}}>
          <textarea ref={inputRef} placeholder="พิมพ์คำถามที่ต้องการถาม AI..." value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            style={{flex:1,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border2}`,borderRadius:14,padding:'12px 16px',color:C.text,fontFamily:'Montserrat',fontSize:14,outline:'none',resize:'none',minHeight:48,maxHeight:150,lineHeight:1.6}} rows={1}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{width:48,height:48,borderRadius:14,background:input.trim()&&!loading?`linear-gradient(135deg,${C.gold},${C.gold2})`:'rgba(255,255,255,0.05)',border:'none',color:input.trim()&&!loading?'#fff':C.text3,cursor:input.trim()&&!loading?'pointer':'default',alignSelf:'flex-end',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',boxShadow:input.trim()&&!loading?`0 4px 12px ${C.gold}44`:'none'}}>
            <Ic n="send" s={20}/>
          </button>
        </div>
      </div>

      {showUpload&&(
        <Modal title="อัปโหลดคลังความรู้" onClose={()=>setShowUpload(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div onClick={()=>{setDocs(d=>[...d,'Document-new.pdf']);setShowUpload(false);showToast('อัปโหลดเอกสารสำเร็จ');}} style={{minHeight:140,border:`2px dashed ${C.border2}`,borderRadius:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,cursor:'pointer',transition:'all 0.2s', padding:20}}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.gold;(e.currentTarget as HTMLDivElement).style.background=`${C.gold}08`;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border2;(e.currentTarget as HTMLDivElement).style.background='transparent';}}>
              <Ic n="upload" s={36} c={C.text3}/>
              <div style={{fontSize:14,fontWeight:700,color:C.text2}}>เลือกไฟล์ PDF หรือ TXT</div>
              <div style={{fontSize:11,color:C.text3, textAlign:'center'}}>AI จะเรียนรู้ข้อมูลในไฟล์นี้เพื่อนำมาใช้ตอบคำถามของคุณ</div>
            </div>
            {docs.map((d,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px',background:C.surface,borderRadius:12, border:`1px solid ${C.border}`}}>
                <Ic n="file" s={20} c={C.gold}/>
                <span style={{flex:1,fontSize:13,color:C.text}}>{d}</span>
                <button onClick={()=>setDocs(ds=>ds.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:C.text3}}><Ic n="trash" s={16}/></button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
