# 00 — Master Implementation Sequence & Risk Review (P0 + P1)

> **Scope:** Reconciles and sequences the two plans —
> `docs/implementation/p0-security-hardening.md` (P0) and
> `docs/implementation/p1-audit-data-foundation.md` (P1) — into one
> **deployable order of PRs** for the **live** NEXUS OS backend (Express + TS +
> PostgreSQL on Railway, `railway up` per service; SQLite for local dev).
> **Tenant:** Saduak Suay Mai PCL (single live company today).
> **Author altitude:** Senior Staff Engineer + Security Architect.
> **Non-negotiable:** nothing here may lock out the live tenant, lose the audit
> trail, or send RESTRICTED data to an external LLM.

This document is the **source of truth for ordering**. The P0/P1 docs remain the
source of truth for the *content* of each work item. Where the two docs each
define a "PR-0", this file renames them to avoid collision:
- P1 PR-0 (migration runner) → **A0**
- P0 PR-0 (security scaffolding) → **A1**
…and so on. The mapping table is in §6.

---

## 0. Grounding — verified against real code (2026-06-25)

Re-read before trusting the sequence. All confirmed in-tree:

- **Hard super-admin is in 3 code paths + 1 data path** (must all be neutralized together or the kill is illusory):
  1. `backend/src/lib/rbac.ts:68` — `if (r === 'admin') return true` in `canAccessModule`.
  2. `backend/src/middleware/rbac.ts:15` — `if (role === 'admin' || ...)` in `requireRole`.
  3. `backend/src/lib/user-permissions.ts` — admin → `Set(['*'])` (per P0 doc; confirm at edit time).
  4. `backend/src/lib/encryption.ts:38-39` — `canViewTier` lists `admin` in T2 **and** T3 → admin sees salary/PHI ambiently.
- **Audit today** = `audit_log` (singular), writer `backend/src/lib/audit.ts:12-27` swallows **all** errors (`catch { /* non-fatal */ }`). `company_id` FK is `ON DELETE CASCADE` (deleting a company erases its trail).
- **AI choke-point:** `routeAI` (`ai-router.ts:62`) builds `contextBlock + prompt` from `buildOrgContext` and passes it **raw** to `askWithFallback` → external providers. No redaction, no row filtering. `ai-context.ts` is a **second** path (`buildPersonalContext`/`buildScopedContext`) with the same exposure — both must be wired.
- **Encryption fallback:** `encryption.ts:6` — `ENCRYPTION_KEY || JWT_SECRET || 'nexus_dev_encryption_change_in_production'`. A missing key silently uses a constant. Ciphertext format `enc:iv:tag:data` has **no key id**.
- **Migration runner:** `migrations.ts` — `MIGRATIONS[]` max version is **10**, so next free = **11**. `up` is a single SQL string run via one `run(m.up,[])`. On non-"duplicate"/"exists" errors it **warns and continues without recording** (`migrations.ts:93-95`) → a failed trigger silently retries every boot. SQLite (`better-sqlite3`) runs one statement per prepare → **multi-statement `up` will not work on SQLite today**.
- **Boot:** `index.ts initialize()` runs `initSchema()` → `runMigrations()`; a thrown error → `process.exit(1)` (good — we can make security migrations fail-loud by rethrowing).
- **Middleware order today** (`index.ts:49-57`): `helmet → cors → rateLimit → requestMetrics → json → routes`. No request-id, no AsyncLocalStorage. `trust proxy` not set → `req.ip` is the Railway proxy.
- **Signup** (`auth.controller.ts:33`) makes the **first user `admin`** → company owner == data-god.
- **Tokens:** `jwt.sign({id,company_id}, secret, {expiresIn:'7d'})` (`auth.controller.ts:59`). No refresh, no revocation, no `token_version`.
- **`docs/architecture/15/17/19/21/22/26-*.md` do not exist in the repo** (only `docs/ARCHITECTURE-MAP.md`, `docs/SYSTEM-SPEC.md`). Both plans flag this. **[CONFIRM]** locate them before flipping tier semantics; nothing in the *first two weeks* depends on them.

**Conclusion:** both plans are accurately grounded and mutually consistent. The
remaining job is **cross-plan ordering** — several P0 items structurally depend
on P1 foundations.

---

## 1. Cross-plan dependency resolution (the crux)

P0 reads as if it stands alone, but three of its highest-value items **cannot be
done safely without P1 foundations**. Resolved explicitly:

### Dependency 1 — Killing the hard super-admin (P0 Item 1) needs P1's request-context + audit + (P0) break-glass first
- The shadow strategy in P0 Item 1 **logs every would-be admin denial** (`authz.shadow_admin_bypass`) so we can see exactly what admin touches before enforcing. That logging is worthless without **rich, reliable audit** — which is **P1 Item 1 (`audit_logs`) + Item 2 (`writeAudit` v2, fail-loud) + Item 4 (request-context)**.
- Enforcing least-privilege without a **break-glass path** (P0 Item 1f) risks owner lockout. Break-glass writes must be `writeAuditStrict` → again needs the audit foundation.
- **Resolution:** P1 audit spine (A0–A3 below) ships **before** the P0 authz shadow PR, and the **enforce flip** for least-privilege is gated behind break-glass being live + shadow report clean.

### Dependency 2 — MFA / step-up (P0 Item 3) audit needs audit logging
- Every step-up issue/use/failure → `writeAuditStrict` (P0 Item 3c). Step-up is also a **prerequisite for break-glass** (RESTRICTED requires step-up). So: **audit first → step-up → break-glass → least-privilege enforce.**
- **Resolution:** sequence is audit spine → step-up backend (shadow) → break-glass → authz enforce.

