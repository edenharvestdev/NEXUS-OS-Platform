import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'
import { encryptField, sanitizeUserForRole } from '../lib/encryption'
import {
  createDepartmentEmployee,
  departmentScope,
  isValidDepartment,
  getSystemRoleForDepartment,
} from '../lib/departments'
import { sanitizeUser, sanitizeUsers } from '../lib/sanitize'

export async function getAll(req: Request, res: Response): Promise<void> {
  const scope = departmentScope(req.user)
  const params: any[] = [req.user.company_id]
  let sql = 'SELECT * FROM users WHERE company_id = $1'
  if (scope) {
    sql += ' AND department = $2'
    params.push(scope)
  }
  sql += ' ORDER BY department, name'
  const rows = await queryAll(sql, params)
  res.json({ data: rows.map((u: any) => sanitizeUserForRole(sanitizeUser(u), req.user.role)) })
}

export async function create(req: Request, res: Response): Promise<void> {
  const { email, password, name, department, dept, phone, salary, color } = req.body
  const finalDept = department || dept
  if (!name || !email || !password || !finalDept) {
    res.status(400).json({ error: 'กรุณากรอก ชื่อ, อีเมล, รหัสผ่าน, แผนก' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
    return
  }
  if (!isValidDepartment(finalDept)) {
    res.status(400).json({ error: 'แผนกไม่ถูกต้อง — เลือกจากรายการแผนกมาตรฐาน' })
    return
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) { res.status(400).json({ error: 'Email นี้มีผู้ใช้งานแล้ว' }); return }

  try {
    const data = await createDepartmentEmployee(req.user.company_id, {
      name,
      email,
      password,
      department: finalDept,
      phone,
      salary,
      color,
    })
    res.json({
      data: sanitizeUserForRole(sanitizeUser(data), req.user.role),
      systemRole: getSystemRoleForDepartment(finalDept),
    })
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'สร้างพนักงานไม่สำเร็จ' })
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const fields = ['name', 'phone', 'salary', 'color', 'status', 'leave_used']
  const updates: string[] = []
  const vals: any[] = []
  let i = 1

  if (req.body.department !== undefined) {
    if (!isValidDepartment(req.body.department)) {
      res.status(400).json({ error: 'แผนกไม่ถูกต้อง' })
      return
    }
    updates.push(`department = $${i++}`)
    vals.push(req.body.department)
    updates.push(`role = $${i++}`)
    vals.push(getSystemRoleForDepartment(req.body.department))
  }

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      let val = req.body[f]
      if (f === 'salary' && val) val = encryptField(String(val))
      updates.push(`${f} = $${i++}`)
      vals.push(val)
    }
  }
  if (!updates.length) { res.status(400).json({ error: 'No fields' }); return }
  vals.push(String(id), req.user.company_id)
  await run(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i++} AND company_id = $${i}`, vals)
  const data = await queryOne('SELECT * FROM users WHERE id = $1', [id])
  res.json({ data: sanitizeUser(data) })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  if (id === req.user.id) { res.status(400).json({ error: 'ไม่สามารถลบตัวเองได้' }); return }
  const target = await queryOne('SELECT role FROM users WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  if (target?.role === 'admin') { res.status(400).json({ error: 'ไม่สามารถลบผู้บริหารหลักได้' }); return }
  await run('DELETE FROM users WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  res.json({ success: true })
}

// ── POST /api/employees/:id/review ───────────────────────────────
export async function reviewPerformance(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const emp = await queryOne('SELECT * FROM users WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  if (!emp) { res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' }); return }

  const scope = departmentScope(req.user)
  if (scope && emp.department !== scope) {
    res.status(403).json({ error: 'ดูได้เฉพาะพนักงานในแผนกของคุณ' })
    return
  }

  const prompt = `คุณคือผู้เชี่ยวชาญด้านทรัพยากรบุคคล (HR Expert)
วิเคราะห์ประสิทธิภาพการทำงานของพนักงานคนนี้:
ชื่อ: ${emp.name}
แผนก: ${emp.department}
บทบาทระบบ: ${emp.role}

ให้ประเมินในหัวข้อ:
1. จุดแข็งและศักยภาพ
2. ประเด็นที่ควรปรับปรุง
3. ข้อแนะนำในการพัฒนาอาชีพ (Career Path)
4. การพิจารณาเงินเดือน/โบนัส

ตอบเป็น JSON:
{
  "rating": 4.5,
  "summary": "สรุปภาพรวม",
  "strengths": ["ข้อดี 1", "ข้อดี 2"],
  "improvements": ["สิ่งที่ต้องแก้ 1"],
  "advice": "คำแนะนำสั้นๆ"
}`

  try {
    // Route through the brokered entry (not gemini.ts direct) so employee/HR data
    // egress is classified + redacted + logged. AIEG-2: flag it RESTRICTED.
    const { askAIJSON } = await import('../lib/ai-providers')
    const result = await askAIJSON(prompt, { dataClass: 'RESTRICTED', taskType: 'hr', prefer: ['gemini'] })

    await run(
      `INSERT INTO ai_logs (id,company_id,user_id,agent,action,tokens_used,cost_thb)
       VALUES ($1,$2,$3,'HR AI','ประเมินผล: ${emp.name}',400,0.12)`,
      [newId(), req.user.company_id, req.user.id]
    )

    res.json({ data: result })
  } catch {
    res.status(500).json({ error: 'AI ประเมินผลล้มเหลว' })
  }
}
