'use client'
import { useState } from 'react'
import { C, Ic, Avatar, Badge, StatCard, Modal, Field, Input, Select, Tabs, ProgressBar, Toast } from '@/lib/ui'

const INIT_EMPLOYEES = [
  {id:1,name:'สมชาย จันทร์',role:'CEO',dept:'บริหาร',status:'active',color:'#6B8E6E',phone:'081-234-5678',email:'somchai@abc.co.th',start:'2018-01-01',leave:15,leaveUsed:0,salary:'฿120,000'},
  {id:2,name:'วิไล กุมาร',role:'HR Manager',dept:'HR',status:'active',color:'#8B6F47',phone:'082-345-6789',email:'wilai@abc.co.th',start:'2019-03-15',leave:15,leaveUsed:2,salary:'฿65,000'},
  {id:3,name:'อาภา ปรีดา',role:'Senior Developer',dept:'IT',status:'active',color:'#C4956A',phone:'083-456-7890',email:'arpa@abc.co.th',start:'2020-06-01',leave:15,leaveUsed:0,salary:'฿75,000'},
  {id:4,name:'ธนา นิลกาญจน์',role:'UI/UX Designer',dept:'Creative',status:'leave',color:'#3498DB',phone:'084-567-8901',email:'thana@abc.co.th',start:'2021-01-10',leave:15,leaveUsed:5,salary:'฿55,000'},
  {id:5,name:'มาลี ศรีสุข',role:'Sales Manager',dept:'Sales',status:'active',color:'#9B59B6',phone:'085-678-9012',email:'mali@abc.co.th',start:'2019-08-20',leave:15,leaveUsed:1,salary:'฿70,000'},
  {id:6,name:'ประภา กาญจนา',role:'CFO',dept:'Finance',status:'active',color:'#E67E22',phone:'086-789-0123',email:'prapa@abc.co.th',start:'2017-05-01',leave:15,leaveUsed:0,salary:'฿110,000'},
]

