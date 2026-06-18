/**
 * Seed platform super-admin accounts (admin01–03).
 * Usage: DATABASE_URL=... npm run seed:super-admins
 * Password: SUPER_ADMIN_PASSWORD env or default super2026
 */
import dotenv from 'dotenv'
dotenv.config()

import bcrypt from 'bcryptjs'
import { queryOne, run, newId } from '../src/lib/db'
import { initCompanyDepartments } from '../src/lib/departments'
import { initUserSkills } from '../src/lib/skill-wallet'

const COMPANY_NAME = 'NEXUS OS Platform'
const COMPANY_SLUG = 'nexus-os-platform'
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'super2026'

const ADMINS = [
  { email: 'superadmin01@nexus.os', name: 'Super Admin 01' },
  { email: 'superadmin02@nexus.os', name: 'Super Admin 02' },
  { email: 'superadmin03@nexus.os', name: 'Super Admin 03' },
]

async function ensureCompany(): Promise<string> {
  const existing = await queryOne('SELECT id FROM companies WHERE slug = $1', [COMPANY_SLUG])
  if (existing?.id) return existing.id

  const id = newId()
  await run('INSERT INTO companies (id, name, slug, industry) VALUES ($1,$2,$3,$4)', [
    id, COMPANY_NAME, COMPANY_SLUG, 'Tamada Clinic & SDX Dental',
  ])
  await run(
    `INSERT INTO onboarding_state (company_id, industry, step, completed) VALUES ($1, 'tamada', 0, 0)`,
    [id],
  )
  console.log(`✅ Created company: ${COMPANY_NAME}`)
  return id
}

async function upsertAdmin(companyId: string, email: string, name: string, hash: string) {
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing?.id) {
    await run(
      `UPDATE users SET password_hash = $1, role = 'admin', department = 'Management', status = 'active' WHERE id = $2`,
      [hash, existing.id],
    )
    console.log(`🔄 Updated password: ${email}`)
    return existing.id
  }

  const userId = newId()
  await run(
    `INSERT INTO users (id, company_id, name, email, password_hash, role, department, color, status)
     VALUES ($1,$2,$3,$4,$5,'admin','Management','#C4956A','active')`,
    [userId, companyId, name, email, hash],
  )
  await initUserSkills(companyId, userId, 'admin')
  console.log(`✅ Created: ${email}`)
  return userId
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
  const deptCount = Number((await queryOne('SELECT COUNT(*) as c FROM departments WHERE company_id = $1', [companyId]))?.c || 0)
  if (deptCount === 0) {
    const firstAdmin = await queryOne('SELECT id FROM users WHERE company_id = $1 LIMIT 1', [companyId])
    await initCompanyDepartments(companyId, firstAdmin?.id || newId())
  }

  const hash = await bcrypt.hash(PASSWORD, 10)
  for (const admin of ADMINS) {
    await upsertAdmin(companyId, admin.email, admin.name, hash)
  }

  console.log('\nSuper admins ready (role: admin):')
  for (const admin of ADMINS) {
    console.log(`  • ${admin.email}`)
  }
  console.log(`  Password: ${PASSWORD}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
