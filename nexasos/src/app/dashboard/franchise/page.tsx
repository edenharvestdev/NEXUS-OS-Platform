'use client'
import { Store } from 'lucide-react'
import DepartmentWorkspace from '@/components/DepartmentWorkspace'

export default function FranchisePage() {
  return (
    <DepartmentWorkspace
      titleTh="แฟรนไชส์"
      titleEn="Franchise"
      subtitleTh="สาขา · มาตรฐานบริการ · สนับสนุนพาร์ทเนอร์"
      Icon={Store}
    />
  )
}
