'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadPayrollReport } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadPayrollReport('annual'), [])
  return <ReportShell title={t('nav.report.payrollAnnual')} load={load} filename="payroll-annual.csv" />
}
