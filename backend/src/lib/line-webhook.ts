import crypto from 'crypto'
import { run, newId, queryOne } from './db'

function verifySignature(rawBody: string, signature: string | undefined): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
  return expected === signature
}

async function resolveCompanyId(lineUserId: string | null, fallback?: string): Promise<string | null> {
  if (lineUserId) {
    const byUser = await queryOne(
      `SELECT company_id FROM users WHERE line_user_id = $1 AND status = 'active' LIMIT 1`,
      [lineUserId],
    )
    if (byUser?.company_id) return byUser.company_id
  }
  return fallback || process.env.LINE_DEFAULT_COMPANY_ID || null
}

async function resolveWorkLogUser(companyId: string, lineUserId: string | null) {
  if (lineUserId) {
    const linked = await queryOne(
      `SELECT id FROM users WHERE company_id = $1 AND line_user_id = $2 AND status = 'active'`,
      [companyId, lineUserId],
    )
    if (linked) return linked
  }
  return queryOne(
    `SELECT id FROM users WHERE company_id = $1 AND status = 'active' ORDER BY created_at ASC LIMIT 1`,
    [companyId],
  )
}

export async function handleLineWebhook(
  body: any,
  opts?: { rawBody?: string; signature?: string; companyId?: string },
): Promise<{ ok: boolean; message: string }> {
  const raw = opts?.rawBody || JSON.stringify(body)
  if (!verifySignature(raw, opts?.signature)) {
    return { ok: false, message: 'Invalid LINE signature' }
  }

  const events = body?.events || []
  let processed = 0

  for (const ev of events) {
    const lineUserId = ev.source?.userId || null
    const eventId = newId()
    const cid = await resolveCompanyId(lineUserId, opts?.companyId)

    await run(
      `INSERT INTO line_events (id, company_id, line_user_id, event_type, payload, processed)
       VALUES ($1,$2,$3,$4,$5,0)`,
      [eventId, cid, lineUserId, ev.type || 'message', JSON.stringify(ev)],
    )

    try {
      if (ev.type === 'message' && ev.message?.type === 'text' && cid) {
        const text = ev.message.text?.trim() || ''
        if (text.startsWith('LOG:')) {
          const user = await resolveWorkLogUser(cid, lineUserId)
          if (user) {
            await run(
              `INSERT INTO work_logs (id, company_id, user_id, role, department, action_type, object, status, security_tier)
               VALUES ($1,$2,$3,'staff','Operation','submit',$4,'review','T1')`,
              [newId(), cid, user.id, text.replace(/^LOG:\s*/, '')],
            )
          }
        } else if (text.startsWith('LINK:')) {
          const code = text.replace(/^LINK:\s*/, '').trim()
          if (lineUserId && code) {
            await run(
              `UPDATE users SET line_user_id = $1 WHERE company_id = $2 AND email = $3`,
              [lineUserId, cid, code],
            )
          }
        }
      }
      await run('UPDATE line_events SET processed = 1 WHERE id = $1', [eventId])
      processed++
    } catch (e: any) {
      await run('UPDATE line_events SET processed = 0, payload = payload WHERE id = $1', [eventId]).catch(() => {})
    }
  }

  return { ok: true, message: `Processed ${processed}/${events.length} LINE event(s)` }
}

export function getLineConfig(): {
  webhook_path: string
  channel_configured: boolean
  usage: string
  link_command: string
} {
  return {
    webhook_path: '/api/line/webhook',
    channel_configured: !!(process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN),
    usage: 'Staff sends "LOG: description" via LINE OA to create work log',
    link_command: 'LINK: your@email.com — bind LINE user to account (set line_user_id)',
  }
}
