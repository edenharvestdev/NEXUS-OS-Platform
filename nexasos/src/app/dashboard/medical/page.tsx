'use client'
import { Stethoscope } from 'lucide-react'
import DepartmentWorkspace from '@/components/DepartmentWorkspace'

export default function MedicalPage() {
  return (
    <DepartmentWorkspace
      titleTh="การแพทย์"
      titleEn="Medical"
      subtitleTh="ทีมแพทย์ · การรักษา · เวชระเบียน"
      Icon={Stethoscope}
    />
  )
}
