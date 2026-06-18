import { Request, Response } from 'express'
import { importCSV, getIngestionJobs } from '../lib/excel-import'
import { writeAudit } from '../lib/audit'

export async function importData(req: Request, res: Response): Promise<void> {
  const { csv, target = 'transactions' } = req.body
  if (!csv?.trim()) { res.status(400).json({ error: 'csv content required' }); return }
  const allowed = ['transactions', 'employees', 'dictionary', 'pos']
  if (!allowed.includes(target)) { res.status(400).json({ error: 'Invalid target' }); return }

  const result = await importCSV(req.user.company_id, req.user.id, csv, target)
  await writeAudit({
    companyId: req.user.company_id,
    userId: req.user.id,
    action: 'data_import',
    resource: target,
    meta: result,
  })
  res.json(result)
}

export async function getJobs(req: Request, res: Response): Promise<void> {
  const jobs = await getIngestionJobs(req.user.company_id)
  res.json({ data: jobs })
}