### Dependency 3 — AI redaction & broker (P0 Items 6/7) overlap with P1 Item 8 (row security) and need `ai_query_logs` + audit
- P0 Item 7 (broker) and P1 Item 8 (AI context row-filter) **touch the same files** (`rag-context.ts`, `ai-router.ts`, `ai-providers.ts`) and solve overlapping problems. Shipping them in two uncoordinated PRs guarantees a merge conflict and a half-filtered path.
- **Resolution:** treat them as **one coordinated AI-egress workstream** (§3 PR-AI-1/2/3). P0 Item 6 (redaction at `askWithFallback`) is the **floor** (defense-in-depth, always-on for RESTRICTED). P0 Item 7 broker + P1 Item 8 row-security are the **primary control** layered on top. They share `ai_query_logs` and the audit spine, so they come **after** A0–A3.

### Dependency 4 — Encryption fail-fast (P0 Item 4) is independent but gated on a Railway fact
- Has **no dependency** on audit/context. But it can **prevent boot** if `ENCRYPTION_KEY` is not actually set on Railway and live ciphertext was written with the fallback constant. **This is a config investigation, not a code dependency** — it can (and should) be confirmed in week 1, then shipped early because it is pure-additive once the key is verified.

### Dependency 5 — FK CASCADE→RESTRICT (P1 Item 6) must follow soft-delete-on-parents (P1 Item 5)
- Internal to P1 (already sequenced there). Carried through below.

### Dependency 6 — Token rotation (P0 Item 5) is independent of audit but should ride request-context
- Refresh/blocklist tables are self-contained. The only cross-link: forced-logout and refusals should be auditable → nice-to-have on audit spine but not blocking. Slot it after the spine, before enforce flips, with its own dual-accept window.

**Net dependency DAG (high level):**

```
A0 runner ─┐
A1 scaffold┤
A2 reqctx ─┼─> A3 audit_logs ─> A4 audit instrumentation ──┐
flags ─────┘                                               │
                                                           ├─> P0 step-up (shadow) ─> break-glass ─> authz shadow ─> ENFORCE flips
ENCRYPTION fail-fast (independent, week 1) ────────────────┤
soft-delete cols ─> soft-delete convert ─> read-filter ─> FK harden (P1 chain, parallel)
owner/security cols ─────────────────────> AI-egress workstream (redaction floor + broker + row-filter) ─> AI ENFORCE
token rotation (independent, dual-accept) ─────────────────────────────────────────────────────────────> token ENFORCE
retention (dry-run) ───────────────────────────────────────────────────────────────────────────────────> retention ENABLE
```

---

## 2. The single recommended ORDER of PRs (P0 + P1 merged)

Numbered global sequence. **Phase tags:** `[FOUND]` foundation (dark/additive),
`[SHADOW]` ships logging-only or behind off-by-default flag, `[ENFORCE]` flips
behavior (needs sign-off). "Safe to prod" = additive/dark, deployable without
sign-off after the per-endpoint sweep passes. "Sign-off" = needs stakeholder
go-ahead because it can change behavior or lock someone out.

