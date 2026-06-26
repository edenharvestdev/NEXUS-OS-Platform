import { Request, Response } from 'express'
import { softDelete, restore, listDeleted, softDeleteHttpStatus } from '../lib/soft-delete'

function fail(res: Response, reason?: string): void {
  res.status(softDeleteHttpStatus(reason)).json({ error: reason })
}
function actor(req: Request) {
  return { id: req.user.id, role: req.user.role, companyId: req.user.company_id }
}

/** DELETE /api/admin/soft-delete/:resource/:id  { reason } */
export async function postSoftDelete(req: Request, res: Response): Promise<void> {
  const r = await softDelete(String(req.params.resource), String(req.params.id), actor(req), { reason: String(req.body?.reason || ''), source: 'user' })
  if (!r.ok) { fail(res, r.reason); return }
  res.json(r)
}

/** POST /api/admin/soft-delete/:resource/:id/restore  { reason } */
export async function postRestore(req: Request, res: Response): Promise<void> {
  const r = await restore(String(req.params.resource), String(req.params.id), actor(req), { reason: String(req.body?.reason || '') })
  if (!r.ok) { fail(res, r.reason); return }
  res.json(r)
}

/** GET /api/admin/soft-delete/:resource — list soft-deleted rows (owner/admin own
 *  tenant; platform_superadmin cross-tenant, view-only). */
export async function getDeleted(req: Request, res: Response): Promise<void> {
  const r = await listDeleted(String(req.params.resource), actor(req))
  if (!r.ok) { fail(res, r.reason); return }
  res.json(r.rows)
}
