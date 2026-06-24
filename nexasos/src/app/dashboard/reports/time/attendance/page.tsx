'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadWorkLogsReport } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadWorkLogsReport('attendance'), [])
  return <ReportShell title={t('nav.report.attendance')} load={load} filename="attendance.csv" />
}