| # | PR (global) | Source | Phase | Depends | Prod-safe? |
|---|-------------|--------|-------|---------|-----------|
| 1 | **A0** Migration runner: multi-statement + `pgOnly` + `critical` flags | P1 PR-0 | FOUND | — | yes (after sweep) |
| 2 | **A1** Security/flags scaffolding: `feature-flags.ts`/`company-settings.ts`, `security-flags.ts`, `writeAuditStrict`, `security-sweep.ts` | P0 PR-0 + P1 PR-15 | FOUND | — | yes |
| 3 | **ENC-1** ENCRYPTION_KEY fail-fast + key-versioning (no new-column encryption) | P0 PR-1 | FOUND | A1 | **sign-off** (boot risk) — see §3.W1 |
| 4 | **A2** Request-context middleware (AsyncLocalStorage) + `trust proxy` + x-request-id | P1 PR-1 | FOUND | — | yes |
| 5 | **A3a** `writeAudit` v2 (rich fields, diff, redaction-of-sensitive-keys, **fail-loud**) | P1 PR-2 | FOUND | A2 | yes |
| 6 | **A3b** `audit_logs` table + append-only triggers/REVOKE + hash-chain (v11/v12), dual-write | P1 PR-3 | FOUND | A0, A3a | yes (additive; triggers guard only the new table) |
| 7 | **A3c** Backfill `audit_log`→`audit_logs` (manual/job) + flip reader | P1 PR-4 | FOUND | A3b | yes (off-path job) |
| 8 | **A4** blocked_access / failed_access / login / admin_override logging + anti-spam sampler | P1 PR-5 | SHADOW→on | A3a, A3b | yes (additive logging) |
| 9 | **SD-1** Soft-delete columns everywhere (v13) + partial unique indexes (v14) — **Expand only** | P1 PR-6 | FOUND | A0 | yes (columns NULL) |
| 10 | **OS-1** `data_owner`+`security_level` columns + backfill (v15) + `TABLE_SECURITY_DEFAULTS` | P1 PR-10 | FOUND | SD-1 | yes |
| 11 | **AUTHZ-1** `authz.ts` central engine + `data_class` column + backfill; wrappers delegate; **shadow-only admin-bypass logging** | P0 PR-2 | SHADOW | A3a, A3b, A4 | yes (shadow; no enforce) |
| 12 | **MFA-1** Step-up backend: schema, `mfa.ts`, routes, `requireStepUp` middleware — **shadow** | P0 PR-5 | SHADOW | A3b, AUTHZ-1 | yes (shadow; enrollment campaign) |
| 13 | **BG-1** Break-glass tables + endpoints + audit | P0 PR-3 | FOUND | AUTHZ-1, MFA-1 | yes (endpoints live, still shadow) |
| 14 | **ROLE-1** New role `platform_superadmin` (+ `owner` [CONFIRM]) | P0 PR-4 | FOUND | AUTHZ-1 | yes (additive; no live reassignment) |
| 15 | **AIEG-1** AI **redaction floor** in `askWithFallback` + `ai_query_logs` (v16); RESTRICTED hard-block on, name-mask shadow | P0 PR-6 | SHADOW→partial | A1, A3b | yes (RESTRICTED block on by default) |
| 16 | **AIEG-2** AI **broker + row-filter** (merge P0 Item 7 + P1 Item 8): `ai-broker.ts`/`row-access.ts`, rewire `ai-router`/`chat`/`ai-context`/`rag-context`; CI grep gate | P0 PR-7 + P1 PR-12 | SHADOW | OS-1, AIEG-1 | yes (shadow diff) |
| 17 | **SD-2** `audited-db.ts` wrappers + convert hard-DELETE→soft-delete per controller (employees, payroll, patients first) | P1 PR-7 | FOUND | A3a, SD-1 | yes (per-controller) |
| 18 | **SD-3** Read-filter `deleted_at IS NULL` per controller behind flag | P1 PR-8 | ENFORCE(read) | SD-1, SD-2 | yes (per-table, flagged; counts asserted) |
| 19 | **FK-1** CASCADE→RESTRICT on important data (v16-fk) + schema `.ts` for fresh installs + fix seeds/tests | P1 PR-9 | FOUND | SD-2 | yes (safety-net; verify no hard `DELETE FROM companies/users`) |
| 20 | **ROW-1** Row-access engine wired into sensitive read controllers behind `p1.row_security` | P1 PR-11 | SHADOW→ENFORCE | OS-1 | flag off by default |
| 21 | **TOK-1** Token rotation backend: refresh/blocklist tables, `/refresh`/`logout`/`force-logout`, `token_version`; **dual-accept** | P0 PR-8 | SHADOW | A1 | yes (dual-accept) |
| 22 | **AUD-VIEW** view/download/export/approve/reject instrumentation on sensitive endpoints | P1 PR-13 | SHADOW→on | A3a, A4 | yes |
| 23 | **RET-1** Retention tables+seeds (v17), **dry-run** job, legal-hold, right-to-erasure endpoint | P1 PR-14 | FOUND/dry-run | A3b, SD-1, OS-1 | yes (dry-run only) |
| 24 | **ENC-2** At-rest encryption for new columns (totp/PHI/contracts) via dual-write→backfill→contract + `reencrypt.ts` | P0 PR-10 | FOUND | ENC-1, MFA-1 | yes (per-column expand/contract) |
| 25 | **FE-1** Frontend `nexasos/`: refresh interceptor, MFA enroll UI, break-glass UI, new-role pickers | P0 PR-9 | FOUND | MFA-1, TOK-1 | staging verify |
| 26 | **ENFORCE-1** AI: flip `ai_redaction` + `ai_broker` to enforce (RESTRICTED already blocked) | P0/P1 | ENFORCE | AIEG-2, FE-1?, §4 gate | **sign-off** |
| 27 | **ENFORCE-2** AUTHZ least-privilege enforce (per company), after shadow clean + break-glass live | P0 PR-11a | ENFORCE | AUTHZ-1, BG-1, MFA-1, ENFORCE-1 | **sign-off** |
| 28 | **ENFORCE-3** Step-up enforce (after enrollment) | P0 PR-11b | ENFORCE | MFA-1, FE-1, ENFORCE-2 | **sign-off** |
| 29 | **ENFORCE-4** Token rotation enforce (after FE refresh ships + old tokens age out ≤7d) | P0 PR-11c | ENFORCE | TOK-1, FE-1 | **sign-off** |
| 30 | **ENFORCE-5** Retention: enable low-risk class soft-purge first | P1 | ENABLE | RET-1, legal sign-off | **sign-off (legal)** |

**Why this order:** all `[FOUND]`/`[SHADOW]` work (1–25) is user-invisible and
ships continuously via `railway up`. Every `[ENFORCE]` flip (26–30) is **one
flag at a time, per company**, each with the global `SECURITY_ENFORCE` /
`P1_FORCE` kill-switch and a per-flag rollback, watching `audit_log`
(`authz.shadow_*`, `*_would_block`) and `ai_query_logs` between flips.

---

## 3. The "first two weeks" concrete checklist

The safest, highest-leverage changes — all additive or shadow, none can lock out
the tenant, each independently shippable.

### Week 1 — foundations + the one urgent investigation

