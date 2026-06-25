/**
 * One-off: create the "Saduak Suay Mai PCL" company on the connected DB with
 * one login per department (password = test1234) and seed the org tree.
 * Fully idempotent/resumable: re-running only fills in what's missing.
 *
 * Run against prod:
 *   DATABASE_URL="$PUBLIC_URL" node --require ts-node/register scripts/seed-saduak.ts
 */
import bcrypt from 'bcryptjs'
import { run, queryOne, newId } from '../src/lib/db'
import { initCompanyDepartments, DEPARTMENT_DEFINITIONS } from '../src/lib/departments'
import { initUserSkills } from '../src/lib/skill-wallet'
import { ensureHrDefaults } from '../src/lib/hr-init'

const COMPANY = 'Saduak Suay Mai PCL'
const DOMAIN = 'saduaksuaymai.co'
const PASSWORD = process.env.SADUAK_SEED_PASSWORD || 'test1234'

async function ensureUser(
  companyId: string, email: string, role: string, department: string, label: string, color: string,
): Promise<void> {
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) { console.log(`  • ${email} exists — skipped`); return }
  const hash = await bcrypt.hash(PASSWORD, 10)
  const uid = newId()
  await run(
    `INSERT INTO users (id,company_id,name,email,password_hash,role,department,color,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')`,
    [uid, companyId, label, email, hash, role, department, color],
  )
  await initUserSkills(companyId, uid, role)
  console.log(`  ✓ ${email}  | role=${role} | ${department}`)
}

async function main() {
  let company = await queryOne('SELECT id FROM companies WHERE name = $1', [COMPANY])
  let companyId: string
  if (company) {
    companyId = company.id
    console.log(`Company "${COMPANY}" exists (${companyId}) — ensuring users/org.\n`)
  } else {
    companyId = newId()
    await run('INSERT INTO companies (id,name,slug) VALUES ($1,$2,$3)', [companyId, COMPANY, `saduak-suay-mai-${Date.now()}`])
    console.log(`Created company "${COMPANY}" (${companyId})\n`)
  }

  console.log('Users:')
  // Owner / super-admin first so departments get a head.
  const ownerEmail = `admin@${DOMAIN}`
  let owner = await queryOne('SELECT id FROM users WHERE email = $1', [ownerEmail])
  let ownerId: string
  if (owner) {
    ownerId = owner.id
    console.log(`  • ${ownerEmail} exists — skipped`)
  } else {
    ownerId = newId()
    const hash = await bcrypt.hash(PASSWORD, 10)
    await run(
      `INSERT INTO users (id,company_id,name,email,password_hash,role,department,color,status)
       VALUES ($1,$2,$3,$4,$5,'admin','CEO Office','#C4956A','active')`,
      [ownerId, companyId, 'ผู้ดูแลระบบ (Owner)', ownerEmail, hash],
    )
    await initUserSkills(companyId, ownerId, 'admin')
    console.log(`  ✓ ${ownerEmail}  | role=admin | CEO Office (owner)`)
  }

  await initCompanyDepartments(companyId, ownerId)
  const ob = await queryOne('SELECT company_id FROM onboarding_state WHERE company_id = $1', [companyId])
  if (!ob) {
    await run(`INSERT INTO onboarding_state (company_id, industry, step, completed) VALUES ($1, 'generic', 0, 0)`, [companyId])
  }

  // One role-user per real department.
  for (const d of DEPARTMENT_DEFINITIONS) {
    await ensureUser(companyId, `${d.systemRole}@${DOMAIN}`, d.systemRole, d.name, `หัวหน้า${d.label_th}`, '#8B6F47')
  }

  // Seed the org tree (root + 10 departments + Operations sub-units).
  await ensureHrDefaults(companyId)
  const units = await queryOne('SELECT COUNT(*) c FROM org_units WHERE company_id = $1', [companyId])
  console.log(`\nOrg tree: ${units?.c} units · company ${companyId}`)
  console.log(`All logins use password: ${PASSWORD}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error('FAILED:', e); process.exit(1) })
