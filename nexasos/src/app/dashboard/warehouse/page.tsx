'use client'
import { Warehouse } from 'lucide-react'
import DepartmentWorkspace from '@/components/DepartmentWorkspace'

export default function WarehousePage() {
  return (
    <DepartmentWorkspace
      titleTh="คลังสินค้าและจัดซื้อ"
      titleEn="Warehouse & Purchasing"
      subtitleTh="สต๊อก · รับเข้า-เบิกออก · จัดซื้อ"
      Icon={Warehouse}
    />
  )
}
