'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadTaxReport } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadTaxReport('pnd1'), [])
  return <ReportShell title={t('nav.report.taxPnd1')} load={load} filename="pnd1.csv" />
}
