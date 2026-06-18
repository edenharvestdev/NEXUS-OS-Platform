import { queryAll, queryOne, run, newId } from './db'
import { DEFAULT_DEPARTMENTS } from './nexus-extended-schema'
import { initUserSkills } from './skill-wallet'

/** แผนกมาตรฐาน — 1 แผนก = 1 system role = 1 module หลัก */
export const DEPARTMENT_DEFINITIONS: Array<{
  name: string
  systemRole: string
  label_th: string
}> = [
  { name: 'Management', systemRole: 'admin', label_th: 'ผู้บริหาร' },
  { name: 'Finance', systemRole: 'finance', label_th: 'การเงิน' },
  { name: 'HR', systemRole: 'hr', label_th: 'ทรัพยากรบุคคล' },
  { name: 'Sales', systemRole: 'sales', label_th: 'ขาย' },
  { name: 'Marketing', systemRole: 'marketing', label_th: 'การตลาด' },
  { name: 'IT', systemRole: 'it', label_th: 'เทคโนโลยีสารสนเทศ' },
  { name: 'Operation', systemRole: 'staff', label_th: 'ปฏิบัติการ' },
]

const DEPT_MAP = new Map(DEPARTMENT_DEFINITIONS.map(d => [d.name, d]))

export function getSystemRoleForDepartment(department: string): string {
  return DEPT_MAP.get(department)?.systemRole || 'staff'
}

export function isValidDepartment(department: string): boolean {
  return DEPT_MAP.has(department)
}

export async function initCompanyDepartments(companyId: string, adminUserId: string): Promise<void> {
  for (const dept of DEPARTMENT_DEFINITIONS) {
    const exists = await queryOne(
      'SELECT id FROM departments WHERE company_id = $1 AND name = $2',
      [companyId, dept.name],
    )
    if (!exists) {
      await run(
        'INSERT INTO departments (id, company_id, name, head_user_id) VALUES ($1,$2,$3,$4)',
        [newId(), companyId, dept.name, dept.name === 'Management' ? adminUserId : null],
      )
    }
  }
}

export async function listDepartments(companyId: string) {
  const rows = await queryAll(
    `SELECT d.*, u.name as head_name,
      (SELECT COUNT(*) FROM users WHERE company_id = d.company_id AND department = d.name AND status = 'active') as headcount
     FROM departments d LEFT JOIN users u ON u.id = d.head_user_id
     WHERE d.company_id = $1 ORDER BY d.name`,
    [companyId],
  )
  if (rows.length) return rows
  return DEPARTMENT_DEFINITIONS.map(d => ({
    name: d.name,
    systemRole: d.systemRole,
    label_th: d.label_th,
    headcount: 0,
  }))
}

/** admin/hr เห็นทั้ง org · แผนกอื่นเห็นเฉพาะแผนกตัวเอง */
export function departmentScope(user: { role?: string; department?: string }): string | null {
  const role = (user.role || 'staff').toLowerCase()
  if (role === 'admin' || role === 'hr') return null
  return user.department || null
}

export function canReviewWorkLog(
  viewer: { id: string; role?: string; department?: string },
  log: { user_id?: string; department?: string },
): boolean {
  const role = (viewer.role || 'staff').toLowerCase()
  if (role === 'admin' || role === 'hr') return true
  if (role === 'staff') return false
  if (log.user_id === viewer.id) return false
  return !!viewer.department && viewer.department === log.department
}

export async function assignDepartmentHead(companyId: string, department: string, userId: string): Promise<void> {
  await run(
    'UPDATE departments SET head_user_id = $1 WHERE company_id = $2 AND name = $3',
    [userId, companyId, department],
  )
}

export async function createDepartmentEmployee(
  companyId: string,
  data: { name: string; email: string; password: string; department: string; phone?: string; salary?: string; color?: string },
): Promise<any> {
  if (!isValidDepartment(data.department)) {
    throw new Error(`แผนกไม่ถูกต้อง — ใช้ได้: ${DEFAULT_DEPARTMENTS.join(', ')}`)
  }
  const systemRole = getSystemRoleForDepartment(data.department)
  if (systemRole === 'admin') {
    throw new Error('ไม่สามารถสร้าง admin ซ้ำผ่าน HR — ใช้ Management เฉพาะเจ้าขององค์กร')
  }

  const id = newId()
  const bcrypt = await import('bcryptjs')
  const hash = await bcrypt.hash(data.password, 10)
  const { encryptField } = await import('./encryption')
  const encSalary = data.salary ? encryptField(String(data.salary)) : ''

  await run(
    `INSERT INTO users (id, company_id, name, email, password_hash, role, department, phone, salary, color, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active')`,
    [id, companyId, data.name, data.email, hash, systemRole, data.department, data.phone || '', encSalary, data.color || '#C4956A'],
  )

  const head = await queryOne(
    'SELECT head_user_id FROM departments WHERE company_id = $1 AND name = $2',
    [companyId, data.department],
  )
  if (!head?.head_user_id) {
    await assignDepartmentHead(companyId, data.department, id)
  }

  await initUserSkills(companyId, id, systemRole)
  return queryOne('SELECT * FROM users WHERE id = $1', [id])
}
