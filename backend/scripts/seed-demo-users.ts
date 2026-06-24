/**
 * Seed demo test users — one account per department.
 * Usage: DATABASE_URL=... npm run seed:demo-users
 * Password: DEMO_USER_PASSWORD env or default Demo2026!
 */
import dotenv from 'dotenv'
dotenv.config()

import bcrypt from 'bcryptjs'
import { queryOne, run, newId } from '../src/lib/db'
import {
  DEPARTMENT_DEFINITIONS,
  initCompanyDepartments,
  createDepartmentEmployee,
  assignDepartmentHead,
} from '../src/lib/departments'
import { initUserSkills } from '../src/lib/skill-wallet'

const COMPANY_NAME = process.env.DEMO_COMPANY_NAME || 'Tamada Clinic (Demo)'
const COMPANY_SLUG = process.env.DEMO_COMPANY_SLUG || 'tamada-demo'
const PASSWORD = process.env.DEMO_USER_PASSWORD || 'Demo2026!'

/** หัวหน้าแผนก 1 คนต่อแผนก */
const DEMO_USERS: Array<{ email: string; name: string; department: string; color?: string }> = [
  { email: 'admin@demo.tamada', name: 'ผู้บริหาร Demo', department: 'Management', color: '#C4956A' },
  { email: 'hr@demo.tamada', name: 'หัวหน้า HR Demo', department: 'HR', color: '#4CAF7D' },
  { email: 'finance@demo.tamada', name: 'หัวหน้าการเงิน Demo', department: 'Finance', color: '#4A9EDB' },
  { email: 'sales@demo.tamada', name: 'หัวหน้าขาย Demo', department: 'Sales', color: '#E2B989' },
  { email: 'marketing@demo.tamada', name: 'หัวหน้าการตลาด Demo', department: 'Marketing', color: '#9B7EDE' },
  { email: 'it@demo.tamada', name: 'หัวหน้า IT Demo', department: 'IT', color: '#5C9EAD' },
  { email: 'staff@demo.tamada', name: 'พนักงานปฏิบัติการ Demo', department: 'Operation', color: '#8B9A6B' },
]

/** พนักงานเพิ่มในแผนกปฏิบัติการ */
const EXTRA_STAFF = [
  { email: 'staff2@demo.tamada', name: 'พนักงาน Demo 02', department: 'Operation', color: '#A0A0A0' },
]

async function ensureCompany(): Promise<string> {
  const existing = await queryOne('SELECT id FROM companies WHERE slug = $1', [COMPANY_SLUG])
  if (existing?.id) return existing.id

  const id = newId()
  await run('INSERT INTO companies (id, name, slug, industry) VALUES ($1,$2,$3,$4)', [
    id, COMPANY_NAME, COMPANY_SLUG, 'tamada',
  ])
  await run(
    `INSERT INTO onboarding_state (company_id, industry, step, completed) VALUES ($1, 'tamada', 0, 0)`,
    [id],
  )
  console.log(`✅ สร้างบริษัท: ${COMPANY_NAME}`)
  return id
}

async function upsertAdmin(
  companyId: string,
  email: string,
  name: string,
  hash: string,
  color: string,
): Promise<string> {
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing?.id) {
    await run(
      `UPDATE users SET password_hash = $1, role = 'admin', department = 'Management', name = $2, status = 'active', color = $3
       WHERE id = $4`,
      [hash, name, color, existing.id],
    )
    console.log(`🔄 อัปเดต admin: ${email}`)
    return existing.id
  }
  const userId = newId()
  await run(
    `INSERT INTO users (id, company_id, name, email, password_hash, role, department, color, status)
     VALUES ($1,$2,$3,$4,$5,'admin','Management',$6,'active')`,
    [userId, companyId, name, email, hash, color],
  )
  await initUserSkills(companyId, userId, 'admin')
  console.log(`✅ สร้าง admin: ${email}`)
  return userId
}

async function upsertEmployee(
  companyId: string,
  u: { email: string; name: string; department: string; color?: string },
  hash: string,
): Promise<void> {
  const existing = await queryOne('SELECT id, department FROM users WHERE email = $1', [u.email])
  if (existing?.id) {
    const bcrypt = await import('bcryptjs')
    const role = DEPARTMENT_DEFINITIONS.find(d => d.name === u.department)?.systemRole || 'staff'
    await run(
      `UPDATE users SET password_hash = $1, name = $2, department = $3, role = $4, status = 'active', color = $5 WHERE id = $6`,
      [hash, u.name, u.department, role, u.color || '#C4956A', existing.id],
    )
    await assignDepartmentHead(companyId, u.department, existing.id)
    console.log(`🔄 อัปเดต: ${u.email} (${u.department})`)
    return
  }

  await createDepartmentEmployee(companyId, {
    name: u.name,
    email: u.email,
    password: PASSWORD,
    department: u.department,
    color: u.color,
  })
  const created = await queryOne('SELECT id FROM users WHERE email = $1', [u.email])
  if (created?.id) await assignDepartmentHead(companyId, u.department, created.id)
  console.log(`✅ สร้าง: ${u.email} (${u.department})`)
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }
  if (PASSWORD.length < 6) {
    console.error('Password must be at least 6 characters')
    process.exit(1)
  }

  const companyId = await ensureCompany()
  const hash = await bcrypt.hash(PASSWORD, 10)

  const adminUser = DEMO_USERS.find(u => u.department === 'Management')!
  const adminId = await upsertAdmin(companyId, adminUser.email, adminUser.name, hash, adminUser.color || '#C4956A')

  const deptCount = Number((await queryOne('SELECT COUNT(*) as c FROM departments WHERE company_id = $1', [companyId]))?.c || 0)
  if (deptCount === 0) {
    await initCompanyDepartments(companyId, adminId)
  }

  for (const u of DEMO_USERS.filter(x => x.department !== 'Management')) {
    await upsertEmployee(companyId, u, hash)
  }
  for (const u of EXTRA_STAFF) {
    await upsertEmployee(companyId, u, hash)
  }

  console.log('\n══════════════════════════════════════════════')
  console.log(`บริษัท: ${COMPANY_NAME} (${COMPANY_SLUG})`)
  console.log(`รหัสผ่านทุกคน: ${PASSWORD}`)
  console.log('══════════════════════════════════════════════\n')

  const rows = [...DEMO_USERS, ...EXTRA_STAFF]
  console.log('| แผนก | อีเมล | Role |')
  console.log('|------|-------|------|')
  for (const u of rows) {
    const role = DEPARTMENT_DEFINITIONS.find(d => d.name === u.department)?.systemRole || 'staff'
    const label = DEPARTMENT_DEFINITIONS.find(d => d.name === u.department)?.label_th || u.department
    console.log(`| ${label} | ${u.email} | ${role} |`)
  }
  console.log('\nLogin: https://nexus-web-production-4fda.up.railway.app/login')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
