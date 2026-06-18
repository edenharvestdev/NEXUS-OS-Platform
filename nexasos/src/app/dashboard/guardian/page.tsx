'use client'
import { useState, useRef } from 'react'
import { Ic, DonutChart, Modal, ProgressBar, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { useAppData } from '@/lib/data'
import { api } from '@/lib/api'

export default function GuardianPage() {
  const { colors: C } = useApp()
  const { docs, setDocs, refresh } = useAppData()
  const [selected, setSelected] = useState<any>(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showUpload, setShowUpload] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const riskColor: Record<string,string> = {high:C.red,medium:C.gold,low:C.green}
  const riskIcon: Record<string,string> = {high:'🔴',medium:'🟡',low:'🟢'}

  const fileInputRef = useRef<HTMLInputElement>(null)

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true); setProgress(0); setShowUpload(false);
    const iv = setInterval(()=>setProgress(p=>p<90?p+5:p), 200)

    try {
      const base64 = await toBase64(file);
      const res = await api.analyzeDocument({
        name: file.name,
        fileBase64: base64,
        fileMime: file.type,
        fileSize: (file.size/1024/1024).toFixed(1) + ' MB'
      });
      
      clearInterval(iv);
      setProgress(100);

      if (res.data) {
        setDocs(d => [res.data, ...d]);
        setSelected(res.data);
        showToast('วิเคราะห์เอกสารด้วย Gemini 2.0 สำเร็จ')
      }
      setTimeout(()=>setScanning(false), 500);
    } catch(err: any) {
      clearInterval(iv);
      setScanning(false);
      showToast(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์', 'error');
    }
  }

  const resolveRisk = async (docId: string, riskIdx: number) => {
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;

    const newRisks = [...doc.risks];
    newRisks[riskIdx] = { ...newRisks[riskIdx], resolved: !newRisks[riskIdx].resolved };

    // Optimistic update
    const updated = docs.map(d => d.id === docId ? { ...d, risks: newRisks } : d);
    setDocs(updated);
    if (selected?.id === docId) setSelected(updated.find(d => d.id === docId));

    try {
      await api.updateDocumentRisks(docId, newRisks);
      showToast(newRisks[riskIdx].resolved ? 'แก้ไขความเสี่ยงแล้ว' : 'ยกเลิกการแก้ไขแล้ว');
    } catch (err: any) {
      showToast(err.message || 'อัปเดตไม่สำเร็จ', 'error');
      refresh(); // Rollback
    }
  }

  const deleteDoc = async (id: string) => {
    try {
      await api.deleteDocument(id);
      setDocs(d => d.filter(x => x.id !== id));
      if (selected?.id === id) setSelected(null);
      showToast('ลบเอกสารสำเร็จ');
    } catch (err: any) {
      showToast(err.message || 'ลบไม่สำเร็จ', 'error');
    }
  }

  const currentDocs = docs || [];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>Doc Guardian AI</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>วิเคราะห์สัญญาและเอกสารกฎหมายด้วย Gemini 2.0 Flash</div></div>
        <button onClick={()=>setShowUpload(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700}}><Ic n="upload" s={13}/>อัพโหลดเอกสาร</button>
      </div>

      {scanning&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
          <div style={{animation:'spin 1s linear infinite'}}><Ic n="shield" s={36} c={C.gold}/></div>
          <div style={{fontSize:14,fontWeight:700,color:C.text}}>Gemini 2.0 กำลังวิเคราะห์เชิงลึก...</div>
          <div style={{width:'100%',maxWidth:360}}><ProgressBar pct={progress} color={C.gold} height={8}/></div>
          <div style={{fontSize:12,color:C.text3}}>{progress<40?'อ่านเนื้อหาและ OCR...':progress<70?'ระบุความเสี่ยงทางกฎหมาย...':'สร้างรายงานสรุป...'}</div>
        </div>
      )}

      {!scanning&&(
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          <div style={{width:240,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:4}}>เอกสารล่าสุด ({currentDocs.length})</div>
            {currentDocs.map(d=>(
              <div key={d.id} onClick={()=>setSelected(d)} style={{background:selected?.id===d.id?C.goldLight:C.surface,border:`1px solid ${selected?.id===d.id?C.gold+'44':C.border}`,borderRadius:12,padding:'12px 14px',cursor:'pointer',transition:'all 0.2s'}}
                onMouseEnter={e=>{if(selected?.id!==d.id)(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.07)';}}
                onMouseLeave={e=>{if(selected?.id!==d.id)(e.currentTarget as HTMLDivElement).style.background=C.surface;}}>
                <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                  <Ic n="file" s={20} c={d.risk_score>70?C.red:d.risk_score>40?C.gold:C.green}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</div>
                    <div style={{fontSize:10,color:C.text3,marginTop:2}}>{d.size} · {new Date(d.created_at).toLocaleDateString('th-TH')}</div>
                    <div style={{marginTop:6}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:10,color:C.text3}}>Risk Score</span>
                        <span style={{fontSize:10,fontWeight:700,color:d.risk_score>70?C.red:d.risk_score>40?C.gold:C.green}}>{d.risk_score}/100</span>
                      </div>
                      <ProgressBar pct={d.risk_score} color={d.risk_score>70?C.red:d.risk_score>40?C.gold:C.green}/>
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:4,marginTop:8}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>showToast('กำลังเตรียมไฟล์...')} style={{flex:1,padding:'5px',borderRadius:6,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer',fontSize:10}}>⬇ View</button>
                  <button onClick={()=>deleteDoc(d.id)} style={{flex:1,padding:'5px',borderRadius:6,background:C.red+'22',border:`1px solid ${C.red}44`,color:C.red,cursor:'pointer',fontSize:10}}>🗑 Delete</button>
                </div>
              </div>
            ))}
            {currentDocs.length === 0 && <div style={{fontSize:12, color:C.text3, textAlign:'center', padding:20}}>ไม่มีเอกสาร</div>}
          </div>

          {selected ? (
            <div style={{flex:1,minWidth:280,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
                <DonutChart pct={selected.risk_score} color={selected.risk_score>70?C.red:selected.risk_score>40?C.gold:C.green} size={90} label={selected.risk_score} sub="score"/>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:selected.risk_score>70?C.red:selected.risk_score>40?C.gold:C.green,marginBottom:4}}>
                    {selected.risk_score>70?'ระดับความเสี่ยง: สูงมาก':selected.risk_score>40?'ระดับความเสี่ยง: ปานกลาง':'ระดับความเสี่ยง: ต่ำ'}
                  </div>
                  <div style={{fontSize:12,color:C.text2,lineHeight:1.6}}>{selected.summary}</div>
                  <div style={{display:'flex',gap:8,marginTop:12}}>
                    {['high','medium','low'].map(l=>{const cnt=selected.risks.filter((r:any)=>r.level===l).length; return cnt>0&&<div key={l} style={{fontSize:11,color:C.text2}}>{riskIcon[l]} {cnt} {l}</div>;})}
                  </div>
                </div>
              </div>
              
              <div style={{fontSize:13, fontWeight:700, color:C.text, marginTop:8}}>ประเด็นที่วิเคราะห์พบ ({selected.risks.length})</div>
              
              {selected.risks.map((r:any,i:number)=>(
                <div key={i} style={{background:C.surface,border:`1px solid ${r.resolved?C.green+'33':riskColor[r.level]+'22'}`,borderRadius:12,padding:14,animation:`fadeIn 0.3s ease ${i*0.1}s both`,opacity:r.resolved?0.7:1,transition:'all 0.3s'}}>
                  <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                    <span style={{fontSize:18,flexShrink:0}}>{riskIcon[r.level]}</span>
                    <div style={{flex:1}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
                        <div style={{fontSize:13,fontWeight:700,color:r.resolved?C.text3:C.text,textDecoration:r.resolved?'line-through':'none'}}>{r.title}</div>
                        <span style={{fontSize:10, color:C.gold, fontWeight:700}}>{r.location}</span>
                      </div>
                      <div style={{fontSize:12,color:C.text2,lineHeight:1.6, marginBottom:8}}>{r.description}</div>
                      <div style={{fontSize:11, background:`${C.gold}10`, padding:'6px 10px', borderRadius:8, borderLeft:`3px solid ${C.gold}`, color:C.text2}}>
                        <b>คำแนะนำ:</b> {r.suggestion}
                      </div>
                    </div>
                    <button onClick={()=>resolveRisk(selected.id,i)} style={{padding:'5px 10px',borderRadius:7,background:r.resolved?C.green+'22':'rgba(255,255,255,0.05)',border:`1px solid ${r.resolved?C.green+'44':C.border}`,color:r.resolved?C.green:C.text3,cursor:'pointer',fontSize:10,fontWeight:600,whiteSpace:'nowrap', alignSelf:'flex-start'}}>
                      {r.resolved?'✓ แก้ไขแล้ว':'ทำเครื่องหมายว่าแก้'}
                    </button>
                  </div>
                </div>
              ))}
              
              <div style={{display:'flex',gap:8, marginTop:12}}>
                <button onClick={()=>showToast('สร้างรายงานสำเร็จ')} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'12px',borderRadius:12,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}><Ic n="download" s={13}/>Download Report</button>
                <button onClick={()=>showToast('ส่งข้อมูลให้ทีมกฎหมายแล้ว')} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'12px',borderRadius:12,background:C.goldLight,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:12,fontWeight:600}}><Ic n="send" s={13}/>ส่งต่อ Legal Team</button>
              </div>
            </div>
          ) : (
            <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:C.surface, border:`1px dashed ${C.border}`, borderRadius:14, color:C.text3, fontSize:13}}>
              เลือกเอกสารเพื่อดูผลวิเคราะห์
            </div>
          )}
        </div>
      )}

      {showUpload&&(
        <Modal title="อัปโหลดเอกสารวิเคราะห์" onClose={()=>setShowUpload(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div onClick={()=>fileInputRef.current?.click()} style={{minHeight:150,border:`2px dashed ${C.border2}`,borderRadius:12,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,cursor:'pointer',padding:24,transition:'all 0.2s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.gold;(e.currentTarget as HTMLDivElement).style.background=`${C.gold}08`;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border2;(e.currentTarget as HTMLDivElement).style.background='transparent';}}>
              <input type="file" ref={fileInputRef} style={{display:'none'}} accept="image/*,application/pdf" onChange={handleFileUpload} />
              <Ic n="shield" s={40} c={C.text3}/>
              <div style={{fontSize:14,fontWeight:700,color:C.text2}}>ลากไฟล์หรือคลิกเพื่ออัปโหลด</div>
              <div style={{fontSize:11,color:C.text3, textAlign:'center'}}>ระบบจะใช้ Gemini 2.0 Flash ในการทำ OCR และวิเคราะห์ความเสี่ยงเชิงลึก (PDF, PNG, JPG)</div>
              <button style={{padding:'8px 24px', borderRadius:10, background:C.gold, border:'none', color:'#fff', fontWeight:700, fontSize:12, marginTop:10}}>เลือกไฟล์จากเครื่อง</button>
            </div>
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
