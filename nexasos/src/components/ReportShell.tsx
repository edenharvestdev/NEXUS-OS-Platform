'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { StatCard, EmptyState } from '@/lib/ui'
import { useApp } from '@/lib/theme'
import {
  type ReportData,
  type ReportColumn,
  type ReportRow,
  exportReportCsv,
} from '@/lib/report-data'

type Props = {
  title: string
  load: () => Promise<ReportData>
  filename?: string
}

export default function ReportShell({ title, load, filename }: Props) {
  const { colors: C } = useApp()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    load()
      .then(setData)
      .catch((e: Error) => setError(e.message || 'โหลดรายงานไม่สำเร็จ'))
      .finally(() => setLoading(false))
  }, [load])

  const exportCsv = () => {
    if (!data?.rows.length) return
    exportReportCsv(data.columns, data.rows, filename || `${title.replace(/\s+/g, '_')}.csv`)
  }

  if (loading) return <div style={{ color: C.text3, padding: 24 }}>กำลังโหลดรายงาน...</div>
  if (error) return <div style={{ color: C.red, padding: 24 }}>{error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{title}</div>
          {data?.note && (
            <div style={{ fontSize: 12, color: C.text3, marginTop: 6, lineHeight: 1.6, maxWidth: 640 }}>{data.note}</div>
          )}
        </div>
        {data?.rows.length ? (
          <button
            type="button"
            onClick={exportCsv}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 10, border: `1px solid ${C.border2}`,
              background: C.surface, color: C.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
        ) : null}
      </div>

      {data?.stats?.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {data.stats.map(s => (
            <StatCard key={s.label} icon="chart" label={s.label} value={String(s.value)} />
          ))}
        </div>
      ) : null}

      {!data?.rows.length ? (
        <EmptyState icon="inbox" title="ไม่มีข้อมูล" sub="ยังไม่มีข้อมูลสำหรับรายงานนี้" />
      ) : (
        <ReportTable columns={data.columns} rows={data.rows} />
      )}
    </div>
  )
}

function ReportTable({ columns, rows }: { columns: ReportColumn[]; rows: ReportRow[] }) {
  const { colors: C } = useApp()
  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 14, background: C.surface }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {columns.map(col => (
              <th
                key={col.key}
                style={{
                  padding: '12px 14px', textAlign: col.align || 'left',
                  fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: 0.5,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
              {columns.map(col => (
                <td
                  key={col.key}
                  style={{
                    padding: '11px 14px', color: C.text2,
                    textAlign: col.align || 'left',
                  }}
                >
                  {row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
