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

export async function getMe(req: Request, res: Response): Promise<void> {
  res.json({ user: sanitizeUser(req.user) })
}
