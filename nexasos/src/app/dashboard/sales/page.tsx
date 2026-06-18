'use client'
import { useState } from 'react'
import { Ic, Badge, StatCard, Field, Input, Select, Tabs, ProgressBar, Modal, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { useAppData } from '@/lib/data'
import { api } from '@/lib/api'

const STAGES = ['ติดต่อ','สนใจ','นำเสนอ','เจรจา','ปิดดีล']

export default function SalesPage() {
  const { colors: C } = useApp()
  const { deals, setDeals } = useAppData()
  const [view, setView] = useState('kanban')
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [aiEmail, setAiEmail] = useState('')
  const [generating, setGenerating] = useState(false)
  const [emailTarget, setEmailTarget] = useState<any>(null)
  const [form, setForm] = useState({name:'',value:'',stage:'ติดต่อ',contact:'',email:'',phone:'',prob:50,notes:''})
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const addDeal = async () => {
    if(!form.name){showToast('กรุณากรอกชื่อบริษัท','error');return}
    // Optimistic local update
    try {
      const res = await api.createDeal({
        ...form,
        value: parseInt(form.value) || 0,
        prob: form.prob
      });
      setDeals(d => [res.data, ...d]);
      setShowAdd(false);
      setForm({name:'',value:'',stage:'ติดต่อ',contact:'',email:'',phone:'',prob:50,notes:''});
      showToast('เพิ่ม Deal ใหม่สำเร็จ');
    } catch (err: any) {
      showToast(err.message || 'เพิ่มไม่สำเร็จ', 'error');
    }
  }

  const moveDeal = async (id: string, stage: string) => {
    try {
      await api.updateDeal(id, { stage });
      setDeals(ds => ds.map(d => d.id === id ? { ...d, stage } : d));
      showToast(`ย้าย Deal ไป "${stage}" แล้ว`);
    } catch (err: any) {
      showToast('ย้ายไม่สำเร็จ', 'error');
    }
  }

  const deleteDeal = async (id: string) => {
    try {
      await api.deleteDeal(id);
      setDeals(ds => ds.filter(d => d.id !== id));
      setShowDetail(null);
      showToast('ลบ Deal สำเร็จ');
    } catch (err: any) {
      showToast('ลบไม่สำเร็จ', 'error');
    }
  }

  const [showAnalysis, setShowAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const runLeadAnalysis = async (deal: any) => {
    setAnalyzing(true)
    try {
      const res = await api.analyzeLead(deal.id)
      setShowAnalysis({ ...res.data, dealId: deal.id })
      setShowDetail(null)
    } catch (err: any) {
      showToast('AI วิเคราะห์ล้มเหลว', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  const generateEmail = async (deal: any) => {
    setEmailTarget(deal); setGenerating(true); setAiEmail('')
    try {
      const prompt = `คุณคือสุดยอดพนักงานขาย (Sales Expert) ที่มีความเป็นมืออาชีพและเข้าถึงใจลูกค้า
      เขียนอีเมล Follow-up ภาษาไทยเพื่อติดต่อคุณ ${deal.contact} จากบริษัท ${deal.name}
      ข้อมูล Deal:
      - มูลค่า: ฿${deal.value.toLocaleString()}
      - สถานะปัจจุบัน: ${deal.stage}
      - ความเป็นไปได้ในการปิดดีล: ${deal.prob}%
      
      วัตถุประสงค์: ติดตามความคืบหน้า เสนอความช่วยเหลือเพิ่มเติม และสร้างความประทับใจ
      โทนเสียง: สุภาพ, เป็นมืออาชีพ, น่าเชื่อถือ แต่เป็นกันเองพอสมควร`
      
      const res = await api.sendMessage(prompt);
      setAiEmail(res.text);
      showToast('AI สร้างร่างอีเมลสำเร็จ');
    } catch (err) {
      setAiEmail('ไม่สามารถสร้างร่างอีเมลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
      showToast('AI Error', 'error');
    }
    setGenerating(false)
  }

  const total = deals.reduce((s,d)=>s+(Number(d.value)||0),0)
  const won   = deals.filter(d=>d.stage==='ปิดดีล').reduce((s,d)=>s+(Number(d.value)||0),0)
  const hotDeals = deals.filter(d=>d.prob>=70&&d.stage!=='ปิดดีล')

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text}}>Sales AI Copilot</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>Pipeline Total: ฿{(total/1000000).toFixed(2)}M · {deals.length} active deals</div>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <Tabs tabs={[{id:'kanban',label:'Kanban Board'},{id:'list',label:'List View'}]} active={view} onChange={setView}/>
          <button onClick={()=>setShowAdd(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 18px',borderRadius:12,background:C.gold,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,boxShadow:`0 4px 12px ${C.gold}44`}}>
            <Ic n="plus" s={14}/>สร้าง Deal ใหม่
          </button>
        </div>
      </div>

      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon="target"  label="Pipeline Value" value={`฿${(total/1000).toFixed(1)}K`} trend={12} color={C.blue} chart={[10,20,15,30,25,45,40,60]}/>
        <StatCard icon="check"   label="ปิดดีลแล้ว (Won)" value={`฿${(won/1000).toFixed(1)}K`} color={C.green}/>
        <StatCard icon="trending" label="Win Probability" value={`${deals.length > 0 ? Math.round(deals.reduce((s,d)=>s+d.prob,0)/deals.length) : 0}%`} color={C.gold}/>
        <StatCard icon="zap"     label="Hot Deals"    value={hotDeals.length} sub="Chance ≥70%" color={C.red}/>
      </div>

      {hotDeals.length>0&&(
        <div style={{background:`${C.gold}12`,border:`1px solid ${C.gold}33`,borderRadius:16,padding:'12px 20px',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap', boxShadow:`0 0 20px ${C.gold}11`}}>
          <div style={{width:36,height:36,borderRadius:12,background:C.gold,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Ic n="zap" s={20} c="#fff"/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:800,color:C.gold,marginBottom:2}}>AI แนะนำ: ดีลเหล่านี้มีโอกาสปิดสูง (High Priority)</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {hotDeals.map(d=>(
                <span key={d.id} style={{fontSize:11,color:C.text2, background:'rgba(255,255,255,0.05)', padding:'3px 10px', borderRadius:8, border:`1px solid ${C.border}`}}>
                   <b>{d.name}</b> ({d.prob}%)
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={()=>{const top=hotDeals.sort((a,b)=>b.prob-a.prob)[0]; generateEmail(top);}}
            style={{padding:'8px 16px',borderRadius:10,background:C.goldLight,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:8, transition:'all 0.2s'}}>
            <Ic n="mail" s={14}/>Draft Smart Follow-up
          </button>
        </div>
      )}

      {(aiEmail||generating)&&(
        <div style={{background:C.surface,border:`1px solid ${C.gold}33`,borderRadius:18,padding:20,animation:'fadeIn 0.4s ease', boxShadow:`0 8px 30px rgba(0,0,0,0.2)`}}>
          <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Ic n="mail" s={18} c={C.gold}/> 
              <span>AI Email Draft {emailTarget&&`— For ${emailTarget.name}`}</span>
            </div>
            <button onClick={()=>{setAiEmail('');setEmailTarget(null);}} style={{background:'none',border:'none',cursor:'pointer',color:C.text3, padding:5}}>
              <Ic n="x" s={20}/>
            </button>
          </div>
          {generating ? (
            <div style={{display:'flex',gap:10,alignItems:'center',color:C.text3,fontSize:14, padding:20}}>
              <div style={{animation:'spin 1s linear infinite'}}><Ic n="cpu" s={20} c={C.gold}/></div>
              Gemini 2.0 กำลังสร้างร่างอีเมลระดับมืออาชีพ...
            </div>
          ) : (
            <div style={{background:C.bg3, padding:20, borderRadius:12, border:`1px solid ${C.border}`}}>
               <pre style={{fontSize:13,color:C.text2,lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'Montserrat'}}>{aiEmail}</pre>
            </div>
          )}
          {aiEmail&&!generating&&(
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button onClick={()=>showToast('ส่งร่างอีเมลไปยัง Gmail แล้ว')} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px 24px',borderRadius:12,background:C.gold,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700, flex:1}}>
                <Ic n="send" s={16}/>ส่งทันที
              </button>
              <button onClick={()=>{navigator.clipboard.writeText(aiEmail); showToast('คัดลอกลง Clipboard แล้ว')}} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px 20px',borderRadius:12,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:13,fontWeight:600}}>
                <Ic n="file" s={16}/>คัดลอกข้อความ
              </button>
            </div>
          )}
        </div>
      )}

      {view==='kanban'&&(
        <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:12, minHeight:400}}>
          {STAGES.map(stage=>{
            const sd = deals.filter(d=>d.stage===stage)
            const sv = sd.reduce((s,d)=>s+(Number(d.value)||0),0)
            return (
              <div key={stage} style={{minWidth:220,background:'rgba(255,255,255,0.02)',border:`1px solid ${C.border}`,borderRadius:18,padding:14,display:'flex',flexDirection:'column',gap:12,flexShrink:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text}}>{stage}</span>
                  <Badge type="gold">{sd.length}</Badge>
                </div>
                <div style={{fontSize:11,color:C.text3, fontWeight:600}}>Value: ฿{(sv/1000).toFixed(1)}K</div>

                <div style={{display:'flex', flexDirection:'column', gap:10, flex:1}}>
                  {sd.map(d=>(
                    <div key={d.id} onClick={()=>setShowDetail(d)}
                      style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:14,cursor:'pointer',transition:'all 0.25s', boxShadow:`0 2px 8px rgba(0,0,0,0.1)`}}
                      onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.gold+'55';(e.currentTarget as HTMLDivElement).style.transform='translateY(-3px)';}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border;(e.currentTarget as HTMLDivElement).style.transform='';}}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</div>
                      <div style={{fontSize:15,fontWeight:900,color:C.gold,marginBottom:10}}>฿{(Number(d.value)/1000).toFixed(1)}K</div>
                      <div style={{marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:10,color:C.text3}}>Confidence</span>
                          <span style={{fontSize:10,fontWeight:800,color:d.prob>70?C.green:d.prob>40?C.gold:C.red}}>{d.prob}%</span>
                        </div>
                        <ProgressBar pct={d.prob} color={d.prob>70?C.green:d.prob>40?C.gold:C.red} height={4}/>
                      </div>
                      <div style={{fontSize:10,color:C.text3, display:'flex', alignItems:'center', gap:4}}>
                         <Ic n="users" s={10}/> {d.contact}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={()=>setShowAdd(true)}
                  style={{border:`1px dashed ${C.border2}`,borderRadius:10,padding:'10px',textAlign:'center',fontSize:12,color:C.text3,cursor:'pointer',transition:'all 0.2s', background:'transparent'}}>
                  + เพิ่มรายการ
                </button>
              </div>
            )
          })}
        </div>
      )}

      {view==='list'&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:18,overflow:'hidden', boxShadow:`0 4px 20px rgba(0,0,0,0.15)`}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',padding:'14px 20px',borderBottom:`1px solid ${C.border}`,gap:12, background:C.bg3}}>
            {['บริษัท / ชื่อติดต่อ','มูลค่าดีล','สถานะ (Stage)','Win Probability','อัปเดตล่าสุด',''].map((h,i)=>(
              <div key={i} style={{fontSize:11,fontWeight:800,color:C.text3, textTransform:'uppercase', letterSpacing:1}}>{h}</div>
            ))}
          </div>
          {deals.map(d=>(
            <div key={d.id} onClick={()=>setShowDetail(d)}
              style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',padding:'16px 20px',borderBottom:`1px solid ${C.border}`,gap:12,alignItems:'center',cursor:'pointer',transition:'background 0.2s'}}
              onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)'}
              onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>{d.name}</div>
                <div style={{fontSize:11,color:C.text3, marginTop:2}}>{d.contact}</div>
              </div>
              <div style={{fontSize:15,fontWeight:900,color:C.gold}}>฿{(Number(d.value)/1000).toFixed(1)}K</div>
              <div><Badge type="gold">{d.stage}</Badge></div>
              <div style={{minWidth:100}}>
                <div style={{fontSize:12,fontWeight:800,color:d.prob>70?C.green:C.gold, marginBottom:4}}>{d.prob}%</div>
                <ProgressBar pct={d.prob} color={d.prob>70?C.green:C.gold} height={5}/>
              </div>
              <div style={{fontSize:11,color:C.text3}}>{d.days || 0} วันที่ผ่านมา</div>
              <div style={{display:'flex',gap:8}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>generateEmail(d)} style={{padding:'7px',borderRadius:8,background:C.goldLight,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer'}} title="AI Email Draft"><Ic n="mail" s={14}/></button>
                <button onClick={()=>deleteDeal(d.id)} style={{padding:'7px',borderRadius:8,background:C.redL, border:`1px solid ${C.red}33`, color:C.red, cursor:'pointer'}} title="ลบ"><Ic n="trash" s={14}/></button>
              </div>
            </div>
          ))}
          {deals.length === 0 && <div style={{padding:60, textAlign:'center', color:C.text3, fontSize:14}}>ไม่มีข้อมูลดีลในระบบ</div>}
        </div>
      )}

      {showAdd&&(
        <Modal title="ลงทะเบียนดีลใหม่" onClose={()=>setShowAdd(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <Field label="ชื่อบริษัทลูกค้า" required>
                <Input placeholder="เช่น Apple Inc., ปตท." value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
              </Field>
              <Field label="มูลค่าโดยประมาณ (฿)">
                <Input type="number" placeholder="0.00" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}/>
              </Field>
              <Field label="ขั้นตอนปัจจุบัน">
                <Select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})} options={STAGES}/>
              </Field>
              <Field label={`ความมั่นใจในการปิดดีล: ${form.prob}%`}>
                <input type="range" min="0" max="100" value={form.prob}
                  onChange={e=>setForm({...form,prob:parseInt(e.target.value)})}
                  style={{width:'100%',accentColor:C.gold,marginTop:12, cursor:'pointer'}}/>
              </Field>
              <Field label="ชื่อผู้ติดต่อ">
                <Input placeholder="คุณ..." value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/>
              </Field>
              <Field label="อีเมลติดต่อ">
                <Input type="email" placeholder="email@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
              </Field>
            </div>
            <Field label="หมายเหตุ / ความต้องการลูกค้า">
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} 
                placeholder="ระบุสิ่งที่ลูกค้าต้องการหรือข้อมูลสำคัญอื่นๆ..."
                style={{width:'100%', minHeight:80, background:'rgba(255,255,255,0.05)', border:`1px solid ${C.border2}`, borderRadius:12, padding:12, color:C.text, fontFamily:'inherit', fontSize:13, outline:'none', resize:'vertical'}}/>
            </Field>
            <div style={{display:'flex',gap:12,justifyContent:'flex-end',marginTop:10,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setShowAdd(false)} style={{padding:'10px 24px',borderRadius:10,background:'transparent',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:13,fontWeight:600}}>ยกเลิก</button>
              <button onClick={addDeal} style={{padding:'10px 24px',borderRadius:12,background:C.gold,border:'none',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:800}}>สร้าง Deal ทันที</button>
            </div>
          </div>
        </Modal>
      )}

      {showDetail&&(
        <Modal title={`รายละเอียด: ${showDetail.name}`} onClose={()=>setShowDetail(null)} width={550}>
          <div style={{display:'flex',flexDirection:'column',gap:18}}>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <Badge type="gold">{showDetail.stage}</Badge>
              <Badge type={showDetail.prob>70?'green':showDetail.prob>40?'gold':'red'}>Win Rate {showDetail.prob}%</Badge>
              <Badge type="blue">Value ฿{Number(showDetail.value).toLocaleString()}</Badge>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[
                ['ผู้ติดต่อหลัก',showDetail.contact,'users'],
                ['อีเมลติดต่อ',showDetail.email || '-','mail'],
                ['เบอร์โทรศัพท์',showDetail.phone || '-','phone'],
                ['วันในระบบ',`${showDetail.days || 0} วัน`,'calendar'],
              ].map(([l,v,icon]:any)=>(
                <div key={l} style={{background:C.surface,borderRadius:14,padding:'14px',display:'flex',gap:12,alignItems:'flex-start', border:`1px solid ${C.border}`}}>
                  <div style={{width:30, height:30, borderRadius:8, background:`${C.gold}15`, display:'flex', alignItems:'center', justifyContent:'center'}}><Ic n={icon} s={16} c={C.gold}/></div>
                  <div>
                    <div style={{fontSize:10,color:C.text3, marginBottom:2}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{v}</div>
                  </div>
                </div>
              ))}
            </div>

            {showDetail.notes&&(
              <div style={{background:C.bg3,borderRadius:14,padding:16,border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:11,fontWeight:800,color:C.text3,marginBottom:8, textTransform:'uppercase'}}>บันทึกเพิ่มเติม:</div>
                  <div style={{fontSize:13,color:C.text2,lineHeight:1.7}}>{showDetail.notes}</div>
              </div>
            )}

            <div>
              <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:12}}>ย้ายสถานะดีล (Change Stage)</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {STAGES.map(s=>(
                  <button key={s} onClick={()=>{moveDeal(showDetail.id,s);setShowDetail({...showDetail,stage:s});}}
                    style={{padding:'8px 16px',borderRadius:10,fontSize:11,fontWeight:700,cursor:'pointer',background:showDetail.stage===s?C.goldLight:'rgba(255,255,255,0.04)',color:showDetail.stage===s?C.gold:C.text3,border:`1px solid ${showDetail.stage===s?C.gold+'44':C.border}`,transition:'all 0.2s'}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'flex',gap:10,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>runLeadAnalysis(showDetail)} disabled={analyzing} style={{flex:2,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',borderRadius:12,background:C.blueL,border:`1px solid ${C.blue}44`,color:C.blue,cursor:'pointer',fontSize:13,fontWeight:700}}>
                {analyzing ? <div style={{animation:'spin 1s linear infinite'}}><Ic n="cpu" s={16}/></div> : <Ic n="zap" s={16}/>}
                {analyzing ? 'AI กำลังวิเคราะห์ดีล...' : 'วิเคราะห์ดีลด้วย AI'}
              </button>
              <button onClick={()=>{generateEmail(showDetail);setShowDetail(null);}} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',borderRadius:12,background:C.goldLight,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:13,fontWeight:700}}>
                <Ic n="mail" s={16}/>ร่างอีเมล
              </button>
              <button onClick={()=>deleteDeal(showDetail.id)} style={{padding:'12px 16px',borderRadius:12,background:C.redL,border:`1px solid ${C.red}44`,color:C.red,cursor:'pointer'}}>
                <Ic n="trash" s={18}/>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showAnalysis&&(
        <Modal title={`AI Sales Strategy — ${deals.find(d=>d.id===showAnalysis.dealId)?.name}`} onClose={()=>setShowAnalysis(null)} width={600}>
          <div style={{display:'flex',flexDirection:'column',gap:16, animation:'fadeIn 0.3s ease'}}>
            <div style={{background:`${C.blue}10`, border:`1px solid ${C.blue}33`, borderRadius:20, padding:24, display:'flex', alignItems:'center', gap:20}}>
               <div style={{width:80, height:80, borderRadius:'50%', border:`4px solid ${C.blue}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:900, color:C.blue, background:'#fff'}}>
                  {showAnalysis.score}<span style={{fontSize:14}}>%</span>
               </div>
               <div style={{flex:1}}>
                  <div style={{fontSize:16, fontWeight:800, color:C.blue, marginBottom:6}}>Gemini Sales Potential</div>
                  <p style={{fontSize:13, color:C.text2, lineHeight:1.6}}>{showAnalysis.summary}</p>
               </div>
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
               <div style={{background:C.surface, borderRadius:16, padding:16, border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:13, fontWeight:800, color:C.green, marginBottom:12, display:'flex', alignItems:'center', gap:8}}><Ic n="check" s={14} c={C.green}/> กลยุทธ์การขาย</div>
                  {showAnalysis.strategies?.map((s:string,i:number)=>(
                    <div key={i} style={{fontSize:12, color:C.text, marginBottom:8, paddingLeft:14, position:'relative'}}>
                      <span style={{position:'absolute', left:0, color:C.green}}>•</span> {s}
                    </div>
                  ))}
               </div>
               <div style={{background:C.surface, borderRadius:16, padding:16, border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:13, fontWeight:800, color:C.red, marginBottom:12, display:'flex', alignItems:'center', gap:8}}><Ic n="zap" s={14} c={C.red}/> ความเสี่ยง/อุปสรรค</div>
                  {showAnalysis.risks?.map((s:string,i:number)=>(
                    <div key={i} style={{fontSize:12, color:C.text, marginBottom:8, paddingLeft:14, position:'relative'}}>
                      <span style={{position:'absolute', left:0, color:C.red}}>•</span> {s}
                    </div>
                  ))}
               </div>
            </div>

            <div style={{background:`${C.green}10`, borderLeft:`4px solid ${C.green}`, borderRadius:12, padding:16}}>
               <div style={{fontSize:13, fontWeight:800, color:C.green, marginBottom:8}}>สิ่งที่ควรทำต่อไป (Next Best Action)</div>
               <p style={{fontSize:12, color:C.text2, lineHeight:1.6}}>{showAnalysis.next_action}</p>
            </div>

            <div style={{display:'flex', gap:10, justifyContent:'flex-end', marginTop:10}}>
               <button onClick={()=>setShowAnalysis(null)} style={{padding:'12px 30px', borderRadius:12, background:C.blue, border:'none', color:'#fff', cursor:'pointer', fontSize:14, fontWeight:800}}>ปิดการวิเคราะห์</button>
            </div>
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
