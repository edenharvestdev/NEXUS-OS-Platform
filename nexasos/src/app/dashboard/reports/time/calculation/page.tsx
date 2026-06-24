'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadWorkLogsReport } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadWorkLogsReport('calculation'), [])
  return <ReportShell title={t('nav.report.timeCalc')} load={load} filename="time-calculation.csv" />
}
