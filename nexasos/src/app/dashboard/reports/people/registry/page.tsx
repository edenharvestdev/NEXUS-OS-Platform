'use client'
import { useCallback } from 'react'
import ReportShell from '@/components/ReportShell'
import { useApp } from '@/lib/theme'
import { loadPeopleRegistry } from '@/lib/report-data'

export default function Page() {
  const { t } = useApp()
  const load = useCallback(() => loadPeopleRegistry(), [])
  return <ReportShell title={t('nav.report.peopleRegistry')} load={load} filename="people-registry.csv" />
}
