'use client'
import { Headset } from 'lucide-react'
import DepartmentWorkspace from '@/components/DepartmentWorkspace'

export default function OperationsPage() {
  return (
    <DepartmentWorkspace
      titleTh="ปฏิบัติการ"
      titleEn="Operations"
      subtitleTh="ลูกค้าสัมพันธ์ / แอดมิน · ดูแลส่วนบุคคล · เทเลเซลส์"
      Icon={Headset}
    />
  )
}
