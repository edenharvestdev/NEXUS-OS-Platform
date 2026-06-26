import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { postSoftDelete, postRestore, getDeleted } from '../controllers/soft-delete.controller'

const r = Router()
// Soft Delete v1 (dark). Authenticated; resource + tenant + role enforced in the
// lib. The actor's company comes from the token, never the body/params.
r.get('/:resource', authMiddleware, getDeleted)
r.delete('/:resource/:id', authMiddleware, postSoftDelete)
r.post('/:resource/:id/restore', authMiddleware, postRestore)
export default r