- [ ] **A0 — Migration runner upgrade.** Add `pgOnly?: boolean`, `critical?: boolean`, and multi-statement support (split on `;` for SQLite; single `query` for PG). Make `critical` migrations **rethrow** (so `initialize()` → `process.exit(1)`) instead of warn-and-continue. *Verify:* boot local SQLite + a Railway branch; a deliberately-bad `critical` PG migration aborts boot; a `pgOnly` migration is skipped + marked applied on SQLite. **Prod-safe.**
- [ ] **A1 — Scaffolding.** `lib/feature-flags.ts` (`isFlagOn(companyId,'p0.x'|'p1.x')`, 30s cache, `P1_FORCE`/`SECURITY_ENFORCE` env overrides), `security-flags.ts` (`enforceMode → 'off'|'shadow'|'enforce'`), `writeAuditStrict` (throws on failure), `backend/scripts/security-sweep.ts` enumerating every prefix in `index.ts:83-114`. *Verify:* `npm run build`; sweep prints the route matrix. **Prod-safe.** (Pull this earliest — many PRs read flags.)
- [ ] **[CONFIRM — CRITICAL] ENCRYPTION_KEY investigation (blocks ENC-1).** On the Railway `nexus-api` service: is `ENCRYPTION_KEY` actually set, and was live `users.salary`/PHI ciphertext written with it or with the hardcoded fallback constant? Decrypt one known live `salary` value under (a) the env key and (b) `sha256('nexus_dev_encryption_change_in_production')` to determine which key the data is under. **Outcome decides ENC-1 shape:** if data is under the fallback, ship `ENCRYPTION_KEYS={"v1":"<fallback-derived>","v2":"<new-strong>"}` (active=v2) so legacy rows still decrypt, then `reencrypt.ts`. **Do not deploy the boot guard until this is known.**
- [ ] **A2 — Request-context middleware.** `lib/request-context.ts` (AsyncLocalStorage) + `middleware/request-context.ts`; wire `helmet → cors → rateLimit → requestMetrics → requestContext → json → routes`; set `app.set('trust proxy', 1)`; `authMiddleware` calls `patchContext({actorUserId,actorRole,companyId,impersonatedBy})`. *Verify:* temp `ctx_probe` audit row has ip/UA/endpoint/method/requestId; `x-request-id` echoed. **Prod-safe.**

### Week 2 — audit spine + always-on AI floor

- [ ] **A3a — `writeAudit` v2.** Superset signature (legacy aliases `resource→targetTable`, `userId→actorUserId`, `securityTier→targetSecurityLevel` preserved), before/after diff + `changed_fields`, redaction of `password_hash`/`*_encrypted`/`salary`, pulls missing fields from `getRequestContext()`, **fail-loud** (`console.error` + `auditWriteFailures` counter on `/health/deep`) instead of silent swallow. *Verify:* all ~10 existing callers still compile; unit test diff+redaction. **Prod-safe.**
- [ ] **A3b — `audit_logs` table (v11) + append-only (v12, pgOnly+critical) + hash-chain + dual-write.** New `lib/nexus-audit-schema.ts`; BEFORE UPDATE/DELETE triggers with the `current_setting('audit.purge', true)` guard; per-company hash-chain via `pg_advisory_xact_lock(hashtext(company_id))`; `writeAudit` dual-writes `audit_log` + `audit_logs` (gated `p1.audit_v2`). *Verify (Postgres branch):* `UPDATE/DELETE audit_logs` rejected; `SET LOCAL audit.purge='on'; DELETE` allowed; 3-row chain links. **Prod-safe (additive).**
- [ ] **AIEG-1 — AI redaction floor (start).** `lib/ai-redaction.ts` + the two-line wrap in `askWithFallback`; `ai_query_logs` (v16). **RESTRICTED hard-block + ID/salary/phone/email regex masking ON by default** (the non-negotiable floor); name-pseudonymization behind `ai_redaction='shadow'` to tune false-positives. *Verify:* golden cases (Thai 13-digit ID, ฿salary, phone, email, UUID) masked; integration `/api/chat` outbound (mock provider) contains no raw ID/salary; `ai_query_logs.redaction_count>0`. **Prod-safe** — this is the single most urgent leak-stopper and it only *removes* sensitive tokens from egress.

> **Two-week outcome:** runner safe, flags + sweep in place, request-context +
> reliable append-only audit live, AI egress can no longer ship raw national
> IDs/salary to OpenAI/Anthropic/Gemini/Typhoon, and we know the truth about the
> encryption key. Zero user-visible change. Everything after this builds on the
> audit spine and the AI floor.

---

## 4. Risk register (for the implementation itself)

Risks **of doing the work**, not of the current system. Each has a mitigation +
shadow/canary strategy. Severity = impact × likelihood if mitigations skipped.

