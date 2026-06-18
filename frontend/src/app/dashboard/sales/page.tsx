'use client'
import { useState } from 'react'
import { C, Ic, Badge, StatCard, Field, Input, Select, Tabs, ProgressBar, Modal, Toast } from '@/lib/ui'

async function callClaude(message: string): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  const data = await res.json()
  return data.text
}

const STAGES = ['ติดต่อ','สนใจ','นำเสนอ','เจรจา','ปิดดีล']

const INIT_DEALS = [
  {id:1,name:'บริษัท XYZ จำกัด',value:850000,stage:'สนใจ',prob:82,days:5,contact:'คุณวิชัย',phone:'081-111-2222',email:'wichai@xyz.co.th',notes:'มีแนวโน้มสูง ต้องการ demo Q2'},
  {id:2,name:'ABC Corporation',value:1200000,stage:'นำเสนอ',prob:65,days:12,contact:'Ms. Sarah',phone:'+66-82-222-3333',email:'sarah@abc.com',notes:'รอผลการพิจารณา board'},
  {id:3,name:'ไทยพัฒนา กรุ๊ป',value:340000,stage:'เจรจา',prob:71,days:3,contact:'คุณสมหมาย',phone:'083-333-4444',email:'sommai@thaidev.co.th',notes:'ต่อรองราคา 5%'},
  {id:4,name:'Global Tech Co.',value:2100000,stage:'ปิดดีล',prob:95,days:1,contact:'Mr. John',phone:'+1-555-0100',email:'john@globaltech.com',notes:'เตรียมสัญญา'},
  {id:5,name:'สยามสตาร์ จำกัด',value:450000,stage:'ติดต่อ',prob:20,days:30,contact:'คุณนภา',phone:'085-555-6666',email:'napa@siamstar.co.th',notes:'ส่ง brochure แล้ว'},
  {id:6,name:'เทคโนพลัส',value:680000,stage:'สนใจ',prob:55,days:8,contact:'คุณประสิทธิ์',phone:'086-666-7777',email:'prasit@technoplus.co.th',notes:'ขอ trial 30 วัน'},
]

