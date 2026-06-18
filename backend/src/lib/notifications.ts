import { queryAll, queryOne, run, newId } from './db'

export async function createNotification(opts: {
  companyId: string
  userId: string
  fromUserId?: string
  type: string
  title: string
  body?: string
  meta?: Record<string, unknown>
}): Promise<string> {
  const id = newId()
  await run(
    `INSERT INTO notifications (id, company_id, user_id, from_user_id, type, title, body, meta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id, opts.companyId, opts.userId, opts.fromUserId || null,
      opts.type, opts.title, opts.body || null,
      JSON.stringify(opts.meta || {}),
    ],
  )
  return id
}

/** Create notification + queue email/LINE delivery */
export async function createAndDeliverNotification(opts: {
  companyId: string
  userId: string
  fromUserId?: string
  type: string
  title: string
  body?: string
  meta?: Record<string, unknown>
}): Promise<string> {
  const id = await createNotification(opts)
  try {
    const { enqueueNotificationDelivery } = await import('./delivery')
    await enqueueNotificationDelivery(id, opts.userId, opts.companyId)
  } catch { /* in-app still works */ }
  return id
}

/** หา head แผนก + admin สำหรับแจ้งงาน */
export async function getManagerRecipients(
  companyId: string,
  department?: string,
): Promise<Array<{ id: string; name: string; role: string }>> {
  const recipients: Array<{ id: string; name: string; role: string }> = []

  if (department) {
    const dept = await queryOne(
      'SELECT head_user_id FROM departments WHERE company_id = $1 AND name = $2',
      [companyId, department],
    )
    if (dept?.head_user_id) {
      const head = await queryOne('SELECT id, name, role FROM users WHERE id = $1', [dept.head_user_id])
      if (head) recipients.push(head)
    }
    const deptLeads = await queryAll(
      `SELECT id, name, role FROM users
       WHERE company_id = $1 AND department = $2 AND role NOT IN ('staff') AND status = 'active'`,
      [companyId, department],
    )
    for (const u of deptLeads) {
      if (!recipients.find(r => r.id === u.id)) recipients.push(u)
    }
  }

  const admins = await queryAll(
    `SELECT id, name, role FROM users WHERE company_id = $1 AND role = 'admin' AND status = 'active' LIMIT 3`,
    [companyId],
  )
  for (const a of admins) {
    if (!recipients.find(r => r.id === a.id)) recipients.push(a)
  }

  return recipients
}

export async function notifyWorkSubmitted(opts: {
  companyId: string
  fromUserId: string
  fromUserName: string
  department?: string
  object?: string
  workLogId: string
}): Promise<void> {
  const managers = await getManagerRecipients(opts.companyId, opts.department)
  const title = `📋 ${opts.fromUserName} ส่งงานรอตรวจ`
  const body = opts.object || 'งานใหม่รอการอนุมัติ'
  for (const m of managers) {
    if (m.id === opts.fromUserId) continue
    await createAndDeliverNotification({
      companyId: opts.companyId,
      userId: m.id,
      fromUserId: opts.fromUserId,
      type: 'work_submitted',
      title,
      body,
      meta: { work_log_id: opts.workLogId, department: opts.department },
    })
  }
}

export async function notifyWorkReviewed(opts: {
  companyId: string
  employeeId: string
  reviewerId: string
  reviewerName: string
  status: string
  object?: string
  workLogId: string
}): Promise<void> {
  const statusLabel = opts.status === 'approved' ? 'อนุมัติแล้ว ✓' : opts.status === 'rejected' ? 'ตีกลับ' : 'ขอแก้ไข'
  await createAndDeliverNotification({
    companyId: opts.companyId,
    userId: opts.employeeId,
    fromUserId: opts.reviewerId,
    type: `work_${opts.status}`,
    title: `${statusLabel} — ${opts.object || 'Work Log'}`,
    body: `หัวหน้า ${opts.reviewerName} ${statusLabel} งานของคุณ`,
    meta: { work_log_id: opts.workLogId, status: opts.status },
  })
}

export async function notifyTaskAssigned(opts: {
  companyId: string
  toUserId: string
  fromUserId: string
  title: string
  assignmentId: string
  matchScore?: number
}): Promise<void> {
  await createAndDeliverNotification({
    companyId: opts.companyId,
    userId: opts.toUserId,
    fromUserId: opts.fromUserId,
    type: 'task_assigned',
    title: `🎯 งานใหม่: ${opts.title}`,
    body: opts.matchScore ? `AI จับคู่ Skill คะแนน ${Math.round(opts.matchScore)}%` : undefined,
    meta: { assignment_id: opts.assignmentId },
  })
}

export async function listNotifications(userId: string, companyId: string, limit = 50) {
  return queryAll(
    `SELECT n.*, fu.name as from_name FROM notifications n
     LEFT JOIN users fu ON fu.id = n.from_user_id
     WHERE n.company_id = $1 AND n.user_id = $2
     ORDER BY n.created_at DESC LIMIT $3`,
    [companyId, userId, limit],
  )
}

export async function markRead(id: string, userId: string, companyId: string): Promise<void> {
  await run(
    'UPDATE notifications SET read_flag = 1 WHERE id = $1 AND user_id = $2 AND company_id = $3',
    [id, userId, companyId],
  )
}

export async function markAllRead(userId: string, companyId: string): Promise<void> {
  await run(
    'UPDATE notifications SET read_flag = 1 WHERE user_id = $1 AND company_id = $2',
    [userId, companyId],
  )
}

export async function unreadCount(userId: string, companyId: string): Promise<number> {
  const row = await queryOne(
    'SELECT COUNT(*) as c FROM notifications WHERE user_id = $1 AND company_id = $2 AND read_flag = 0',
    [userId, companyId],
  )
  return Number(row?.c || 0)
}
