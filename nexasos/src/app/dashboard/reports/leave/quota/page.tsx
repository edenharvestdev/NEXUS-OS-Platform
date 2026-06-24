'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadLeaveQuota } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadLeaveQuota(), [])
  return <ReportShell title={t('nav.report.leaveQuota')} load={load} filename="leave-quota.csv" />
}
