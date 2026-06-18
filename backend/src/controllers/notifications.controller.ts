import { Request, Response } from 'express'
import {
  listNotifications,
  markRead,
  markAllRead,
  unreadCount,
} from '../lib/notifications'

export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await listNotifications(req.user.id, req.user.company_id)
  res.json({ data })
}

export async function getUnread(req: Request, res: Response): Promise<void> {
  const count = await unreadCount(req.user.id, req.user.company_id)
  res.json({ count })
}

export async function readOne(req: Request, res: Response): Promise<void> {
  await markRead(String(req.params.id), req.user.id, req.user.company_id)
  res.json({ success: true })
}

export async function readAll(req: Request, res: Response): Promise<void> {
  await markAllRead(req.user.id, req.user.company_id)
  res.json({ success: true })
}
