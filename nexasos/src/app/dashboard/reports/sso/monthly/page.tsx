'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadSsoReport } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadSsoReport('monthly'), [])
  return <ReportShell title={t('nav.report.ssoMonthly')} load={load} filename="sso-monthly.csv" />
}
