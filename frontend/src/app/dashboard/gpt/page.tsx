'use client'
import { useState, useEffect, useRef } from 'react'
import { C, Ic, Modal, Toast } from '@/lib/ui'

async function callClaude(message: string, system?: string): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, system }),
  })
  const data = await res.json()
  return data.text
}

export default function GPTPage() {
  const [messages, setMessages] = useState([
    {role:'ai',text:'สวัสดีครับ ผม Company GPT ของ Autosoft 🤖\n\nผมรู้จักข้อมูลบริษัทของคุณเป็นอย่างดี ถามได้เลยเกี่ยวกับ:\n• นโยบาย HR และการลา\n• ขั้นตอนการเงินและเบิกค่าใช้จ่าย\n• ข้อมูลพนักงาน\n• กฎระเบียบบริษัท',sources:[] as string[]},
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState(['นโยบายการลา...','ขั้นตอนเบิกค่าใช้จ่าย...','รายชื่อ Vendor...'])
  const [showUpload, setShowUpload] = useState(false)
  const [docs, setDocs] = useState(['HR Policy 2024.pdf','Finance Manual.pdf','Company Handbook.pdf'])
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}) },[messages])

  const send = async () => {
    if(!input.trim()||loading) return
    const q = input.trim()
    setInput('')
    setMessages(m=>[...m,{role:'user',text:q,sources:[]}])
    setLoading(true)
    try {
      const ctx = `คุณคือ Company GPT ของบริษัท ABC จำกัด ที่ใช้ระบบ Autosoft
คุณมีข้อมูลเกี่ยวกับ:
- นโยบาย HR: พักร้อน 10 วัน/ปี ลาป่วย 30 วัน/ปี ลากิจ 3 วัน/ปี
- เงินเดือนจ่ายทุกวันที่ 25 ของเดือน
- เบิกค่าใช้จ่ายผ่านระบบ Finance ของ Autosoft พร้อมใบเสร็จ
- มีพนักงาน 247 คน แบ่งเป็น 8 แผนก
ตอบเป็นภาษาไทย กระชับ ชัดเจน และมีประโยชน์

คำถาม: ${q}`
      const r = await callClaude(ctx)
      const fakeSources = q.includes('ลา')||q.includes('HR')?['HR Policy 2024.pdf — หน้า 12']:q.includes('เงิน')||q.includes('เบิก')?['Finance Manual.pdf — หน้า 4']:[]
      setMessages(m=>[...m,{role:'ai',text:r,sources:fakeSources}])
      if(q.length>5&&!history.includes(q.slice(0,15)+'...')) setHistory(h=>[q.slice(0,15)+'...',...h.slice(0,7)])
    } catch {
      setMessages(m=>[...m,{role:'ai',text:'ขออภัยครับ ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง',sources:[]}])
    }
    setLoading(false)
    setTimeout(()=>inputRef.current?.focus(),100)
  }

  const chips = ['นโยบายลาพักร้อน','วันลาคงเหลือของฉัน','ขั้นตอนเบิกค่าใช้จ่าย','สวัสดิการมีอะไรบ้าง','วันหยุดประจำปี']
  const newChat = () => setMessages([{role:'ai',text:'เริ่มการสนทนาใหม่ครับ มีอะไรให้ช่วยไหมครับ?',sources:[]}])

  return (
    <div style={{display:'flex',height:'calc(100vh - 120px)',gap:0,minHeight:0,animation:'fadeIn 0.3s ease'}}>
      {/* Sidebar */}
      <div style={{width:210,background:C.bg3,borderRadius:'14px 0 0 14px',border:`1px solid ${C.border}`,borderRight:'none',display:'flex',flexDirection:'column',padding:'12px 10px',flexShrink:0}}>
        <button onClick={newChat} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,width:'100%',padding:'10px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,marginBottom:12}}>
          <Ic n="plus" s={14}/>สนทนาใหม่
        </button>
        <div style={{fontSize:10,fontWeight:700,color:C.text3,letterSpacing:1,padding:'4px 6px',marginBottom:4}}>ประวัติ</div>
        {history.map((h,i)=>(
          <div key={i} onClick={()=>setInput(h.replace('...','')+' ')} style={{padding:'8px 10px',borderRadius:8,cursor:'pointer',fontSize:12,color:i===0?C.gold:C.text2,background:i===0?C.goldLight:'transparent',transition:'all 0.15s',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2}}
            onMouseEnter={e=>{if(i!==0)(e.currentTarget as HTMLDivElement).style.background=C.surface;}}
            onMouseLeave={e=>{if(i!==0)(e.currentTarget as HTMLDivElement).style.background='transparent';}}>
            {h}
          </div>
        ))}
        <div style={{flex:1}}/>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,display:'flex',flexDirection:'column',gap:6}}>
          <div style={{fontSize:10,fontWeight:700,color:C.text3,letterSpacing:1,padding:'0 6px',marginBottom:2}}>เอกสาร ({docs.length})</div>
          {docs.map((d,i)=>(
            <div key={i} style={{display:'flex',gap:6,alignItems:'center',padding:'5px 8px',borderRadius:7,background:C.surface}}>
              <Ic n="file" s={12} c={C.gold}/>
              <span style={{fontSize:10,color:C.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{d}</span>
            </div>
          ))}
          <button onClick={()=>setShowUpload(true)} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'7px',borderRadius:8,background:'rgba(255,255,255,0.05)',border:`1px dashed ${C.border2}`,color:C.text3,cursor:'pointer',fontSize:11}}>
            <Ic n="upload" s={12}/>อัพโหลดเอกสาร
          </button>
        </div>
      </div>

      {/* Chat */}
      <div style={{flex:1,display:'flex',flexDirection:'column',background:C.bg2,borderRadius:'0 14px 14px 0',border:`1px solid ${C.border}`,minHeight:0,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:10,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="msg" s={16} c={C.gold}/></div>
          <div><div style={{fontSize:13,fontWeight:700,color:C.text}}>Company GPT</div><div style={{fontSize:11,color:C.text3}}>AI ที่รู้จักบริษัทคุณดีที่สุด</div></div>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:C.green,animation:'pulse 2s ease infinite'}}/>
            <span style={{fontSize:11,color:C.green,fontWeight:600}}>Online</span>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'16px 18px',display:'flex',flexDirection:'column',gap:14,minHeight:0}}>
          {messages.map((m,i)=>(
            <div key={i} style={{display:'flex',flexDirection:'column',gap:4,alignItems:m.role==='user'?'flex-end':'flex-start',animation:'fadeIn 0.3s ease'}}>
              {m.role==='ai'&&(
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                  <div style={{width:22,height:22,borderRadius:8,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="cpu" s={12} c={C.gold}/></div>
                  <span style={{fontSize:11,color:C.text3,fontWeight:600}}>Company GPT</span>
                </div>
              )}
              <div style={{background:m.role==='user'?`linear-gradient(135deg,${C.gold2},${C.gold})`:'rgba(255,255,255,0.06)',border:m.role==='ai'?`1px solid ${C.border}`:'none',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',padding:'10px 14px',maxWidth:'82%',color:m.role==='user'?'#fff':C.text,fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap'}}>
                {m.text}
              </div>
              {m.role==='ai'&&m.sources?.length>0&&(
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:2}}>
                  {m.sources.map((s,j)=>(
                    <div key={j} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:C.text3,background:C.surface,padding:'3px 8px',borderRadius:99,border:`1px solid ${C.border}`}}>
                      <Ic n="file" s={10}/>{s}
                    </div>
                  ))}
                </div>
              )}
              {m.role==='ai'&&(
                <div style={{display:'flex',gap:4,marginTop:2}}>
                  <button onClick={()=>showToast('คัดลอกแล้ว')} style={{padding:'3px 8px',borderRadius:6,background:'transparent',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer',fontSize:10}}>คัดลอก</button>
                  <button onClick={()=>showToast('บันทึกแล้ว')} style={{padding:'3px 8px',borderRadius:6,background:'transparent',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer',fontSize:10}}>บันทึก</button>
                </div>
              )}
            </div>
          ))}
          {loading&&(
            <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
              <div style={{width:22,height:22,borderRadius:8,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic n="cpu" s={12} c={C.gold}/></div>
              <div style={{background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,borderRadius:'16px 16px 16px 4px',padding:'12px 16px',display:'flex',gap:5,alignItems:'center'}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:'50%',background:C.gold,animation:`pulse 1.2s ease ${i*0.2}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={endRef}/>
        </div>

        <div style={{padding:'0 18px 10px',display:'flex',gap:6,flexWrap:'wrap'}}>
          {chips.map(c=>(
            <div key={c} onClick={()=>{setInput(c);inputRef.current?.focus();}} style={{padding:'5px 12px',borderRadius:99,fontSize:11,fontWeight:500,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer',transition:'all 0.15s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=C.goldLight;(e.currentTarget as HTMLDivElement).style.borderColor=C.gold+'44';(e.currentTarget as HTMLDivElement).style.color=C.gold;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.05)';(e.currentTarget as HTMLDivElement).style.borderColor=C.border;(e.currentTarget as HTMLDivElement).style.color=C.text3;}}>
              {c}
            </div>
          ))}
        </div>

        <div style={{padding:'10px 18px 16px',borderTop:`1px solid ${C.border}`,display:'flex',gap:8,flexShrink:0}}>
          <textarea ref={inputRef} placeholder="ถามเกี่ยวกับนโยบาย HR การเงิน หรือบริษัท..." value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            style={{flex:1,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border2}`,borderRadius:12,padding:'11px 14px',color:C.text,fontFamily:'Montserrat',fontSize:13,outline:'none',resize:'none',minHeight:44,maxHeight:120,lineHeight:1.5}} rows={1}/>
          <button onClick={send} disabled={loading||!input.trim()} style={{padding:'10px 18px',borderRadius:12,background:input.trim()&&!loading?`linear-gradient(135deg,${C.gold},${C.gold2})`:'rgba(255,255,255,0.05)',border:'none',color:input.trim()&&!loading?'#fff':C.text3,cursor:input.trim()&&!loading?'pointer':'default',alignSelf:'flex-end',height:44,display:'flex',alignItems:'center',gap:6,fontWeight:700,fontSize:13,transition:'all 0.2s'}}>
            <Ic n="send" s={16}/>ส่ง
          </button>
        </div>
      </div>

      {showUpload&&(
        <Modal title="อัพโหลดเอกสาร" onClose={()=>setShowUpload(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div onClick={()=>{setDocs(d=>[...d,'Document-new.pdf']);setShowUpload(false);showToast('อัพโหลดเอกสารสำเร็จ');}} style={{minHeight:100,border:`2px dashed ${C.border2}`,borderRadius:12,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer',transition:'all 0.2s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.gold;(e.currentTarget as HTMLDivElement).style.background=`${C.gold}08`;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border2;(e.currentTarget as HTMLDivElement).style.background='transparent';}}>
              <Ic n="upload" s={32} c={C.text3}/>
              <div style={{fontSize:13,fontWeight:600,color:C.text2}}>ลากไฟล์มาวางที่นี่</div>
              <div style={{fontSize:11,color:C.text3}}>PDF, Word, TXT — AI จะเรียนรู้เนื้อหาอัตโนมัติ</div>
            </div>
            {docs.map((d,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:C.surface,borderRadius:10}}>
                <Ic n="file" s={18} c={C.gold}/>
                <span style={{flex:1,fontSize:12,color:C.text}}>{d}</span>
                <button onClick={()=>setDocs(ds=>ds.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:C.text3}}><Ic n="trash" s={14}/></button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
