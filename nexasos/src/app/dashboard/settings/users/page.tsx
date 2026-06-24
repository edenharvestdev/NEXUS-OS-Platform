'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function UsersAdminPage() {
  const { colors: C, t } = useApp()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getEmployees()
      .then(r => setUsers(r.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.usersAdmin')}</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>ผู้ใช้งานในองค์กร — จัดการรายละเอียดได้ที่หน้าบุคลากร</div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/people')}
          style={{
            padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #B48648, #9C713B)', color: '#fff', fontSize: 12, fontWeight: 700,
          }}
        >
          ไปหน้าบุคลากร
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 14, background: C.surface }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['ชื่อ', 'อีเมล', 'แผนก', 'Role', 'สถานะ'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.text3 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '11px 14px', color: C.text, fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: '11px 14px', color: C.text2 }}>{u.email}</td>
                <td style={{ padding: '11px 14px', color: C.text2 }}>{u.department || u.dept || '—'}</td>
                <td style={{ padding: '11px 14px' }}><Badge type="blue">{u.role || 'staff'}</Badge></td>
                <td style={{ padding: '11px 14px' }}>
                  <Badge type={u.status === 'active' ? 'green' : 'gold'}>{u.status || 'active'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
