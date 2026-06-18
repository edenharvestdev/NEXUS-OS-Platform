'use client'
import { useState } from 'react'
import { C, Ic, Badge, StatCard, Select, Field, Input, Modal, ProgressBar, Toast } from '@/lib/ui'

async function callClaude(message: string): Promise<string> {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  const data = await res.json()
  return data.text
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState([
    {id:1,name:'Summer Sale 2026',channel:'Facebook Ads',budget:50000,spent:38000,reach:45200,clicks:2340,conv:187,status:'active',color:C.gold},
    {id:2,name:'Brand Awareness Q2',channel:'Google Display',budget:30000,spent:13500,reach:78900,clicks:890,conv:45,status:'active',color:C.blue},
    {id:3,name:'Retargeting Cart',channel:'Facebook+IG',budget:20000,spent:20000,reach:12400,clicks:1120,conv:234,status:'paused',color:C.purple},
    {id:4,name:'LINE OA Push',channel:'LINE',budget:15000,spent:8200,reach:18900,clicks:3400,conv:420,status:'active',color:C.green},
  ])
  const [showAdd, setShowAdd] = useState(false)
  const [aiCopy, setAiCopy] = useState('')
  const [genType, setGenType] = useState('Facebook Ad')
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({name:'',channel:'Facebook Ads',budget:'',status:'active'})
  const [selected, setSelected] = useState<any>(null)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const toggleStatus = (id:number) => { setCampaigns(cs=>cs.map(c=>c.id===id?{...c,status:c.status==='active'?'paused':'active'}:c)); showToast('อัพเดทสถานะแล้ว') }
  const deleteCampaign = (id:number) => { setCampaigns(cs=>cs.filter(c=>c.id!==id)); if(selected?.id===id)setSelected(null); showToast('ลบ Campaign แล้ว') }
  const addCampaign = () => {
    if(!form.name){showToast('กรุณากรอกชื่อ Campaign','error');return}
    setCampaigns(cs=>[...cs,{id:Date.now(),...form,budget:parseInt(form.budget)||10000,spent:0,reach:0,clicks:0,conv:0,color:C.gold}])
    setShowAdd(false); setForm({name:'',channel:'Facebook Ads',budget:'',status:'active'}); showToast('เพิ่ม Campaign สำเร็จ')
  }
  const generateCopy = async () => {
    setGenerating(true); setAiCopy('')
    try {
      const r = await callClaude(`เขียน ${genType} copy ภาษาไทย สำหรับ Autosoft ระบบ AI สำหรับธุรกิจ เน้นจุดเด่นด้าน AI และการจัดการธุรกิจอัตโนมัติ กระชับ ดึงดูด มี CTA`)
      setAiCopy(r)
    } catch { setAiCopy('ไม่สามารถสร้าง Copy ได้ กรุณาลองใหม่') }
    setGenerating(false)
  }

  const totalBudget = campaigns.reduce((s,c)=>s+c.budget,0)
  const totalSpent = campaigns.reduce((s,c)=>s+c.spent,0)
  const totalReach = campaigns.reduce((s,c)=>s+c.reach,0)
  const totalConv = campaigns.reduce((s,c)=>s+c.conv,0)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>Marketing Studio</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>Campaigns · Analytics · AI Copywriting</div></div>
        <button onClick={()=>setShowAdd(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700}}><Ic n="plus" s={13}/>Campaign ใหม่</button>
      </div>

      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon="trending" label="Reach รวม" value={`${(totalReach/1000).toFixed(0)}K`} trend={18} color={C.blue} chart={[20,35,28,45,52,60,55,70]}/>
        <StatCard icon="target" label="Conversions" value={totalConv.toLocaleString()} trend={9} color={C.gold} chart={[10,15,20,18,25,30,28,35]}/>
        <StatCard icon="dollar" label="Budget ใช้แล้ว" value={`${Math.round(totalSpent/totalBudget*100)}%`} sub={`฿${(totalSpent/1000).toFixed(0)}K / ฿${(totalBudget/1000).toFixed(0)}K`} color={C.green}/>
        <StatCard icon="zap" label="ROAS" value="3.8x" trend={5} color={C.purple}/>
      </div>

      <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
        <div style={{flex:2,minWidth:300,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>Campaigns</div>
          {campaigns.map((c,i)=>(
            <div key={c.id} onClick={()=>setSelected(c)} style={{background:selected?.id===c.id?`${c.color}10`:C.surface,border:`1px solid ${selected?.id===c.id?c.color+'44':C.border}`,borderRadius:14,padding:16,cursor:'pointer',transition:'all 0.2s',animation:`fadeIn 0.3s ease ${i*0.08}s both`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:C.text}}>{c.name}</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}>{c.channel}</div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}} onClick={e=>e.stopPropagation()}>
                  <Badge type={c.status==='active'?'green':'gold'}>{c.status==='active'?'Active':'Paused'}</Badge>
                  <button onClick={()=>toggleStatus(c.id)} style={{padding:'4px 8px',borderRadius:6,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer',fontSize:10}}>{c.status==='active'?'⏸':'▶'}</button>
                  <button onClick={()=>deleteCampaign(c.id)} style={{padding:'4px 8px',borderRadius:6,background:C.redLight,border:`1px solid ${C.red}44`,color:C.red,cursor:'pointer',fontSize:10}}>🗑</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
                {([['Reach',`${(c.reach/1000).toFixed(1)}K`],['Clicks',c.clicks.toLocaleString()],['Conv.',c.conv]] as [string,string|number][]).map(([l,v])=>(
                  <div key={l}><div style={{fontSize:10,color:C.text3}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:C.text}}>{v}</div></div>
                ))}
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:11,color:C.text3}}>Budget</span>
                  <span style={{fontSize:11,fontWeight:700,color:c.color}}>฿{c.spent.toLocaleString()} / ฿{c.budget.toLocaleString()}</span>
                </div>
                <ProgressBar pct={Math.round(c.spent/c.budget*100)} color={c.color}/>
              </div>
            </div>
          ))}
        </div>

        <div style={{flex:1,minWidth:240,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:12}}>🤖 AI Copywriting</div>
            <Select value={genType} onChange={e=>setGenType(e.target.value)} options={['Facebook Ad','Email Subject','LINE Message','Google Ad','Instagram Caption','Twitter/X Post']}/>
            <button onClick={generateCopy} disabled={generating} style={{width:'100%',marginTop:10,padding:'10px',borderRadius:10,background:generating?'rgba(255,255,255,0.05)':`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:generating?C.text3:'#fff',cursor:generating?'default':'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              {generating?<><div style={{animation:'spin 1s linear infinite'}}><Ic n="cpu" s={14}/></div>กำลังสร้าง...</>:<><Ic n="zap" s={14}/>สร้าง Copy</>}
            </button>
            {aiCopy&&(
              <div style={{marginTop:12,background:C.bg3,borderRadius:10,padding:12}}>
                <pre style={{fontSize:12,color:C.text2,lineHeight:1.7,whiteSpace:'pre-wrap',fontFamily:'Montserrat',marginBottom:8}}>{aiCopy}</pre>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>showToast('คัดลอกแล้ว')} style={{flex:1,padding:'6px',borderRadius:7,background:C.goldLight,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:11,fontWeight:600}}>คัดลอก</button>
                  <button onClick={()=>setAiCopy('')} style={{padding:'6px 8px',borderRadius:7,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer',fontSize:11}}><Ic n="x" s={12}/></button>
                </div>
              </div>
            )}
          </div>
          <div style={{background:`${C.gold}10`,border:`1px solid ${C.gold}30`,borderRadius:14,padding:14}}>
            <div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:8}}>📊 AI Insight</div>
            <p style={{fontSize:11,color:C.text2,lineHeight:1.7}}>วันพุธ–พฤหัส 19:00–21:00 มี engagement สูงสุด แนะนำ boost post ช่วงนี้ เพื่อเพิ่ม ROAS อีก 0.5x</p>
          </div>
        </div>
      </div>

      {showAdd&&(
        <Modal title="เพิ่ม Campaign ใหม่" onClose={()=>setShowAdd(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Field label="ชื่อ Campaign" required><Input placeholder="Summer Sale 2026" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="ช่องทาง"><Select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})} options={['Facebook Ads','Google Ads','LINE','Instagram','Twitter/X','TikTok','Email']}/></Field>
              <Field label="งบประมาณ (฿)"><Input type="number" placeholder="50000" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}/></Field>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:8,borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setShowAdd(false)} style={{padding:'10px 20px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:13,fontWeight:600}}>ยกเลิก</button>
              <button onClick={addCampaign} style={{padding:'10px 20px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>เพิ่ม Campaign</button>
            </div>
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
