import { Request, Response } from 'express'
import { queryOne, run } from '../lib/db'
import bcrypt from 'bcryptjs'
import { sanitizeUser } from '../lib/sanitize'

const DEFAULT_SETTINGS = {
  modules: { people: true, finance: true, sales: true, marketing: true, meeting: true, gpt: true, guardian: true, ai: true },
  theme: { dark: true, primary: '#C4956A', notif: true, lang: 'th' },
  ai_budget: 5000,
}

function parseSettings(raw: unknown) {
  if (!raw) return { ...DEFAULT_SETTINGS }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return { ...DEFAULT_SETTINGS, ...parsed, modules: { ...DEFAULT_SETTINGS.modules, ...parsed?.modules }, theme: { ...DEFAULT_SETTINGS.theme, ...parsed?.theme } }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function getSettings(req: Request, res: Response): Promise<void> {
  const company = await queryOne('SELECT * FROM companies WHERE id = $1', [req.user.company_id])
  const { password_hash, ...userSafe } = req.user
  res.json({
    company: {
      id: company?.id,
      name: company?.name || '',
      industry: company?.industry || '',
      size: company?.size || '',
      tax_id: company?.tax_id || '',
      address: company?.address || '',
    },
    profile: sanitizeUser(req.user),
    settings: parseSettings(company?.settings),
  })
}

export async function updateCompany(req: Request, res: Response): Promise<void> {
  const { name, industry, size, tax_id, address } = req.body
  await run(
    `UPDATE companies SET name = COALESCE($1, name), industry = COALESCE($2, industry),
     size = COALESCE($3, size), tax_id = COALESCE($4, tax_id), address = COALESCE($5, address)
     WHERE id = $6`,
    [name, industry, size, tax_id, address, req.user.company_id],
  )
  const company = await queryOne('SELECT * FROM companies WHERE id = $1', [req.user.company_id])
  res.json({ data: company })
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { name, phone, email_notify, line_user_id } = req.body
  await run(
    `UPDATE users SET
       name = COALESCE($1, name),
       phone = COALESCE($2, phone),
       email_notify = COALESCE($3, email_notify),
       line_user_id = COALESCE($4, line_user_id)
     WHERE id = $5 AND company_id = $6`,
    [
      name,
      phone,
      email_notify !== undefined ? (email_notify ? 1 : 0) : null,
      line_user_id !== undefined ? (line_user_id || null) : null,
      req.user.id,
      req.user.company_id,
    ],
  )
  const user = await queryOne('SELECT u.*, c.name as company_name FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = $1', [req.user.id])
  res.json({ user: sanitizeUser({ ...user, companies: { id: user.company_id, name: user.company_name } }) })
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const company = await queryOne('SELECT settings FROM companies WHERE id = $1', [req.user.company_id])
  const current = parseSettings(company?.settings)
  const next = {
    ...current,
    ...(req.body.modules ? { modules: { ...current.modules, ...req.body.modules } } : {}),
    ...(req.body.theme ? { theme: { ...current.theme, ...req.body.theme } } : {}),
    ...(req.body.ai_budget !== undefined ? { ai_budget: req.body.ai_budget } : {}),
  }
  await run('UPDATE companies SET settings = $1 WHERE id = $2', [JSON.stringify(next), req.user.company_id])
  res.json({ settings: next })
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'กรุณากรอกรหัสผ่านให้ครบ' }); return
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }); return
  }
  const user = await queryOne('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
  const valid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!valid) { res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }); return }
  const hash = await bcrypt.hash(newPassword, 10)
  await run('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id])
  res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' })
}
