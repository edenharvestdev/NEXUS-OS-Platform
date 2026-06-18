import { queryOne, run, newId } from './db'
import { sendEmail } from './email-notify'
import { pushLineMessage } from './line-notify'

export async function deliverNotification(payload: {
  notificationId: string
  userId: string
  companyId: string
}): Promise<void> {
  const n = await queryOne(
    `SELECT n.*, u.email, u.line_user_id, u.email_notify
     FROM notifications n JOIN users u ON u.id = n.user_id
     WHERE n.id = $1`,
    [payload.notificationId],
  )
  if (!n) return

  await recordDelivery(payload.notificationId, 'in_app', 'sent')

  if (n.email && n.email_notify !== 0) {
    const result = await sendEmail({
      to: n.email,
      subject: `[NEXUS OS] ${n.title}`,
      text: `${n.title}\n\n${n.body || ''}`,
    })
    await recordDelivery(
      payload.notificationId,
      'email',
      result.ok ? 'sent' : 'failed',
      result.detail,
    )
  }

  if (n.line_user_id) {
    const result = await pushLineMessage(n.line_user_id, `${n.title}\n${n.body || ''}`)
    await recordDelivery(
      payload.notificationId,
      'line',
      result.ok ? 'sent' : 'failed',
      result.detail,
    )
  }
}

async function recordDelivery(
  notificationId: string,
  channel: string,
  status: string,
  error?: string,
) {
  await run(
    `INSERT INTO notification_deliveries (id, notification_id, channel, status, error)
     VALUES ($1,$2,$3,$4,$5)`,
    [newId(), notificationId, channel, status, error || null],
  )
}

export async function enqueueNotificationDelivery(
  notificationId: string,
  userId: string,
  companyId: string,
): Promise<void> {
  const { enqueueJob } = await import('./job-queue')
  await enqueueJob('notification_delivery', { notificationId, userId, companyId }, 500)
}