| # | Risk | Trigger | Severity | Mitigation | Shadow/Canary |
|---|------|---------|----------|-----------|---------------|
| R1 | **Super-admin / owner lockout** | AUTHZ least-privilege flipped to enforce before break-glass live or before shadow report clean | **Critical** | Per-company flag default off; global `SECURITY_ENFORCE=off` kill-switch; `bootstrap_admin` keeps *module navigation* (only RESTRICTED *data* class-gated); break-glass (BG-1) live first; explicit owner-never-locked check | Run AUTHZ-1 in shadow ≥1 week; require `authz.shadow_admin_bypass` report to show admin only hits RESTRICTED on medical/payroll (expected) before flip; flip on a non-owner test admin first |
| R2 | **Encryption boot guard prevents deploy** | ENC-1 deployed while Railway `ENCRYPTION_KEY` unset or data under fallback | **Critical** | Week-1 investigation (must finish before ENC-1); multi-key `ENCRYPTION_KEYS` with `v1=legacy`; guard hard-fails only in `NODE_ENV=production`; one-line revert of `assertEncryptionReady()` | Deploy guard to a Railway **branch** with a copy of live data first; confirm boot + one `salary` decrypt before prod |
| R3 | **Audit cutover loses trail** | Reader flipped to `audit_logs` before backfill completes, or dual-write dropped too early | High | Dual-write `audit_log` + `audit_logs` for ≥1 release; backfill is idempotent (skip existing ids); flip reader only after backfill verified; **Contract** (rename `audit_log_legacy`) only after a stable release | Compare row counts `audit_log` vs `audit_logs` post-backfill; keep legacy frozen N days before archive |
| R4 | **Append-only triggers block legitimate inserts / retention** | REVOKE INSERT by mistake; or BEFORE DELETE trigger blocks retention job | High | REVOKE only `UPDATE,DELETE,TRUNCATE` (never INSERT) — unit-asserted; retention job sets `SET LOCAL audit.purge='on'`; `writeAudit` stays best-effort for **availability** but now fail-loud; `critical` migration fails boot if trigger DDL errors (caught early on branch) | On PG branch: prove INSERT works, UPDATE/DELETE rejected, guarded DELETE succeeds, before promoting |
| R5 | **Soft-delete read-filter hides live data OR leaks deleted data** | Read filter added before column exists; or a sensitive read forgets the filter | High | Strict order: **add columns everywhere → convert deletes → add read filters**, per-controller behind `p1.soft_delete_read_filter`; sweep asserts list counts **unchanged** at column-add time (nothing soft-deleted yet); partial unique indexes for `users.email`/`companies.slug` `WHERE deleted_at IS NULL` | Canary one controller; assert count parity; delete-via-API then confirm gone from list, present in DB |
| R6 | **FK CASCADE→RESTRICT breaks a maintenance/seed path** | A script relied on cascade (e.g. `lib/tamada-seed.ts` teardown, tests) | Medium | Grep for `DELETE FROM companies/users` and seed teardowns before FK-1; convert offenders to soft-delete/children-first; change is pure safety-net (only fires on hard parent delete, which Item 5 removes) | Run full seed + test suite on PG branch after FK-1 |
| R7 | **AI redaction false-negatives (leak) / false-positives (degraded answers)** | Regex misses a PII shape; or over-masks a name the user asked about | High (FN) / Med (FP) | **Defense in depth:** broker (AIEG-2) excludes RESTRICTED rows *before* prompt assembly = primary control; redaction floor (AIEG-1) masks residual = secondary; RESTRICTED hard-block never shadowed; name-pseudonymization shadowed + `redaction_count` telemetry to tune; CI grep gate fails build if any AI controller imports `buildOrgContext`/`buildPersonalContext` directly | AIEG-1 ships RESTRICTED-block enforced, name-mask shadow; AIEG-2 shadow logs broker-vs-legacy context delta (expect payslip/salary lines to vanish) before enforce |
| R8 | **Mass logout on token rotation** | `token_version` enforced before frontend handles `/refresh` | High | Dual-accept window: verify old 7d tokens (no `tv` ⇒ `tv=0` matches default), enforce mismatch only under `token_rotation='enforce'`; flip only after FE interceptor ships + old tokens age out (≤7d natural expiry) | FE-1 on staging; force-logout a test user, confirm old access token dies ≤15m |
| R9 | **Migration silently retries every boot** | A non-duplicate error in a security migration is warn-and-continued (current `migrations.ts:93`) | Medium | A0 adds `critical` flag → security migrations rethrow → boot aborts loudly rather than half-applying; `pgOnly` prevents SQLite from choking on PG-only DDL | Branch-boot each `critical` migration; confirm `schema_migrations` row written exactly once |
| R10 | **AI-egress workstream merge conflict** | P0 Item 7 broker and P1 Item 8 row-filter shipped as two uncoordinated PRs over the same files | Medium | Merged into one workstream (AIEG-2); single owner; `rag-context.ts`/`ai-router.ts`/`ai-providers.ts` touched once | Land AIEG-1 first (isolated), then AIEG-2 as one PR |
| R11 | **Hash-chain contention / wrong-tenant linkage** | Concurrent audit writes interleave the per-company chain | Low-Med | Per-company chain + `pg_advisory_xact_lock(hashtext(company_id))` serializes read-prev+insert; nightly `audit_chain_checkpoints` re-walk + alert on mismatch | Load-test concurrent writes on branch; verify chain integrity |
| R12 | **Retention irreversible data loss** | Wrong window or hard_purge enabled before legal sign-off | **Critical** | Job ships **disabled + dry-run** (logs `retention_dryrun`); default `soft_purge` (reversible); legal-hold checked before every purge; per-batch `retention_purge` audit event; hard_purge only low-value classes after legal sign-off | Dry-run ≥1 cycle; seed old row + legal hold, confirm it's retained; enable ai_logs>365d soft-purge first |

**Global canary doctrine:** single live tenant today → "canary" = **(1)** PG
branch with copied live data for every `[ENFORCE]`/`critical` change, **(2)**
one-controller / one-flag at a time, **(3)** the per-endpoint sweep (no-token /
staff / dept-role / admin / step-up tokens) run before and after each flip, **(4)**
watch `audit_log` shadow rows + `ai_query_logs` + `auditWriteFailures` between
flips, **(5)** every enforce behind a flag + global kill-switch revertible by
`railway up` with no schema rollback.

---

## 5. Go / No-Go gate — "AI Workforce Analysis" activation

The stakeholder requires this feature ON only when the platform can be trusted to
analyze workforce data without leaking RESTRICTED data to an external LLM and
without un-audited access. **ALL of the following must be TRUE and verified:**

