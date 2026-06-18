'use client'
import { useState, useRef } from 'react'
import { Ic, StatCard, MiniChart, Badge, Field, Input, Select, Tabs, ProgressBar, Modal, EmptyState, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { useAppData } from '@/lib/data'
import { api } from '@/lib/api'

export default function FinancePage() {
  const { colors: C } = useApp()
  const { transactions, setTransactions, refresh } = useAppData()
  const [activeTab, setActiveTab] = useState('upload')
  const [ocrState, setOcrState] = useState<'idle'|'scanning'|'done'>('idle')
  const [ocrData, setOcrData] = useState({name:'',date:'',total:'',tax:'',cat:'ค่าใช้จ่าย'})
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({desc:'',amount:'',cat:'ค่าใช้จ่าย',type:'expense',date:''})
  const [filter, setFilter] = useState('all')
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<{msg:string,type:string}|null>(null)
  const showToast = (msg:string, type='success') => setToast({msg,type})

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

    setOcrState('scanning'); setProgress(0)
    const iv = setInterval(()=>setProgress(p=>p<90?p+5:p), 200)

    try {
      const base64 = await toBase64(file);
      const data = await api.ocrReceipt(base64, file.type || 'image/jpeg');
      
      clearInterval(iv);
      setProgress(100);

      const parsed = data.result || {}
      setOcrData({
        name:  parsed.name  || '',
        date:  parsed.date  || '',
        total: String(parsed.total || ''),
        tax:   String(parsed.tax   || '0'),
        cat:   parsed.cat   || 'ค่าใช้จ่าย',
      })
      setTimeout(()=>setOcrState('done'), 500);
    } catch(err: any) {
      clearInterval(iv);
      setOcrState('idle');
      showToast(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ AI', 'error');
    }
  }

  const saveOcr = async () => {
    const amount = parseFloat(ocrData.total.replace(/,/g,'').replace(/[^0-9.]/g,'')) || 0
    if (!ocrData.name && !amount) { showToast('ข้อมูลไม่ครบ กรุณาแก้ไข','error'); return }
    
    try {
      const res = await api.createTransaction({
        desc: `ซื้อที่ ${ocrData.name || 'ร้านค้า'}`,
        amount,
        cat: ocrData.cat,
        date: ocrData.date || new Date().toISOString().slice(0, 10),
        type: 'expense',
        status: 'pending'
      });
      
      setTransactions(t => [res.data, ...t])
      setOcrState('idle')
      setOcrData({name:'',date:'',total:'',tax:'',cat:'ค่าใช้จ่าย'})
      showToast('บันทึกรายการจากใบเสร็จสำเร็จ')
      setActiveTab('transactions')
    } catch (err: any) {
      showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
    }
  }

  const approve = async (id: string) => {
    try {
      await api.updateTransactionStatus(id, 'approved');
      setTransactions(ts => ts.map(t => t.id === id ? { ...t, status: 'approved' } : t));
      showToast('อนุมัติรายการแล้ว');
    } catch (err: any) {
      showToast(err.message || 'อัปเดตไม่สำเร็จ', 'error');
    }
  }

  const removeTx = async (id: string) => {
    try {
      await api.deleteTransaction(id);
      setTransactions(ts => ts.filter(t => t.id !== id));
      showToast('ลบรายการแล้ว');
    } catch (err: any) {
      showToast(err.message || 'ลบไม่สำเร็จ', 'error');
    }
  }

  const addTx = async () => {
    if(!addForm.desc || !addForm.amount){showToast('กรุณากรอกข้อมูล','error');return}
    try {
      const res = await api.createTransaction({
        ...addForm,
        amount: parseFloat(addForm.amount),
        date: addForm.date || new Date().toISOString().slice(0, 10),
        status: 'pending'
      });
      setTransactions(ts => [res.data, ...ts])
      setShowAdd(false)
      setAddForm({desc:'',amount:'',cat:'ค่าใช้จ่าย',type:'expense',date:''})
      showToast('เพิ่มรายการสำเร็จ')
    } catch (err: any) {
      showToast(err.message || 'เพิ่มไม่สำเร็จ', 'error');
    }
  }

  const exportCSV = async () => {
    try {
      const blob = await api.exportTransactionsCSV()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nexasos-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('ดาวน์โหลด CSV สำเร็จ')
    } catch {
      showToast('Export ล้มเหลว', 'error')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const filtered = filter==='all' ? transactions : transactions.filter(t=>t.status===filter||t.type===filter)
  const income   = transactions.filter(t=>t.type==='income').reduce((s,t)=>s + (Number(t.amount)||0),0)
  const expense  = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s + (Number(t.amount)||0),0)
  const pending  = transactions.filter(t=>t.status==='pending').length

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16,animation:'fadeIn 0.3s ease'}}>
      <style>{`
        @media print {
          aside, header, nav, .no-print, button { display: none !important; }
          main { padding: 0 !important; background: white !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: black !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:C.text}}>Finance Center</div>
          <div style={{fontSize:12,color:C.text3,marginTop:2}}>จัดการบัญชีและ OCR ใบเสร็จอัตโนมัติ</div>
        </div>
        <div style={{display:'flex',gap:8}} className="no-print">
          <button onClick={exportCSV} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border2}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}>
            <Ic n="file" s={13}/>Export CSV
          </button>
          <button onClick={handlePrint} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:`1px solid ${C.border2}`,color:C.text2,cursor:'pointer',fontSize:12,fontWeight:600}}>
            <Ic n="download" s={13}/>Export PDF
          </button>
          <button onClick={()=>setShowAdd(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:10,background:`linear-gradient(135deg,${C.gold},${C.gold2})`,border:'none',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,boxShadow:`0 4px 14px ${C.gold}44`}}>
            <Ic n="plus" s={13}/>รายการใหม่
          </button>
        </div>
      </div>

      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <StatCard icon="trending" label="รายได้รวม" value={`฿${income.toLocaleString()}`} color={C.green}/>
        <StatCard icon="dollar"   label="รายจ่ายรวม" value={`฿${expense.toLocaleString()}`} color={C.red}/>
        <StatCard icon="zap"      label="กำไรสุทธิ"  value={`฿${(income-expense).toLocaleString()}`} color={C.gold}/>
        <StatCard icon="file"     label="รออนุมัติ"   value={pending} sub="รายการ" color={C.blue}/>
      </div>

      <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
        <div style={{flex:2,minWidth:300,display:'flex',flexDirection:'column',gap:12}}>
          <Tabs
            tabs={[{id:'upload',icon:'upload',label:'OCR ใบเสร็จ'},{id:'transactions',icon:'file',label:'รายการล่าสุด'},{id:'reports',icon:'trending',label:'วิเคราะห์ข้อมูล'}]}
            active={activeTab}
            onChange={setActiveTab}
          />

          {activeTab==='upload'&&(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {ocrState==='idle'&&(
                <div onClick={()=>fileInputRef.current?.click()}
                  style={{minHeight:140,border:`2px dashed ${C.border2}`,borderRadius:14,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,cursor:'pointer',transition:'all 0.2s',padding:24}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.gold;(e.currentTarget as HTMLDivElement).style.background=`${C.gold}08`;}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=C.border2;(e.currentTarget as HTMLDivElement).style.background='transparent';}}>
                  <input type="file" ref={fileInputRef} style={{display:'none'}} accept="image/*,application/pdf" onChange={handleFileUpload} />
                  <Ic n="upload" s={40} c={C.text3}/>
                  <div style={{fontSize:14,fontWeight:700,color:C.text2}}>สแกนใบเสร็จด้วย Gemini 2.0</div>
                  <div style={{fontSize:11,color:C.text3}}>ระบบจะแยกข้อมูลร้านค้า วันที่ ยอดรวม และภาษีให้โดยอัตโนมัติ</div>
                  <button style={{padding:'8px 20px',borderRadius:10,background:`${C.gold}22`,border:`1px solid ${C.gold}44`,color:C.gold,cursor:'pointer',fontSize:12,fontWeight:600}}>คลิกเพื่ออัปโหลด</button>
                </div>
              )}

              {ocrState==='scanning'&&(
                <div style={{padding:40,display:'flex',flexDirection:'column',alignItems:'center',gap:16,background:C.surface,borderRadius:16,border:`1px solid ${C.border}`}}>
                  <div style={{animation:'spin 1s linear infinite'}}><Ic n="cpu" s={40} c={C.gold}/></div>
                  <div style={{fontSize:15,fontWeight:700,color:C.text}}>AI กำลังประมวลผลใบเสร็จ...</div>
                  <div style={{width:'100%',maxWidth:320}}>
                    <ProgressBar pct={progress} color={C.gold} height={8}/>
                  </div>
                  <div style={{fontSize:11,color:C.text3}}>{progress}% Processing...</div>
                </div>
              )}

              {ocrState==='done'&&(
                <div style={{background:C.surface,border:`1px solid ${C.gold}44`,borderRadius:16,padding:20,animation:'fadeIn 0.3s ease'}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.gold,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
                    <Ic n="check" s={18} c={C.gold}/>ข้อมูลที่ Gemini สกัดออกมาได้
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
                    {[
                      {label:'ร้านค้า', key:'name'},
                      {label:'วันที่', key:'date'},
                      {label:'ยอดรวม (฿)', key:'total'},
                      {label:'VAT 7% (฿)', key:'tax'}
                    ].map(({label, key}) => (
                      <div key={key} style={{display:'flex',gap:12,alignItems:'center'}}>
                        <span style={{fontSize:12,color:C.text3,width:90,flexShrink:0}}>{label}</span>
                        <input value={(ocrData as any)[key]} onChange={e=>setOcrData({...ocrData,[key]:e.target.value})}
                          style={{flex:1,background:'rgba(255,255,255,0.05)',border:`1px solid ${C.border2}`,borderRadius:10,padding:'10px 14px',color:C.text,fontFamily:'Montserrat',fontSize:13,outline:'none'}}/>
                      </div>
                    ))}
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <span style={{fontSize:12,color:C.text3,width:90,flexShrink:0}}>หมวดหมู่</span>
                      <div style={{flex:1}}>
                        <Select value={ocrData.cat} onChange={e=>setOcrData({...ocrData,cat:e.target.value})} options={['ค่าใช้จ่าย','Marketing','IT & อุปกรณ์','ทรัพย์สิน','อาหาร','เดินทาง','อื่นๆ']}/>
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={saveOcr} style={{flex:2,padding:'12px',borderRadius:12,background:`linear-gradient(135deg,${C.green},${C.green}99)`,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      <Ic n="check" s={16}/>บันทึกลงฐานข้อมูล
                    </button>
                    <button onClick={()=>setOcrState('idle')} style={{flex:1,padding:'12px',borderRadius:12,background:C.redL,border:`1px solid ${C.red}44`,color:C.red,cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      <Ic n="x" s={16}/>ทิ้งรายการ
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab==='transactions'&&(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {(['all','pending','approved','income','expense'] as string[]).map(f=>(
                  <button key={f} onClick={()=>setFilter(f)}
                    style={{padding:'6px 14px',borderRadius:99,fontSize:11,fontWeight:600,cursor:'pointer',background:filter===f?C.goldLight:'transparent',color:filter===f?C.gold:C.text3,border:`1px solid ${filter===f?C.gold+'44':C.border}`,transition:'all 0.15s'}}>
                    {f==='all'?'ทั้งหมด':f==='pending'?'รออนุมัติ':f==='approved'?'อนุมัติแล้ว':f==='income'?'รายได้':'รายจ่าย'}
                  </button>
                ))}
              </div>

              <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 100px 100px 100px 80px',padding:'12px 20px',borderBottom:`1px solid ${C.border}`,gap:12}}>
                  {['รายการ','จำนวน','หมวดหมู่','สถานะ',''].map((h,i)=>(
                    <div key={i} style={{fontSize:11,fontWeight:800,color:C.text3, textTransform:'uppercase', letterSpacing:1}}>{h}</div>
                  ))}
                </div>
                {filtered.map(t=>(
                  <div key={t.id}
                    style={{display:'grid',gridTemplateColumns:'1fr 100px 100px 100px 80px',padding:'14px 20px',borderBottom:`1px solid ${C.border}`,gap:12,alignItems:'center',transition:'background 0.15s'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <div>
                      <div style={{fontSize:13,color:C.text,fontWeight:600}}>{t.description || t.desc}</div>
                      <div style={{fontSize:11,color:C.text3, marginTop:2}}>{t.date}</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:800,color:t.type==='income'?C.green:C.red}}>
                      {t.type==='income'?'+':'-'}฿{(Number(t.amount)||0).toLocaleString()}
                    </div>
                    <div><Badge type="gold">{t.category || t.cat}</Badge></div>
                    <div>
                      <Badge type={t.status==='approved'?'green':'blue'}>
                        {t.status==='approved'?'✓ อนุมัติ':'⏳ รอตรวจ'}
                      </Badge>
                    </div>
                    <div style={{display:'flex',gap:6, justifyContent:'flex-end'}}>
                      {t.status==='pending' && (
                        <button onClick={()=>approve(t.id)} style={{padding:'6px',borderRadius:8,background:C.greenL,border:`1px solid ${C.green}44`,color:C.green,cursor:'pointer'}} title="อนุมัติ"><Ic n="check" s={14}/></button>
                      )}
                      <button onClick={()=>removeTx(t.id)} style={{padding:'6px',borderRadius:8,background:C.redL, border:`1px solid ${C.red}44`,  color:C.red,  cursor:'pointer'}} title="ลบ"><Ic n="trash" s={14}/></button>
                    </div>
                  </div>
                ))}
                {filtered.length===0&&<EmptyState icon="file" title="ไม่พบข้อมูล" sub="กรุณาลองเปลี่ยนตัวกรอง หรือเพิ่มรายการใหม่"/>}
              </div>
            </div>
          )}

          {activeTab==='reports'&&(
             <div style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:24}}>
                <EmptyState icon="trending" title="AI Financial Insights" sub="ระบบกำลังวิเคราะห์ข้อมูลการเงินย้อนหลัง เพื่อทำนายกระแสเงินสดในอนาคต"/>
             </div>
          )}
        </div>

        <div style={{width:240,display:'flex',flexDirection:'column',gap:16,flexShrink:0}}>
           <div style={{background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16}}>
              <div style={{fontSize:13, fontWeight:800, color:C.text, marginBottom:16}}>ยอดใช้จ่ายตามหมวด</div>
              {[
                {l:'ค่าใช้จ่ายทั่วไป', p:45, col:C.gold},
                {l:'Marketing', p:25, col:C.blue},
                {l:'IT & อุปกรณ์', p:20, col:C.purple},
                {l:'อื่นๆ', p:10, col:C.text3}
              ].map(i => (
                <div key={i.l} style={{marginBottom:14}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4}}>
                    <span style={{color:C.text2}}>{i.l}</span>
                    <span style={{fontWeight:700, color:i.col}}>{i.p}%</span>
                  </div>
                  <ProgressBar pct={i.p} color={i.col} height={5}/>
                </div>
              ))}
           </div>

           <div style={{background:`${C.gold}10`, border:`1px solid ${C.gold}30`, borderRadius:16, padding:16}}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:10}}>
                <Ic n="zap" s={16} c={C.gold}/>
                <span style={{fontSize:13, fontWeight:800, color:C.gold}}>AI Insights</span>
              </div>
              <p style={{fontSize:12, color:C.text2, lineHeight:1.6}}>Gemini สังเกตเห็นว่ายอดใช้จ่ายด้าน IT ของคุณสูงขึ้น 15% ในเดือนนี้ ควรตรวจสอบความจำเป็นของ Subscription ที่ไม่ได้ใช้งาน</p>
           </div>
        </div>
      </div>

      {showAdd&&(
        <Modal title="เพิ่มรายการเงินสด" onClose={()=>setShowAdd(false)}>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <Field label="ประเภทรายการ">
              <div style={{display:'flex',gap:8}}>
                {['expense','income'].map(t=>(
                  <button key={t} onClick={()=>setAddForm({...addForm,type:t})}
                    style={{flex:1,padding:'12px',borderRadius:12,background:addForm.type===t?t==='expense'?C.redL:C.greenL:'rgba(255,255,255,0.04)',border:`1px solid ${addForm.type===t?t==='expense'?C.red:C.green:C.border}`,color:addForm.type===t?t==='expense'?C.red:C.green:C.text3,cursor:'pointer',fontSize:13,fontWeight:700}}>
                    {t==='expense'?'💸 รายจ่าย':'💰 รายได้'}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="ชื่อรายการ" required>
              <Input placeholder="เช่น ค่าเช่าออฟฟิศ, ค่าโปรเจค..." value={addForm.desc} onChange={e=>setAddForm({...addForm,desc:e.target.value})}/>
            </Field>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <Field label="จำนวนเงิน (฿)" required>
                <Input type="number" placeholder="0.00" value={addForm.amount} onChange={e=>setAddForm({...addForm,amount:e.target.value})}/>
              </Field>
              <Field label="วันที่">
                <Input type="date" value={addForm.date} onChange={e=>setAddForm({...addForm,date:e.target.value})}/>
              </Field>
            </div>
            <Field label="หมวดหมู่">
              <Select value={addForm.cat} onChange={e=>setAddForm({...addForm,cat:e.target.value})} options={['ค่าใช้จ่าย','Marketing','IT & อุปกรณ์','ทรัพย์สิน','รายได้','อื่นๆ']}/>
            </Field>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:10}}>
              <button onClick={()=>setShowAdd(false)} style={{padding:'10px 24px',borderRadius:10,background:'transparent',border:`1px solid ${C.border}`,color:C.text2,cursor:'pointer',fontSize:13,fontWeight:600}}>ยกเลิก</button>
              <button onClick={addTx} style={{padding:'10px 24px',borderRadius:10,background:C.gold,border:'none',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>บันทึกรายการ</button>
            </div>
          </div>
        </Modal>
      )}

      {toast&&<Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  )
}
