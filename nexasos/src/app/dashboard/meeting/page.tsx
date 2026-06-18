'use client'
import { useState, useRef, useEffect } from 'react'
import { Ic, Badge, ProgressBar, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { useAppData } from '@/lib/data'
import { api } from '@/lib/api'

export default function MeetingPage() {
  const { colors: C } = useApp()
  const { meetingActions, setMeetingActions, refresh } = useAppData()
  
  const [meetings, setMeetings] = useState<any[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null)
  
  const [stage, setStage] = useState<'list'|'upload'|'processing'|'done'>('list')
  const [progress, setProgress] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load meetings on mount
  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await api.getMeetings();
      setMeetings(res.data || []);
      if (res.data?.length > 0 && stage === 'list') {
        setSelectedMeeting(res.data[0]);
      }
    } catch (err: any) {
      showToast(err.message || 'โหลดข้อมูลประชุมไม่สำเร็จ', 'error');
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStage('processing'); setProgress(0); setGenerating(true);
    const iv = setInterval(()=>setProgress(p=>p<90?p+5:p), 200);

    try {
      const base64 = await toBase64(file);
      const res = await api.analyzeMeeting({
        title: file.name.split('.')[0],
        fileBase64: base64,
        fileMime: file.type
      });
      
      clearInterval(iv);
      setProgress(100);

      if (res.data) {
        setMeetings(m => [res.data, ...m]);
        setSelectedMeeting(res.data);
        showToast('Gemini 2.0 สรุปการประชุมสำเร็จ');
        // Refresh global action items
        refresh();
      }
      setGenerating(false);
      setTimeout(()=>setStage('done'), 500);
    } catch(err: any) {
      clearInterval(iv);
      setStage('upload');
      setGenerating(false);
      showToast(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์', 'error');
    }
  }

  const toggleAction = async (id: string) => {
    try {
      await api.toggleMeetingAction(id);
      // Update local state for immediate feedback
      if (selectedMeeting) {
        const newActions = selectedMeeting.action_items.map((a: any) => 
          a.id === id ? { ...a, done: a.done ? 0 : 1 } : a
        );
        setSelectedMeeting({ ...selectedMeeting, action_items: newActions });
      }
      showToast('อัปเดตสถานะงานแล้ว');
    } catch (err: any) {
      showToast('อัปเดตล้มเหลว', 'error');
    }
  }

  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({ title: '', summary: '', decisions: [] as string[] })

  const startEdit = () => {
    if (!selectedMeeting) return
    setEditData({
      title: selectedMeeting.title,
      summary: selectedMeeting.summary,
      decisions: [...selectedMeeting.decisions]
    })
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!selectedMeeting) return
    try {
      await api.updateMeeting(selectedMeeting.id, editData)
      const updated = { ...selectedMeeting, ...editData }
      setSelectedMeeting(updated)
      setMeetings(ms => ms.map(m => m.id === selectedMeeting.id ? updated : m))
      setEditing(false)
      showToast('บันทึกการแก้ไขแล้ว')
    } catch (err: any) {
      showToast('บันทึกไม่สำเร็จ', 'error')
    }
  }

  const addDecision = () => setEditData({ ...editData, decisions: [...editData.decisions, ''] })
  const updateDecision = (idx: number, val: string) => {
    const next = [...editData.decisions]
    next[idx] = val
    setEditData({ ...editData, decisions: next })
  }
  const removeDecision = (idx: number) => {
    setEditData({ ...editData, decisions: editData.decisions.filter((_, i) => i !== idx) })
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>Meeting Brain AI</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>สรุปการประชุมและสกัด Action Items ด้วย Gemini 2.0 Flash</div></div>
        <div style={{display:'flex',gap:8}}>
          {selectedMeeting && !editing && (
            <button onClick={startEdit} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:700}}><Ic n="edit" s={13}/>แก้ไขข้อมูล</button>
          )}
          {editing && (
            <button onClick={saveEdit} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:C.green,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700}}><Ic n="check" s={13}/>บันทึก</button>
          )}
          {editing && (
            <button onClick={() => setEditing(false)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:700}}>ยกเลิก</button>
          )}
          {stage !== 'upload' && !editing && (
            <button onClick={()=>setStage('upload')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700}}><Ic n="plus" s={13}/>ประชุมใหม่</button>
          )}
          {stage === 'upload' && (
            <button onClick={()=>setStage('list')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:700}}>กลับรายการ</button>
          )}
        </div>
      </div>

      {stage==='upload'&&(
        <div style={{display:'flex',flexDirection:'column',gap:14, animation:'fadeIn 0.3s ease'}}>
          <div onClick={()=>fileInputRef.current?.click()} style={{minHeight:200,border:`2px dashed ${C.border2}`,borderRadius:20,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,cursor:'pointer',padding:40,transition:'all 0.2s'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.gold;(e.currentTarget as HTMLDivElement).style.background=`${C.gold}08`;}}
            onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border2;(e.currentTarget as HTMLDivElement).style.background='transparent';}}>
            <input type="file" ref={fileInputRef} style={{display:'none'}} accept="audio/*,video/*,image/*,application/pdf" onChange={handleFileUpload} />
            <div style={{width:80,height:80,borderRadius:24,background:`${C.gold}15`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n="mic" s={40} c={C.gold}/></div>
            <div style={{fontSize:16,fontWeight:800,color:C.text}}>อัปโหลดไฟล์บันทึกการประชุม</div>
            <div style={{fontSize:12,color:C.text3,textAlign:'center', maxWidth:400}}>รองรับไฟล์เสียง (MP3, M4A), วิดีโอ (MP4), หรือไฟล์เอกสารสรุป (PDF, JPG) ระบบจะใช้ AI วิเคราะห์เนื้อหาทั้งหมด</div>
            <button style={{padding:'12px 32px',borderRadius:12,background:C.gold,border:'none',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:10, marginTop:10}}><Ic n="upload" s={18}/>เลือกไฟล์</button>
          </div>
        </div>
      )}

      {stage==='processing'&&(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:24,padding:'80px 0',background:C.surface,borderRadius:20,border:`1px solid ${C.border}`}}>
          <div style={{width:80,height:80,borderRadius:26,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center',animation:'pulse 2s infinite'}}><Ic n="cpu" s={40} c={C.gold}/></div>
          <div style={{fontSize:18,fontWeight:800,color:C.text}}>Gemini 2.0 กำลังประมวลผล...</div>
          <div style={{width:'100%',maxWidth:450,padding:'0 40px'}}>
            <ProgressBar pct={progress} color={C.gold} height={10}/>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:12}}>
              {['ถอดความ','สรุปใจความ','ระบุ Action Items'].map((s,i)=>(
                <span key={s} style={{fontSize:11,color:progress>(i*33)?C.gold:C.text3,fontWeight:progress>(i*33)?700:500, display:'flex', alignItems:'center', gap:4}}>
                  {progress>(i*33+15)?<Ic n="check" s={10} c={C.gold}/>:null}{s}
                </span>
              ))}
            </div>
          </div>
          {generating&&<div style={{fontSize:12,color:C.text3, animation:'blink 1.5s infinite'}}>🤖 กำลังสร้างรายงานสรุปอัจฉริยะ...</div>}
        </div>
      )}

      {(stage==='list' || stage==='done') && (
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          {/* Sidebar - Meeting List */}
          <div style={{width:260,flexShrink:0,display:'flex',flexDirection:'column',gap:10}} className="no-print">
            <div style={{fontSize:12,fontWeight:800,color:C.text3, textTransform:'uppercase', letterSpacing:1}}>ประวัติการประชุม ({meetings.length})</div>
            {meetings.map(m => (
              <div key={m.id} onClick={() => { setSelectedMeeting(m); setStage('done'); setEditing(false); }} 
                style={{
                  background: selectedMeeting?.id === m.id ? C.goldLight : C.surface,
                  border: `1px solid ${selectedMeeting?.id === m.id ? C.gold + '44' : C.border}`,
                  borderRadius: 14, padding: 14, cursor: 'pointer', transition: 'all 0.2s'
                }}>
                <div style={{fontSize:13, fontWeight:700, color:C.text, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{m.title}</div>
                <div style={{fontSize:11, color:C.text3, display:'flex', justifyContent:'space-between'}}>
                  <span>{new Date(m.created_at).toLocaleDateString('th-TH')}</span>
                  <span>{m.duration_minutes} นาที</span>
                </div>
                <div style={{marginTop:8, display:'flex', gap:4}}>
                   <Badge type={m.sentiment === 'positive' ? 'green' : m.sentiment === 'negative' ? 'red' : 'gold'}>
                      {m.sentiment === 'positive' ? '😊 Positive' : m.sentiment === 'negative' ? '😡 Critical' : '😐 Neutral'}
                   </Badge>
                </div>
              </div>
            ))}
            {meetings.length === 0 && <div style={{fontSize:12, color:C.text3, textAlign:'center', padding:40, border:`1px dashed ${C.border}`, borderRadius:14}}>ยังไม่มีข้อมูลการประชุม</div>}
          </div>

          {/* Main Content - Selected Meeting */}
          {selectedMeeting ? (
            <div style={{flex:1, minWidth:400, display:'flex', flexDirection:'column', gap:12, animation:'fadeIn 0.3s ease'}}>
               <div style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16}}>
                     <div style={{flex:1}}>
                        {editing ? (
                          <input value={editData.title} onChange={e=>setEditData({...editData,title:e.target.value})} style={{fontSize:18, fontWeight:800, color:C.text, background:'transparent', border:`1px solid ${C.gold}44`, borderRadius:8, padding:'4px 8px', width:'100%', outline:'none'}} />
                        ) : (
                          <div style={{fontSize:18, fontWeight:800, color:C.text}}>{selectedMeeting.title}</div>
                        )}
                        <div style={{fontSize:12, color:C.text3, marginTop:4}}>สรุปการประชุมโดย Gemini 2.0 • {new Date(selectedMeeting.created_at).toLocaleString('th-TH')}</div>
                     </div>
                     <div style={{display:'flex', gap:8}} className="no-print">
                        <button onClick={()=>showToast('แชร์ลิงก์สำเร็จ')} style={{padding:'8px 12px', borderRadius:10, background:C.surface2, border:`1px solid ${C.border}`, color:C.text2, cursor:'pointer'}}><Ic n="send" s={14}/></button>
                        <button onClick={()=>window.print()} style={{padding:'8px 12px', borderRadius:10, background:C.surface2, border:`1px solid ${C.border}`, color:C.text2, cursor:'pointer'}}><Ic n="download" s={14}/></button>
                     </div>
                  </div>

                  <div style={{fontSize:14, fontWeight:800, color:C.gold, marginBottom:10, display:'flex', alignItems:'center', gap:8}}>
                     <Ic n="file" s={16} c={C.gold}/> สรุปใจความสำคัญ
                  </div>
                  {editing ? (
                    <textarea value={editData.summary} onChange={e=>setEditData({...editData,summary:e.target.value})} style={{fontSize:13, color:C.text2, lineHeight:1.8, width:'100%', minHeight:150, background:`${C.gold}05`, padding:16, borderRadius:12, border:`1px solid ${C.gold}44`, outline:'none', fontFamily:'inherit'}} />
                  ) : (
                    <div style={{fontSize:13, color:C.text2, lineHeight:1.8, whiteSpace:'pre-wrap', background:`${C.gold}05`, padding:16, borderRadius:12, border:`1px solid ${C.gold}15`}}>
                       {selectedMeeting.summary}
                    </div>
                  )}
                  
                  <div style={{marginTop:20}}>
                     <div style={{fontSize:14, fontWeight:800, color:C.green, marginBottom:10, display:'flex', alignItems:'center', gap:8, justifyContent:'space-between'}}>
                        <div style={{display:'flex', alignItems:'center', gap:8}}><Ic n="check" s={16} c={C.green}/> มติที่ประชุม / การตัดสินใจ</div>
                        {editing && <button onClick={addDecision} style={{fontSize:10, padding:'4px 8px', borderRadius:6, background:C.greenL, border:`1px solid ${C.green}44`, color:C.green, cursor:'pointer'}}>+ เพิ่มมติ</button>}
                     </div>
                     <div style={{display:'flex', flexDirection:'column', gap:8}}>
                        {(editing ? editData.decisions : (selectedMeeting.decisions || [])).map((d:string, i:number) => (
                           <div key={i} style={{display:'flex', gap:8, alignItems:'center'}}>
                             {editing ? (
                               <>
                                 <input value={d} onChange={e=>updateDecision(i,e.target.value)} style={{flex:1, fontSize:13, color:C.text, background:C.surface2, padding:'10px 14px', borderRadius:10, borderLeft:`4px solid ${C.green}`, outline:'none'}} />
                                 <button onClick={()=>removeDecision(i)} style={{color:C.red, background:'none', border:'none', cursor:'pointer'}}><Ic n="trash" s={14}/></button>
                               </>
                             ) : (
                               <div style={{flex:1, fontSize:13, color:C.text, background:C.surface2, padding:'10px 14px', borderRadius:10, borderLeft:`4px solid ${C.green}`}}>
                                  {d}
                               </div>
                             )}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20}}>
                  <div style={{fontSize:14, fontWeight:800, color:C.text, marginBottom:16, display:'flex', alignItems:'center', gap:8}}>
                     <Ic n="zap" s={18} c={C.gold}/> Action Items ({selectedMeeting.action_items?.filter((a:any)=>!a.done).length} งานค้าง)
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap:2}}>
                     {selectedMeeting.action_items?.map((a:any) => (
                        <div key={a.id} style={{display:'flex', gap:12, padding:'12px 0', borderBottom:`1px solid ${C.border}`, alignItems:'center', opacity: a.done ? 0.6 : 1}}>
                           <div onClick={()=>toggleAction(a.id)} style={{width:22, height:22, borderRadius:7, border:`2px solid ${a.done ? C.green : C.border2}`, background: a.done ? C.green : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all 0.2s'}}>
                              {a.done ? <Ic n="check" s={14} c="#fff"/> : null}
                           </div>
                           <div style={{flex:1, minWidth:0}}>
                              <div style={{fontSize:13, fontWeight:600, color: a.done ? C.text3 : C.text, textDecoration: a.done ? 'line-through' : 'none'}}>{a.task}</div>
                              <div style={{fontSize:11, color:C.text3, marginTop:2}}>{a.assigned_to} • กำหนดส่ง: {a.due_date || 'ไม่ระบุ'}</div>
                           </div>
                           <Badge type={a.priority === 'high' ? 'red' : 'gold'}>{a.priority?.toUpperCase()}</Badge>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          ) : (
            <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', minHeight:400, background:C.surface, border:`1px dashed ${C.border}`, borderRadius:16, color:C.text3, fontSize:14}}>
               เลือกรายการประชุมเพื่อดูรายละเอียด
            </div>
          )}
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
