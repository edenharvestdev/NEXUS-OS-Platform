'use client'
import { useState } from 'react'
import { Ic, Badge, StatCard, Select, Field, Input, Modal, ProgressBar, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { useAppData } from '@/lib/data'
import { api } from '@/lib/api'

export default function MarketingPage() {
  const { colors: C } = useApp()
  const { campaigns, setCampaigns } = useAppData()
  const [showAdd, setShowAdd] = useState(false)
  const [aiCopy, setAiCopy] = useState('')
  const [genType, setGenType] = useState('Facebook Ad')
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({name:'',channel:'Facebook Ads',budget:'',status:'active'})
  const [selected, setSelected] = useState<any>(null)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const [showAnalysis, setShowAnalysis] = useState<any>(null)
  const [analyzingCamp, setAnalyzingCamp] = useState(false)

  const toggleStatus = async (id: string) => {
    const c = campaigns.find((x: any) => x.id === id)
    if (!c) return
    const next = c.status === 'active' ? 'paused' : 'active'
    try {
      const res = await api.updateCampaign(id, { status: next })
      setCampaigns((cs: any[]) => cs.map(x => x.id === id ? res.data : x))
      showToast('อัปเดตสถานะแล้ว')
    } catch { showToast('อัปเดตไม่สำเร็จ', 'error') }
  }

  const deleteCampaign = async (id:string) => { 
    try {
      await api.deleteCampaign(id);
      setCampaigns(cs=>cs.filter(c=>c.id!==id)); 
      if(selected?.id===id)setSelected(null); 
      showToast('ลบ Campaign แล้ว') 
    } catch (err) {
      showToast('ลบไม่สำเร็จ', 'error')
    }
  }
  
  const addCampaign = async () => {
    if(!form.name){showToast('กรุณากรอกชื่อ Campaign','error');return}
    try {
      const res = await api.createCampaign({
        ...form,
        budget: parseInt(form.budget) || 10000,
        spent: 0, reach: 0, clicks: 0, conversions: 0
      });
      setCampaigns(cs => [res.data, ...cs]);
      setShowAdd(false);
      setForm({name:'',channel:'Facebook Ads',budget:'',status:'active'});
      showToast('เพิ่ม Campaign สำเร็จ');
    } catch (err: any) {
      showToast(err.message || 'เพิ่มไม่สำเร็จ', 'error');
    }
  }

  const runCampaignAnalysis = async (camp: any) => {
    setAnalyzingCamp(true)
    try {
      const res = await api.analyzeCampaign(camp.id)
      setShowAnalysis({ ...res.data, campId: camp.id })
    } catch (err: any) {
      showToast('AI วิเคราะห์ล้มเหลว', 'error')
    } finally {
      setAnalyzingCamp(false)
    }
  }

  const generateCopy = async () => {
    setGenerating(true); setAiCopy('')
    try {
      const prompt = `เขียนโฆษณาประเภท ${genType} เป็นภาษาไทย สำหรับ "NEXUS OS" 
      NEXUS OS คือ Enterprise Intelligence Platform — จัดหมวดข้อมูลเป็นมาตรฐาน (Data First) แล้วเชื่อม AI Agent ทีมละแผนก
      Beachhead: คลินิกและ SME ที่ข้อมูลกระจัด · หลักการ Data First → AI Later
      จุดเด่น: 
      - มี AI จดจำใบเสร็จแม่นยำ (Gemini 2.0)
      - ระบบวิเคราะห์เอกสารกฎหมายอัตโนมัติ
      - AI ช่วยสรุปการประชุมและสั่งงาน
      - Dashboard สวยงาม ทันสมัย ใช้งานง่าย
      
      โทนเสียง: เป็นมืออาชีพ ทันสมัย ดึงดูด กระชับ และมี Call to Action ที่ชัดเจน`
      
      const res = await api.sendMessage(prompt);
      setAiCopy(res.text);
      showToast('AI สร้าง Copy สำเร็จ');
    } catch (err) { 
      setAiCopy('ไม่สามารถสร้าง Copy ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
      showToast('AI Error', 'error');
    }
    setGenerating(false)
  }

  const totalBudget = campaigns.reduce((s,c)=>s+(Number(c.budget)||0),0)
  const totalSpent = campaigns.reduce((s,c)=>s+(Number(c.spent)||0),0)
  const totalReach = campaigns.reduce((s,c)=>s+(Number(c.reach)||0),0)
  const totalConv = campaigns.reduce((s,c)=>s+(Number(c.conversions || c.conv)||0),0)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>Marketing AI Studio</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>จัดการแคมเปญและสร้างคอนเทนต์ด้วยพลัง Gemini 2.0</div></div>
        <button onClick={()=>setShowAdd(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,boxShadow:`0 4px 12px ${C.gold}33`}}><Ic n="plus" s={13}/>Campaign ใหม่</button>
      </div>

      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon="trending" label="Reach รวม" value={`${(totalReach/1000).toFixed(0)}K`} trend={18} color={C.blue} chart={[20,35,28,45,52,60,55,70]}/>
        <StatCard icon="target" label="Conversions" value={totalConv.toLocaleString()} trend={9} color={C.gold} chart={[10,15,20,18,25,30,28,35]}/>
        <StatCard icon="dollar" label="งบประมาณที่ใช้" value={`${totalBudget > 0 ? Math.round(totalSpent/totalBudget*100) : 0}%`} sub={`฿${(totalSpent/1000).toFixed(1)}K / ฿${(totalBudget/1000).toFixed(1)}K`} color={C.green}/>
        <StatCard icon="zap" label="AI Performance" value="Excellent" trend={5} color={C.purple}/>
      </div>

      <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
        <div style={{flex:2,minWidth:300,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:4}}>Active Campaigns ({campaigns.length})</div>
          {campaigns.map((c,i)=>(
            <div key={c.id} onClick={()=>setSelected(c)} style={{background:selected?.id===c.id?`${c.color || C.gold}15`:C.surface,border:`1px solid ${selected?.id===c.id?(c.color || C.gold)+'44':C.border}`,borderRadius:16,padding:18,cursor:'pointer',transition:'all 0.2s',animation:`fadeIn 0.3s ease ${i*0.08}s both`, boxShadow:selected?.id===c.id?`0 4px 15px ${(c.color || C.gold)}22`:'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:C.text}}>{c.name}</div>
                  <div style={{fontSize:11,color:C.text3,marginTop:2}}><Badge type="blue">{c.channel}</Badge></div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}} onClick={e=>e.stopPropagation()}>
                  <Badge type={c.status==='active'?'green':'gold'}>{c.status==='active'?'Running':'Paused'}</Badge>
                  <button onClick={()=>toggleStatus(c.id)} style={{padding:'6px',borderRadius:8,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer'}} title={c.status==='active'?'Pause':'Resume'}><Ic n={c.status==='active'?'plus':'plus'} s={14} style={{transform:c.status==='active'?'rotate(45deg)':'none'}}/></button>
                  <button onClick={()=>deleteCampaign(c.id)} style={{padding:'6px',borderRadius:8,background:C.red+'15',border:`1px solid ${C.red}33`,color:C.red,cursor:'pointer'}} title="Delete"><Ic n="trash" s={14}/></button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:14,background:'rgba(0,0,0,0.1)',padding:10,borderRadius:10}}>
                {([['Reach',`${(c.reach/1000).toFixed(1)}K`],['Clicks',Number(c.clicks || 0).toLocaleString()],['Conv.',c.conversions || c.conv || 0]] as [string,string|number][]).map(([l,v])=>(
                  <div key={l}><div style={{fontSize:10,color:C.text3,marginBottom:2}}>{l}</div><div style={{fontSize:14,fontWeight:800,color:C.text}}>{v}</div></div>
                ))}
              </div>
              <div style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:11,color:C.text3}}>งบประมาณที่ใช้ไป</span>
                  <span style={{fontSize:11,fontWeight:800,color:c.color || C.gold}}>฿{Number(c.spent || 0).toLocaleString()} / ฿{Number(c.budget || 0).toLocaleString()}</span>
                </div>
                <ProgressBar pct={c.budget > 0 ? Math.round((c.spent||0)/c.budget*100) : 0} color={c.color || C.gold} height={6}/>
              </div>
              <div style={{display:'flex',gap:8}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>runCampaignAnalysis(c)} disabled={analyzingCamp} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'8px',borderRadius:10,background:C.purpleL,border:`1px solid ${C.purple}33`,color:C.purple,cursor:'pointer',fontSize:11,fontWeight:700}}>
                   {analyzingCamp ? <div style={{animation:'spin 1s linear infinite'}}><Ic n="cpu" s={12}/></div> : <Ic n="zap" s={12}/>}
                   วิเคราะห์ AI
                </button>
                <button onClick={()=>setSelected(c)} style={{padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:11,fontWeight:600}}>รายละเอียด</button>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && <div style={{padding:40, textAlign:'center', border:`1px dashed ${C.border}`, borderRadius:16, color:C.text3}}>ยังไม่มีแคมเปญการตลาด</div>}
        </div>

        <div style={{flex:1,minWidth:280,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
            <div style={{fontSize:13,fontWeight:800,color:C.text,marginBottom:14,display:'flex',alignItems:'center',gap:8}}><Ic n="zap" s={16} c={C.gold}/> AI Ad Copywriter</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Field label="ประเภทสื่อ">
                <Select value={genType} onChange={e=>setGenType(e.target.value)} options={['Facebook Ad','Instagram Caption','Email Subject','LINE Message','TikTok Script','Google Search Ad']}/>
              </Field>
              <button onClick={generateCopy} disabled={generating} style={{width:'100%',marginTop:6,padding:'12px',borderRadius:12,background:generating?'rgba(255,255,255,0.05)':`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:generating?C.text3:'#fff',cursor:generating?'default':'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8, transition:'all 0.2s'}}>
                {generating?<><div style={{animation:'spin 1s linear infinite'}}><Ic n="cpu" s={16}/></div>กำลังประมวลผล...</>:<><Ic n="zap" s={16}/>สร้างข้อความโฆษณา</>}
              </button>
            </div>
            
            {aiCopy&&(
              <div style={{marginTop:16,background:C.bg3,borderRadius:14,padding:16, border:`1px solid ${C.gold}22`, animation:'fadeIn 0.4s ease'}}>
                <div style={{fontSize:11, fontWeight:800, color:C.gold, marginBottom:10, textTransform:'uppercase'}}>Generated Content:</div>
                <div style={{fontSize:13,color:C.text2,lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'Montserrat',marginBottom:14}}>{aiCopy}</div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{navigator.clipboard.writeText(aiCopy); showToast('คัดลอกลง Clipboard แล้ว')}} style={{flex:1,padding:'8px',borderRadius:10,background:C.goldLight,border:`1px solid ${C.gold}33`,color:C.gold,cursor:'pointer',fontSize:12,fontWeight:700}}>คัดลอก</button>
                  <button onClick={()=>setAiCopy('')} style={{padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer'}}><Ic n="trash" s={14}/></button>
                </div>
              </div>
            )}
          </div>
          <div style={{background:`${C.purple}10`,border:`1px solid ${C.purple}30`,borderRadius:16,padding:16}}>
            <div style={{fontSize:12,fontWeight:800,color:C.purple,marginBottom:8, display:'flex', alignItems:'center', gap:6}}><Ic n="trending" s={14} c={C.purple}/> Smart Optimization</div>
            <p style={{fontSize:11,color:C.text2,lineHeight:1.7}}>Gemini แนะนำให้คุณลองใช้ภาพแนว <b>Minimalist</b> กับแคมเปญ Facebook Ads ของคุณ เพราะมีโอกาสเพิ่ม CTR ได้ถึง 22% จากสถิติอุตสาหกรรมในเดือนนี้</p>
          </div>
        </div>
      </div>

      {showAnalysis&&(
        <Modal title={`AI Marketing Insights — ${campaigns.find(c=>c.id===showAnalysis.campId)?.name}`} onClose={()=>setShowAnalysis(null)} width={600}>
          <div style={{display:'flex',flexDirection:'column',gap:16, animation:'fadeIn 0.3s ease'}}>
            <div style={{background:`${C.purple}10`, border:`1px solid ${C.purple}33`, borderRadius:20, padding:24, display:'flex', alignItems:'center', gap:20}}>
               <div style={{width:80, height:80, borderRadius:'50%', border:`4px solid ${C.purple}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:900, color:C.purple, background:'#fff'}}>
                  {showAnalysis.performance_score}<span style={{fontSize:14}}>%</span>
               </div>
               <div style={{flex:1}}>
                  <div style={{fontSize:16, fontWeight:800, color:C.purple, marginBottom:6}}>Gemini Performance Score</div>
                  <div style={{display:'flex', gap:12, marginBottom:8}}>
                     {Object.entries(showAnalysis.metrics || {}).map(([k,v]:any)=>(
                       <div key={k} style={{fontSize:12, color:C.text3}}><b style={{color:C.text2}}>{k.toUpperCase()}:</b> {v}</div>
                     ))}
                  </div>
                  <p style={{fontSize:12, color:C.text2, lineHeight:1.6}}>การประเมินประสิทธิภาพโดยรวมอ้างอิงจากงบประมาณและผลลัพธ์ที่ได้</p>
               </div>
            </div>
            
            <div style={{fontSize:13, fontWeight:800, color:C.text, marginBottom:4}}>AI Generated Content Ideas:</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
               {showAnalysis.content_ideas?.map((idea:any, i:number)=>(
                 <div key={i} style={{background:C.surface, borderRadius:16, padding:16, border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:11, fontWeight:800, color:C.gold, marginBottom:6, textTransform:'uppercase'}}>{idea.type}</div>
                    <div style={{fontSize:12, color:C.text, fontWeight:700, marginBottom:4}}>{idea.hook}</div>
                    <div style={{fontSize:11, color:C.text3, lineHeight:1.5}}>{idea.body}</div>
                 </div>
               ))}
            </div>

            <div style={{background:`${C.blue}10`, borderLeft:`4px solid ${C.blue}`, borderRadius:12, padding:16}}>
               <div style={{fontSize:13, fontWeight:800, color:C.blue, marginBottom:8}}>คำแนะนำในการปรับปรุง (Optimization)</div>
               <p style={{fontSize:12, color:C.text2, lineHeight:1.6}}>{showAnalysis.optimization}</p>
            </div>

            <div style={{display:'flex', gap:10, justifyContent:'flex-end', marginTop:10}}>
               <button onClick={()=>setShowAnalysis(null)} style={{padding:'12px 30px', borderRadius:12, background:C.purple, border:'none', color:'#fff', cursor:'pointer', fontSize:14, fontWeight:800}}>ปิดการประเมิน</button>
            </div>
          </div>
        </Modal>
      )}

      {showAdd&&(
        <Modal title="สร้างแคมเปญโฆษณาใหม่" onClose={()=>setShowAdd(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:16, width:450}}>
            <Field label="ชื่อแคมเปญ" required><Input placeholder="เช่น เปิดตัวสินค้าใหม่, โปรโมชั่น 5.5..." value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <Field label="ช่องทางลงโฆษณา"><Select value={form.channel} onChange={e=>setForm({...form,channel:e.target.value})} options={['Facebook Ads','Google Ads','TikTok Ads','Instagram','LINE','Email Marketing']}/></Field>
              <Field label="งบประมาณทั้งหมด (฿)"><Input type="number" placeholder="0.00" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}/></Field>
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:10,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setShowAdd(false)} style={{padding:'10px 24px',borderRadius:10,background:'transparent',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:13,fontWeight:600}}>ยกเลิก</button>
              <button onClick={addCampaign} style={{padding:'10px 24px',borderRadius:12,background:C.gold,border:'none',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:800}}>สร้างแคมเปญ</button>
            </div>
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