### G1 — Permission engine live (least-privilege, no hard super-admin)
- [ ] `authz.ts` is the single decision point; `canAccessModule` admin short-circuit (`rbac.ts:68`), `requireRole` admin bypass (`middleware/rbac.ts:15`), `user-permissions` `Set(['*'])`, and `canViewTier` ambient admin T2/T3 are all routed through it (AUTHZ-1).
- [ ] Least-privilege **enforced** for the live company (ENFORCE-2), shadow report clean, **break-glass path live + audited** (BG-1).
- *Verify:* sweep — admin token 200 on operational modules, RESTRICTED data masked/denied without active break-glass; `authz.shadow_admin_bypass` quiet on operational modules.

### G2 — Audit live (append-only, tamper-evident, request-context)
- [ ] `audit_logs` append-only triggers active on Postgres (A3b); `writeAudit` v2 fail-loud (A3a); request-context populates actor/target/ip/endpoint (A2); reader flipped + backfill complete (A3c).
- [ ] `ai_query_logs` records every AI call (provider, model, scope, `redaction_count`, `blocked`, `restricted_attempt`, `prompt_hash` — never raw prompt) (AIEG-1).
- *Verify:* `UPDATE/DELETE audit_logs` rejected on PG branch; AI call produces an `ai_query_logs` row; `auditWriteFailures=0` under load.

### G3 — Redaction + broker live (RESTRICTED never reaches an external LLM)
- [ ] Redaction floor enforced in `askWithFallback` — ID/salary/phone/email masking + RESTRICTED hard-block ON (AIEG-1, not shadowed).
- [ ] AI Data Broker is the **only** context source for AI; `rag-context`/`ai-router`/`chat`/`ai-context` rewired; CI grep gate prevents direct `buildOrgContext` use; broker excludes payslips/salary/PHI for **every** role incl. admin/hr/finance (AIEG-2 enforced via ENFORCE-1).
- *Verify:* prompt "summarize <employee> payroll" on every role → response has no amounts; `ai_query_logs.restricted_attempt=1`; mock-provider outbound payload contains no salary digits; CI grep gate green.

### G4 — Consent / disclosure gate live
- [ ] A per-company **consent flag** `companies.settings.ai.workforce_analysis_consent` (with who/when/scope) must be `true` before any workforce-analysis route runs; the route checks it and **audits** the consent decision. **[CONFIRM]** exact consent UX + whether per-employee PDPA consent is required for workforce analysis (Thai PDPA) — legal sign-off.
- *Verify:* with consent off → route returns `403 consent_required` + audit row; with consent on → proceeds, audit records consenting actor.

### G5 — Verified end-to-end on prod-like
- [ ] Full per-endpoint sweep green on a Railway PG branch with live-shaped data, across all token tiers, with all four flags (`least_privilege`, `ai_redaction`, `ai_broker`, audit) in their target enforce state.

**Go decision** = G1∧G2∧G3∧G4∧G5 true, shadow reports reviewed, kill-switch
rehearsed. **No-Go** if any is shadow-only, if `restricted_attempt` ever shows
RESTRICTED data reaching a provider, or if consent gate is absent.

---

## 6. Per-PR detail (scope · files · verify · deploy posture)

Source-PR mapping: A0=P1·PR-0, A1=P0·PR-0 + P1·PR-15, ENC-1=P0·PR-1,
A2=P1·PR-1, A3a=P1·PR-2, A3b=P1·PR-3, A3c=P1·PR-4, A4=P1·PR-5, SD-1=P1·PR-6,
OS-1=P1·PR-10, AUTHZ-1=P0·PR-2, MFA-1=P0·PR-5, BG-1=P0·PR-3, ROLE-1=P0·PR-4,
AIEG-1=P0·PR-6, AIEG-2=P0·PR-7 + P1·PR-12, SD-2=P1·PR-7, SD-3=P1·PR-8,
FK-1=P1·PR-9, ROW-1=P1·PR-11, TOK-1=P0·PR-8, AUD-VIEW=P1·PR-13, RET-1=P1·PR-14,
ENC-2=P0·PR-10, FE-1=P0·PR-9, ENFORCE-1..5=P0·PR-11 / P1 enable.

> For each: **Verify** always includes "`npm run build` + per-endpoint sweep
> (no-token/staff/dept/admin[/step-up]) on SQLite local **and** a Railway PG
> branch". Listed below is the PR-specific assertion on top of that.

