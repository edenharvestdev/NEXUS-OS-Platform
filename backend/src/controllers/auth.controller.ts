import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import { sanitizeUser } from '../lib/sanitize'
import { initCompanyDepartments } from '../lib/departments'
import { initUserSkills } from '../lib/skill-wallet'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production')
  return secret || 'nexasos_dev_secret_change_in_production'
}

export async function signup(req: Request, res: Response): Promise<void> {
  const { email, password, name, companyName } = req.body
  if (!email || !password || !name || !companyName) {
    res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' }); return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }); return
  }
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) { res.status(400).json({ error: 'Email นี้มีผู้ใช้งานแล้ว' }); return }

  const hash = await bcrypt.hash(password, 10)
  const company_id = newId(), user_id = newId()
  const slug = `${companyName.toLowerCase().replace(/\s+/g,'-')}-${Date.now()}`

  await run('INSERT INTO companies (id,name,slug) VALUES ($1,$2,$3)', [company_id, companyName, slug])
  await run(
    `INSERT INTO users (id,company_id,name,email,password_hash,role,department,color) VALUES ($1,$2,$3,$4,$5,'admin','Management','#C4956A')`,
    [user_id, company_id, name, email, hash]
  )
  await initCompanyDepartments(company_id, user_id)
  await initUserSkills(company_id, user_id, 'admin')
  await run(
    `INSERT INTO onboarding_state (company_id, industry, step, completed) VALUES ($1, 'generic', 0, 0)`,
    [company_id],
  )
  res.json({ success: true, message: 'สมัครสมาชิกสำเร็จ — ลงชื่อเข้าใช้แล้วตั้งค่าแผนกและเพิ่มพนักงานใน HR' })
}

export async function signin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body
  if (!email || !password) { res.status(400).json({ error: 'กรุณากรอก Email และ Password' }); return }

  const user = await queryOne(
    `SELECT u.*, c.name as company_name FROM users u
     LEFT JOIN companies c ON c.id = u.company_id WHERE u.email = $1`,
    [email]
  )
  if (!user) { res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }); return }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) { res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }); return }

  const token = jwt.sign({ id: user.id, company_id: user.company_id }, getJwtSecret(), { expiresIn: '7d' })
  res.json({
    token,
    user: sanitizeUser({ ...user, companies: { id: user.company_id, name: user.company_name } }),
  })
}

function impersonationResponse(req: Request) {
  if (req.impersonation?.active && req.impersonation.actor) {
    return {
      active: true,
      actor: sanitizeUser(req.impersonation.actor),
    }
  }
  if (req.impersonation?.canImpersonate) {
    return { active: false, canImpersonate: true }
  }
  return { active: false, canImpersonate: false }
}

async function resolveActor(req: Request) {
  const actorId = req.jwtPayload?.impersonated_by || req.user?.id
  if (!actorId) return null
  return queryOne(
    `SELECT u.*, c.name as company_name FROM users u
     LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = $1`,
    [actorId],
  )
}

function issueToken(user: { id: string; company_id: string }, impersonatedBy?: string) {
  const payload: Record<string, string> = { id: user.id, company_id: user.company_id }
  if (impersonatedBy) payload.impersonated_by = impersonatedBy
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export async function getMe(req: Request, res: Response): Promise<void> {
  res.json({
    user: sanitizeUser(req.user),
    impersonation: impersonationResponse(req),
  })
}

/** Admin only — list company users available for impersonation */
export async function getImpersonateTargets(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req)
  if (!actor || actor.role?.toLowerCase() !== 'admin') {
    res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' })
    return
  }
  const rows = await queryAll(
    `SELECT id, name, email, role, department, color FROM users
     WHERE company_id = $1 ORDER BY department, name`,
    [actor.company_id],
  )
  res.json({ data: rows })
}

/** Admin only — act as another user in the same company */
export async function impersonate(req: Request, res: Response): Promise<void> {
  const actor = await resolveActor(req)
  if (!actor || actor.role?.toLowerCase() !== 'admin') {
    res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' })
    return
  }

  const { userId } = req.body
  if (!userId) {
    res.status(400).json({ error: 'กรุณาระบุ userId' })
    return
  }

  if (userId === actor.id) {
    const token = issueToken(actor)
    res.json({
      token,
      user: sanitizeUser({ ...actor, companies: { id: actor.company_id, name: actor.company_name } }),
      impersonation: { active: false, canImpersonate: true },
    })
    return
  }

  const target = await queryOne(
    `SELECT u.*, c.name as company_name FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE u.id = $1 AND u.company_id = $2`,
    [userId, actor.company_id],
  )
  if (!target) {
    res.status(404).json({ error: 'ไม่พบพนักงานในองค์กรนี้' })
    return
  }

  const token = issueToken(target, actor.id)
  res.json({
    token,
    user: sanitizeUser({ ...target, companies: { id: target.company_id, name: target.company_name } }),
    impersonation: {
      active: true,
      actor: sanitizeUser(actor),
    },
  })
}

/** Return to the admin account after impersonation */
export async function stopImpersonate(req: Request, res: Response): Promise<void> {
  const actorId = req.jwtPayload?.impersonated_by
  if (!actorId) {
    res.status(400).json({ error: 'ไม่ได้อยู่ในโหมดสวมสิทธิ์' })
    return
  }

  const actor = await queryOne(
    `SELECT u.*, c.name as company_name FROM users u
     LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = $1`,
    [actorId],
  )
  if (!actor) {
    res.status(404).json({ error: 'ไม่พบบัญชีผู้ดูแลระบบ' })
    return
  }

  const token = issueToken(actor)
  res.json({
    token,
    user: sanitizeUser({ ...actor, companies: { id: actor.company_id, name: actor.company_name } }),
    impersonation: { active: false, canImpersonate: true },
  })
}
