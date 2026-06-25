import { queryAll, queryOne, run, newId } from './db'
import { DEFAULT_LEAVE_TYPES, DEFAULT_SHIFTS } from './nexus-hr-schema'
import { DEFAULT_OT_TYPES } from './nexus-hr-phase5-schema'
import { DEPARTMENT_DEFINITIONS } from './departments'

export async function ensureHrDefaults(companyId: string): Promise<void> {
  const settings = await queryOne('SELECT company_id FROM payroll_settings WHERE company_id = $1', [companyId])
  if (!settings) {
    await run(
      `INSERT INTO payroll_settings (company_id) VALUES ($1)`,
      [companyId],
    )
  }

  for (const lt of DEFAULT_LEAVE_TYPES) {
    const ex = await queryOne('SELECT id FROM leave_types WHERE company_id = $1 AND code = $2', [companyId, lt.code])
    if (!ex) {
      await run(
        `INSERT INTO leave_types (id, company_id, code, name, quota_days, paid) VALUES ($1,$2,$3,$4,$5,$6)`,
        [newId(), companyId, lt.code, lt.name, lt.quota_days, lt.paid],
      )
    }
  }

  for (const sh of DEFAULT_SHIFTS) {
    const ex = await queryOne('SELECT id FROM work_shifts WHERE company_id = $1 AND code = $2', [companyId, sh.code])
    if (!ex) {
      await run(
        `INSERT INTO work_shifts (id, company_id, code, name, start_time, end_time, break_minutes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [newId(), companyId, sh.code, sh.name, sh.start_time, sh.end_time, sh.break_minutes],
      )
    }
  }

  const orgCount = await queryOne('SELECT COUNT(*) as c FROM org_units WHERE company_id = $1', [companyId])
  if (Number(orgCount?.c || 0) === 0) {
    const rootId = newId()
    await run(
      `INSERT INTO org_units (id, company_id, parent_id, level, code, name_th, name_en) VALUES ($1,$2,NULL,1,'ROOT','องค์กรหลัก','Organization')`,
      [rootId, companyId],
    )
    for (const dept of DEPARTMENT_DEFINITIONS) {
      const deptId = newId()
      await run(
        `INSERT INTO org_units (id, company_id, parent_id, level, code, name_th, name_en) VALUES ($1,$2,$3,2,$4,$5,$6)`,
        [deptId, companyId, rootId, dept.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8), dept.label_th, dept.name],
      )
      for (const sub of dept.subUnits ?? []) {
        await run(
          `INSERT INTO org_units (id, company_id, parent_id, level, code, name_th, name_en) VALUES ($1,$2,$3,3,$4,$5,$6)`,
          [newId(), companyId, deptId, sub.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8), sub.label_th, sub.name],
        )
      }
    }
  }

  const posCount = await queryOne('SELECT COUNT(*) as c FROM positions WHERE company_id = $1', [companyId])
  if (Number(posCount?.c || 0) === 0) {
    const defaults = ['ผู้จัดการ', 'เจ้าหน้าที่', 'หัวหน้าแผนก', 'ผู้ช่วย']
    for (const name of defaults) {
      const code = name.slice(0, 6).toUpperCase()
      await run(
        `INSERT INTO positions (id, company_id, code, name) VALUES ($1,$2,$3,$4)`,
        [newId(), companyId, code, name],
      )
    }
  }

  const grp = await queryOne('SELECT id FROM permission_groups WHERE company_id = $1 AND name = $2', [companyId, 'Default HR'])
  if (!grp) {
    await run(
      `INSERT INTO permission_groups (id, company_id, name, modules) VALUES ($1,$2,$3,$4)`,
      [newId(), companyId, 'Default HR', JSON.stringify(['people', 'reports', 'advances', 'org', 'payroll'])],
    )
  }

  for (const ot of DEFAULT_OT_TYPES) {
    const ex = await queryOne('SELECT id FROM overtime_types WHERE company_id = $1 AND code = $2', [companyId, ot.code])
    if (!ex) {
      await run(
        `INSERT INTO overtime_types (id, company_id, code, name, day_type, multiplier) VALUES ($1,$2,$3,$4,$5,$6)`,
        [newId(), companyId, ot.code, ot.name, ot.day_type, ot.multiplier],
      )
    }
  }
}

export async function syncEmployeeProfiles(companyId: string): Promise<void> {
  const users = await queryAll('SELECT id FROM users WHERE company_id = $1', [companyId])
  for (const u of users) {
    const ex = await queryOne('SELECT user_id FROM employee_profiles WHERE user_id = $1', [u.id])
    if (!ex) {
      await run(
        `INSERT INTO employee_profiles (user_id, company_id, employee_code) VALUES ($1,$2,$3)`,
        [u.id, companyId, `EMP-${String(u.id).slice(0, 6).toUpperCase()}`],
      )
    }
  }
}