- **A0** — runner flags. *Files:* `lib/migrations.ts`. *Verify+:* bad `critical` PG migration aborts boot; `pgOnly` skipped+marked on SQLite; multi-statement splits on SQLite. *Deploy:* **prod-safe.**
- **A1** — scaffolding. *Files:* `lib/feature-flags.ts`, `lib/company-settings.ts`, `lib/security-flags.ts`, `lib/audit.ts` (+`writeAuditStrict`), `scripts/security-sweep.ts`. *Verify+:* sweep enumerates all prefixes; flag read cached. *Deploy:* **prod-safe.**
- **ENC-1** — encryption fail-fast + key versioning. *Files:* `lib/encryption.ts`, `index.ts` (`assertEncryptionReady()`), `scripts/reencrypt.ts`. *Verify+:* legacy 4-part ciphertext decrypts as v1; prod boot fails if key invalid; **branch-boot with live-data copy + one `salary` decrypt before prod.** *Deploy:* **SIGN-OFF (boot risk; blocked on week-1 ENCRYPTION_KEY investigation).**
- **A2** — request-context. *Files:* `lib/request-context.ts`, `middleware/request-context.ts`, `index.ts` (order + `trust proxy`), `middleware/auth.ts` (`patchContext`). *Verify+:* `ctx_probe` row fully populated; `x-request-id` header echoed; system jobs get `actorRole='system'`. *Deploy:* **prod-safe.**
- **A3a** — `writeAudit` v2. *Files:* `lib/audit.ts`, `controllers/deep-health.controller.ts`. *Verify+:* legacy callers compile; diff/redaction unit tests; `auditWriteFailures` surfaces on `/health/deep`. *Deploy:* **prod-safe.**
- **A3b** — `audit_logs` + triggers + hash-chain. *Files:* `lib/nexus-audit-schema.ts`, `lib/migrations.ts` (v11/v12), `db.ts` (wire schema), `lib/audit.ts` (dual-write+chain). *Verify+:* PG branch UPDATE/DELETE rejected, guarded purge allowed, 3-row chain links; SQLite plain table. *Deploy:* **prod-safe (additive).**
- **A3c** — backfill + reader flip. *Files:* `controllers/audit-log.controller.ts`, `scripts/backfill-audit.ts`. *Verify+:* counts match post-backfill; reader returns new table. *Deploy:* **prod-safe** (run backfill off-path, not in boot).
- **A4** — access/deny logging + sampler. *Files:* `middleware/rbac.ts`, `middleware/auth.ts`, `auth.controller.ts`, `lib/rbac.ts`, `lib/audit-sampling.ts`. *Verify+:* forbidden module → `blocked_access`; bad token → `failed_access`; admin short-circuit → `admin_override`; spam GET → deduped `view`. *Deploy:* **prod-safe** (additive; flags `p1.blocked_access_logging` on, `p1.audit_views` off).
- **SD-1** — soft-delete columns (v13) + partial unique (v14). *Files:* `lib/nexus-audit-schema.ts` (`SOFT_DELETE_TABLES`), `lib/migrations.ts`, schema `.ts`. *Verify+:* list counts unchanged; re-create same-email after (future) soft-delete succeeds. *Deploy:* **prod-safe.**
- **OS-1** — owner/security columns (v15) + backfill. *Files:* `lib/nexus-audit-schema.ts` (`TABLE_SECURITY_DEFAULTS`), `lib/migrations.ts`. *Verify+:* `data_owner IS NULL` count = 0 post-backfill. *Deploy:* **prod-safe.**
- **AUTHZ-1** — central authz + `data_class` + shadow. *Files:* `lib/authz.ts` (new), `lib/rbac.ts`/`encryption.ts`/`user-permissions.ts` (delegate wrappers), `lib/migrations.ts`. *Verify+:* unit admin-vs-RESTRICTED; shadow run logs `authz.shadow_admin_bypass` only on RESTRICTED reads; operational modules still 200. *Deploy:* **prod-safe (shadow; no enforce).**
- **MFA-1** — step-up backend. *Files:* `lib/mfa.ts`, `routes/security.route.ts`, `middleware/step-up.ts`, `lib/migrations.ts`, `package.json` (`otplib`). *Verify+:* TOTP drift window, single-use `jti`, expiry; RESTRICTED read without `X-Step-Up` logs `stepup_would_block` (shadow). *Deploy:* **prod-safe (shadow).**
- **BG-1** — break-glass. *Files:* `lib/migrations.ts`, `routes/security.route.ts`, controller. *Verify+:* request→approve→use writes `writeAuditStrict` T3; `canViewClass` honors active non-expired grant; notify `it_security`/`ceo`. *Deploy:* **prod-safe** (endpoints live, still shadow).
- **ROLE-1** — `platform_superadmin`(+`owner`). *Files:* `lib/rbac.ts` (`ROLES`,`MODULE_ACCESS`), `middleware/rbac.ts` (`MANAGER_ROLES`). *Verify+:* new role gets security/settings modules, denied raw payroll/medical without break-glass; existing matrices unchanged. *Deploy:* **prod-safe** (additive; no live reassignment — reassigning the live owner is a separate audited manual step, **[CONFIRM]**).
- **AIEG-1** — redaction floor + `ai_query_logs`. *Files:* `lib/ai-redaction.ts`, `lib/ai-providers.ts` (`askWithFallback` wrap), `lib/migrations.ts` (v16). *Verify+:* golden masking cases; `/api/chat` outbound has no raw ID/salary; `ai_query_logs.redaction_count>0`. *Deploy:* **prod-safe** (RESTRICTED block + ID/salary masking ON; name-mask shadow).
- **AIEG-2** — broker + row-filter (merged). *Files:* `lib/ai-broker.ts`, `lib/row-access.ts`, `lib/rag-context.ts`, `lib/ai-router.ts`, `lib/ai-context.ts`, `controllers/chat.controller.ts`, CI grep gate. *Verify+:* broker excludes payslip/salary/PHI for every role; shadow logs broker-vs-legacy delta; CI fails on direct `buildOrgContext` import. *Deploy:* **prod-safe (shadow).**
- **SD-2** — `audited-db.ts` + soft-delete conversion. *Files:* `lib/audited-db.ts`, sensitive controllers (employees/payroll/patients first). *Verify+:* delete-via-API sets `deleted_at`, writes `delete` audit with `before_json`. *Deploy:* **prod-safe (per-controller).**
- **SD-3** — read-filter. *Files:* `db.ts` (`ACTIVE` const), controllers. *Verify+:* list counts unchanged at rollout; soft-deleted row gone from list, present in DB. *Deploy:* **prod-safe** (per-table, flagged) — but **assert count parity per table** before each flag-on (a read-filter is a behavior change at the row level).
- **FK-1** — CASCADE→RESTRICT. *Files:* `lib/migrations.ts` (pgOnly), schema `.ts`, `lib/tamada-seed.ts`, tests. *Verify+:* `DELETE FROM payroll_periods` with children → RESTRICT error; soft-delete company leaves children; fresh install gets RESTRICT. *Deploy:* **prod-safe** after grep confirms no live hard parent-delete.
- **ROW-1** — row-access engine. *Files:* `lib/row-access.ts`, sensitive read controllers, `lib/encryption.ts` (reuse `canViewTier`). *Verify+:* staff GET T3 patient → empty/403 under `p1.row_security`; admin behavior **[CONFIRM]** + `admin_override` logged. *Deploy:* **prod-safe (flag off).**
- **TOK-1** — token rotation backend. *Files:* `auth.controller.ts`, `middleware/auth.ts`, `lib/migrations.ts`, `routes/auth.route.ts`. *Verify+:* dual-accept old 7d token; tv-mismatch→401; refresh rotation; refresh-reuse→family revoke; force-logout kills old session ≤15m. *Deploy:* **prod-safe (dual-accept).**
- **AUD-VIEW** — view/download/export/approve/reject. *Files:* `documents`/`self-service`/`hr`/`ceo`/`transactions` controllers, `lib/file-storage.ts`. *Verify+:* download payslip → `download` row with `targetSecurityLevel`; export → `export` row. *Deploy:* **prod-safe** (success-path only; flagged).
- **RET-1** — retention dry-run + legal hold. *Files:* `lib/retention-job.ts`, `lib/migrations.ts` (v17), `index.ts`, admin controller. *Verify+:* dry-run logs `retention_dryrun`; held row retained; right-to-erasure defers held/retained rows with report. *Deploy:* **prod-safe (dry-run only).**
- **ENC-2** — at-rest encryption new columns. *Files:* per-column expand (`<col>_enc`), dual-write, backfill, contract; `scripts/reencrypt.ts`. *Verify+:* read-prefer-enc; backfill idempotent; old plaintext dropped only after read flip. *Deploy:* **prod-safe (per-column expand/contract).**
- **FE-1** — frontend. *Files:* `nexasos/` (refresh interceptor, MFA enroll, break-glass UI, role pickers). *Verify+:* staging — 401→refresh→retry; MFA enroll+verify; break-glass request flow. *Deploy:* **staging verify** then prod (frontend deploy).
- **ENFORCE-1..5** — flag flips. *Files:* none (config in `companies.settings` / env). *Verify+:* §5 gate for ENFORCE-1; sweep + shadow-clean per flip; kill-switch rehearsed. *Deploy:* **SIGN-OFF each** (ENFORCE-5 needs **legal** sign-off).

