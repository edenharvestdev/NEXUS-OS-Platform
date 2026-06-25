# P1 — Audit / Data Foundation — Implementation Plan

**System:** NEXUS OS backend (Express + TypeScript + PostgreSQL on Railway; SQLite for local dev).
**Deploy:** `railway up` per service (NOT GitHub auto-deploy). Schema applies automatically at boot via `initSchema()` then `runMigrations()` in `backend/src/index.ts` `initialize()`.
**Status:** LIVE system, real company (Saduak Suay Mai PCL). Every change must be Expand→Backfill→Contract, feature-flagged where behavior changes, and non-breaking on a running prod DB.

---

## 0. Preconditions, assumptions, and global mechanics

### 0.1 Doc grounding
- **[CONFIRM]** The prompt references `docs/architecture/17-audit-log-design.md`, `19-permission-logic.md`, `21-ai-architecture.md`, `22-security-architecture.md`, `26-development-roadmap.md`, `15-database-schema.md`. **These files do not exist in the repo.** Only `docs/SYSTEM-SPEC.md` and `docs/ARCHITECTURE-MAP.md` are present, and there is a git branch named `architecture/ai-workforce-os-enterprise-foundation` (a branch, not a docs dir). This plan is therefore grounded in the **actual code** plus `docs/ARCHITECTURE-MAP.md` / `docs/SYSTEM-SPEC.md`. Where the missing docs would have set a target (e.g. exact tier semantics, hash-chain requirement), the choice is marked `[ASSUMPTION]` and should be reconciled against those docs once located.

