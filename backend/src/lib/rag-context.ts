import { queryAll, queryOne } from './db'
import { canViewTier } from './encryption'

export interface RAGContext {
  text: string
  sources: string[]
}

export async function buildOrgContext(companyId: string, viewerRole: string, viewerUserId?: string): Promise<RAGContext> {
  const sources: string[] = []
  const parts: string[] = ['=== NEXUS OS Organizational Context (Grounded) ===']

  const emps = await queryAll(
    "SELECT name, role, department FROM users WHERE company_id = $1 AND status = 'active' LIMIT 20",
    [companyId],
  )
  if (emps.length) {
    parts.push(`People (${emps.length}): ${emps.map((e: any) => `${e.name} [${e.role}/${e.department}]`).join(', ')}`)
    sources.push('users')
  }

  if (canViewTier(viewerRole, 'T1')) {
    const mtgs = await queryAll(
      'SELECT title, summary FROM meetings WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5',
      [companyId],
    )
    for (const m of mtgs) {
      parts.push(`Meeting: ${m.title} — ${m.summary || 'no summary'}`)
      sources.push(`meeting:${m.title}`)
    }
  }

  if (canViewTier(viewerRole, 'T1')) {
    const docs = await queryAll(
      'SELECT name, summary, risk_level FROM documents WHERE company_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 5',
      [companyId],
    )
    for (const d of docs) {
      parts.push(`Document: ${d.name} (${d.risk_level || 'n/a'}) — ${d.summary || ''}`)
      sources.push(`document:${d.name}`)
    }
  }

  if (canViewTier(viewerRole, 'T2')) {
    const tx = await queryAll(
      `SELECT type, SUM(amount) as total FROM transactions WHERE company_id = $1 AND status = 'approved' GROUP BY type`,
      [companyId],
    )
    for (const t of tx) {
      parts.push(`Finance ${t.type}: ฿${Number(t.total || 0).toLocaleString()}`)
      sources.push(`transactions:${t.type}`)
    }
  }

  const dict = await queryAll(
    'SELECT metric_key, name, definition FROM data_dictionary WHERE company_id = $1 LIMIT 10',
    [companyId],
  )
  for (const d of dict) {
    parts.push(`KPI ${d.name} (${d.metric_key}): ${d.definition}`)
    sources.push(`dictionary:${d.metric_key}`)
  }

  const knowledge = await queryAll(
    'SELECT title, content, layer FROM knowledge_items WHERE company_id = $1 ORDER BY created_at DESC LIMIT 8',
    [companyId],
  )
  for (const k of knowledge) {
    parts.push(`Knowledge [${k.layer}]: ${k.title} — ${String(k.content).slice(0, 200)}`)
    sources.push(`knowledge:${k.title}`)
  }

  const logs = await queryAll(
    `SELECT object, status FROM work_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [companyId],
  )
  for (const l of logs) {
    parts.push(`WorkLog [${l.status}]: ${l.object}`)
    sources.push('work_logs')
  }

  // ── HR Engine (HumanSoft parity) — unified with NEXUS data layer ──
  parts.push('=== HR / Payroll Context ===')
  const today = new Date().toISOString().slice(0, 10)
  const ym = today.slice(0, 7)

  if (viewerUserId) {
    const att = await queryOne(
      'SELECT clock_in, clock_out, hours_worked, source FROM time_attendance WHERE company_id = $1 AND user_id = $2 AND work_date = $3',
      [companyId, viewerUserId, today],
    )
    if (att) {
      parts.push(`Today attendance: in ${att.clock_in || '—'} out ${att.clock_out || '—'} ${att.hours_worked || 0}h (${att.source})`)
      sources.push('time_attendance')
    }
    const myLeave = await queryAll(
      `SELECT type, days, status, approve_flag, start_date FROM leave_requests WHERE company_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 3`,
      [companyId, viewerUserId],
    )
    for (const lv of myLeave) {
      parts.push(`Leave [${lv.status}/${lv.approve_flag}]: ${lv.type} ${lv.days}d from ${lv.start_date}`)
      sources.push('leave_requests')
    }
    const slip = await queryOne(
      `SELECT p.net, p.gross, p.tax_wht, p.sso_employee, pp.year, pp.month FROM payslips p
       JOIN payroll_periods pp ON pp.id = p.period_id
       WHERE p.company_id = $1 AND p.user_id = $2 ORDER BY pp.year DESC, pp.month DESC LIMIT 1`,
      [companyId, viewerUserId],
    )
    if (slip) {
      parts.push(`Latest payslip ${slip.month}/${slip.year}: gross ฿${Number(slip.gross).toLocaleString()} net ฿${Number(slip.net).toLocaleString()} tax ฿${Number(slip.tax_wht).toLocaleString()} SSO ฿${Number(slip.sso_employee).toLocaleString()}`)
      sources.push('payslips')
    }
  }

  if (['admin', 'hr', 'finance'].includes(viewerRole.toLowerCase())) {
    const openPeriod = await queryOne(
      `SELECT year, month, status FROM payroll_periods WHERE company_id = $1 ORDER BY year DESC, month DESC LIMIT 1`,
      [companyId],
    )
    if (openPeriod) {
      parts.push(`Payroll period ${openPeriod.month}/${openPeriod.year}: ${openPeriod.status}`)
      sources.push('payroll_periods')
    }
    const pendingLeave = await queryOne(
      `SELECT COUNT(*) as c FROM leave_requests WHERE company_id = $1 AND status = 'pending'`,
      [companyId],
    )
    if (Number(pendingLeave?.c)) {
      parts.push(`Pending leave requests: ${pendingLeave.c}`)
      sources.push('leave_requests')
    }
    const pendingOt = await queryOne(
      `SELECT COUNT(*) as c FROM overtime_requests WHERE company_id = $1 AND status = 'pending'`,
      [companyId],
    )
    if (Number(pendingOt?.c)) {
      parts.push(`Pending OT requests: ${pendingOt.c}`)
      sources.push('overtime_requests')
    }
  }

  parts.push('=== End Context — cite sources when answering ===')
  return { text: parts.join('\n'), sources: [...new Set(sources)] }
}
