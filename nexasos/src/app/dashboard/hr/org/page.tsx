'use client'

import { useEffect, useState } from 'react'
import { Badge, Toast } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function HrOrgPage() {
  const { colors: C, t } = useApp()
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null)

  useEffect(() => {
    api.getOrgUnits()
      .then(r => setUnits(r.data || []))
      .catch(() => setToast({ msg: 'โหลดโครงสร้างไม่สำเร็จ', type: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  const roots = units.filter(u => !u.parent_id)
  const childrenOf = (pid: string) => units.filter(u => u.parent_id === pid)

  const renderNode = (node: any, depth = 0) => (
    <div key={node.id} style={{ marginLeft: depth * 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 6,
      }}>
        <Badge type="blue">L{node.level}</Badge>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{node.name_th}</div>
          <div style={{ fontSize: 11, color: C.text3 }}>{node.code}</div>
        </div>
      </div>
      {childrenOf(node.id).map(c => renderNode(c, depth + 1))}
    </div>
  )

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.hrOrg')}</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>โครงสร้างองค์กรแบบหลายระดับ (Phase 1)</div>
      </div>
      {roots.length ? roots.map(r => renderNode(r)) : (
        <div style={{ color: C.text3, padding: 24, textAlign: 'center' }}>ยังไม่มีโครงสร้าง</div>
      )}
      {toast && <Toast msg={toast.msg} type={toast.type as any} onClose={() => setToast(null)} />}
    </div>
  )
}