export default function PeoplePage() {
  const [employees, setEmployees] = useState(INIT_EMPLOYEES)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [showLeave, setShowLeave] = useState<any>(null)
  const [newEmp, setNewEmp] = useState({name:'',role:'',dept:'HR',email:'',phone:'',salary:''})
  const [leaveForm, setLeaveForm] = useState({type:'ลาพักร้อน',days:1,reason:'',startDate:''})
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const filtered = employees.filter(e=>{
    const m = e.name.includes(search)||e.role.includes(search)||e.dept.includes(search)
    if(activeTab==='all') return m
    if(activeTab==='active') return m&&e.status==='active'
    return m&&e.status==='leave'
  })

  const addEmployee = () => {
    if(!newEmp.name||!newEmp.role){showToast('กรุณากรอกข้อมูลให้ครบ','error');return}
    const colors=['#6B8E6E','#8B6F47','#C4956A','#3498DB','#9B59B6','#E67E22','#1ABC9C','#E74C3C']
    setEmployees(e=>[...e,{id:Date.now(),...newEmp,status:'active',color:colors[e.length%colors.length],leave:15,leaveUsed:0,start:new Date().toISOString().slice(0,10)}])
    setNewEmp({name:'',role:'',dept:'HR',email:'',phone:'',salary:''})
    setShowModal(false);showToast('เพิ่มพนักงานสำเร็จ')
  }
  const deleteEmployee = (id:number) => {setEmployees(e=>e.filter(x=>x.id!==id));setShowDetail(null);showToast('ลบพนักงานแล้ว')}
  const requestLeave = () => {
    setEmployees(e=>e.map(x=>x.id===showLeave.id?{...x,leaveUsed:x.leaveUsed+(parseInt(String(leaveForm.days))||0)}:x))
    setShowLeave(null);showToast('ส่งคำขอลาแล้ว')
  }
  const depts = [...new Set(employees.map(e=>e.dept))]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div><div style={{fontSize:18,fontWeight:800,color:C.text}}>HR & People Hub</div><div style={{fontSize:12,color:C.text3,marginTop:2}}>จัดการพนักงาน {employees.length} คน</div></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>showToast('Export เสร็จแล้ว')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border2}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}><Ic n="download" s={13}/>Export</button>
          <button onClick={()=>setShowModal(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,boxShadow:`0 4px 14px ${C.gold}44`}}><Ic n="plus" s={13}/>เพิ่มพนักงาน</button>
        </div>
      </div>

      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon="users" label="ทั้งหมด" value={employees.length} color={C.green}/>
        <StatCard icon="calendar" label="ลาวันนี้" value={employees.filter(e=>e.status==='leave').length} color={C.gold}/>
        <StatCard icon="award" label="แผนก" value={depts.length} color={C.blue}/>
        <StatCard icon="trending" label="พนักงานใหม่" value="5" sub="เดือนนี้" color={C.purple}/>
      </div>

      <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:1,minWidth:200}}>
          <Ic n="search" s={14} c={C.text3} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}/>
          <input placeholder="ค้นหาชื่อ / ตำแหน่ง / แผนก..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,borderRadius:10,padding:'9px 14px 9px 36px',color:C.text,fontFamily:'Montserrat',fontSize:12,outline:'none',width:'100%'}}/>
        </div>
        <Tabs tabs={[{id:'all',label:'ทั้งหมด'},{id:'active',label:'Active'},{id:'leave',label:'ลา'}]} active={activeTab} onChange={setActiveTab}/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
        {filtered.map((emp,i)=>(
          <div key={emp.id} onClick={()=>setShowDetail(emp)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16,cursor:'pointer',transition:'all 0.2s',animation:`fadeIn 0.3s ease ${i*0.04}s both`}}
            onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.07)';(e.currentTarget as HTMLDivElement).style.borderColor=emp.color+'44';(e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background=C.surface;(e.currentTarget as HTMLDivElement).style.borderColor=C.border;(e.currentTarget as HTMLDivElement).style.transform='';}}>
            <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:12}}>
              <Avatar name={emp.name} size={44} color={emp.color}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{emp.name}</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>{emp.role}</div>
                <Badge type={emp.dept==='IT'?'blue':emp.dept==='Finance'?'gold':emp.dept==='Sales'?'purple':'green'}>{emp.dept}</Badge>
              </div>
              <div style={{width:8,height:8,borderRadius:'50%',background:emp.status==='active'?C.green:C.red,marginTop:4}}/>
            </div>
            <div style={{marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:10,color:C.text3}}>วันลาคงเหลือ</span>
                <span style={{fontSize:10,fontWeight:700,color:C.gold}}>{emp.leave-emp.leaveUsed}/{emp.leave} วัน</span>
              </div>
              <ProgressBar pct={((emp.leave-emp.leaveUsed)/emp.leave)*100} color={C.gold}/>
            </div>
            <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
              <button onClick={()=>setShowLeave(emp)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'6px',borderRadius:8,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:11}}>
                <Ic n="calendar" s={11}/>ขอลา
              </button>
              <button onClick={()=>setShowDetail(emp)} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:4,padding:'6px',borderRadius:8,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:11}}>
                <Ic n="eye" s={11}/>ดูโปรไฟล์
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal&&(
        <Modal title="เพิ่มพนักงานใหม่" onClose={()=>setShowModal(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="ชื่อ-นามสกุล" required><Input placeholder="สมชาย จันทร์" value={newEmp.name} onChange={e=>setNewEmp({...newEmp,name:e.target.value})}/></Field>
              <Field label="ตำแหน่ง" required><Input placeholder="Developer" value={newEmp.role} onChange={e=>setNewEmp({...newEmp,role:e.target.value})}/></Field>
              <Field label="แผนก"><Select value={newEmp.dept} onChange={e=>setNewEmp({...newEmp,dept:e.target.value})} options={['HR','Finance','IT','Sales','Marketing','Creative','บริหาร']}/></Field>
              <Field label="เงินเดือน"><Input placeholder="฿50,000" value={newEmp.salary} onChange={e=>setNewEmp({...newEmp,salary:e.target.value})}/></Field>
              <Field label="อีเมล"><Input placeholder="name@company.com" type="email" value={newEmp.email} onChange={e=>setNewEmp({...newEmp,email:e.target.value})}/></Field>
              <Field label="เบอร์โทร"><Input placeholder="08x-xxx-xxxx" value={newEmp.phone} onChange={e=>setNewEmp({...newEmp,phone:e.target.value})}/></Field>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:8,borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setShowModal(false)} style={{padding:'10px 20px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:13,fontWeight:600}}>ยกเลิก</button>
              <button onClick={addEmployee} style={{padding:'10px 20px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>เพิ่มพนักงาน</button>
            </div>
          </div>
        </Modal>
      )}

      {showDetail&&(
        <Modal title="ข้อมูลพนักงาน" onClose={()=>setShowDetail(null)} width={520}>
          <div style={{display:'flex',gap:16,marginBottom:20,alignItems:'flex-start'}}>
            <Avatar name={showDetail.name} size={64} color={showDetail.color}/>
            <div style={{flex:1}}>
              <div style={{fontSize:18,fontWeight:800,color:C.text}}>{showDetail.name}</div>
              <div style={{fontSize:13,color:C.text3}}>{showDetail.role} · {showDetail.dept}</div>
              <div style={{marginTop:6,display:'flex',gap:6}}>
                <Badge type={showDetail.status==='active'?'green':'red'}>{showDetail.status==='active'?'Active':'ลา'}</Badge>
                <Badge type="gold">เริ่มงาน {showDetail.start}</Badge>
              </div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {([['อีเมล',showDetail.email,'mail'],['โทร',showDetail.phone,'phone'],['เงินเดือน',showDetail.salary,'dollar'],['วันลาคงเหลือ',`${showDetail.leave-showDetail.leaveUsed}/${showDetail.leave} วัน`,'calendar']] as [string,string,string][]).map(([l,v,icon])=>(
              <div key={l} style={{background:C.surface,borderRadius:10,padding:'10px 12px',display:'flex',gap:8,alignItems:'center'}}>
                <Ic n={icon} s={14} c={C.gold}/>
                <div><div style={{fontSize:10,color:C.text3}}>{l}</div><div style={{fontSize:12,fontWeight:600,color:C.text}}>{v}</div></div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>{setShowLeave(showDetail);setShowDetail(null);}} style={{flex:1,padding:'10px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Ic n="calendar" s={13}/>ขอลา</button>
            <button onClick={()=>deleteEmployee(showDetail.id)} style={{flex:1,padding:'10px',borderRadius:10,background:C.redLight,border:`1px solid ${C.red}44`,color:C.red,cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><Ic n="trash" s={13}/>ลบ</button>
          </div>
        </Modal>
      )}

      {showLeave&&(
        <Modal title={`ขอลา — ${showLeave.name}`} onClose={()=>setShowLeave(null)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Field label="ประเภทการลา"><Select value={leaveForm.type} onChange={e=>setLeaveForm({...leaveForm,type:e.target.value})} options={['ลาพักร้อน','ลาป่วย','ลากิจ','ลาคลอด']}/></Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="วันที่เริ่มลา"><Input type="date" value={leaveForm.startDate} onChange={e=>setLeaveForm({...leaveForm,startDate:e.target.value})}/></Field>
              <Field label="จำนวนวัน"><Input type="number" placeholder="1" value={leaveForm.days} onChange={e=>setLeaveForm({...leaveForm,days:parseInt(e.target.value)||1})}/></Field>
            </div>
            <Field label="เหตุผล">
              <textarea value={leaveForm.reason} onChange={e=>setLeaveForm({...leaveForm,reason:e.target.value})} placeholder="ระบุเหตุผล..." style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border2}`,borderRadius:10,padding:'10px 14px',color:C.text,fontFamily:'Montserrat',fontSize:13,outline:'none',width:'100%',minHeight:80,resize:'vertical'}}/>
            </Field>
            <div style={{background:C.goldLight,border:`1px solid ${C.gold}44`,borderRadius:10,padding:'10px 14px'}}>
              <span style={{fontSize:12,color:C.gold}}>วันลาคงเหลือ: <strong>{showLeave.leave-showLeave.leaveUsed} วัน</strong></span>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>setShowLeave(null)} style={{padding:'10px 20px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:13,fontWeight:600}}>ยกเลิก</button>
              <button onClick={requestLeave} style={{padding:'10px 20px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>ส่งคำขอลา</button>
            </div>
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
