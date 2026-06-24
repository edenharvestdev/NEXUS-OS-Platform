'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Ic, Avatar, Toggle, Tabs, Field, Input, Select, Toast, Badge } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'
import { setCachedUser } from '@/lib/users'

const LAYERS = ['People', 'Customer', 'Financial', 'Operation', 'Knowledge', 'Performance']
const TIER_COLORS: Record<string, string> = { T0: '#4CAF7D', T1: '#4A9EDB', T2: '#E2B989', T3: '#E05252' }

export default function SettingsPage() {
  const { colors: C } = useApp()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('company')
  const [theme, setTheme] = useState({dark:true,primary:'#C4956A',notif:true,lang:'th'})
  const [company, setCompany] = useState({name:'',type:'',tax:'',address:'',size:''})
  const [profile, setProfile] = useState({name:'',email:'',phone:'',role:'', email_notify: true, line_user_id: ''})
  const [pass, setPass] = useState({old:'',new1:'',new2:''})
  const [decisionRights, setDecisionRights] = useState<Record<string, string>>({
    strategy: 'suggest', automation: 'suggest', research: 'auto', thai_market: 'auto', general: 'auto',
  })
  const [twoFA, setTwoFA] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const [loading, setLoading] = useState(true)
  const [dictionary, setDictionary] = useState<any[]>([])
  const [dictLayer, setDictLayer] = useState('')
  const [newMetric, setNewMetric] = useState({
    layer: 'Performance', metric_key: '', name: '', definition: '', formula: '', source: '', owner: '', security_tier: 'T1',
  })
  const showToast = (msg:string, type='success') => setToast({msg,type})

  useEffect(() => {
    api.getSettings().then(res => {
      setCompany({
        name: res.company?.name || '',
        type: res.company?.industry || '',
        tax: res.company?.tax_id || '',
        address: res.company?.address || '',
        size: res.company?.size || '',
      })
      setProfile({
        name: res.profile?.name || '',
        email: res.profile?.email || '',
        phone: res.profile?.phone || '',
        role: res.profile?.role || '',
        email_notify: res.profile?.email_notify !== 0,
        line_user_id: res.profile?.line_user_id || '',
      })
      if (res.settings?.theme) setTheme(res.settings.theme)
    }).catch(() => showToast('โหลด settings ไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const loadDictionary = async (layer?: string) => {
    try {
      const data = await api.getDictionary(layer)
      setDictionary(Array.isArray(data) ? data : [])
    } catch { showToast('โหลด Data Dictionary ไม่สำเร็จ', 'error') }
  }

  useEffect(() => {
    if (activeTab === 'dictionary') loadDictionary(dictLayer || undefined)
  }, [activeTab, dictLayer])

  const addMetric = async () => {
    if (!newMetric.metric_key || !newMetric.name || !newMetric.definition) {
      showToast('กรอก metric_key, name, definition', 'error'); return
    }
    try {
      await api.createDictionaryEntry(newMetric)
      setNewMetric({ layer: 'Performance', metric_key: '', name: '', definition: '', formula: '', source: '', owner: '', security_tier: 'T1' })
      showToast('เพิ่ม KPI ใน Data Dictionary แล้ว')
      loadDictionary(dictLayer || undefined)
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const saveCompany = async () => {
    try {
      await api.updateCompany({ name: company.name, industry: company.type, tax_id: company.tax, address: company.address, size: company.size })
      showToast('บันทึกข้อมูลบริษัทสำเร็จ')
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const saveProfile = async () => {
    try {
      const res = await api.updateProfile({
        name: profile.name,
        phone: profile.phone,
        email_notify: profile.email_notify,
        line_user_id: profile.line_user_id || null,
      })
      setCachedUser(res.user)
      showToast('บันทึกโปรไฟล์สำเร็จ')
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const saveThemePrefs = async () => {
    try {
      await api.updatePreferences({ theme })
      showToast('บันทึก Settings สำเร็จ')
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const savePass = async () => {
    if(!pass.old||!pass.new1){showToast('กรุณากรอกข้อมูลให้ครบ','error');return}
    if(pass.new1!==pass.new2){showToast('รหัสผ่านใหม่ไม่ตรงกัน','error');return}
    try {
      await api.changePassword(pass.old, pass.new1)
      setPass({old:'',new1:'',new2:''})
      showToast('เปลี่ยนรหัสผ่านสำเร็จ')
    } catch (e: any) { showToast(e.message, 'error') }
  }

  const saveDecisionRights = async () => {
    try {
      await api.confirmDecisionRights(decisionRights)
      showToast('บันทึก Decision Rights แล้ว — Onboarding p6 จะ sync อัตโนมัติ')
    } catch (e: any) { showToast(e.message, 'error') }
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{fontSize:18,fontWeight:800,color:C.text}}>Settings</div>
      <Tabs tabs={[
        {id:'company',icon:'home',label:'บริษัท'},
        {id:'dictionary',icon:'grid',label:'L0 Dictionary'},
        {id:'profile',icon:'users',label:'โปรไฟล์'},
        {id:'theme',icon:'eye',label:'ธีม'},
        {id:'security',icon:'lock',label:'ความปลอดภัย'},
      ]} active={activeTab} onChange={setActiveTab}/>

      {activeTab==='company'&&(
        <div style={{maxWidth:600,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:16}}>ข้อมูลบริษัท</div>
            <div style={{display:'flex',gap:16,alignItems:'flex-start',marginBottom:16}}>
              <div onClick={()=>showToast('เปลี่ยน Logo สำเร็จ')} style={{width:72,height:72,borderRadius:16,background:C.bg3,border:`2px dashed ${C.border2}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer',transition:'all 0.2s'}}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.borderColor=C.gold}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.borderColor=C.border2}>
                <Ic n="upload" s={24} c={C.text3}/>
              </div>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:10}}>
                <Field label="ชื่อบริษัท" required><Input value={company.name} onChange={e=>setCompany({...company,name:e.target.value})}/></Field>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <Field label="ประเภทธุรกิจ"><Select value={company.type} onChange={e=>setCompany({...company,type:e.target.value})} options={['เทคโนโลยี','การผลิต','การค้า','บริการ','อสังหา','อื่นๆ']}/></Field>
                  <Field label="ขนาดองค์กร"><Select value={company.size} onChange={e=>setCompany({...company,size:e.target.value})} options={['1-10','10-50','50-100','100-500','500+']}/></Field>
                </div>
                <Field label="เลขประจำตัวผู้เสียภาษี"><Input value={company.tax} onChange={e=>setCompany({...company,tax:e.target.value})}/></Field>
                <Field label="ที่อยู่"><Input value={company.address} onChange={e=>setCompany({...company,address:e.target.value})}/></Field>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button onClick={saveCompany} style={{padding:'10px 24px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {activeTab==='dictionary'&&(
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{background:C.goldLight,border:`1px solid ${C.gold}33`,borderRadius:12,padding:14,fontSize:12,color:C.text2}}>
            <strong style={{color:C.gold}}>L0 Data Taxonomy</strong> — ทุกตัวชี้วัดต้องมีนิยาม · สูตร · แหล่ง · เจ้าของ · Security Tier · AI จะวิเคราะห์ผิดถ้านิยามไม่ชัด
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={()=>setDictLayer('')} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${!dictLayer?C.gold:C.border}`,background:!dictLayer?C.goldLight:'transparent',color:!dictLayer?C.gold:C.text3,cursor:'pointer',fontSize:11,fontWeight:700}}>ทั้งหมด</button>
            {LAYERS.map(l=>(
              <button key={l} onClick={()=>setDictLayer(l)} style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${dictLayer===l?C.gold:C.border}`,background:dictLayer===l?C.goldLight:'transparent',color:dictLayer===l?C.gold:C.text3,cursor:'pointer',fontSize:11,fontWeight:600}}>{l}</button>
            ))}
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
            {dictionary.length===0 ? (
              <div style={{padding:32,textAlign:'center',color:C.text3,fontSize:13}}>ยังไม่มี metric — ใช้ตั้งค่าองค์กร เลือก Tamada template</div>
            ) : dictionary.map(m=>(
              <div key={m.id||m.metric_key} style={{padding:'14px 18px',borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
                  <div>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4}}>
                      <span style={{fontSize:14,fontWeight:700,color:C.text}}>{m.name}</span>
                      <Badge type="gold">{m.layer}</Badge>
                      <span style={{fontSize:10,fontWeight:700,color:TIER_COLORS[m.security_tier]||C.text3}}>{m.security_tier}</span>
                    </div>
                    <div style={{fontSize:11,color:C.text3,fontFamily:'JetBrains Mono,monospace'}}>{m.metric_key}</div>
                  </div>
                  <div style={{fontSize:11,color:C.text2,textAlign:'right'}}>{m.owner} · {m.source}</div>
                </div>
                <div style={{fontSize:12,color:C.text2,marginTop:8}}>{m.definition}</div>
                {m.formula&&<div style={{fontSize:11,color:C.gold,marginTop:4,fontFamily:'JetBrains Mono,monospace'}}>{m.formula}</div>}
              </div>
            ))}
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,maxWidth:640}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>เพิ่ม Metric ใหม่</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Field label="Layer"><Select value={newMetric.layer} onChange={e=>setNewMetric({...newMetric,layer:e.target.value})} options={LAYERS}/></Field>
              <Field label="metric_key"><Input value={newMetric.metric_key} onChange={e=>setNewMetric({...newMetric,metric_key:e.target.value})} placeholder="no_show_rate"/></Field>
              <Field label="ชื่อ KPI"><Input value={newMetric.name} onChange={e=>setNewMetric({...newMetric,name:e.target.value})}/></Field>
              <Field label="Owner"><Input value={newMetric.owner} onChange={e=>setNewMetric({...newMetric,owner:e.target.value})}/></Field>
            </div>
            <Field label="นิยาม" required><Input value={newMetric.definition} onChange={e=>setNewMetric({...newMetric,definition:e.target.value})}/></Field>
            <Field label="สูตร"><Input value={newMetric.formula} onChange={e=>setNewMetric({...newMetric,formula:e.target.value})}/></Field>
            <Field label="แหล่งข้อมูล"><Input value={newMetric.source} onChange={e=>setNewMetric({...newMetric,source:e.target.value})}/></Field>
            <Field label="Security Tier"><Select value={newMetric.security_tier} onChange={e=>setNewMetric({...newMetric,security_tier:e.target.value})} options={['T0','T1','T2','T3']}/></Field>
            <button onClick={addMetric} style={{marginTop:8,padding:'10px 24px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>เพิ่ม Metric</button>
          </div>
        </div>
      )}

      {activeTab==='profile'&&(
        <div style={{maxWidth:500,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:20}}>
            <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:18}}>
              <Avatar name={profile.name} size={64} color={C.gold2}/>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:C.text}}>{profile.name}</div>
                <div style={{fontSize:12,color:C.text3}}>{profile.role} · {profile.email}</div>
                <button onClick={()=>showToast('เปลี่ยนรูปสำเร็จ')} style={{marginTop:6,padding:'5px 12px',borderRadius:8,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text3,cursor:'pointer',fontSize:11,fontWeight:600}}>เปลี่ยนรูปภาพ</button>
              </div>
            </div>
            {(['ชื่อ-นามสกุล','อีเมล','เบอร์โทร','ตำแหน่ง'] as string[]).map((label,i)=>{
              const key = ['name','email','phone','role'][i]
              const readOnly = key === 'email' || key === 'role'
              return <Field key={key} label={label}><Input value={(profile as any)[key]} onChange={readOnly ? undefined : e=>setProfile({...profile,[key]:e.target.value})} style={readOnly ? { opacity: 0.6 } : undefined}/></Field>
            })}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>การแจ้งเตือน</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div><div style={{ fontSize: 13, color: C.text }}>แจ้งทางอีเมล</div><div style={{ fontSize: 11, color: C.text3 }}>Work Log · มอบหมายงาน · Skill Match รายเดือน</div></div>
                <Toggle val={profile.email_notify} onChange={v => setProfile({ ...profile, email_notify: v })}/>
              </div>
              <Field label="LINE User ID (สำหรับ Push)">
                <Input value={profile.line_user_id} onChange={e => setProfile({ ...profile, line_user_id: e.target.value })} placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"/>
              </Field>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
              <button onClick={saveProfile} style={{padding:'10px 24px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {activeTab==='theme'&&(
        <div style={{maxWidth:480,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Dark Mode</div><div style={{fontSize:11,color:C.text3}}>ธีมมืด (แนะนำ)</div></div>
              <Toggle val={theme.dark} onChange={v=>{setTheme({...theme,dark:v});showToast('เปลี่ยนธีมแล้ว');}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>การแจ้งเตือน</div><div style={{fontSize:11,color:C.text3}}>รับ Push Notification</div></div>
              <Toggle val={theme.notif} onChange={v=>setTheme({...theme,notif:v})}/>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:10}}>สีหลัก</div>
              <div style={{display:'flex',gap:10}}>
                {['#C4956A','#3498DB','#6B8E6E','#9B59B6','#E67E22','#E74C3C','#1ABC9C'].map(col=>(
                  <div key={col} onClick={()=>{setTheme({...theme,primary:col});showToast('เปลี่ยนสีแล้ว');}} style={{width:36,height:36,borderRadius:'50%',background:col,cursor:'pointer',border:`3px solid ${theme.primary===col?'#fff':'transparent'}`,transition:'all 0.2s',boxShadow:theme.primary===col?`0 0 12px ${col}88`:''}}/>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:8}}>ภาษา</div>
              <Select value={theme.lang} onChange={e=>{setTheme({...theme,lang:e.target.value});showToast('เปลี่ยนภาษาแล้ว');}} options={[{value:'th',label:'ภาษาไทย'},{value:'en',label:'English'},{value:'zh',label:'中文'}]}/>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button onClick={saveThemePrefs} style={{padding:'10px 24px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {activeTab==='security'&&(
        <div style={{maxWidth:480,display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>เปลี่ยนรหัสผ่าน</div>
            {(['รหัสผ่านปัจจุบัน','รหัสผ่านใหม่','ยืนยันรหัสผ่านใหม่'] as string[]).map((label,i)=>{
              const key = ['old','new1','new2'][i]
              return <Field key={key} label={label}><Input type="password" placeholder="••••••••" value={(pass as any)[key]} onChange={e=>setPass({...pass,[key]:e.target.value})}/></Field>
            })}
            <button onClick={savePass} style={{width:'100%',padding:'10px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,marginTop:4}}>เปลี่ยนรหัสผ่าน</button>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><div style={{fontSize:13,fontWeight:600,color:C.text}}>Two-Factor Authentication</div><div style={{fontSize:11,color:C.text3}}>เพิ่มความปลอดภัยด้วย OTP</div></div>
            <Toggle val={twoFA} onChange={v=>{setTwoFA(v);showToast(`${v?'เปิด':'ปิด'} 2FA แล้ว`);}}/>
          </div>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8}}>AI Decision Rights (Workbook Tab 6)</div>
            <div style={{fontSize:11,color:C.text3,marginBottom:14}}>auto = AI ตัดสินใจได้ · suggest = แนะนำเท่านั้น · human = มนุษย์ตัดสินเสมอ</div>
            {Object.entries({ strategy: 'Strategy (CEO)', automation: 'Automation', research: 'Research', thai_market: 'Department / Thai', general: 'Personal AI' }).map(([key, label]) => (
              <Field key={key} label={label}>
                <Select
                  value={decisionRights[key] || 'auto'}
                  onChange={e => setDecisionRights({ ...decisionRights, [key]: e.target.value })}
                  options={[{ value: 'auto', label: 'auto' }, { value: 'suggest', label: 'suggest' }, { value: 'human', label: 'human' }]}
                />
              </Field>
            ))}
            <button onClick={saveDecisionRights} style={{width:'100%',padding:'10px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,marginTop:8}}>บันทึก Decision Rights</button>
          </div>
          {(['จัดการ Sessions','API Keys','Activity Log'] as string[]).map((label,i)=>(
            <div key={label} onClick={()=> i===2 ? router.push('/dashboard/audit') : showToast(`เปิด ${label}`)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'all 0.2s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.07)';(e.currentTarget as HTMLDivElement).style.borderColor=C.gold+'44';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background=C.surface;(e.currentTarget as HTMLDivElement).style.borderColor=C.border;}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${C.gold}22`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic n={['eye','cpu','zap'][i]} s={18} c={C.gold}/></div>
              <span style={{flex:1,fontSize:13,fontWeight:600,color:C.text}}>{label}</span>
              <Ic n="chevronR" s={16} c={C.text3}/>
            </div>
          ))}
        </div>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