---

## 7. Open confirmations carried from both plans (block specific PRs)

1. **[CONFIRM — blocks ENC-1, week 1]** Railway `nexus-api` `ENCRYPTION_KEY` set? Live `salary`/PHI ciphertext under the env key or the fallback constant?
2. **[CONFIRM — blocks AUTHZ tier semantics]** Locate `docs/architecture/15/17/19/21/22/26-*.md`; reconcile T0–T3 ↔ PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED and role taxonomy.
3. **[CONFIRM — blocks ENC-2 & AIEG-2 exclusion list]** Exact PHI/patient + payslip + contract table/column names in `nexus-*-schema.ts`.
4. **[CONFIRM — blocks ENFORCE-1]** Does any live feature rely on AI reading salary/payroll? Review `ceo.controller.ts` `/api/ceo/brief` before broker enforce.
5. **[CONFIRM — blocks MFA policy]** Step-up policy: TOTP-only for RESTRICTED vs LINE-OTP fallback; PIN allowed for which classes.
6. **[CONFIRM — blocks ROLE-1 reassignment + G1]** Introduce `owner` distinct from first-user `admin`; reassign live owner (separate audited manual step).
7. **[CONFIRM — blocks A3b/A4 REVOKE & FK-1]** Railway PG app role name for `REVOKE`; grep confirms no live `DELETE FROM companies/users`.
8. **[CONFIRM — blocks SD-1 unique policy]** Partial unique index vs anonymize on soft-deleted unique columns, per table.
9. **[CONFIRM — blocks ENFORCE-5 / G4]** Legal sign-off on retention windows (no `hard_purge` until then) and PDPA consent model for workforce analysis.
10. **[CONFIRM — blocks ROW-1 / G1]** Should `admin` be filtered for T3/PHI row-security (and `admin_override` logged), or exempt?

---

## 8. TL;DR for the stakeholder

- **Ship 1–25 continuously** (`railway up`) — all additive or shadow, **no
  user-visible change**, no lockout risk.
- **First two weeks** = migration-runner safety, flags+sweep, request-context,
  reliable **append-only audit**, and the **always-on AI redaction floor** that
  stops national IDs / salary from ever leaving to an external LLM — plus the
  one urgent Railway encryption-key investigation.
- **"AI Workforce Analysis" turns on only when G1–G5 are all true and verified**
  (permission engine + audit + redaction/broker + consent gate, proven on a
  prod-like branch). Until then it stays off behind `workforce_analysis_consent`.
- **Every behavior flip is one flag, per company, reversible by `railway up`**
  with no schema rollback. The two `Critical` risks (owner lockout, encryption
  boot-fail) are each gated behind a prerequisite and a kill-switch.
