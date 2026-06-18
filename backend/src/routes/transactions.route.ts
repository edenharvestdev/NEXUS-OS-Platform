import { Router } from 'express'
import * as c from '../controllers/transactions.controller'
import { authMiddleware } from '../middleware/auth'
const r = Router()
r.use(authMiddleware)
r.get('/', c.getAll)
r.post('/ocr', c.ocrReceipt)
r.get('/export/csv', c.exportCSV)
r.post('/', c.create)
r.patch('/:id', c.updateStatus)
r.delete('/:id', c.remove)
export default r