export default function SalesPage() {
  const [deals, setDeals] = useState(INIT_DEALS)
  const [view, setView] = useState('kanban')
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [aiEmail, setAiEmail] = useState('')
  const [generating, setGenerating] = useState(false)
  const [emailTarget, setEmailTarget] = useState<any>(null)
  const [form, setForm] = useState({name:'',value:'',stage:'ติดต่อ',contact:'',email:'',phone:'',prob:50,notes:''})
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const addDeal = () => {
    if(!form.name){showToast('กรุณากรอกชื่อบริษัท','error');return}
    setDeals(d=>[...d,{id:Date.now(),...form,value:parseInt(form.value)||0,days:30}])
    setShowAdd(false)
    setForm({name:'',value:'',stage:'ติดต่อ',contact:'',email:'',phone:'',prob:50,notes:''})
    showToast('เพิ่ม Deal สำเร็จ')
  }
  const moveDeal = (id:number, stage:string) => {
    setDeals(ds=>ds.map(d=>d.id===id?{...d,stage}:d))
    showToast(`ย้าย Deal ไป ${stage}`)
  }
  const deleteDeal = (id:number) => {
    setDeals(ds=>ds.filter(d=>d.id!==id))
    setShowDetail(null)
    showToast('ลบ Deal แล้ว')
  }

  const generateEmail = async (deal: any) => {
    setEmailTarget(deal); setGenerating(true); setAiEmail('')
    try {
      const r = await callClaude(
        `เขียน email ติดต่อ follow up สั้นๆ เป็นภาษาไทยอย่างเป็นทางการ สำหรับ Sales ติดต่อ ${deal.contact} จาก ${deal.name} เกี่ยวกับ deal มูลค่า ฿${deal.value.toLocaleString()} ที่อยู่ใน stage "${deal.stage}" Win rate ${deal.prob}% — ไม่เกิน 3 ย่อหน้า`
      )
      setAiEmail(r)
    } catch {
      setAiEmail('ไม่สามารถสร้าง Email ได้ กรุณาลองใหม่')
    }
    setGenerating(false)
  }

  const total = deals.reduce((s,d)=>s+d.value,0)
  const won   = deals.filter(d=>d.stage==='ปิดดีล').reduce((s,d)=>s+d.value,0)
  const hotDeals = deals.filter(d=>d.prob>=70&&d.stage!=='ปิดดีล')

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text}}>Sales Copilot</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>Pipeline ฿{(total/1000000).toFixed(1)}M · {deals.length} deals</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <Tabs tabs={[{id:'kanban',label:'Kanban'},{id:'list',label:'รายการ'}]} active={view} onChange={setView}/>
          <button onClick={()=>setShowAdd(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,boxShadow:`0 4px 14px ${C.gold}44`}}>
            <Ic n="plus" s={13}/>Deal ใหม่
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon="target"  label="Pipeline รวม" value={`฿${(total/1000000).toFixed(1)}M`} trend={8} color={C.blue} chart={[20,35,30,45,40,55,50,65]}/>
        <StatCard icon="check"   label="ปิดดีลแล้ว"   value={`฿${(won/1000000).toFixed(1)}M`} color={C.green}/>
        <StatCard icon="trending" label="Avg Win Rate" value={`${Math.round(deals.reduce((s,d)=>s+d.prob,0)/deals.length)}%`} color={C.gold}/>
        <StatCard icon="zap"     label="Hot Deals"    value={deals.filter(d=>d.prob>=70).length} sub="Win Rate ≥70%" color={C.red}/>
      </div>

      {/* AI Focus Bar */}
      {hotDeals.length>0&&(
        <div style={{background:`${C.gold}10`,border:`1px solid ${C.gold}30`,borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div style={{width:34,height:34,borderRadius:10,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Ic n="zap" s={18} c={C.gold}/>
          </div>
          <div style={{flex:1}}>
            <span style={{fontSize:13,fontWeight:700,color:C.gold}}>🎯 AI Focus: </span>
            {hotDeals.map(d=>(
              <span key={d.id} style={{fontSize:12,color:C.text2,marginRight:12}}>{d.name} ({d.prob}%)</span>
            ))}
          </div>
          <button
            onClick={()=>{const top=deals.reduce((a,b)=>a.prob>b.prob?a:b);generateEmail(top);}}
            style={{padding:'8px 14px',borderRadius:10,background:C.goldLight,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
            <Ic n="mail" s={13}/>เขียน Email
          </button>
        </div>
      )}

      {/* AI Email Result */}
      {(aiEmail||generating)&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16,animation:'fadeIn 0.3s ease'}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span>✉️ AI Email Draft {emailTarget&&`— ${emailTarget.name}`}</span>
            <button onClick={()=>{setAiEmail('');setEmailTarget(null);}} style={{background:'none',border:'none',cursor:'pointer',color:C.text3}}>
              <Ic n="x" s={16}/>
            </button>
          </div>
          {generating ? (
            <div style={{display:'flex',gap:6,alignItems:'center',color:C.text3,fontSize:12}}>
              <div style={{animation:'spin 1s linear infinite'}}><Ic n="cpu" s={16} c={C.gold}/></div>
              กำลังสร้าง Email...
            </div>
          ) : (
            <pre style={{fontSize:12,color:C.text2,lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'Montserrat'}}>{aiEmail}</pre>
          )}
          {aiEmail&&!generating&&(
            <div style={{display:'flex',gap:8,marginTop:12}}>
              <button onClick={()=>showToast('ส่ง Email แล้ว')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700}}>
                <Ic n="send" s={13}/>ส่งทันที
              </button>
              <button onClick={()=>showToast('คัดลอกแล้ว')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}>
                <Ic n="file" s={13}/>คัดลอก
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Kanban View ── */}
      {view==='kanban'&&(
        <div style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:8}}>
          {STAGES.map(stage=>{
            const sd = deals.filter(d=>d.stage===stage)
            const sv = sd.reduce((s,d)=>s+d.value,0)
            return (
              <div key={stage} style={{minWidth:190,background:'rgba(255,255,255,0.03)',border:`1px solid ${C.border}`,borderRadius:14,padding:12,display:'flex',flexDirection:'column',gap:8,flexShrink:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.text}}>{stage}</span>
                  <Badge type="gold">{sd.length}</Badge>
                </div>
                <div style={{fontSize:11,color:C.text3,marginBottom:4}}>฿{(sv/1000).toFixed(0)}K</div>

                {sd.map(d=>(
                  <div key={d.id} onClick={()=>setShowDetail(d)}
                    style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,borderRadius:10,padding:12,cursor:'pointer',transition:'all 0.2s'}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.08)';(e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.05)';(e.currentTarget as HTMLDivElement).style.transform='';}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</div>
                    <div style={{fontSize:13,fontWeight:800,color:C.gold,marginBottom:8}}>฿{(d.value/1000).toFixed(0)}K</div>
                    <div style={{marginBottom:6}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:10,color:C.text3}}>Win Rate</span>
                        <span style={{fontSize:10,fontWeight:700,color:d.prob>70?C.green:d.prob>40?C.gold:C.red}}>{d.prob}%</span>
                      </div>
                      <ProgressBar pct={d.prob} color={d.prob>70?C.green:d.prob>40?C.gold:C.red}/>
                    </div>
                    <div style={{fontSize:10,color:C.text3}}>{d.contact} · {d.days} วัน</div>
                  </div>
                ))}

                <div onClick={()=>setShowAdd(true)}
                  style={{border:`1px dashed ${C.border}`,borderRadius:8,padding:'8px',textAlign:'center',fontSize:11,color:C.text3,cursor:'pointer',transition:'all 0.15s'}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.gold;(e.currentTarget as HTMLDivElement).style.color=C.gold;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border;(e.currentTarget as HTMLDivElement).style.color=C.text3;}}>
                  + เพิ่ม
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── List View ── */}
      {view==='list'&&(
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',padding:'10px 16px',borderBottom:`1px solid ${C.border}`,gap:12}}>
            {['บริษัท','มูลค่า','Stage','Win Rate','วัน',''].map((h,i)=>(
              <div key={i} style={{fontSize:11,fontWeight:700,color:C.text3}}>{h}</div>
            ))}
          </div>
          {deals.map(d=>(
            <div key={d.id} onClick={()=>setShowDetail(d)}
              style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',padding:'12px 16px',borderBottom:`1px solid ${C.border}`,gap:12,alignItems:'center',cursor:'pointer',transition:'background 0.15s'}}
              onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)'}
              onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.text}}>{d.name}</div>
                <div style={{fontSize:11,color:C.text3}}>{d.contact}</div>
              </div>
              <div style={{fontSize:13,fontWeight:800,color:C.gold}}>฿{(d.value/1000).toFixed(0)}K</div>
              <Badge type="gold">{d.stage}</Badge>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:d.prob>70?C.green:C.gold}}>{d.prob}%</div>
                <ProgressBar pct={d.prob} color={d.prob>70?C.green:C.gold}/>
              </div>
              <div style={{fontSize:11,color:C.text3}}>{d.days} วัน</div>
              <div style={{display:'flex',gap:4}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>generateEmail(d)} style={{padding:'5px 8px',borderRadius:6,background:C.goldLight,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:10,fontWeight:600}}>✉️</button>
                <button onClick={()=>deleteDeal(d.id)} style={{padding:'5px 8px',borderRadius:6,background:C.redLight, border:`1px solid ${C.red}44`, color:C.red, cursor:'pointer',fontSize:10,fontWeight:600}}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Deal Modal */}
      {showAdd&&(
        <Modal title="เพิ่ม Deal ใหม่" onClose={()=>setShowAdd(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="ชื่อบริษัท" required>
                <Input placeholder="บริษัท ABC" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
              </Field>
              <Field label="มูลค่า (฿)">
                <Input type="number" placeholder="500000" value={form.value} onChange={e=>setForm({...form,value:e.target.value})}/>
              </Field>
              <Field label="Stage">
                <Select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})} options={STAGES}/>
              </Field>
              <Field label={`Win Rate — ${form.prob}%`}>
                <input type="range" min="0" max="100" value={form.prob}
                  onChange={e=>setForm({...form,prob:parseInt(e.target.value)})}
                  style={{width:'100%',accentColor:C.gold,marginTop:8}}/>
              </Field>
              <Field label="ชื่อติดต่อ">
                <Input placeholder="คุณสมชาย" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/>
              </Field>
              <Field label="อีเมล">
                <Input type="email" placeholder="contact@company.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
              </Field>
            </div>
            <Field label="หมายเหตุ">
              <Input placeholder="รายละเอียดเพิ่มเติม..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
            </Field>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:8,borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setShowAdd(false)} style={{padding:'10px 20px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:13,fontWeight:600}}>ยกเลิก</button>
              <button onClick={addDeal} style={{padding:'10px 20px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>เพิ่ม Deal</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Deal Detail Modal */}
      {showDetail&&(
        <Modal title={showDetail.name} onClose={()=>setShowDetail(null)} width={520}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <Badge type="gold">{showDetail.stage}</Badge>
              <Badge type={showDetail.prob>70?'green':showDetail.prob>40?'gold':'red'}>Win {showDetail.prob}%</Badge>
              <Badge type="blue">฿{showDetail.value.toLocaleString()}</Badge>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {([
                ['ติดต่อ',showDetail.contact,'users'],
                ['อีเมล',showDetail.email,'mail'],
                ['โทร',showDetail.phone,'phone'],
                ['วันในระบบ',`${showDetail.days} วัน`,'calendar'],
              ] as [string,string,string][]).map(([l,v,icon])=>(
                <div key={l} style={{background:C.surface,borderRadius:10,padding:'10px 12px',display:'flex',gap:8,alignItems:'flex-start'}}>
                  <Ic n={icon} s={14} c={C.gold} style={{marginTop:1}}/>
                  <div>
                    <div style={{fontSize:10,color:C.text3}}>{l}</div>
                    <div style={{fontSize:12,fontWeight:600,color:C.text}}>{v}</div>
                  </div>
                </div>
              ))}
            </div>

            {showDetail.notes&&(
              <div style={{background:C.surface,borderRadius:10,padding:'10px 12px',display:'flex',gap:8,alignItems:'flex-start'}}>
                <Ic n="file" s={14} c={C.gold} style={{marginTop:1}}/>
                <div>
                  <div style={{fontSize:10,color:C.text3}}>หมายเหตุ</div>
                  <div style={{fontSize:12,fontWeight:600,color:C.text}}>{showDetail.notes}</div>
                </div>
              </div>
            )}

            <div>
              <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>ย้าย Stage</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {STAGES.map(s=>(
                  <button key={s} onClick={()=>{moveDeal(showDetail.id,s);setShowDetail({...showDetail,stage:s});}}
                    style={{padding:'6px 12px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',background:showDetail.stage===s?C.goldLight:'rgba(255,255,255,0.05)',color:showDetail.stage===s?C.gold:C.text3,border:`1px solid ${showDetail.stage===s?C.gold+'44':C.border}`,transition:'all 0.15s'}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:'flex',gap:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>{generateEmail(showDetail);setShowDetail(null);}} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:10,background:C.goldLight,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:12,fontWeight:600}}>
                <Ic n="mail" s={13}/>AI Email
              </button>
              <button onClick={()=>deleteDeal(showDetail.id)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',borderRadius:10,background:C.redLight,border:`1px solid ${C.red}44`,color:C.red,cursor:'pointer',fontSize:12,fontWeight:600}}>
                <Ic n="trash" s={13}/>ลบ Deal
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
