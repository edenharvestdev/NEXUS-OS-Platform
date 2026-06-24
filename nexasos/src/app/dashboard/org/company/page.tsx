'use client'

import { useEffect, useState } from 'react'
import { Field, Input, Select, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function OrgCompanyPage() {
  const { colors: C, t } = useApp()
  const [company, setCompany] = useState({ name: '', type: '', tax: '', address: '', size: '' })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    api.getSettings()
      .then(res => {
        setCompany({
          name: res.company?.name || '',
          type: res.company?.industry || '',
          tax: res.company?.tax_id || '',
          address: res.company?.address || '',
          size: res.company?.size || '',
        })
      })
      .catch(() => showToast('โหลดข้อมูลบริษัทไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    try {
      await api.updateCompany({
        name: company.name,
        industry: company.type,
        tax_id: company.tax,
        address: company.address,
        size: company.size,
      })
      showToast('บันทึกข้อมูลบริษัทสำเร็จ')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.company')}</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>ข้อมูลองค์กรหลัก — ชื่อ ที่อยู่ เลขประจำตัวผู้เสียภาษี</div>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="ชื่อบริษัท">
          <Input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} />
        </Field>
        <Field label="ประเภทธุรกิจ">
          <Input value={company.type} onChange={e => setCompany({ ...company, type: e.target.value })} />
        </Field>
        <Field label="เลขประจำตัวผู้เสียภาษี">
          <Input value={company.tax} onChange={e => setCompany({ ...company, tax: e.target.value })} />
        </Field>
        <Field label="ที่อยู่">
          <Input value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} />
        </Field>
        <Field label="ขนาดองค์กร">
          <Select
            value={company.size}
            onChange={e => setCompany({ ...company, size: e.target.value })}
            options={['1-10', '10-50', '50-100', '100-500', '500+']}
          />
        </Field>
        <button
          onClick={save}
          style={{
            marginTop: 8, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #B48648, #9C713B)', color: '#fff', fontWeight: 700, fontSize: 13,
          }}
        >
          บันทึก
        </button>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}
