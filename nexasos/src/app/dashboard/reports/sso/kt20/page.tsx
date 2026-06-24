'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadSsoReport } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadSsoReport('kt20'), [])
  return <ReportShell title={t('nav.report.ssoKt20')} load={load} filename="sso-kt20.csv" />
}
