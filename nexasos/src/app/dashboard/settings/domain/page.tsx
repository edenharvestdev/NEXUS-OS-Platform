'use client'

import { useEffect, useState } from 'react'
import { Field, Input, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function DomainSettingsPage() {
  const { colors: C, t } = useApp()
  const [company, setCompany] = useState({ name: '', tax: '', subdomain: '' })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)
  const showToast = (msg: string, type = 'success') => setToast({ msg, type })

  useEffect(() => {
    api.getSettings()
      .then(res => {
        const name = res.company?.name || ''
        const slug = res.company?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company'
        setCompany({
          name,
          tax: res.company?.tax_id || '',
          subdomain: slug,
        })
      })
      .catch(() => showToast('โหลดข้อมูลไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    try {
      await api.updateCompany({
        name: company.name,
        tax_id: company.tax,
        subdomain: company.subdomain,
      })
      showToast('บันทึกโดเมนองค์กรสำเร็จ')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  const host = `${company.subdomain || 'company'}.nexus-os.app`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.domain')}</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>โดเมนและข้อมูลองค์กรสำหรับเข้าใช้งานระบบ</div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="ชื่อองค์กร">
          <Input value={company.name} onChange={e => setCompany({ ...company, name: e.target.value })} />
        </Field>
        <Field label="เลขประจำตัวผู้เสียภาษี">
          <Input value={company.tax} onChange={e => setCompany({ ...company, tax: e.target.value })} />
        </Field>
        <Field label="Subdomain">
          <Input value={company.subdomain} onChange={e => setCompany({ ...company, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
        </Field>
        <div style={{ fontSize: 12, color: C.text3, padding: '8px 12px', background: C.bg3, borderRadius: 8 }}>
          URL: <strong style={{ color: C.gold }}>{host}</strong>
        </div>
        <button
          type="button"
          onClick={save}
          style={{
            marginTop: 4, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
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
