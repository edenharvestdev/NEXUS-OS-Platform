import { Request, Response } from 'express'
import { DEPARTMENT_DEFINITIONS, listDepartments } from '../lib/departments'

export async function getAll(req: Request, res: Response): Promise<void> {
  const depts = await listDepartments(req.user.company_id)
  res.json({
    data: depts,
    definitions: DEPARTMENT_DEFINITIONS,
  })
}
