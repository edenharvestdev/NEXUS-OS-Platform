'use client'
import { Smile } from 'lucide-react'
import DepartmentWorkspace from '@/components/DepartmentWorkspace'

export default function DentalPage() {
  return (
    <DepartmentWorkspace
      titleTh="ทันตกรรม"
      titleEn="Dental"
      subtitleTh="ทันตแพทย์ · แผนการรักษา · นัดหมาย"
      Icon={Smile}
    />
  )
}
