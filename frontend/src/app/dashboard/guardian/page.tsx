'use client'
import { useState } from 'react'
import { C, Ic, DonutChart, Modal, ProgressBar, Toast } from '@/lib/ui'

const INIT_DOCS = [
  {id:1,name:'Contract-ABC-Corp.pdf',pages:24,size:'2.4MB',status:'analyzed',score:64,risks:[
    {level:'high',title:'ข้อกำหนดไม่ชัดเจน',loc:'หน้า 3 บรรทัด 47',desc:'ควรระบุขอบเขตความรับผิดชอบให้ชัดเจน',resolved:false},
    {level:'med',title:'ระยะเวลาสัญญาคลุมเครือ',loc:'หน้า 7',desc:'ควรกำหนดวันสิ้นสุดสัญญาที่แน่ชัด',resolved:false},
    {level:'low',title:'เงื่อนไขการชำระเงิน',loc:'หน้า 12',desc:'มาตรฐาน แต่แนะนำเพิ่ม penalty clause',resolved:true},
  ]},
  {id:2,name:'NDA-XYZ-2026.pdf',pages:8,size:'0.8MB',status:'analyzed',score:28,risks:[
    {level:'low',title:'ข้อกำหนดมาตรฐาน',loc:'หน้า 2',desc:'ปกติ ไม่มีความเสี่ยง',resolved:false},
  ]},
]

