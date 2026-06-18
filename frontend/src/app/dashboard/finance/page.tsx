'use client'
import { useState } from 'react'
import { C, Ic, StatCard, MiniChart, Badge, Field, Input, Select, Tabs, ProgressBar, Modal, EmptyState, Toast } from '@/lib/ui'

const INIT_TRANSACTIONS = [
  {id:1,desc:'ซื้อวัสดุสำนักงาน',amount:4280,cat:'ค่าใช้จ่าย',date:'05/05',status:'approved',type:'expense'},
  {id:2,desc:'ค่าโฆษณา Facebook',amount:15000,cat:'Marketing',date:'04/05',status:'pending',type:'expense'},
  {id:3,desc:'ซื้ออุปกรณ์ IT',amount:32500,cat:'ทรัพย์สิน',date:'03/05',status:'approved',type:'expense'},
  {id:4,desc:'รายได้ Project ABC',amount:150000,cat:'รายได้',date:'02/05',status:'approved',type:'income'},
  {id:5,desc:'ค่าเช่าสำนักงาน',amount:85000,cat:'ค่าใช้จ่าย',date:'01/05',status:'approved',type:'expense'},
  {id:6,desc:'รายได้ Project XYZ',amount:280000,cat:'รายได้',date:'30/04',status:'approved',type:'income'},
]

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('upload')
  const [ocrState, setOcrState] = useState<'idle'|'scanning'|'done'>('idle')
  const [ocrData, setOcrData] = useState({name:'',date:'',total:'',tax:'',cat:'ค่าใช้จ่าย'})
  const [transactions, setTransactions] = useState(INIT_TRANSACTIONS)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({desc:'',amount:'',cat:'ค่าใช้จ่าย',type:'expense',date:''})
  const [filter, setFilter] = useState('all')
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

  const startOcr = () => {
    setOcrState('scanning'); setProgress(0)
    const iv = setInterval(()=>setProgress(p=>{
      if(p>=100){
        clearInterval(iv)
        setOcrState('done')
        setOcrData({name:'ซีพี เฟรช มาร์เก็ต',date:'05/05/2026',total:'4,280.00',tax:'299.60',cat:'ค่าใช้จ่าย'})
        return 100
      }
      return p+8
    }),80)
  }

  const saveOcr = () => {
    const n = {id:Date.now(),desc:`ซื้อที่ ${ocrData.name}`,amount:parseInt(ocrData.total.replace(/,/g,'')),cat:ocrData.cat,date:ocrData.date.slice(0,5),status:'approved',type:'expense'}
    setTransactions(t=>[n,...t])
    setOcrState('idle')
    setOcrData({name:'',date:'',total:'',tax:'',cat:'ค่าใช้จ่าย'})
    showToast('บันทึกรายการสำเร็จ')
    setActiveTab('transactions')
  }

  const approve = (id:number) => { setTransactions(ts=>ts.map(t=>t.id===id?{...t,status:'approved'}:t)); showToast('อนุมัติแล้ว') }
  const reject  = (id:number) => { setTransactions(ts=>ts.filter(t=>t.id!==id)); showToast('ปฏิเสธและลบแล้ว') }

  const addTx = () => {
    if(!addForm.desc||!addForm.amount){showToast('กรุณากรอกข้อมูล','error');return}
    setTransactions(ts=>[{id:Date.now(),...addForm,amount:parseInt(addForm.amount),status:'pending',date:addForm.date||new Date().toLocaleDateString('th-TH')},...ts])
    setShowAdd(false)
    setAddForm({desc:'',amount:'',cat:'ค่าใช้จ่าย',type:'expense',date:''})
    showToast('เพิ่มรายการแล้ว')
  }

  const filtered = filter==='all' ? transactions : transactions.filter(t=>t.status===filter||t.type===filter)
  const income   = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0)
  const expense  = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0)
  const pending  = transactions.filter(t=>t.status==='pending').length

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text}}>Finance Center</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>บัญชี · OCR ใบเสร็จ · รายงาน</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>showToast('Export PDF สำเร็จ')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border2}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}>
            <Ic n="download" s={13}/>Export PDF
          </button>
          <button onClick={()=>setShowAdd(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,boxShadow:`0 4px 14px ${C.gold}44`}}>
            <Ic n="plus" s={13}/>รายการใหม่
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon="trending" label="รายได้เดือนนี้" value={`฿${(income/1000).toFixed(0)}K`} trend={12} color={C.green} chart={[40,55,45,60,58,65,70,68,80]}/>
        <StatCard icon="dollar"   label="ค่าใช้จ่าย"    value={`฿${(expense/1000).toFixed(0)}K`} trend={-3} color={C.red}   chart={[30,25,35,28,32,25,30,22,28]}/>
        <StatCard icon="zap"      label="กำไรสุทธิ"     value={`฿${((income-expense)/1000).toFixed(0)}K`} trend={18} color={C.gold}/>
        <StatCard icon="file"     label="รอ Approve"    value={pending} sub="รายการ" color={C.blue}/>
      </div>

      <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
        {/* Main Panel */}
        <div style={{flex:2,minWidth:300,display:'flex',flexDirection:'column',gap:12}}>
          <Tabs
            tabs={[{id:'upload',icon:'upload',label:'OCR ใบเสร็จ'},{id:'transactions',icon:'file',label:'รายการ'},{id:'reports',icon:'trending',label:'รายงาน'}]}
            active={activeTab}
            onChange={setActiveTab}
          />

          {/* ── OCR Tab ── */}
          {activeTab==='upload'&&(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {ocrState==='idle'&&(
                <div onClick={startOcr}
                  style={{minHeight:140,border:`2px dashed ${C.border2}`,borderRadius:14,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,cursor:'pointer',transition:'all 0.2s',padding:24}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.gold;(e.currentTarget as HTMLDivElement).style.background=`${C.gold}08`;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border2;(e.currentTarget as HTMLDivElement).style.background='transparent';}}>
                  <Ic n="upload" s={36} c={C.text3}/>
                  <div style={{fontSize:14,fontWeight:600,color:C.text2}}>ลากไฟล์มาวางที่นี่</div>
                  <div style={{fontSize:12,color:C.text3}}>PDF, JPG, PNG, Word — Max 50MB</div>
                  <button style={{padding:'8px 20px',borderRadius:10,background:`${C.gold}22`,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:12,fontWeight:600}}>เลือกไฟล์</button>
                </div>
              )}

              {ocrState==='scanning'&&(
                <div style={{padding:32,display:'flex',flexDirection:'column',alignItems:'center',gap:16,background:C.surface,borderRadius:14,border:`1px solid ${C.border}`}}>
                  <div style={{animation:'spin 1s linear infinite'}}><Ic n="cpu" s={36} c={C.gold}/></div>
                  <div style={{fontSize:14,fontWeight:600,color:C.text}}>AI กำลังอ่านใบเสร็จ...</div>
                  <div style={{width:'100%',maxWidth:300}}>
                    <ProgressBar pct={progress} color={C.gold} height={8}/>
                    <div style={{fontSize:11,color:C.text3,textAlign:'center',marginTop:6}}>{progress}%</div>
                  </div>
                  {['ถอดข้อความ','แยกหมวดหมู่','ตรวจสอบ'].map((s,i)=>(
                    <div key={s} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:progress>i*33?C.gold:C.text3}}>
                      {progress>i*33 ? <Ic n="check" s={13} c={C.gold}/> : <div style={{width:13,height:13}}/>}
                      {s}
                    </div>
                  ))}
                </div>
              )}

              {ocrState==='done'&&(
                <div style={{background:C.surface,border:`1px solid ${C.gold}44`,borderRadius:14,padding:18,animation:'fadeIn 0.3s ease'}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.gold,marginBottom:14,display:'flex',alignItems:'center',gap:6}}>
                    <Ic n="check" s={16} c={C.gold}/>ข้อมูลที่แยกได้
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
                    {([['ชื่อร้าน','name'],['วันที่','date'],['ยอดรวม','total'],['ภาษี 7%','tax']] as [string,string][]).map(([label,key])=>(
                      <div key={key} style={{display:'flex',gap:12,alignItems:'center'}}>
                        <span style={{fontSize:12,color:C.text3,width:80,flexShrink:0}}>{label}</span>
                        <input value={(ocrData as any)[key]} onChange={e=>setOcrData({...ocrData,[key]:e.target.value})}
                          style={{flex:1,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border2}`,borderRadius:8,padding:'7px 12px',color:C.text,fontFamily:'Montserrat',fontSize:12,outline:'none'}}/>
                      </div>
                    ))}
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <span style={{fontSize:12,color:C.text3,width:80,flexShrink:0}}>หมวดหมู่</span>
                      <div style={{flex:1}}>
                        <Select value={ocrData.cat} onChange={e=>setOcrData({...ocrData,cat:e.target.value})} options={['ค่าใช้จ่าย','Marketing','IT & อุปกรณ์','ทรัพย์สิน','อื่นๆ']}/>
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={saveOcr} style={{flex:1,padding:'10px',borderRadius:10,background:`linear-gradient(135deg,${C.green},${C.green}99)`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                      <Ic n="check" s={14}/>บันทึก
                    </button>
                    <button onClick={()=>setOcrState('idle')} style={{flex:1,padding:'10px',borderRadius:10,background:C.redLight,border:`1px solid ${C.red}44`,color:C.red,cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                      <Ic n="x" s={14}/>ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Transactions Tab ── */}
          {activeTab==='transactions'&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {(['all','pending','approved','income','expense'] as string[]).map(f=>(
                  <button key={f} onClick={()=>setFilter(f)}
                    style={{padding:'5px 12px',borderRadius:99,fontSize:11,fontWeight:500,cursor:'pointer',background:filter===f?C.goldLight:'transparent',color:filter===f?C.gold:C.text3,border:`1px solid ${filter===f?C.gold+'44':C.border}`,transition:'all 0.15s'}}>
                    {f==='all'?'ทั้งหมด':f==='pending'?'รอ':f==='approved'?'อนุมัติ':f==='income'?'รายได้':'รายจ่าย'}
                  </button>
                ))}
              </div>

              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',padding:'10px 16px',borderBottom:`1px solid ${C.border}`,gap:12}}>
                  {['รายการ','จำนวน','หมวด','สถานะ',''].map((h,i)=>(
                    <div key={i} style={{fontSize:11,fontWeight:700,color:C.text3}}>{h}</div>
                  ))}
                </div>
                {filtered.map(t=>(
                  <div key={t.id}
                    style={{display:'grid',gridTemplateColumns:'1fr auto auto auto auto',padding:'12px 16px',borderBottom:`1px solid ${C.border}`,gap:12,alignItems:'center',transition:'background 0.15s',cursor:'pointer'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <div>
                      <div style={{fontSize:12,color:C.text,fontWeight:500}}>{t.desc}</div>
                      <div style={{fontSize:11,color:C.text3}}>{t.date}</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:t.type==='income'?C.green:C.red,textAlign:'right'}}>
                      {t.type==='income'?'+':'-'}฿{t.amount.toLocaleString()}
                    </div>
                    <Badge type="gold">{t.cat}</Badge>
                    <Badge type={t.status==='approved'?'green':'blue'}>
                      {t.status==='approved'?'✓ อนุมัติ':'⏳ รอ'}
                    </Badge>
                    {t.status==='pending' ? (
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>approve(t.id)} style={{padding:'4px 8px',borderRadius:6,background:C.greenLight,border:`1px solid ${C.green}44`,color:C.green,cursor:'pointer',fontSize:10,fontWeight:600}}>✓</button>
                        <button onClick={()=>reject(t.id)}  style={{padding:'4px 8px',borderRadius:6,background:C.redLight, border:`1px solid ${C.red}44`,  color:C.red,  cursor:'pointer',fontSize:10,fontWeight:600}}>✕</button>
                      </div>
                    ) : <div/>}
                  </div>
                ))}
                {filtered.length===0&&<EmptyState icon="file" title="ไม่มีรายการ" sub="ลองเปลี่ยน filter ด้านบน"/>}
              </div>
            </div>
          )}

          {/* ── Reports Tab ── */}
          {activeTab==='reports'&&(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:18}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:12}}>รายได้ vs ค่าใช้จ่าย (6 เดือน)</div>
                <MiniChart data={[40,55,45,60,58,70,65,80,72,85,78,90]} color={C.gold} h={90}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:14}}>
                  {([
                    ['รายได้รวม',`฿${(income/1000).toFixed(0)}K`,C.green],
                    ['ค่าใช้จ่าย',`฿${(expense/1000).toFixed(0)}K`,C.red],
                    ['กำไรสุทธิ',`฿${((income-expense)/1000).toFixed(0)}K`,C.gold],
                    ['ROI',`${Math.round((income-expense)/income*100)}%`,C.blue],
                  ] as [string,string,string][]).map(([l,v,col])=>(
                    <div key={l} style={{background:C.bg3,borderRadius:10,padding:'12px 14px'}}>
                      <div style={{fontSize:11,color:C.text3}}>{l}</div>
                      <div style={{fontSize:18,fontWeight:800,color:col,marginTop:2}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {['PDF Report','Excel Export','Send to Accountant'].map(a=>(
                  <button key={a} onClick={()=>showToast(`${a} สำเร็จ`)} style={{flex:1,padding:'10px 14px',borderRadius:10,background:C.surface,border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    <Ic n="download" s={13}/>{a}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{width:220,display:'flex',flexDirection:'column',gap:12,flexShrink:0}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:16}}>
            <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:12}}>ค่าใช้จ่ายตามหมวด</div>
            {([['ค่าใช้จ่ายทั่วไป',35,C.gold],['Marketing',28,C.blue],['IT',20,C.purple],['อื่นๆ',17,C.text3]] as [string,number,string][]).map(([l,p,col])=>(
              <div key={l} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:11,color:C.text2}}>{l}</span>
                  <span style={{fontSize:11,fontWeight:700,color:col}}>{p}%</span>
                </div>
                <ProgressBar pct={p} color={col}/>
              </div>
            ))}
          </div>

          <div style={{background:`${C.gold}10`,border:`1px solid ${C.gold}30`,borderRadius:14,padding:14}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
              <Ic n="zap" s={13} c={C.gold}/>
              <span style={{fontSize:12,fontWeight:700,color:C.gold}}>AI แนะนำ</span>
            </div>
            <p style={{fontSize:11,color:C.text2,lineHeight:1.7}}>ค่าใช้จ่าย Marketing เพิ่ม 15% ควรตรวจสอบ ROI ก่อนอนุมัติงบ Q2</p>
          </div>

          {pending>0&&(
            <div style={{background:C.blueLight,border:`1px solid ${C.blue}44`,borderRadius:14,padding:14}}>
              <div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:4}}>⏳ รอ Approve</div>
              <div style={{fontSize:22,fontWeight:800,color:C.blue}}>{pending}</div>
              <div style={{fontSize:11,color:C.text3}}>รายการรอการอนุมัติ</div>
              <button onClick={()=>setActiveTab('transactions')}
                style={{marginTop:8,width:'100%',padding:'6px',borderRadius:8,background:C.blueLight,border:`1px solid ${C.blue}44`,color:C.blue,cursor:'pointer',fontSize:11,fontWeight:600}}>
                ดูทั้งหมด →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAdd&&(
        <Modal title="เพิ่มรายการใหม่" onClose={()=>setShowAdd(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <Field label="ประเภท">
              <div style={{display:'flex',gap:8}}>
                {(['expense','income'] as string[]).map(t=>(
                  <button key={t} onClick={()=>setAddForm({...addForm,type:t})}
                    style={{flex:1,padding:'10px',borderRadius:10,background:addForm.type===t?t==='expense'?C.redLight:C.greenLight:'rgba(255,255,255,0.04)',border:`1px solid ${addForm.type===t?t==='expense'?C.red:C.green:C.border}`,color:addForm.type===t?t==='expense'?C.red:C.green:C.text3,cursor:'pointer',fontSize:12,fontWeight:600}}>
                    {t==='expense'?'💸 รายจ่าย':'💰 รายได้'}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="รายการ" required>
              <Input placeholder="ค่าใช้จ่าย..." value={addForm.desc} onChange={e=>setAddForm({...addForm,desc:e.target.value})}/>
            </Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="จำนวนเงิน (฿)" required>
                <Input type="number" placeholder="0" value={addForm.amount} onChange={e=>setAddForm({...addForm,amount:e.target.value})}/>
              </Field>
              <Field label="วันที่">
                <Input type="date" value={addForm.date} onChange={e=>setAddForm({...addForm,date:e.target.value})}/>
              </Field>
            </div>
            <Field label="หมวดหมู่">
              <Select value={addForm.cat} onChange={e=>setAddForm({...addForm,cat:e.target.value})} options={['ค่าใช้จ่าย','Marketing','IT & อุปกรณ์','ทรัพย์สิน','รายได้','อื่นๆ']}/>
            </Field>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:8,borderTop:`1px solid ${C.border}`}}>
              <button onClick={()=>setShowAdd(false)} style={{padding:'10px 20px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:13,fontWeight:600}}>ยกเลิก</button>
              <button onClick={addTx} style={{padding:'10px 20px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>เพิ่มรายการ</button>
            </div>
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
