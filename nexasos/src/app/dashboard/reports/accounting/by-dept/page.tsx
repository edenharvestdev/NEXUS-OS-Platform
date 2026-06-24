'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadAccountingReport } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadAccountingReport('by-dept'), [])
  return <ReportShell title={t('nav.report.accountingDept')} load={load} filename="accounting-by-dept.csv" />
}