export default function GuardianPage() {
  const [docs, setDocs] = useState(INIT_DOCS)
  const [selected, setSelected] = useState<any>(INIT_DOCS[0])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showUpload, setShowUpload] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const riskColor: Record<string,string> = {high:C.red,med:C.gold,low:C.green}
  const riskIcon: Record<string,string> = {high:'🔴',med:'🟡',low:'🟢'}

  const scanNew = (name: string) => {
    setScanning(true); setProgress(0)
    const iv = setInterval(()=>setProgress(p=>{
      if(p>=100){
        clearInterval(iv)
        const nd = {id:Date.now(),name,pages:Math.floor(Math.random()*30+5),size:`${(Math.random()*3+0.5).toFixed(1)}MB`,status:'analyzed',score:Math.floor(Math.random()*60+20),risks:[{level:'med',title:'เงื่อนไขไม่ชัดเจน',loc:'หน้า 2',desc:'ควรปรับปรุง',resolved:false}]}
        setDocs(d=>[...d,nd]); setSelected(nd); setScanning(false); setShowUpload(false)
        showToast('วิเคราะห์เอกสารสำเร็จ')
        return 100
      }
      return p+7
    }),80)
  }

  const resolveRisk = (docId:number, riskIdx:number) => {
    const updated = docs.map(d=>d.id===docId?{...d,risks:d.risks.map((r,i)=>i===riskIdx?{...r,resolved:!r.resolved}:r)}:d)
    setDocs(updated)
    if(selected?.id===docId) setSelected(updated.find(d=>d.id===docId))
    showToast('อัพเดทสถานะความเสี่ยงแล้ว')
  }
  const deleteDoc = (id:number) => {
    setDocs(d=>d.filter(x=>x.id!==id))
    if(selected?.id===id) setSelected(docs.find(d=>d.id!==id)||null)
    showToast('ลบเอกสารแล้ว')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>Doc Guardian</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>ตรวจสอบสัญญา ความเสี่ยง และเอกสารกฎหมาย</div></div>
        <button onClick={()=>setShowUpload(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700}}><Ic n="upload" s={13}/>อัพโหลดเอกสาร</button>
      </div>

      {scanning&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:14}}>
          <div style={{animation:'spin 1s linear infinite'}}><Ic n="shield" s={36} c={C.gold}/></div>
          <div style={{fontSize:14,fontWeight:700,color:C.text}}>AI กำลังวิเคราะห์เอกสาร...</div>
          <div style={{width:'100%',maxWidth:360}}><ProgressBar pct={progress} color={C.gold} height={8}/></div>
          <div style={{fontSize:12,color:C.text3}}>{progress<40?'อ่านเนื้อหา...':progress<70?'ระบุความเสี่ยง...':'สร้างรายงาน...'}</div>
        </div>
      )}

      {!scanning&&(
        <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
          <div style={{width:220,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:4}}>เอกสาร ({docs.length})</div>
            {docs.map(d=>(
              <div key={d.id} onClick={()=>setSelected(d)} style={{background:selected?.id===d.id?C.goldLight:C.surface,border:`1px solid ${selected?.id===d.id?C.gold+'44':C.border}`,borderRadius:12,padding:'12px 14px',cursor:'pointer',transition:'all 0.2s'}}
                onMouseEnter={e=>{if(selected?.id!==d.id)(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.07)';}}
                onMouseLeave={e=>{if(selected?.id!==d.id)(e.currentTarget as HTMLDivElement).style.background=C.surface;}}>
                <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                  <Ic n="file" s={20} c={d.score>60?C.red:d.score>30?C.gold:C.green}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</div>
                    <div style={{fontSize:10,color:C.text3,marginTop:2}}>{d.pages} หน้า · {d.size}</div>
                    <div style={{marginTop:6}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:10,color:C.text3}}>ความเสี่ยง</span>
                        <span style={{fontSize:10,fontWeight:700,color:d.score>60?C.red:d.score>30?C.gold:C.green}}>{d.score}/100</span>
                      </div>
                      <ProgressBar pct={d.score} color={d.score>60?C.red:d.score>30?C.gold:C.green}/>
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:4,marginTop:8}} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>showToast('Download สำเร็จ')} style={{flex:1,padding:'5px',borderRadius:6,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer',fontSize:10}}>⬇</button>
                  <button onClick={()=>deleteDoc(d.id)} style={{flex:1,padding:'5px',borderRadius:6,background:C.redLight,border:`1px solid ${C.red}44`,color:C.red,cursor:'pointer',fontSize:10}}>🗑</button>
                </div>
              </div>
            ))}
          </div>

          {selected&&(
            <div style={{flex:1,minWidth:280,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
                <DonutChart pct={selected.score} color={selected.score>60?C.red:selected.score>30?C.gold:C.green} size={90} label={selected.score} sub="score"/>
                <div>
                  <div style={{fontSize:15,fontWeight:800,color:selected.score>60?C.red:selected.score>30?C.gold:C.green,marginBottom:4}}>
                    {selected.score>60?'ความเสี่ยงสูง':selected.score>30?'ความเสี่ยงปานกลาง':'ความเสี่ยงต่ำ'}
                  </div>
                  <div style={{fontSize:12,color:C.text3}}>พบ {selected.risks.length} ประเด็นที่ควรตรวจสอบ</div>
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    {(['high','med','low'] as string[]).map(l=>{const cnt=selected.risks.filter((r:any)=>r.level===l).length;return cnt>0&&<div key={l} style={{fontSize:11,color:C.text2}}>{riskIcon[l]} {cnt}</div>;})}
                  </div>
                </div>
              </div>
              {selected.risks.map((r:any,i:number)=>(
                <div key={i} style={{background:C.surface,border:`1px solid ${r.resolved?C.green+'33':riskColor[r.level]+'22'}`,borderRadius:12,padding:14,animation:`fadeIn 0.3s ease ${i*0.1}s both`,opacity:r.resolved?0.7:1,transition:'all 0.3s'}}>
                  <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                    <span style={{fontSize:18,flexShrink:0}}>{riskIcon[r.level]}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700,color:r.resolved?C.text3:C.text,textDecoration:r.resolved?'line-through':'none',marginBottom:2}}>{r.title}</div>
                      <div style={{fontSize:11,color:C.text3,marginBottom:6}}>{r.loc}</div>
                      <div style={{fontSize:12,color:C.text2,lineHeight:1.5}}>{r.desc}</div>
                    </div>
                    <button onClick={()=>resolveRisk(selected.id,i)} style={{padding:'5px 10px',borderRadius:7,background:r.resolved?C.greenLight:'rgba(255,255,255,0.05)',border:`1px solid ${r.resolved?C.green+'44':C.border}`,color:r.resolved?C.green:C.text3,cursor:'pointer',fontSize:10,fontWeight:600,whiteSpace:'nowrap'}}>
                      {r.resolved?'✓ แก้แล้ว':'แก้ไขแล้ว'}
                    </button>
                  </div>
                </div>
              ))}
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>showToast('Download Report สำเร็จ')} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}><Ic n="download" s={13}/>Download Report</button>
                <button onClick={()=>showToast('แชร์กับ Legal แล้ว')} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:10,background:C.goldLight,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:12,fontWeight:600}}><Ic n="send" s={13}/>แชร์ Legal</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showUpload&&(
        <Modal title="อัพโหลดเอกสาร" onClose={()=>setShowUpload(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div onClick={()=>scanNew('Contract-New.pdf')} style={{minHeight:120,border:`2px dashed ${C.border2}`,borderRadius:12,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer',padding:24,transition:'all 0.2s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.gold;(e.currentTarget as HTMLDivElement).style.background=`${C.gold}08`;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border2;(e.currentTarget as HTMLDivElement).style.background='transparent';}}>
              <Ic n="shield" s={32} c={C.text3}/>
              <div style={{fontSize:13,fontWeight:600,color:C.text2}}>ลากไฟล์มาวางที่นี่</div>
              <div style={{fontSize:11,color:C.text3}}>PDF, Word, TXT — AI วิเคราะห์ความเสี่ยงอัตโนมัติ</div>
            </div>
            {['Employment Contract.pdf','Vendor Agreement.pdf','Service SLA.pdf'].map(n=>(
              <button key={n} onClick={()=>scanNew(n)} style={{width:'100%',padding:'10px 14px',borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:500,textAlign:'left',display:'flex',alignItems:'center',gap:8}}>
                <Ic n="file" s={14} c={C.gold}/>{n}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
