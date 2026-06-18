import express, { Request, Response } from 'express'
import { handleLineWebhook, getLineConfig } from '../lib/line-webhook'

export async function webhook(req: Request, res: Response): Promise<void> {
  const rawBody = (req as any).rawBody as string | undefined
  const signature = req.headers['x-line-signature'] as string | undefined
  const result = await handleLineWebhook(req.body, {
    rawBody,
    signature,
    companyId: process.env.LINE_DEFAULT_COMPANY_ID,
  })
  if (!result.ok) {
    res.status(401).json(result)
    return
  }
  res.json(result)
}

export async function config(_req: Request, res: Response): Promise<void> {
  res.json(getLineConfig())
}

/** Capture raw body for LINE signature verification */
export const lineRawParser = express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf.toString('utf8')
  },
})
