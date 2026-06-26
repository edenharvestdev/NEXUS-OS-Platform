/**
 * Security / regression endpoint sweep — the formalized version of the manual
 * curl sweep used throughout the P0/P1 work. For each token tier (no-token +
 * each configured account) it hits every read endpoint and reports the HTTP
 * status, flagging anything that is NOT a 2xx or an EXPECTED 403 (deny).
 *
 * Usage:
 *   SWEEP_BASE_URL=http://localhost:4000 \
 *   SWEEP_PASSWORD=Test1234! \
 *   SWEEP_ACCOUNTS="admin:test@nexus.local" \
 *   node --require ts-node/register scripts/security-sweep.ts
 *
 * Defaults target local dev (http://localhost:4000). For prod pass the Railway
 * API URL + the Saduak accounts (admin:admin@saduaksuaymai.co,medical:medical@...).
 * Exit code is non-zero if any unexpected failure is found (CI-friendly).
 */

const BASE = process.env.SWEEP_BASE_URL || 'http://localhost:4000'
const PASSWORD = process.env.SWEEP_PASSWORD || 'Test1234!'

// label:email pairs (the account's role is whatever that user has)
const ACCOUNTS = (process.env.SWEEP_ACCOUNTS || 'admin:test@nexus.local')
  .split(',').map(s => s.trim()).filter(Boolean)
  .map(p => { const [label, email] = p.split(':'); return { label, email } })

// Read endpoints a page loads on mount. Each entry may declare roles that are
// EXPECTED to be denied (403) so a correct denial is not flagged as a failure.
const ENDPOINTS: Array<{ path: string; adminOnly?: boolean }> = [
  { path: '/api/auth/me' },
  { path: '/api/self-service/hub' },
  { path: '/api/self-service/daily-tasks' },
  { path: '/api/work-logs' },
  { path: '/api/tasks' },
  { path: '/api/skills' },
  { path: '/api/employees' },
  { path: '/api/transactions' },
  { path: '/api/deals' },
  { path: '/api/campaigns' },
  { path: '/api/documents' },
  { path: '/api/meetings' },
  { path: '/api/notifications' },
  { path: '/api/notifications/unread' },
  { path: '/api/settings' },
  { path: '/api/audit' },
  { path: '/api/leave' },
  { path: '/api/ai-stats', adminOnly: true },
  { path: '/api/ai-router/status' },
  { path: '/api/ai-command/command-center', adminOnly: true },
  { path: '/api/chat/agents' },
  { path: '/api/ceo/brief', adminOnly: true },
  { path: '/api/health/readiness' },
  { path: '/api/dictionary/layers' },
  { path: '/api/onboarding' },
  { path: '/api/hr/org-units' },
  { path: '/api/hr/shifts' },
  { path: '/api/hr/payroll/periods' },
  { path: '/api/hr/leave-requests' },
  { path: '/api/hr/overtime/requests' },
  { path: '/api/hr/advances' },
  { path: '/api/tamada/branches' },
]

async function signin(email: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    })
    if (!res.ok) return null
    const data = await res.json() as { token?: string }
    return data.token || null
  } catch { return null }
}

async function hit(path: string, token: string | null): Promise<number> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(20_000),
    })
    return res.status
  } catch { return 0 }
}

async function sweepAccount(label: string, token: string | null): Promise<number> {
  let failures = 0
  const lines: string[] = []
  for (const ep of ENDPOINTS) {
    const code = await hit(ep.path, token)
    const ok2xx = code >= 200 && code < 300
    // No token → 401/403 is the correct (expected) denial.
    // adminOnly endpoint hit by a non-admin → 403 is expected.
    const expectedDeny =
      (!token && (code === 401 || code === 403)) ||
      (!!token && !!ep.adminOnly && label !== 'admin' && code === 403)
    const bad = !ok2xx && !expectedDeny
    if (bad) { failures++; lines.push(`    ✗ ${ep.path.padEnd(34)} ${code}`) }
  }
  console.log(`  [${label}] ${failures === 0 ? 'OK — all 2xx / expected-403' : failures + ' UNEXPECTED'}`)
  lines.forEach(l => console.log(l))
  return failures
}

async function main() {
  console.log(`Security sweep → ${BASE}`)
  let totalFailures = 0

  totalFailures += await sweepAccount('no-token', null)
  for (const acc of ACCOUNTS) {
    const token = await signin(acc.email)
    if (!token) { console.log(`  [${acc.label}] ⚠️  could not sign in as ${acc.email} (skipped)`); continue }
    totalFailures += await sweepAccount(acc.label, token)
  }

  console.log(totalFailures === 0
    ? '\n✅ Sweep clean — no unexpected failures.'
    : `\n❌ Sweep found ${totalFailures} unexpected failure(s).`)
  process.exit(totalFailures === 0 ? 0 : 1)
}

main().catch(e => { console.error('sweep error:', e); process.exit(1) })
