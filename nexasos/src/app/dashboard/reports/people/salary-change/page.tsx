'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadSalaryChange } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadSalaryChange(), [])
  return <ReportShell title={t('nav.report.salaryChange')} load={load} filename="salary-change.csv" />
}
