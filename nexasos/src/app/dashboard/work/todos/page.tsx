'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import { api } from '@/lib/api'

export default function WorkTodosPage() {
  const { colors: C, t } = useApp()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getTasks()
      .then(r => setTasks(r.data || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{t('nav.todos')}</div>
        <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>งานที่มอบหมายและต้องติดตาม</div>
      </div>
      {tasks.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: C.text3, fontSize: 13, background: C.surface, borderRadius: 14, border: `1px solid ${C.border}` }}>
          ไม่มีงานที่ต้องทำในขณะนี้
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(task => (
            <div
              key={task.id}
              style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{task.title || task.name}</div>
                {task.description && (
                  <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>{task.description}</div>
                )}
                {task.due_date && (
                  <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>กำหนด: {task.due_date}</div>
                )}
              </div>
              {task.status && (
                <Badge type={task.status === 'done' ? 'green' : task.status === 'cancelled' ? 'red' : 'blue'}>
                  {task.status}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