### 0.2 How schema/migrations currently apply (the spine everything hangs on)
`backend/src/index.ts:146-175 initialize()`:
1. `initSchema()` (`db.ts:79`) — Postgres only. Runs a big inline `CREATE TABLE IF NOT EXISTS` block (`db.ts:87-163`) then each `NEXUS_*_PG` schema string, then idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` loops (`db.ts:176-195`). **Idempotent, additive, safe to re-run.**
2. `runMigrations()` (`migrations.ts:70`) — runs versioned `MIGRATIONS[]` once each, tracked in `schema_migrations(version, name, applied_at)`. On `duplicate column` / `already exists` it marks the version applied anyway (`migrations.ts:90-92`). **This is our primary mechanism for new DDL.**

**Key constraints of the current migration runner we must respect:**
- `MIGRATIONS[].up` is a **single SQL string**, run via `run(m.up, [])` → one `pool.query`. Postgres allows multiple statements per `query` text; SQLite (`db-sqlite` via `better-sqlite3` `.prepare().run()`) does **one statement per prepare**. So **SQLite local dev cannot run multi-statement `up` strings.** Today this is masked because most `up` values are single `ALTER`s. **We must extend the runner to support multi-statement migrations** (see PR-0) or keep every `up` to one statement. We choose to extend the runner so audit DDL (table + REVOKE + trigger) is atomic.
- Triggers, `REVOKE`, `CREATE FUNCTION` are **Postgres-only**. SQLite has no `REVOKE` and different trigger syntax. The runner must branch on `pool` (Postgres) vs SQLite and **no-op the Postgres-only hardening on SQLite** (local dev keeps a plain append table; enforcement is verified prod-like on Postgres).

### 0.3 Feature-flag convention
Flags live in `companies.settings` (TEXT JSON; read/written in `controllers/settings.controller.ts:77-86` via `parseSettings`). We add a namespaced block:
```json
{ "p1": { "audit_v2": false, "audit_capture_diff": false, "soft_delete_read_filter": false, "blocked_access_logging": true } }
```
Read helper (new, `backend/src/lib/feature-flags.ts`): `await isFlagOn(companyId, 'p1.audit_v2')` with a 30s in-process cache. Flags default **off** for behavior-changing reads; **on** for pure-additive logging. **[ASSUMPTION]** per-company flags are acceptable for a single-tenant-today deployment; a global env override `P1_FORCE=on` is also supported for staged rollout.

### 0.4 Verification harness used by every item (the "per-endpoint sweep")
- **Local SQLite:** `DATABASE_URL` unset → `db-sqlite`. Run `npm run dev` in `backend/`, hit endpoints with a saved Postman/curl collection covering **every route mounted in `index.ts:83-114`** (auth, employees, transactions, deals, meetings, chat, documents, campaigns, ai-stats, settings, tasks, leave, work-logs, dictionary, ai-router, skills, audit, ingest, twin, line, onboarding, self-service, memory, ceo, departments, notifications, ai-command, user-ai, ops, tamada, hr). Assert 2xx unchanged and audit rows written.
- **Postgres prod-like:** create a Railway preview DB (or `create_branch` on the managed PG), point `DATABASE_URL` at it, boot, confirm `initSchema()`+`runMigrations()` succeed, run the same sweep. **This is the only place trigger/REVOKE enforcement and hash-chain can be verified.**
- **Append-only proof:** attempt `UPDATE audit_logs ...` and `DELETE FROM audit_logs ...` as the app role → expect error.
- **Soft-delete proof:** delete a row via API → assert it disappears from list endpoints but still exists with `deleted_at` set.

---

## ITEM 1 — Append-only `audit_logs` (new table, hardened)

### (a) Current state
- Table `audit_log` (singular) defined twice: `nexus-schema.ts:42-52` (SQLite) and `:88-98` (Postgres). Columns: `id, company_id, user_id, action, resource, resource_id, security_tier DEFAULT 'T1', meta TEXT DEFAULT '{}', created_at`. `company_id` FK is `ON DELETE CASCADE` (so deleting a company **erases its audit trail** — a compliance defect).
- Writer `lib/audit.ts:3-28 writeAudit()` — best-effort, wraps the INSERT in `try{}catch{/* non-fatal */}` (swallows all errors → silent audit loss).
- Reader `controllers/audit-log.controller.ts:4-13 getAll()` — `SELECT a.*, u.name ... FROM audit_log a ... WHERE a.company_id=$1 ORDER BY created_at DESC LIMIT $2`.
- No UPDATE/DELETE protection; any code (or compromised role) can rewrite history.

### (b) Target
A new **`audit_logs`** (plural) table that is the canonical, append-only, tamper-evident log, with the rich schema from Item 4, optional hash-chain (Item 1.4), and **no `ON DELETE CASCADE`** to companies. `audit_log` (singular) is kept as a **read-through shadow source** during migration, then frozen.

### (c) Exact changes
**New file** `backend/src/lib/nexus-audit-schema.ts` exporting `NEXUS_AUDIT_PG` and `NEXUS_AUDIT_SQLITE`:
```sql
-- Postgres
CREATE TABLE IF NOT EXISTS audit_logs (
  id            TEXT PRIMARY KEY,
  company_id    TEXT,                       -- NO cascade; soft-orphan tolerated
  -- actor (Item 4)
  actor_user_id   TEXT,
  actor_employee_id TEXT,
  actor_role      TEXT,
  impersonated_by TEXT,
  -- target (Item 4)
  target_table    TEXT,
  target_id       TEXT,
  target_security_level TEXT,               -- T0..T3
  -- request context (Item 4)
  request_id      TEXT,
  session_id      TEXT,
  ip              TEXT,
  device          TEXT,
  user_agent      TEXT,
  endpoint        TEXT,
  http_method     TEXT,
  -- semantics
  action          TEXT NOT NULL,            -- create|update|delete|view|search|download|export|approve|reject|login|blocked_access|failed_access|ai_query ...
  result          TEXT NOT NULL DEFAULT 'success', -- success|failure|denied
  failure_reason  TEXT,
  -- diff (Item 2)
  before_json     JSONB,
  after_json      JSONB,
  changed_fields  TEXT[],
  meta            JSONB DEFAULT '{}',
  -- hash chain (Item 1.4)
  prev_hash       TEXT,
  row_hash        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_result ON audit_logs(action, result);
```
SQLite mirror: `before_json/after_json/meta` as `TEXT`, `changed_fields` as JSON `TEXT`, no `JSONB`/array.

**Append-only enforcement (Postgres only), shipped as migration SQL:**
```sql
CREATE OR REPLACE FUNCTION audit_logs_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (% blocked)', TG_OP;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_no_update ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_update BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();
DROP TRIGGER IF EXISTS trg_audit_logs_no_delete ON audit_logs;
CREATE TRIGGER trg_audit_logs_no_delete BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();

-- Defense in depth: revoke from the app role. [CONFIRM] app role name on Railway PG.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM PUBLIC;
-- REVOKE ... FROM <app_role>;  -- fill once role confirmed
```
**Note on retention:** the BEFORE DELETE trigger blocks the retention job too. We exempt retention by having the retention job (Item 7) set `session_replication_role = replica` within its transaction (superuser/owner only) **or** by a `WHEN (current_setting('audit.purge','t') IS DISTINCT FROM 'on')` guard on the delete trigger and the purge job setting `SET LOCAL audit.purge='on'`. We choose the **`current_setting` guard** — it needs no elevated role and is explicit. Update the trigger:
```sql
CREATE TRIGGER trg_audit_logs_no_delete BEFORE DELETE ON audit_logs
  FOR EACH ROW
  WHEN (current_setting('audit.purge', true) IS DISTINCT FROM 'on')
  EXECUTE FUNCTION audit_logs_block_mutation();
```

**Hash-chain (Item 1.4)** — `[ASSUMPTION]` required for tamper-evidence; cheap, keep it. Computed in `writeAudit` (app side, not trigger, to avoid per-row `SELECT ... FOR UPDATE` contention in a DB trigger):
- `row_hash = sha256(prev_hash || canonical_json(row_without_hashes))`.
- `prev_hash` = `row_hash` of the previous audit row **for the same `company_id`** (per-tenant chain → cheaper indexed lookup, isolates tenants). A nightly job (Item 7 infra) re-walks each company chain and writes a `chain_ok` checkpoint to a `audit_chain_checkpoints` table; mismatch → alert. Concurrency: serialize writes per company via an advisory lock `pg_advisory_xact_lock(hashtext(company_id))` around the read-prev + insert, inside a transaction.

**Migrate the writer** (Item 2 covers signature) to insert into `audit_logs`. During transition: **dual-write** — keep writing the old `audit_log` (singular) for one release so the existing `getAll` reader keeps working, and shadow-write `audit_logs`. Then flip the reader.

### (d) Backward-compat / non-breaking (Expand→Backfill→Contract)
- **Expand:** add `audit_logs` + triggers (PG) via migration. Old `audit_log` untouched. New `writeAudit` dual-writes both (flag `p1.audit_v2` controls whether `audit_logs` write is attempted; old write always happens until Contract).
- **Backfill:** one-time job copies existing `audit_log` rows into `audit_logs` (mapping `action/resource/resource_id/security_tier/meta` → new columns; `result='success'`; hash-chain recomputed in `created_at` order per company). Idempotent (skip ids already present). Backfill must run with `SET LOCAL audit.purge='on'`? No — it only INSERTs, triggers only block UPDATE/DELETE, so backfill inserts freely.
- **Contract:** after reader flip + one stable release, stop writing `audit_log`, rename it `audit_log_legacy`, drop its `ON DELETE CASCADE` issue moot (frozen). Keep for N days then archive.

### (e) Risk + blast radius
- Trigger/REVOKE could block the app from inserting if misapplied (REVOKE INSERT by mistake) → audit writes fail. Mitigation: `writeAudit` stays best-effort for **availability** (never break the user request) but now **logs failures to stderr + a metric** instead of silently swallowing (see Item 2). Blast radius: audit only; user flows unaffected.
- Hash-chain advisory lock adds a tiny serialization point per company; for one company at current volume, negligible.

### (f) Verification
- Local SQLite: `audit_logs` created as plain table; `writeAudit` inserts; no triggers (skipped). Sweep passes.
- Postgres prod-like: boot applies table+triggers; run sweep; then `psql` `UPDATE audit_logs SET action='x'` → expect `audit_logs is append-only (UPDATE blocked)`; `DELETE` likewise; `SET LOCAL audit.purge='on'; DELETE ...` succeeds. Verify chain: insert 3 rows, recompute, assert `row_hash` linkage.

### (g) Rollback
- Set `p1.audit_v2=false` → app stops writing `audit_logs`, keeps `audit_log`. Triggers can stay (they only guard the new table). If table itself must go: `DROP TRIGGER ...; DROP TABLE audit_logs;` (additive, no data loss to live tables). Migration is recorded; to truly re-run, delete its `schema_migrations` row.

---

## ITEM 2 — Capture before/after JSON + changed_fields on every UPDATE/create/delete

### (a) Current state
- `writeAudit(opts)` (`audit.ts:3`) takes `{companyId,userId,action,resource,resourceId,securityTier,meta}` — no before/after, no diff. Callers (≈10 files: `controllers/work-logs.controller.ts`, `skill-wallet`, `self-service`, `ingestion`, `data-dictionary`, `user-ai`, `lib/sla-escalation`, `lib/onboarding`, `lib/tamada-seed`) pass ad-hoc `meta`.
- Mutations everywhere use raw `run('UPDATE ...')` / `run('INSERT ...')` / `run('DELETE ...')` from `lib/db.ts`. No central interception.

### (b) Target
A backward-compatible `writeAudit` v2 that accepts `before`, `after`, computes `changed_fields`, and a thin **audited mutation wrapper** so controllers can opt in incrementally without rewriting all of them at once.

### (c) Exact changes
**Upgrade `lib/audit.ts`** (additive signature; old callers keep working):
```ts
export type AuditInput = {
  action: string
  // context now auto-filled from AsyncLocalStorage (Item 4) if omitted:
  companyId?: string; actorUserId?: string; actorRole?: string
  targetTable?: string; targetId?: string; targetSecurityLevel?: string
  result?: 'success'|'failure'|'denied'; failureReason?: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  meta?: Record<string, unknown>
  // legacy aliases kept: resource->targetTable, resourceId->targetId, userId->actorUserId, securityTier->targetSecurityLevel
}
export async function writeAudit(input: AuditInput): Promise<void>
```
Internals: pull missing context from `getRequestContext()` (Item 4); compute `changed_fields = keys where before[k] !== after[k]` (shallow; deep via JSON.stringify per key); redact sensitive keys (`password_hash`, anything `*_encrypted`, `salary`) → store `"[redacted]"` in before/after; compute hash-chain; INSERT into `audit_logs`. **Failure handling change:** keep the request alive, but **do not swallow silently** — `console.error('[audit] write failed', err)` and increment an in-memory `auditWriteFailures` counter exposed on `/health/deep` (`controllers/deep-health.controller.ts`).

**New file** `backend/src/lib/audited-db.ts` — opt-in wrappers:
```ts
export async function auditedUpdate(opts: {
  table: string; id: string; companyId: string;
  set: Record<string, unknown>; securityLevel?: string;
}) {
  const before = await queryOne(`SELECT * FROM ${ident(opts.table)} WHERE id=$1`, [opts.id])
  // build parameterized UPDATE from opts.set (table name allow-listed, never interpolated from user input)
  await run(updateSql, params)
  const after = await queryOne(`SELECT * FROM ${ident(opts.table)} WHERE id=$1`, [opts.id])
  await writeAudit({ action:'update', targetTable: opts.table, targetId: opts.id,
                     companyId: opts.companyId, before, after, targetSecurityLevel: opts.securityLevel })
}
export async function auditedInsert(...)   // after only
export async function auditedSoftDelete(...) // sets deleted_at (Item 5), before only
```
`ident()` allow-lists table names against the known table set (the 63 tables enumerated at boot) to prevent SQL injection via table name. **We do NOT monkey-patch `db.ts run()`** — too broad, would double-log internal/system writes and break the audit table's own inserts. Controllers migrate to `auditedUpdate` table-by-table, highest-sensitivity first (employees, payroll, patients, salary_*).

### (d) Backward-compat
- Old `writeAudit({companyId, userId, action, resource, resourceId, ...})` calls still compile and run (aliases mapped). No caller breaks.
- `auditedUpdate` is purely opt-in. Migrate one controller per PR. Flag `p1.audit_capture_diff` gates whether before/after SELECTs run (off → wrapper behaves like a plain audit write, cheaper) so we can ship the wrapper before turning on the extra reads.

### (e) Risk + blast radius
- Two extra SELECTs per audited write (before+after). Acceptable at this scale; gated by flag and only on mutating endpoints. Reading `SELECT *` could pull encrypted columns into the log → redaction list is mandatory and unit-tested.

### (f) Verification
- Unit test `changed_fields` and redaction (jest, `backend/`). Integration: update an employee phone via API → assert one `audit_logs` row with `before_json.phone != after_json.phone`, `changed_fields=['phone']`, salary fields `[redacted]`. Run full sweep to confirm no controller regressed.

### (g) Rollback
- `p1.audit_capture_diff=false` disables before/after reads. Reverting `audited-db.ts` adoption is per-controller (git revert the PR). `writeAudit` v2 signature is superset of v1 → safe to keep.

---

## ITEM 3 — Log view / search / download / export / approve / reject / failed-access / blocked-access

### (a) Current state
- Only some writes are audited (the ≈10 callers). **No** logging of reads, searches, downloads, exports, or permission denials. Permission denials happen in `middleware/rbac.ts:19` (`requireRole` → `res.status(403)`), `:30` (`requireModule` → 403), and in `lib/rbac.ts canAccessModule` (`:69 if r==='admin' return true` super-admin short-circuit). File reads go through `lib/file-storage.ts` / `controllers/documents.controller.ts` / `self-service.controller.ts`. Auth failures in `middleware/auth.ts:19/28/38`.

### (b) Target
Structured audit events for: `view`, `search`, `download`, `export`, `approve`, `reject`, `login`/`login_failed`, `blocked_access` (permission denied), `failed_access` (auth failure / not found on sensitive resource). Anti-spam: sampling + dedup for high-volume `view`/`search`.

### (c) Exact changes — where to instrument
1. **blocked_access (permission deny)** — central, lowest effort, highest value. In `middleware/rbac.ts` `requireRole` and `requireModule`, on the 403 path call `writeAudit({action:'blocked_access', result:'denied', failureReason:'role'|'module', targetTable: <module>, ...})`. Because context comes from AsyncLocalStorage (Item 4), no signature change to handlers. Also log when `canAccessModule` returns true **only because** `r==='admin'` short-circuit (`lib/rbac.ts:69`) → emit `action:'admin_override'` so super-admin access is visible (security review requirement). `[ASSUMPTION]` admin-override logging is desired per security-architecture target.
2. **failed_access (auth)** — in `middleware/auth.ts` catch block (`:38`) and `!user` (`:28`): `writeAudit({action:'failed_access', result:'failure', failureReason:'invalid_token'|'user_not_found', endpoint, ip})`. **No companyId** (unauthenticated) → allow null.
3. **login / login_failed** — in `auth.controller.ts signin` (`:54`,`:57` failure; `:59` success).
4. **download / export** — instrument `controllers/documents.controller.ts` (file fetch), `self-service.controller.ts` (payslip/personal docs), and any CSV/Excel export (`lib/excel-import.ts` is import; find export endpoints in `transactions`, `hr`, `ceo` controllers). Add `writeAudit({action:'download'|'export', targetTable, targetId, targetSecurityLevel})` at the point bytes are returned.
5. **approve / reject** — already partly in `work-logs.controller.ts` and leave flow (`lib/hr-leave-workflow.ts`); standardize to `action:'approve'|'reject'`.
6. **view / search** — instrument **list/detail endpoints for sensitive tables only** (patients, payroll_*, salary_*, employee_profiles, audit). Not every GET (spam). For these, log `view` (detail) and `search` (list with query params), capturing `meta.query`.

**Anti-spam strategy (new `lib/audit-sampling.ts`):**
- `view`/`search` on non-sensitive tables: **not logged**.
- `view`/`search` on sensitive tables: logged, but **deduped** — suppress identical `(actor, action, target_table, target_id)` within a 60s window using an in-process LRU (Map with timestamps). Bulk list views log one `search` row with `meta.result_count`, not one row per record.
- Hard cap: a per-process token bucket (e.g. 50 audit writes/sec) drops `view`/`search` first (never drops `update`/`delete`/`blocked_access`/`failed_access`).

### (d) Backward-compat
- All additive — new audit rows only, no response shape changes. `blocked_access`/`failed_access` logging gated by flag `p1.blocked_access_logging` (default **on**; pure addition). View/search logging gated by `p1.audit_views` (default **off**; enable after volume check).

### (e) Risk + blast radius
- Audit write on the auth-failure path could be abused for log flooding (unauthenticated). Mitigation: the token bucket + the existing in-memory `rateLimitMiddleware` (`index.ts:53`) already throttle per-IP before reaching auth. Cap unauthenticated `failed_access` writes per IP per minute.
- Instrumenting download endpoints must happen **after** authorization, on the success path only, to avoid logging denied attempts as downloads (those are `blocked_access`).

### (f) Verification
- Hit a module the role can't access → assert `blocked_access` row with correct `failureReason`. Bad token → `failed_access`. Download a payslip → `download` row with `targetSecurityLevel`. Spam the same patient GET 100×/min → assert ≤ a handful of deduped `view` rows. Full sweep: confirm no endpoint latency regression beyond a few ms.

### (g) Rollback
- Flags off. Revert instrumentation per-PR. Middleware hooks are additive try/catch — a bug there must never 500 the request (wrap in `try{}catch{}` that logs).

---

## ITEM 4 — Request context (request_id, session_id, actor, target, ip, device, UA, endpoint, method, result, failure_reason) via AsyncLocalStorage

### (a) Current state
- No request id. `req.user` set in `middleware/auth.ts:29`; `req.jwtPayload`, `req.impersonation` set `:30-36`. `requestMetricsMiddleware` (`index.ts:54`, `middleware/request-metrics.ts`) records method/path/status/duration into `request_metrics` but does not propagate context. `writeAudit` deep in libs (e.g. `lib/sla-escalation.ts`) has no access to `req`.

### (b) Target
An `AsyncLocalStorage<RequestContext>` populated by an early middleware so any `writeAudit` call anywhere in the async stack auto-fills actor/target/request fields.

### (c) Exact changes
**New file** `backend/src/lib/request-context.ts`:
```ts
import { AsyncLocalStorage } from 'node:async_hooks'
export type RequestContext = {
  requestId: string; sessionId?: string
  actorUserId?: string; actorEmployeeId?: string; actorRole?: string; impersonatedBy?: string
  companyId?: string
  ip?: string; device?: string; userAgent?: string; endpoint?: string; httpMethod?: string
}
export const als = new AsyncLocalStorage<RequestContext>()
export const getRequestContext = () => als.getStore()
export function patchContext(p: Partial<RequestContext>) { Object.assign(als.getStore() ?? {}, p) }
```
**New middleware** `backend/src/middleware/request-context.ts`:
```ts
export function requestContextMiddleware(req, res, next) {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID()
  res.setHeader('x-request-id', requestId)
  als.run({
    requestId,
    ip: req.ip, userAgent: req.headers['user-agent'],
    device: parseDevice(req.headers['user-agent']),
    endpoint: req.originalUrl, httpMethod: req.method,
    sessionId: (req.headers['x-session-id'] as string) || undefined,
  }, () => next())
}
```
**Wire order in `index.ts`** — must run **before** routes and ideally before auth so even auth failures have a request id. Insert at `index.ts` right after `requestMetricsMiddleware` (line 54), i.e.:
```
helmet → cors → rateLimit → requestMetrics → requestContext → json → routes
```
`authMiddleware` then calls `patchContext({ actorUserId: user.id, actorRole: user.role, companyId: user.company_id, impersonatedBy: payload.impersonated_by, actorEmployeeId: <profile lookup, optional> })` after it resolves `req.user` (`auth.ts:29`).

`writeAudit` (Item 2) reads `getRequestContext()` and uses it for any field the caller didn't pass.

**[CONFIRM]** `req.ip` requires `app.set('trust proxy', 1)` behind Railway's proxy to get the real client IP from `X-Forwarded-For`; add it in `index.ts`. Without it, IPs are the proxy's.

### (d) Backward-compat
- Purely additive. `als.run` wraps the request; if a code path runs outside a request (cron jobs like `lib/sla-escalation`, `monthly-task-agent`, backups), `getRequestContext()` returns `undefined` → `writeAudit` falls back to explicit args / `actorRole:'system'`. For system jobs, wrap their entrypoints in `als.run({requestId:'job:'+name, actorRole:'system'}, ...)`.

### (e) Risk + blast radius
- AsyncLocalStorage has minor overhead but is the standard pattern; negligible here. Risk: losing context across a `setTimeout`/queue boundary (job-queue). For queued work, persist `requestId` into the job payload and re-establish context in the worker (`lib/job-queue.ts`).

### (f) Verification
- Add a temp endpoint that calls `writeAudit({action:'ctx_probe'})` with no fields → assert the row has ip/UA/endpoint/method/requestId/actor populated. Confirm `x-request-id` echoed in response header. Confirm system job audit rows have `actorRole='system'`.

### (g) Rollback
- Remove the middleware line; `getRequestContext()` returns undefined and `writeAudit` falls back to explicit args (which v2 still accepts). No data shape break.

---

## ITEM 5 — Soft-delete on all main tables (~63 tables)

### (a) Current state
- No soft-delete anywhere. `db.ts queryAll/queryOne` (`:46-61`) run raw SQL with **no implicit filter**. Deletes are hard `DELETE`. FKs widely `ON DELETE CASCADE` (Item 6).
- 63 tables enumerated at boot (from schema files). Not all need soft-delete (e.g. `request_metrics`, `job_queue`, `idempotency_keys`, `schema_migrations`, `audit_logs` are operational/append and excluded).

### (b) Target
`deleted_at TIMESTAMPTZ NULL`, `deleted_by TEXT NULL`, `is_active BOOLEAN DEFAULT TRUE` on **business tables**; read paths exclude soft-deleted rows. Because `db.ts` has no query layer to inject a filter automatically, we use an **explicit, reviewable per-query approach** plus optional Postgres **views** for the hottest tables — not a magic global rewrite (too risky on a live system, and SQLite parity is hard).

### (c) Exact changes
**Table classification** (3 tiers):
- **Soft-delete (business data):** companies, users, employee_profiles, transactions, deals, meetings, action_items, documents, campaigns, tasks, leave_requests, work_logs, patients, payroll_periods, payroll_items, payroll_runs, payslips, salary_advances, salary_history, departments, org_units, positions, knowledge_items, kpi_entries, branches, entities, tamada_cases, sdx_cases, franchise_audits, overtime_requests, time_attendance, work_shifts, skill_scores, skill_evidence, notifications, chat_messages, data_dictionary, permission_groups, user_permission_groups, task_assignments, user_capacity, daily_ai_tasks, ingestion_jobs, attendance_locations, employee_daily_calendar, employee_leave_quota, leave_types/leave_approval_*, ot_*, payroll_settings, user_ai_memory. (~50)
- **No soft-delete (operational/append):** audit_logs, audit_log, request_metrics, job_queue, idempotency_keys, schema_migrations, backup_records, notification_deliveries, line_events, ai_logs.
- **[CONFIRM]** final list against the missing `15-database-schema.md`.

**Migration DDL** (new migration `add_soft_delete_columns`, multi-statement — needs PR-0 runner support):
```sql
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deleted_by TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
-- repeat per table; generate from the classification list in code, not by hand
CREATE INDEX IF NOT EXISTS idx_transactions_active ON transactions(company_id) WHERE deleted_at IS NULL;
```
Generate this SQL programmatically from a `SOFT_DELETE_TABLES: string[]` constant in `nexus-audit-schema.ts` so PG and SQLite variants stay in sync. (SQLite: `deleted_at TEXT`, partial indexes supported in modern SQLite; `is_active INTEGER DEFAULT 1`.)

**Read-path strategy (Expand→Backfill→Contract):**
- **Expand:** add columns (all NULL `deleted_at`, `is_active=TRUE`) — zero behavior change.
- **Backfill:** none needed (new rows default active; existing rows are active). For any table that already used a `status='inactive'` convention (e.g. `users.status`, `employees`), reconcile: set `is_active = (status <> 'inactive')` once.
- **Contract:** update queries to add `AND deleted_at IS NULL`. Do this **per controller**, gated by flag `p1.soft_delete_read_filter`. To make this manageable and auditable, add a tiny helper in `db.ts`:
  ```ts
  export const ACTIVE = 'AND deleted_at IS NULL'   // append to WHERE on read queries
  ```
  and migrate list/detail queries table-by-table. For the **hottest read tables** (users, transactions, employees, patients, payroll) optionally create Postgres views `*_active AS SELECT * FROM t WHERE deleted_at IS NULL` and point read controllers at the view (SQLite supports views too) — but views complicate INSERT/UPDATE, so prefer the explicit `AND deleted_at IS NULL` clause and reserve views only if a query is shared across many controllers.

**Delete-path:** replace hard `DELETE` in controllers with `auditedSoftDelete` (Item 2) → `UPDATE t SET deleted_at=NOW(), deleted_by=$actor, is_active=FALSE WHERE id=$1`. Audited automatically.

### (d) Backward-compat / non-breaking
- Adding nullable columns is online and safe on Postgres (no rewrite, no lock of significance). The dangerous step is flipping read filters: do it **per table behind the flag**, verify list counts unchanged (nothing is soft-deleted yet), then it's safe. Dual-safety: until a controller's hard-DELETE is replaced with soft-delete, the filter is harmless (no rows have `deleted_at`).
- Ordering matters: **add columns everywhere first (one PR)** → then **convert deletes to soft-deletes per controller** → then **add read filters per controller**. Never add a read filter before the column exists.

### (e) Risk + blast radius
- Biggest risk: a read query that should exclude soft-deleted rows but doesn't (data leak of "deleted" records) or one that wrongly filters and hides live data. Mitigation: per-controller rollout + the per-endpoint sweep asserting counts; flag kill-switch. Unique constraints: soft-deleted rows still occupy unique keys (e.g. `users.email UNIQUE`). Re-creating a record with the same email after soft-delete will collide → **[CONFIRM]** policy: either anonymize unique cols on soft-delete (`email = email || ':deleted:' || id`) or use partial unique indexes `UNIQUE(email) WHERE deleted_at IS NULL`. Recommend partial unique indexes for users/companies.

### (f) Verification
- After columns added: counts unchanged on all list endpoints. After soft-delete conversion: delete a transaction via API → gone from `GET /api/transactions`, still present in DB with `deleted_at`. Confirm `audit_logs` has the `delete` row with `before_json`. Re-create same-email user after soft-delete → succeeds (partial unique index). SQLite + Postgres both.

### (g) Rollback
- `p1.soft_delete_read_filter=false` → reads return all rows (including soft-deleted) — safe because nothing is soft-deleted until delete-conversion ships. To fully revert, columns can stay (harmless) or be dropped per table. Revert delete-conversion PRs to restore hard deletes.

---

## ITEM 6 — Remove `ON DELETE CASCADE` on important data; replace with soft-delete + RESTRICT

### (a) Current state — exact FKs to change
`grep` confirms heavy cascade use. Targets where cascade = catastrophic data/audit loss:
- `audit_log.company_id` → companies `ON DELETE CASCADE` (`nexus-schema.ts:90`). **Erases audit on company delete.**
- `patients.company_id` → companies CASCADE (`nexus-full-schema.ts:56` SQLite / `:122` PG). **PHI.**
- `employee_profiles.user_id`→users CASCADE and `.company_id`→companies CASCADE (`nexus-hr-schema.ts:24-25`).
- Payroll chain CASCADE: `payroll_items.period_id`→payroll_periods (`nexus-hr-schema.ts:119`), `payroll_runs.period_id` (`:132`), `payslips.period_id` (`:142`), plus their `user_id` CASCADE refs (`:44` etc.). Deleting a period nukes payslips (financial records that must be retained).
- `salary_advances`, `salary_history` user/company CASCADE.
- Generic: most business tables `company_id ... ON DELETE CASCADE` (deals, transactions, meetings, tasks, etc.).

### (b) Target
For **important data (audit, patients, payroll/payslips, salary, employees)**: never hard-cascade. Companies/users are soft-deleted (Item 5), so cascades effectively never fire for them anyway — but we still **drop CASCADE** on these FKs and set `ON DELETE RESTRICT` (or `NO ACTION`) so an accidental hard `DELETE FROM companies` is blocked rather than silently shredding records.

### (c) Exact changes
Postgres-only (SQLite can't `ALTER ... DROP CONSTRAINT` easily; local dev keeps cascade — acceptable since enforcement target is prod Postgres; note this divergence). Migration `harden_important_fks`:
```sql
-- Names are auto-generated by PG; discover then alter. Example for payslips.period_id:
ALTER TABLE payslips DROP CONSTRAINT IF EXISTS payslips_period_id_fkey;
ALTER TABLE payslips ADD CONSTRAINT payslips_period_id_fkey
  FOREIGN KEY (period_id) REFERENCES payroll_periods(id) ON DELETE RESTRICT;
-- repeat for: audit_log/audit_logs.company_id, patients.company_id,
-- employee_profiles.user_id & .company_id, payroll_items.period_id,
-- payroll_runs.period_id, salary_advances.*, salary_history.*
```
`audit_logs` is created (Item 1) **without** any cascade from the start, so no alter needed there — only the legacy `audit_log` if we keep it live during transition.

Because `initSchema` uses `CREATE TABLE IF NOT EXISTS`, the **table definitions in the schema files won't change existing constraints** — so the constraint fix MUST be a migration (ALTER), and we should also update the source `nexus-*-schema.ts` definitions to `ON DELETE RESTRICT` so **fresh installs** (new company on a brand-new DB, or SQLite) get the right constraint. Update both: the `.ts` schema strings (for fresh) + the migration (for the live DB).

### (d) Backward-compat
- Switching CASCADE→RESTRICT only changes behavior when a parent is hard-deleted. Since Item 5 makes parent deletes **soft**, no live flow performs a hard parent delete → zero behavioral impact in normal operation; the change is a safety net. Verify no code path issues `DELETE FROM companies`/`DELETE FROM users` (grep) before shipping; if any exists, convert it to soft-delete first (dependency on Item 5 for those controllers).

### (e) Risk + blast radius
- If some maintenance/seed script relied on cascade to clean up (e.g. `lib/tamada-seed.ts` teardown, test fixtures), RESTRICT will now error. Grep seeds/tests; update them to soft-delete or delete children-first. Blast radius limited to admin/maintenance paths, not user flows.

### (f) Verification
- Postgres prod-like: `DELETE FROM payroll_periods WHERE id=...` with child payslips → expect FK RESTRICT error (good). Soft-deleting a company → children untouched, still queryable. Fresh-install path (new DB) → constraints created as RESTRICT.

### (g) Rollback
- Migration to revert: `DROP CONSTRAINT ... ADD CONSTRAINT ... ON DELETE CASCADE`. Low urgency since change only tightens safety.

---

## ITEM 7 — Retention policy (per-class), retention job, legal hold

### (a) Current state
- No retention. `lib/backup.ts scheduleDailyBackup()` exists (`index.ts:163`) — backups only, no purge. Audit rows accumulate forever (now blocked from deletion by Item 1 triggers).

### (b) Target
Per-data-class retention windows; a scheduled retention job that soft-purges/hard-purges by class; a **legal-hold** mechanism that prevents erasure (reconciles GDPR/PDPA right-to-erasure vs Thai medical record retention).

### (c) Exact changes
**New table** `retention_policies` (seeded defaults; per-company overridable in `companies.settings.p1.retention`):
```sql
CREATE TABLE IF NOT EXISTS retention_policies (
  id TEXT PRIMARY KEY, company_id TEXT,
  data_class TEXT NOT NULL,        -- 'patient'|'payroll'|'audit'|'general'|'chat'|'ai_logs'
  retain_days INTEGER NOT NULL,
  action TEXT NOT NULL DEFAULT 'soft_purge', -- soft_purge|hard_purge|anonymize
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS legal_holds (
  id TEXT PRIMARY KEY, company_id TEXT,
  data_class TEXT, target_table TEXT, target_id TEXT, -- null target_id = class-wide hold
  reason TEXT, placed_by TEXT, placed_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ
);
```
**Default windows** `[ASSUMPTION]` (reconcile with legal): audit = **7 years** (THB regulatory), payroll/payslips = **7 years** (Revenue Dept / labour), patient medical = **min 5 years post last visit** (Thai medical record rules; some classes longer) — and **never auto-erase under right-to-erasure if a retention or legal hold applies**. General CRM/chat = 1–2 years. ai_logs = 1 year.

**Retention job** `backend/src/lib/retention-job.ts`, scheduled like the others in `index.ts initialize()` (daily, off-peak):
- For each policy, find rows older than `retain_days` AND not under any active `legal_holds` (class-wide or row-level) → apply `action`.
- `soft_purge` = set `deleted_at` (Item 5). `anonymize` = overwrite PII columns (`*_encrypted`, name, phone) with tombstones, keep the row for stats. `hard_purge` = real `DELETE`. For `audit_logs` hard purge, wrap in `SET LOCAL audit.purge='on'` (Item 1) and **log a `retention_purge` audit event first** (meta = count, class, cutoff) so the purge itself is auditable.
- Right-to-erasure request handler (admin endpoint): attempts erasure but **defers** any record under retention/legal-hold, returning a report of what was erased vs retained and why (PDPA allows refusing erasure where another law mandates retention).

### (d) Backward-compat
- Job ships **disabled** (`p1.retention_enabled=false`) and in **dry-run** mode first (logs what it *would* purge to `audit_logs` as `retention_dryrun`) for at least one cycle before any real purge. Legal-hold table empty by default → no holds block anything until placed.

### (e) Risk + blast radius
- Catastrophic if windows are wrong → irreversible data loss. Mitigations: dry-run first; default to `soft_purge` (reversible) not `hard_purge`; legal-hold checked before every purge; audit event per purge batch; small batch sizes with `LIMIT` to avoid long locks. Hard purge only for low-value classes initially.

### (f) Verification
- Seed an old patient row + a legal hold on it → dry-run report shows it *would* be retained (held). Remove hold → dry-run shows eligible. Enable for a low-risk class (e.g. ai_logs > 365d) on prod-like, confirm soft_purge sets `deleted_at`, audit `retention_purge` row written. Confirm audit hard-purge respects the trigger guard.

### (g) Rollback
- `p1.retention_enabled=false` stops the job instantly. Soft-purged rows recoverable (clear `deleted_at`). Hard-purged rows recoverable only from `lib/backup.ts` daily backups — hence default soft + dry-run.

---

## ITEM 8 — Add `data_owner` + `security_level` base columns to every entity; wire into permission engine + AI broker

### (a) Current state
- Some tables already have `security_tier` (`data_dictionary`, `work_logs`, `audit_log`) with `CHECK IN ('T0','T1','T2','T3')`. Most business tables (transactions, deals, patients, payroll, etc.) have **no** owner/security-level columns. `lib/encryption.ts canViewTier(role,tier)` (`:34-41`) encodes tier→role visibility but is only applied ad hoc (e.g. `sanitizeUserForRole` for salary). `lib/rbac.ts` permission engine is **module-level only**, not row-level. AI grounding `lib/rag-context.ts buildOrgContext` + `lib/ai-providers.ts` send raw context with **no per-row security filtering**.

### (b) Target
Uniform `data_owner TEXT` (user id of record owner/steward) and `security_level TEXT` (T0–T3, default per table) base columns on business tables, populated on write and read by (1) the permission engine to gate row access and (2) the AI broker (rag-context) to **exclude rows above the requester's clearance** from grounding context.

### (c) Exact changes
**Migration `add_owner_security_columns`** (generated from the `SOFT_DELETE_TABLES` list, business tables only):
```sql
ALTER TABLE patients   ADD COLUMN IF NOT EXISTS data_owner TEXT;
ALTER TABLE patients   ADD COLUMN IF NOT EXISTS security_level TEXT DEFAULT 'T3';  -- PHI
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS security_level TEXT DEFAULT 'T2';
ALTER TABLE payslips   ADD COLUMN IF NOT EXISTS security_level TEXT DEFAULT 'T3';
-- general tables default 'T1'
```
Per-table default security_level set from a `TABLE_SECURITY_DEFAULTS: Record<string,'T0'|'T1'|'T2'|'T3'>` constant (new, in `nexus-audit-schema.ts`). `data_owner` backfilled from existing `user_id` columns where present:
```sql
UPDATE patients SET data_owner = user_id WHERE data_owner IS NULL;
```
**Permission engine wiring:** add `lib/row-access.ts`:
```ts
export function canViewRow(viewer:{role:string,id:string}, row:{security_level?:string,data_owner?:string,company_id?:string}): boolean {
  if (row.data_owner === viewer.id) return true          // owner always sees own
  return canViewTier(viewer.role, row.security_level || 'T1')  // reuse encryption.ts
}
export function rowAccessSql(viewer): {clause:string,params:any[]}  // e.g. "(security_level IN (...) OR data_owner = $n)"
```
Apply in sensitive read controllers (patients, payroll, salary) as an extra WHERE clause — incrementally, behind flag `p1.row_security`. Note the **`admin` super-admin short-circuit** in `lib/rbac.ts:69` (`if r==='admin' return true`) means admins bypass row security too; `[CONFIRM]` whether even admins should be filtered for T3 PHI — if so, `canViewRow` must not honor a blanket admin override and admin T3 access must be explicitly logged (Item 3 admin_override).

**AI broker wiring:** in `lib/rag-context.ts buildOrgContext`, when assembling grounding rows, pass the requesting user's role and apply `rowAccessSql` / filter `canViewRow` so **T3 rows never enter the prompt** sent by `lib/ai-providers.ts callProvider` to OpenAI/Anthropic/Gemini/Typhoon (which currently send raw context with no redaction — a data-exfiltration risk). This is the single highest-value security wire-in. Log an `ai_context_filtered` audit meta (count of rows excluded).

### (d) Backward-compat
- Columns nullable / defaulted → additive. Backfill `data_owner` from `user_id` is idempotent. Row-security filters gated by `p1.row_security` (default off) so we can ship columns + backfill, verify, then enable filtering table-by-table. AI context filtering gated separately (`p1.ai_context_security`, default **on** once shipped — it only *removes* high-tier rows from prompts, never breaks a response, and the security benefit is immediate).

### (e) Risk + blast radius
- Over-filtering could starve the AI of context (answers "I don't have data"). Mitigation: default tiers conservative (most rows T1, visible), only patient/payroll/salary high; per-endpoint sweep checks AI answers still ground on permitted data. Under-filtering (forgetting a sensitive table) = leak → enumerate sensitive tables explicitly, default-deny only for the known-sensitive set, log excluded counts.

### (f) Verification
- Backfill: `SELECT count(*) FROM patients WHERE data_owner IS NULL` = 0. As a `staff` user, `GET` a T3 patient → 403/empty (with `p1.row_security`). Ask the AI (as staff) a question whose answer needs a T3 patient row → answer excludes it; `audit_logs` shows `ai_context_filtered`. As admin → `[CONFIRM]` behavior + `admin_override` logged. SQLite + Postgres.

### (g) Rollback
- Flags off → columns become inert metadata; reads/AI revert to prior (less safe) behavior. Columns can remain. AI-context filter is the one to keep on if anything; it has no downside beyond possibly-thinner context.

---

## MIGRATION SEQUENCE (files, order, safe boot)

**Runner prerequisite (PR-0):** extend `migrations.ts` to (i) support **multi-statement** `up` (split on `;` for SQLite, single `query` for PG), and (ii) support **Postgres-only** migrations (a `pgOnly?: boolean` per migration; skipped + marked applied on SQLite). Without this, the audit trigger/REVOKE and multi-column migrations can't run on local SQLite and would crash boot. All new DDL goes through `MIGRATIONS[]` (versions continue from current max **10**), so it applies exactly once at boot via `runMigrations()` and is tracked in `schema_migrations`. `initSchema()` source schema strings are updated **in parallel** so fresh installs are correct, but live changes always come from a versioned migration (since `CREATE TABLE IF NOT EXISTS` / existing constraints won't be altered by re-running `initSchema`).

Order (each is one migration version; dependencies noted):
1. **v11 `audit_logs_table`** (PG: table+indexes; +PG-only `audit_logs_triggers` as v12). → Item 1.
2. **v12 `audit_logs_append_only`** (pgOnly: function + 2 triggers with purge guard + REVOKE). Depends v11.
3. **v13 `add_soft_delete_columns`** (multi-statement, generated). → Item 5 Expand. Independent of audit.
4. **v14 `partial_unique_indexes`** (pgOnly: e.g. `users.email`, `companies.slug` WHERE `deleted_at IS NULL`). Depends v13.
5. **v15 `add_owner_security_columns`** + backfill `data_owner=user_id`. → Item 8 Expand/Backfill. Depends v13 (shares generated list).
6. **v16 `harden_important_fks`** (pgOnly: CASCADE→RESTRICT on audit/patients/payroll/employees/salary). → Item 6. Should land **after** soft-delete delete-conversion code is deployed (so nothing relies on cascade).
7. **v17 `retention_tables`** (`retention_policies`, `legal_holds`, `audit_chain_checkpoints`) + seed default policies. → Item 7.
8. **v18 `audit_log_backfill_marker`** — backfill from `audit_log`→`audit_logs` is a **data job**, not DDL; run as a one-shot guarded by a `schema_migrations`-style flag, not in the boot path if large (could slow boot). Prefer running it via a manual `npm run backfill:audit` against prod, or a job-queue task, to avoid blocking `initialize()` and the Railway healthcheck.

**Safe-boot notes:**
- `runMigrations()` already swallows `duplicate column`/`already exists` (`migrations.ts:90`) and marks applied — keep that. But it currently **logs and continues** on other errors (`:93`) without recording, so a failed trigger creation would silently retry every boot. For hardening migrations we want **fail-loud**: if a `pgOnly` security migration fails on Postgres, `initialize()` should surface it (the catch in `index.ts:171` does `process.exit(1)` on throw). Add a `critical?: boolean` flag so security migrations rethrow instead of warn-and-continue.
- Keep migrations **small and forward-only**; never edit an already-applied migration's SQL (the runner won't re-run it). New change = new version.
- Backfills and read-filter/delete-conversion flips are **code + flags**, deployed via `railway up`, decoupled from DDL versions so DDL can land dark first.

---

## ORDERED PR LIST (small, independently shippable)

| PR | Title | Touches | Depends |
|----|-------|---------|---------|
| **PR-0** | Migration runner: multi-statement + pgOnly + critical flags | `lib/migrations.ts` | — |
| **PR-1** | Request-context middleware (AsyncLocalStorage) + `trust proxy` + x-request-id | `lib/request-context.ts`, `middleware/request-context.ts`, `index.ts`, `middleware/auth.ts` | — |
| **PR-2** | `writeAudit` v2 (rich fields, diff, redaction, fail-loud) — back-compat aliases | `lib/audit.ts`, `controllers/deep-health.controller.ts` | PR-1 |
| **PR-3** | `audit_logs` table + append-only triggers/REVOKE + hash-chain (v11/v12) | `lib/nexus-audit-schema.ts`, `lib/migrations.ts`, `db.ts` (wire schema), `audit.ts` (dual-write + chain) | PR-0, PR-2 |
| **PR-4** | Backfill `audit_log`→`audit_logs` (manual/job) + flip reader | `controllers/audit-log.controller.ts`, backfill script | PR-3 |
| **PR-5** | blocked_access / failed_access / login / admin_override logging + anti-spam sampler | `middleware/rbac.ts`, `middleware/auth.ts`, `auth.controller.ts`, `lib/rbac.ts`, `lib/audit-sampling.ts` | PR-2, PR-3 |
| **PR-6** | Soft-delete columns everywhere (v13) + partial unique indexes (v14) — Expand only | `lib/nexus-audit-schema.ts` (list), `lib/migrations.ts`, schema `.ts` files | PR-0 |
| **PR-7** | `audited-db.ts` wrappers + convert hard-DELETE→soft-delete per controller (start: employees, payroll, patients) | `lib/audited-db.ts`, sensitive controllers | PR-2, PR-6 |
| **PR-8** | Read-filter `deleted_at IS NULL` per controller behind `p1.soft_delete_read_filter` | `db.ts` (`ACTIVE` helper), controllers | PR-6, PR-7 |
| **PR-9** | FK CASCADE→RESTRICT on important data (v16) + update schema `.ts` for fresh installs + fix seeds/tests | `lib/migrations.ts`, schema `.ts`, `lib/tamada-seed.ts`, tests | PR-7 (soft-delete on parents live first) |
| **PR-10** | `data_owner`+`security_level` columns + backfill (v15) + `TABLE_SECURITY_DEFAULTS` | `lib/nexus-audit-schema.ts`, `lib/migrations.ts` | PR-6 |
| **PR-11** | Row-access engine + wire into sensitive read controllers behind `p1.row_security` | `lib/row-access.ts`, controllers, `lib/encryption.ts` (reuse `canViewTier`) | PR-10 |
| **PR-12** | AI broker security filter — exclude high-tier rows from rag-context/prompts | `lib/rag-context.ts`, `lib/ai-router.ts`, `lib/ai-providers.ts` | PR-10, PR-11 |
| **PR-13** | view/download/export/approve/reject instrumentation on sensitive endpoints | `documents`, `self-service`, `hr`, `ceo`, `transactions` controllers, `lib/file-storage.ts` | PR-2, PR-5 |
| **PR-14** | Retention: tables+seeds (v17), dry-run job, legal-hold, right-to-erasure endpoint | `lib/retention-job.ts`, `lib/migrations.ts`, `index.ts`, admin controller | PR-3, PR-6, PR-10 |
| **PR-15** | Feature-flag helper + flag plumbing (can land early; used by many) | `lib/feature-flags.ts`, `controllers/settings.controller.ts` | — (pull earlier if convenient; PR-5/8/11/12/14 depend on it) |

**Critical path:** PR-0 → PR-1 → PR-2 → PR-3 (+PR-15 early). Soft-delete chain PR-6→7→8→9. Security chain PR-10→11→12. PR-5/13 (logging) and PR-14 (retention) ride on the audit foundation.

---

## OPEN ITEMS TO CONFIRM
1. **Architecture docs 15/17/19/21/22/26 missing** — locate (other repo? the `architecture/*` branch's actual file tree?) and reconcile tier semantics, hash-chain requirement, exact retention windows, and admin-vs-T3 policy.
2. **Railway PG app role name** for the `REVOKE` (defense in depth).
3. **Admin super-admin short-circuit** (`lib/rbac.ts:69`): should admins be exempt from T3/PHI row-security, or filtered + logged?
4. **Unique-constraint policy** on soft-deleted rows (partial unique index vs anonymize) per table.
5. **Retention windows** must be legally signed off before any `hard_purge` is enabled (default soft + dry-run until then).
