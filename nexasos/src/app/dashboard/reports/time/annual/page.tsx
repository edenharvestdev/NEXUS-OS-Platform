'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadWorkLogsReport } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadWorkLogsReport('annual'), [])
  return <ReportShell title={t('nav.report.annualTime')} load={load} filename="annual-time.csv" />
}
