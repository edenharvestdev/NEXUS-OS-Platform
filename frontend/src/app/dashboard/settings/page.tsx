'use client'
import { useState } from 'react'
import { C, Ic, Avatar, Toggle, Tabs, Field, Input, Select, Toast } from '@/lib/ui'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [modules, setModules] = useState({people:true,finance:true,sales:true,marketing:true,meeting:true,gpt:true,guardian:true,ai:true})
  const [theme, setTheme] = useState({dark:true,primary:'#C4956A',notif:true,lang:'th'})
  const [company, setCompany] = useState({name:'บริษัท ABC จำกัด',type:'เทคโนโลยี',tax:'0105560123456',address:'123 ถ.สีลม กทม.',size:'100-500'})
  const [profile, setProfile] = useState({name:'สมชาย จันทร์',email:'somchai@abc.co.th',phone:'081-234-5678',role:'Administrator'})
  const [pass, setPass] = useState({old:'',new1:'',new2:''})
  const [twoFA, setTwoFA] = useState(false)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const modLabels: Record<string,string> = {people:'HR & People',finance:'Finance Center',sales:'Sales Copilot',marketing:'Marketing Studio',meeting:'Meeting Brain',gpt:'Company GPT',guardian:'Doc Guardian',ai:'AI Control Tower'}
  const modIcons: Record<string,string> = {people:'users',finance:'dollar',sales:'target',marketing:'mail',meeting:'video',gpt:'msg',guardian:'shield',ai:'cpu'}
  const modColors: Record<string,string> = {people:C.green,finance:C.gold,sales:C.blue,marketing:C.purple,meeting:C.orange,gpt:C.gold,guardian:C.red,ai:C.teal}

  const savePass = () => {
    if(!pass.old||!pass.new1){showToast('กรุณากรอกข้อมูลให้ครบ','error');return}
    if(pass.new1!==pass.new2){showToast('รหัสผ่านใหม่ไม่ตรงกัน','error');return}
    setPass({old:'',new1:'',new2:''}); showToast('เปลี่ยนรหัสผ่านสำเร็จ')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{fontSize:18,fontWeight:800,color:C.text}}>Settings</div>
      <Tabs tabs={[{id:'company',icon:'home',label:'บริษัท'},{id:'profile',icon:'users',label:'โปรไฟล์'},{id:'modules',icon:'grid',label:'Modules'},{id:'theme',icon:'eye',label:'ธีม'},{id:'security',icon:'lock',label:'ความปลอดภัย'}]} active={activeTab} onChange={setActiveTab}/>

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
              <button onClick={()=>showToast('บันทึกข้อมูลบริษัทสำเร็จ')} style={{padding:'10px 24px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>บันทึก</button>
            </div>
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
              return <Field key={key} label={label}><Input value={(profile as any)[key]} onChange={e=>setProfile({...profile,[key]:e.target.value})}/></Field>
            })}
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
              <button onClick={()=>showToast('บันทึกโปรไฟล์สำเร็จ')} style={{padding:'10px 24px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {activeTab==='modules'&&(
        <div style={{maxWidth:520,display:'flex',flexDirection:'column',gap:8}}>
          {Object.entries(modules).map(([k,v])=>(
            <div key={k} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,transition:'all 0.2s'}}>
              <div style={{width:38,height:38,borderRadius:10,background:v?`${modColors[k]}22`:'rgba(255,255,255,0.04)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Ic n={modIcons[k]} s={18} c={v?modColors[k]:C.text3}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:v?C.text:C.text3}}>{modLabels[k]}</div>
                <div style={{fontSize:10,color:C.text3,marginTop:1}}>{v?'เปิดใช้งาน':'ปิด'}</div>
              </div>
              <Toggle val={v} onChange={nv=>{setModules(m=>({...m,[k]:nv}));showToast(`${nv?'เปิด':'ปิด'} ${modLabels[k]} แล้ว`);}}/>
            </div>
          ))}
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
              <button onClick={()=>showToast('บันทึก Settings สำเร็จ')} style={{padding:'10px 24px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>บันทึก</button>
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
          {(['จัดการ Sessions','API Keys','Activity Log'] as string[]).map((label,i)=>(
            <div key={label} onClick={()=>showToast(`เปิด ${label}`)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',transition:'all 0.2s'}}
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
