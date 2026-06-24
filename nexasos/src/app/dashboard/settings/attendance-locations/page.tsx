'use client'

import { useEffect, useState } from 'react'
import { Field, Input, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function AttendanceLocationsPage() {
  const { colors: C } = useApp()
  const [locs, setLocs] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', lat: '', lng: '', radius_m: '150' })
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  const load = () => api.getAttendanceLocations().then(r => setLocs(r.data || [])).catch(() => {})

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.name) return
    try {
      await api.createAttendanceLocation({
        name: form.name,
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        radius_m: Number(form.radius_m) || 150,
      })
      setForm({ name: '', lat: '', lng: '', radius_m: '150' })
      load()
      setToast({ msg: 'สร้างจุดลงเวลาแล้ว', type: 'success' })
    } catch (e: any) { setToast({ msg: e.message, type: 'error' }) }
  }

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setForm(f => ({ ...f, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }))
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>จุดลงเวลา GPS / QR</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>กำหนดพื้นที่ + QR token สำหรับพนักงานสแกน</div>
      </div>
      {locs.map(loc => (
        <div key={loc.id} style={{ padding: 14, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: C.text }}>{loc.name}</div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
              {loc.lat != null ? `${loc.lat}, ${loc.lng} · รัศมี ${loc.radius_m}m` : 'ไม่มี GPS — ใช้ QR อย่างเดียว'}
            </div>
          </div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(loc.qr_token || loc.id)}`}
            alt="QR"
            width={80}
            height={80}
            style={{ borderRadius: 8, border: `1px solid ${C.border}` }}
          />
        </div>
      ))}
      <div style={{ padding: 16, borderRadius: 14, background: C.surface, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, marginBottom: 12, color: C.text }}>เพิ่มจุดลงเวลา</div>
        <Field label="ชื่อจุด"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
          <Field label="Lat"><Input value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} /></Field>
          <Field label="Lng"><Input value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} /></Field>
          <Field label="รัศมี (m)"><Input value={form.radius_m} onChange={e => setForm({ ...form, radius_m: e.target.value })} /></Field>
        </div>
        <button type="button" onClick={useMyLocation} style={{ marginTop: 8, fontSize: 12, color: C.gold, background: 'none', border: 'none', cursor: 'pointer' }}>ใช้ตำแหน่งปัจจุบัน</button>
        <button type="button" onClick={create} style={{ display: 'block', marginTop: 12, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#B48648,#9C713B)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>สร้าง</button>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}
