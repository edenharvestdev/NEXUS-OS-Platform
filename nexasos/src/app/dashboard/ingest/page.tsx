'use client'
import { useEffect, useState } from 'react'
import { Tabs, Field, Toast, Badge } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function IngestPage() {
  const { colors: C } = useApp()
  const [tab, setTab] = useState('excel')
  const [target, setTarget] = useState('transactions')
  const [csv, setCsv] = useState('')
  const [jobs, setJobs] = useState<any[]>([])
  const [line, setLine] = useState<any>(null)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    api.getIngestionJobs().then(r => setJobs(r.data || [])).catch(() => {})
    api.getLineConfig().then(setLine).catch(() => {})
  }, [])

  const importData = async () => {
    if (!csv.trim()) { showToast('วาง CSV ก่อน import', 'error'); return }
    try {
      const res = await api.importCSV(csv, target)
      showToast(`Import สำเร็จ ${res.rows_imported} แถว`)
      api.getIngestionJobs().then(r => setJobs(r.data || []))
    } catch (e: any) { showToast(e.message, 'error') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease', maxWidth: 720 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>P5 · Data Ingestion</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>Excel/CSV · LINE OA — นำเข้าข้อมูลกระจัดให้เป็นมาตรฐาน L0</div>
      </div>
      <Tabs tabs={[{ id: 'excel', icon: 'upload', label: 'Excel/CSV' }, { id: 'line', icon: 'msg', label: 'LINE OA' }, { id: 'jobs', icon: 'grid', label: 'History' }]} active={tab} onChange={setTab} />
      {tab === 'excel' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          <Field label="Target table">
            <select value={target} onChange={e => setTarget(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, background: C.bg3, border: `1px solid ${C.border}`, color: C.text }}>
              <option value="transactions">Financial (transactions)</option>
              <option value="pos">POS / ERP export</option>
              <option value="dictionary">L0 Dictionary</option>
              <option value="employees">People</option>
            </select>
          </Field>
          <Field label="CSV content">
            <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={8} placeholder={'description,amount,type,category\nค่าวัสดุ,5000,expense,Operation\n\nPOS: date,total,product\n2026-06-01,1500,ตรวจสุขภาพ'} style={{ width: '100%', padding: 12, borderRadius: 8, background: C.bg3, border: `1px solid ${C.border}`, color: C.text, fontFamily: 'monospace', fontSize: 12, boxSizing: 'border-box' }} />
          </Field>
          <button onClick={importData} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${C.gold},${C.gold2})`, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Import</button>
        </div>
      )}
      {tab === 'line' && line && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, fontSize: 13, color: C.text2, lineHeight: 1.8 }}>
          <Badge type={line.channel_configured ? 'green' : 'red'}>{line.channel_configured ? 'LINE configured' : 'Set LINE_CHANNEL_SECRET + LINE_CHANNEL_ACCESS_TOKEN'}</Badge>
          <p style={{ marginTop: 12 }}><strong>Webhook:</strong> POST {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}{line.webhook_path}</p>
          <p><strong>Usage:</strong> {line.usage}</p>
          <p>Staff ส่งข้อความ <code>LOG: สรุปงานวันนี้</code> ผ่าน LINE OA → สร้าง Work Log อัตโนมัติ</p>
        </div>
      )}
      {tab === 'jobs' && jobs.map(j => (
        <div key={j.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: C.text2 }}>{j.source} · {j.filename || j.target}</span>
          <Badge type="green">{j.rows_imported} rows</Badge>
        </div>
      ))}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
