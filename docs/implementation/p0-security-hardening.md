# P0 — Security Hardening Implementation Plan

> **Status:** DRAFT for review · **Target:** live NEXUS OS backend (Express + TypeScript + PostgreSQL on Railway, `railway up` per service) · **SQLite** used for local dev (`backend/src/lib/db-sqlite.ts`).
> **Author altitude:** Senior Staff Engineer + Security Architect.
> **Principle:** every change is **expand → backfill → contract**, feature-flagged in `companies.settings`, shadow/log-only before enforce. Nothing here may lock out the live tenant (Saduak Suay Mai PCL).

---

## 0. Grounding notes & unknowns

- **[CONFIRM]** The prompt references `docs/architecture/17,19,21,22,26,15-*.md`. **These files do not exist in the repo** — only `docs/ARCHITECTURE-MAP.md` is present. This plan is therefore grounded entirely in the **real code** (paths/line refs below). If the architecture docs exist elsewhere (private wiki), reconcile tier definitions (T0–T3) and role taxonomy against them before merging PR-1.
- **Real tier model today:** `security_tier IN ('T0','T1','T2','T3')` on `data_dictionary`, `work_logs`, `audit_log` (`backend/src/lib/nexus-schema.ts:20,39,49,66,85,95`). `canViewTier` (`backend/src/lib/encryption.ts:34-41`) maps: T0/T1 = all; T2 = admin/finance/hr/it; T3 = admin/hr. **There is no "RESTRICTED" class in code** — we will define **RESTRICTED = T3** plus a new explicit data-class label, see PR-1.
- **Hard super-admin** lives in **three** places, not one — all must be addressed:
  1. `backend/src/lib/rbac.ts:68` — `if (r === 'admin') return true` in `canAccessModule`.
  2. `backend/src/lib/user-permissions.ts:7` — `if (r === 'admin') return new Set(['*'])` in `getUserModules`.
  3. `backend/src/middleware/rbac.ts:15` — `if (role === 'admin' || ...)` in `requireRole`.
  Plus `canViewTier` (`encryption.ts:38-40`) grants admin T2/T3 implicitly via the role lists.
- **AI context has two builders**, both must go through the broker: `buildOrgContext` (`backend/src/lib/rag-context.ts:9`) and `buildPersonalContext`/`buildScopedContext` (`backend/src/lib/ai-context.ts`). AI call sites: `ai-router.controller.ts`, `ceo.controller.ts`, `chat.controller.ts`, `documents.controller.ts`, `meetings.controller.ts`, `memory.controller.ts`, `user-ai.controller.ts`, `lib/ai-agents.ts`, `lib/gemini.ts`.
- **Migrations**: additive migrations go in `backend/src/lib/migrations.ts` `MIGRATIONS[]` (next free `version` = **11**). They run at boot via `initialize()` in `backend/src/index.ts:157`. Note the runner swallows non-"duplicate"/"exists" errors as warnings (`migrations.ts:93`) — destructive/contract migrations must be guarded and verified manually.
- **No soft-delete; FK `ON DELETE CASCADE`** throughout — deleting a company/user cascades. Security tables below use `ON DELETE SET NULL` for actor refs where we must retain the audit trail.
- **Feature-flag mechanism:** `companies.settings` is a JSON TEXT column (`db.ts:90`, read pattern at `ai-router.ts:109`). All enforcement reads a flag from there; default OFF (= current behavior) until backfill verified.

### Global rollback primitive
Every enforcement PR is gated behind a per-company flag in `companies.settings.security.<flag>` **and** a global kill-switch env var (`SECURITY_ENFORCE=off`). Rollback = flip flag/env and `railway up` (no schema rollback needed because all schema changes are additive expands).

### Per-endpoint verification sweep (used by every PR)
A reusable script `backend/scripts/security-sweep.ts` (new, PR-0) hits every mounted route prefix from `index.ts:83-114` with: (a) no token, (b) staff token, (c) dept-role token, (d) admin token, (e) step-up token where required. It asserts expected 200/403/401 and dumps a matrix. Run against SQLite local and a Railway **prod-like** branch DB before each enforce flip.

---

## PR-0 — Safety scaffolding (no behavior change)

**Current state:** no security test harness; flags read ad-hoc.
**Target:** shared helpers so later PRs are small and uniform.

**Exact changes (all new files):**
- `backend/src/lib/company-settings.ts` — `getSecuritySettings(companyId): Promise<SecurityFlags>` (parse `companies.settings`, memoized 30s), `getFlag(companyId, path, default)`. Centralizes the JSON.parse currently duplicated in `ai-router.ts:109`.
- `backend/src/lib/security-flags.ts` — typed `SecurityFlags` + global `SECURITY_ENFORCE` env reader. Helper `enforceMode(companyId, flag): 'off'|'shadow'|'enforce'`.
- `backend/scripts/security-sweep.ts` — the per-endpoint sweep above.
- `backend/src/lib/audit.ts` — **add** (do not change signature) an overload `writeAuditStrict()` that throws on failure (current `writeAudit` swallows — `audit.ts:27`). Security events must not be best-effort.

**Backward-compat:** purely additive. No call sites changed.
**Risk/blast radius:** none (dead code until used).
**Verification:** `npm run build` (tsc) in `backend/`; run sweep against local SQLite, confirm it enumerates all prefixes.
**Rollback:** revert PR.

---

## ITEM 1 — Kill the HARD super-admin (least-privilege, RESTRICTED-by-default, break-glass)

### (a) Current state
- `backend/src/lib/rbac.ts:66-71` `canAccessModule`: `if (r === 'admin') return true` short-circuits ALL module checks.
- `backend/src/lib/user-permissions.ts:5-12` `getUserModules`: admin → `Set(['*'])` → `userCanAccessModule` returns true for everything (`requireModule` middleware, `rbac.ts:23-32`).
- `backend/src/middleware/rbac.ts:12-21` `requireRole`: admin bypasses every explicit role gate.
- `backend/src/lib/encryption.ts:38-40` `canViewTier`: admin in T2 and T3 lists → sees salary/T3 unconditionally.
- Net effect: a single `admin` account = data-god over PHI/payroll/HR/exec notes with no audit, no step-up, no scoping. The signup flow (`auth.controller.ts:33`) makes the **first user `admin`**, so the company owner == data-god.

### (b) Target
Least-privilege model:
- `admin` (renamed concept: **business admin**) can manage org/users/settings but **does NOT see RESTRICTED (T3) data by default** and does not auto-pass tier checks.
- A separate **`platform_superadmin` / `it_security`** role (Item 2) holds platform-level powers, still **not** auto-granted RESTRICTED business data.
- RESTRICTED access requires an **explicit, time-boxed, audited break-glass grant** (optional second-approver), never an ambient role bit.

### (c) Exact changes

1. **New data-class layer (expand)** — migration `v11` (`migrations.ts`):
   ```sql
   -- data_class is the authoritative sensitivity label; T-tier stays for back-compat
   ALTER TABLE data_dictionary ADD COLUMN data_class TEXT DEFAULT 'INTERNAL';
   -- classes: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
   ```
   Backfill: `UPDATE data_dictionary SET data_class='RESTRICTED' WHERE security_tier='T3'; ... CONFIDENTIAL WHERE T2; INTERNAL WHERE T1; PUBLIC WHERE T0;` (run as a guarded statement in the same migration).

2. **Centralize the decision** — new `backend/src/lib/authz.ts`:
   - `canAccessModule(role, module, ctx)` — **no admin short-circuit**; pure table lookup against `MODULE_ACCESS`.
   - `canViewClass(user, dataClass, stepUp, breakGlass)` — RESTRICTED requires `breakGlass.active` (Item 1f) **and** step-up (Item 3). CONFIDENTIAL requires role-in-list **and** step-up. Admin gets CONFIDENTIAL only via its explicit module grants, never RESTRICTED ambiently.
   - Keep `rbac.ts`/`encryption.ts` exports as thin wrappers that **delegate** to `authz.ts` so call sites don't churn.

3. **Shadow/log-only first (critical for non-breaking):**
   - Add `if (r === 'admin') { if (mode !== 'enforce') { logShadowDenyIfWouldDeny(...); return true } }` — i.e. keep returning `true` while `enforceMode === 'shadow'`, but **call `writeAudit({action:'authz.shadow_admin_bypass', meta:{module,wouldAllow}})`** every time the new least-privilege logic *would* have denied. This produces a real-traffic report of exactly what admin touches before we flip.
   - Flip to `enforce` per company only after the shadow report is clean and the break-glass path is live.

4. **`MODULE_ACCESS` review** (`rbac.ts:13-54`): today many entries already list `admin` explicitly (good). Audit each: keep `admin` on operational modules (`org`, `settings`, `users-admin`, `ai`, `audit`), **remove** the implicit god-mode by deleting the short-circuit. RESTRICTED-data modules (`medical`, `dental`, `payroll`, future `hr-investigation`, `exec-notes`) keep their role lists but their **data reads** go through `canViewClass` (so admin sees the module shell but RESTRICTED rows are masked unless break-glass).

5. **`getUserModules` (`user-permissions.ts:7`)**: replace `Set(['*'])` with the explicit union of admin's `MODULE_ACCESS` modules + permission-group modules. Wildcard `'*'` only for `platform_superadmin` under enforce mode (Item 2), and even then RESTRICTED data is still class-gated.

6. **Break-glass path** — new table (migration `v12`):
   ```sql
   CREATE TABLE IF NOT EXISTS break_glass_grants (
     id TEXT PRIMARY KEY,
     company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
     user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
     data_class TEXT NOT NULL,           -- 'RESTRICTED'
     scope TEXT,                          -- module/resource, e.g. 'medical' or 'payroll:user:<id>'
     justification TEXT NOT NULL,
     approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,  -- second approver (nullable if single-approver mode)
     status TEXT DEFAULT 'active' CHECK (status IN ('pending','active','expired','revoked')),
     expires_at TIMESTAMPTZ NOT NULL,     -- time-boxed (default now()+30min)
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
   - New controller/route `POST /api/security/break-glass` (request, with `justification`, `scope`, `ttl<=ttlMax`), `POST /api/security/break-glass/:id/approve` (second approver; required iff `companies.settings.security.break_glass_two_person=true`), `GET /api/security/break-glass` (active grants), `POST /:id/revoke`.
   - Every request/approve/use **writes `writeAuditStrict`** (mandatory, throws on failure) with `security_tier='T3'`.
   - `authz.canViewClass` checks for an `active`, non-expired grant matching `(company_id,user_id,data_class,scope)`.
   - Notification on grant/use to `it_security` + `ceo` via existing `notifications.ts` / `line-notify.ts`.

### (d) Backward-compat / non-breaking
- Expand (v11 data_class, v12 break_glass) is additive. `canViewTier` keeps working (delegates).
- **Shadow mode default ON-as-allow**: until `companies.settings.security.least_privilege='enforce'`, admin keeps full access; we only *log* would-be denials. Zero user-visible change.
- Wrappers preserve all existing import sites — no controller edits required to ship the expand.

### (e) Risk + blast radius
- **High if flipped to enforce prematurely** → admin loses access. Mitigated by: shadow report, per-company flag, global kill-switch, and an explicit `bootstrap_admin` allowance (the signup admin keeps module access; only **RESTRICTED data** is class-gated, not module navigation).
- Touching `canAccessModule` affects **every** authz check — hence the wrapper + shadow strategy rather than in-place rewrite.

### (f) Verification
- Unit: `authz.spec.ts` — admin vs RESTRICTED (denied without break-glass), break-glass active/expired, second-approver required path.
- Shadow run: deploy with `least_privilege='shadow'`, drive normal admin usage, confirm `audit_log` rows `authz.shadow_admin_bypass` only on RESTRICTED reads (medical/payroll), not on operational modules.
- Sweep (PR-0): admin token must still 200 on operational modules; RESTRICTED data endpoints must mask/deny under enforce, allow under active break-glass.
- Postgres prod-like: run on a Railway DB branch copy with the live tenant's data; confirm owner-admin still logs in and navigates.

### (g) Rollback
- `companies.settings.security.least_privilege='off'` (or `SECURITY_ENFORCE=off`) → instant revert to current behavior; schema stays (harmless). No data migration to undo.

---

## ITEM 2 — Least-privilege roles (platform vs business; CEO/owner ≠ data-god)

### (a) Current state
`ROLES` (`rbac.ts:3-7`): `admin, ceo, operations, medical, dental, finance, hr, it, marketing, warehouse, franchise, sales, staff`. `admin` conflates "platform/IT operator" with "business owner"; `ceo` is broad but currently relies on `admin` for god-mode. `canViewTier` gives `admin/finance/hr/it` T2 and `admin/hr` T3.

### (b) Target
- Add **`platform_superadmin`** (IT-Security; manage system/settings/security, no ambient RESTRICTED business data) and keep **`admin`** as **business admin** (org/users/ops). `ceo`/`owner` = strategic visibility (CONFIDENTIAL aggregates) but **not** row-level PHI/payroll without break-glass.
- Principle: powers are **module + class** grants, never "is admin → everything".

### (c) Exact changes
- `rbac.ts:3-7` `ROLES`: append `'platform_superadmin'`. **[CONFIRM]** whether to add `'owner'` distinct from `ceo` (the signup user is currently `admin`; recommend introducing `owner` for the first user and reserving `admin` for delegated business-admins — but that changes signup, see below).
- `MODULE_ACCESS`: give `platform_superadmin` the IT/security modules (`settings`, `users-admin`, `user-groups`, `ai`, `memory`, `taxonomy`, `audit`, new `security`). Remove any reliance on the short-circuit (Item 1).
- `MANAGER_ROLES` (`middleware/rbac.ts:7-10`): add `platform_superadmin`.
- `canViewTier`/`canViewClass`: **drop ambient `admin` from T3**; T3/RESTRICTED only via break-glass. T2/CONFIDENTIAL keep `finance/hr` (job-necessary) but require step-up (Item 3).
- **Signup (`auth.controller.ts:33`)**: keep first user `admin` for back-compat, but add migration to optionally promote the live tenant's true owner. **[CONFIRM]** with stakeholder before renaming live roles.
- Migration `v13`: no column change needed (role is free TEXT); add a CHECK-free seed/doc note. Add `users.role` index if absent for perf.

### (d) Backward-compat
- New role is additive; nobody is auto-assigned it. Existing `admin` users keep working (Item 1 governs their data reach). Role string stays TEXT so no enum migration risk.
- Frontend role pickers must learn the new role — **[CONFIRM]** `nexasos/` UI lists; ship UI in a follow-up so backend can accept it first (expand).

### (e) Risk + blast radius
- Low if we only *add* a role and don't reassign live users in the same PR. Reassignment of the live tenant is a separate, manual, audited step.

### (f) Verification
- Sweep with a `platform_superadmin` token: gets security/settings modules, **denied** raw payroll/medical rows without break-glass.
- Confirm existing `admin`/`ceo`/`finance`/`hr` matrices unchanged except RESTRICTED now class-gated.

### (g) Rollback
- Remove role from `ROLES`/`MODULE_ACCESS`; no data to undo (no users assigned in this PR).

---

## ITEM 3 — MFA / PIN step-up for RESTRICTED data & sensitive actions

### (a) Current state
- JWT only (`auth.middleware`, `auth.ts:17-41`); no second factor anywhere. Sensitive actions (export, permission change, viewing salary at `encryption.ts:sanitizeUserForRole`) require only the access token.

### (b) Target
A **step-up token** required for: reading RESTRICTED (T3) / CONFIDENTIAL-on-export data, data export endpoints, permission/role changes, impersonation (`auth.controller.ts:118`), and break-glass requests.

**Mechanism choice (tradeoffs):**
- **TOTP (RFC 6238)** — primary. No SMS cost, works offline, standard authenticator apps. Tradeoff: enrollment friction; need recovery codes. **Recommended default.**
- **In-app PIN** (separate from password, bcrypt-hashed, rate-limited, 6-digit) — low-friction fallback for staff without authenticators; weaker (knowledge factor only) so allowed only for CONFIDENTIAL, **not** RESTRICTED. 
- **LINE OTP** — the org already integrates LINE (`line-notify.ts`, `line-webhook.ts`); good for Thai users without authenticator apps. Tradeoff: depends on LINE deliverability + bound `line_user_id` (`users.line_user_id`, migration v4). Use as alternate second factor.

**Decision:** TOTP for RESTRICTED; TOTP **or** LINE OTP for RESTRICTED if TOTP unenrolled; PIN allowed only for CONFIDENTIAL/sensitive-action step-up. **[CONFIRM]** policy with stakeholder.

### (c) Exact changes
- Migration `v14`:
  ```sql
  ALTER TABLE users ADD COLUMN totp_secret TEXT;          -- encryptField()'d at rest
  ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0;
  ALTER TABLE users ADD COLUMN pin_hash TEXT;             -- bcrypt
  ALTER TABLE users ADD COLUMN mfa_recovery TEXT;         -- encrypted JSON array of hashed codes
  CREATE TABLE IF NOT EXISTS step_up_tokens (
    id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    company_id TEXT, factor TEXT, scope TEXT, jti TEXT UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
- New lib `backend/src/lib/mfa.ts` — TOTP (use `otplib`, add to `backend/package.json`), PIN verify, LINE-OTP issue/verify (reuse `line-notify.ts`). Secrets stored via `encryptField` (Item 4).
- New routes `backend/src/routes/security.route.ts` + controller: `POST /api/security/mfa/enroll` (returns otpauth URI/QR), `POST /api/security/mfa/verify` (activate), `POST /api/security/step-up` (verify factor → issue short-lived **step-up JWT**, `exp ≤ 5min`, claim `{stepup:true, scope, jti}`), `POST /api/security/pin/set`.
- New middleware `backend/src/middleware/step-up.ts` — `requireStepUp(scope)`: verifies a step-up JWT in `X-Step-Up` header (signed with `getJwtSecret()` namespace or a dedicated `STEP_UP_SECRET`), checks `jti` not in `step_up_tokens.used_at`, marks single-use for export/permission-change. On success `next()`, else `403 {error:'step_up_required', factors:[...]}`.
- Wire `requireStepUp` into: RESTRICTED data reads (via `authz.canViewClass` returning `needsStepUp`), export endpoints, `PATCH` permission/role routes, impersonate (`auth.controller.ts:118`), break-glass request.
- `audit.ts`: every step-up issue/use/failure → `writeAuditStrict`.

### (d) Backward-compat
- Expand: columns nullable, `totp_enabled=0` default → **no one is forced into MFA on day one**.
- Enforcement gated by `companies.settings.security.step_up='shadow'|'enforce'`. In shadow, missing step-up logs `authz.stepup_would_block` but allows. Enrollment campaign runs during shadow window, then flip to enforce.
- Impersonation keeps working until enforce.

### (e) Risk + blast radius
- Lockout risk if enforce flips before enrollment → mitigated by shadow window + recovery codes + LINE-OTP fallback + `platform_superadmin` admin reset path.
- New dependency `otplib` — vet, pin version.

### (f) Verification
- Unit: TOTP verify drift window, single-use jti, expiry. PIN rate-limit (reuse `rate-limit.ts` pattern, add `/api/security/step-up` bucket).
- Sweep: RESTRICTED read without `X-Step-Up` → 403 `step_up_required` under enforce; with valid step-up → 200; replayed jti on export → 403.
- Prod-like: enroll a test user via Railway branch, full flow.

### (g) Rollback
- `step_up='off'` flag / `SECURITY_ENFORCE=off`. Columns harmless if unused.

---

## ITEM 4 — Fail-fast ENCRYPTION_KEY + key versioning + at-rest field list

### (a) Current state
- `encryption.ts:5-8` `getKey()` falls back: `ENCRYPTION_KEY || JWT_SECRET || 'nexus_dev_encryption_change_in_production'`. **A missing key silently uses a hardcoded constant** → all "encrypted" salary/PHI is trivially decryptable. No key version, so rotation is impossible without re-encrypt-in-place.
- Ciphertext format `enc:iv:tag:data` (`encryption.ts:16`) has **no key id**.

### (b) Target
- Boot **fails** in production if `ENCRYPTION_KEY` is absent or weak (< 32 bytes entropy). No fallback constant.
- Ciphertext carries a **key version** so values can be re-encrypted lazily; support N active keys for rotation.

### (c) Exact changes
1. `encryption.ts`:
   - New `loadKeys()`: parse `ENCRYPTION_KEYS` (JSON `{"v1":"<base64-32B>", "v2":"..."}`) **or** single `ENCRYPTION_KEY` (treated as `v1`). Reject if active key < 32 bytes / equals known dev constant. Throw `EncryptionKeyError` at module load when `NODE_ENV==='production'`.
   - New format: `enc:v<N>:iv:tag:data`. `encryptField` uses the current `ACTIVE_KEY_VERSION`. `decryptField` reads version from the string, picks the right key; **back-compat:** strings without version (`enc:iv:tag:data`, 4 parts) decrypt with `v1` (the legacy key) — so existing rows keep working.
   - Add `reencryptField(value)` → decrypt with old key, encrypt with active key (for the rotation job).
2. **Boot guard** in `backend/src/index.ts initialize()` (after dotenv, before listen): `import { assertEncryptionReady } from './lib/encryption'; assertEncryptionReady()` — in prod, `process.exit(1)` with a clear message if keys invalid. Local SQLite dev allowed to use an explicit dev key but logs a loud warning.
3. **Fail-fast also for JWT_SECRET reuse:** stop using `JWT_SECRET` as the encryption fallback (security smell — same key two purposes). Require distinct `ENCRYPTION_KEY`.
4. **Lazy re-encryption / rotation job** (`backend/scripts/reencrypt.ts`): scan encrypted columns, `reencryptField` rows on older key version, batched. Idempotent.

### (d) Fields that MUST be encrypted at-rest (authoritative list)
- `users.salary` (already encrypted via `sanitizeUserForRole`) — keep.
- **New to encrypt:** `users.totp_secret`, `users.mfa_recovery` (Item 3).
- **PHI / patient (T3):** the "Customer T3 (Patients PDPA)" data referenced in `ARCHITECTURE-MAP.md` — **[CONFIRM]** exact table/columns (likely a patients/customer-T3 table in `nexus-*-schema.ts`); encrypt name/national-id/contact/medical-notes.
- **Payroll:** `payslips` sensitive numeric fields are aggregates (lower risk) but bank account / national ID if present → encrypt. **[CONFIRM]** payslip columns in `nexus-hr-*-schema.ts`.
- **Contracts / HR-investigation / exec notes** free-text bodies (T3) → encrypt at rest.
- National ID / tax_id where stored per-person → encrypt.

> Implementation for *adding* encryption to a column = expand: add `<col>_enc`, dual-write, backfill, read-prefer-enc, then drop plaintext (contract) — see Item dual-write pattern. Do **not** encrypt-in-place on the live column in one shot.

### (e) Backward-compat
- Versioned format is backward-readable (4-part legacy → v1). Existing salary ciphertext keeps decrypting.
- Boot guard only hard-fails in `production`; dev unaffected (explicit dev key).
- New columns/dual-write are additive.

### (f) Risk + blast radius
- **Highest-stakes change**: if `ENCRYPTION_KEY` env is not actually set on Railway today (it relies on the fallback!), turning on fail-fast will **prevent boot**. **MUST** verify the Railway `nexus-api` service has a real `ENCRYPTION_KEY` set *and that current ciphertext was written with it* **before** deploying the guard. **[CONFIRM] CRITICAL:** check Railway env now; if data was encrypted under the fallback constant, set `ENCRYPTION_KEYS={"v1":"<the-fallback-derived-key>", "v2":"<new-strong-key>"}` so legacy rows still decrypt, set active=v2, then run `reencrypt.ts`.
- Blast radius: any read of `users.salary` / PHI if key handling is wrong → decrypt failures. Stage on Railway DB branch first.

### (g) Rollback
- Boot guard: revert the `assertEncryptionReady()` call (one line) and `railway up` if a key issue blocks deploy. Keep multi-key support (harmless). Do **not** rollback after re-encryption has run with v2 unless v1 still present in `ENCRYPTION_KEYS`.

---

## ITEM 5 — Token revocation, rotation, short-lived access + refresh

### (a) Current state
- `auth.controller.ts:59,92` `jwt.sign({id,company_id}, secret, {expiresIn:'7d'})`. No refresh token, **no revocation/blocklist**, no `token_version`. A leaked 7-day token is valid for 7 days; password/role change does **not** invalidate it. `authMiddleware` (`auth.ts:22`) verifies signature + reloads user, nothing else.
- Impersonation tokens (`auth.controller.ts:152`) also 7d, non-revocable.

### (b) Target
- Short-lived **access token (~15min)** + **refresh token (~7–30d)** stored server-side and revocable. Per-user `token_version` bumped on password change, role change, forced logout. Logout + admin force-logout. Rotation on refresh (one-time-use refresh tokens).

### (c) Exact changes
1. Migration `v15`:
   ```sql
   ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0;
   CREATE TABLE IF NOT EXISTS refresh_tokens (
     id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
     company_id TEXT, jti TEXT UNIQUE NOT NULL, family TEXT,    -- rotation family for reuse detection
     revoked INTEGER DEFAULT 0, expires_at TIMESTAMPTZ NOT NULL,
     replaced_by TEXT, user_agent TEXT, ip TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE TABLE IF NOT EXISTS access_token_blocklist (
     jti TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL, reason TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
2. `auth.controller.ts`:
   - `issueToken`/`signin`: access token gets `{id,company_id,tv:<token_version>,jti}` `exp=15m`; mint a refresh token row + cookie/body. Keep `impersonated_by` claim on access token.
   - New `POST /api/auth/refresh` — validate refresh jti (not revoked, not expired, single-use), **rotate** (revoke old, issue new in same `family`; if a revoked token is reused → revoke whole family = theft response), issue new access token.
   - `POST /api/auth/logout` — revoke current refresh family + blocklist current access jti.
   - `POST /api/auth/logout-all` / admin `POST /api/auth/force-logout/:userId` — bump `users.token_version` (instantly invalidates all access tokens) + revoke all refresh rows.
   - On **password change** and **role change** controllers → bump `token_version` + revoke refresh family.
3. `auth.ts` middleware: after `jwt.verify`, check `payload.tv === user.token_version` (else 401) and `payload.jti` not in `access_token_blocklist`. Cleanup job purges expired blocklist/refresh rows (reuse `job-queue.ts`/`sla-escalation.ts` scheduler pattern).
4. **Frontend** (`nexasos/`) must call `/refresh` on 401 — **[CONFIRM]** add interceptor; ship behind compatibility window (see below).

### (d) Backward-compat (critical — live sessions)
- **Dual-accept window:** Phase 1 — keep verifying old 7d tokens (no `tv` claim → treat as `tv=0`, which matches default) so currently-logged-in users aren't kicked. Add `tv` + blocklist checks but only *enforce mismatch* when `companies.settings.security.token_rotation='enforce'`. Phase 2 — once frontend ships refresh support and old tokens age out (≤7d), flip access-token TTL to 15m and enforce `tv`.
- Refresh endpoint/table additive. No forced logout on deploy.

### (e) Risk + blast radius
- Mass logout if `token_version` enforced before frontend handles refresh → mitigated by dual-accept + flag + 7-day natural expiry window. Verify frontend interceptor on staging first.
- In-memory rate-limit (`rate-limit.ts`) is per-instance; add a `/api/auth/refresh` bucket. **[NOTE]** blocklist/refresh are DB-backed (correct across Railway instances), unlike rate-limit.

### (f) Verification
- Unit: tv mismatch → 401; refresh rotation; refresh-reuse → family revoke; logout-all bumps tv.
- Sweep: old token still works in phase 1; after force-logout, old access token 401 within ≤15m (immediately if blocklisted).
- Prod-like: log in on Railway branch, change password, confirm old session dies.

### (g) Rollback
- `token_rotation='off'` → behave as today (verify signature only). Tables harmless. Revert access TTL to 7d if refresh flow misbehaves.

---

## ITEM 6 — AI redaction gate (input + output) before any external provider call

### (a) Current state
- `ai-providers.ts:220 askWithFallback` → `callProvider` (`:189`) → `callOpenAI/callClaude/callGemini/callTyphoon` send the **raw** `prompt` (which `routeAI` builds as `contextBlock + prompt`, `ai-router.ts:62`) directly to external APIs. **No redaction.** `buildOrgContext` injects names, payslip gross/net/tax, leave, attendance (`rag-context.ts:104-113`) straight into the prompt.
- No scan of model output before returning to the user.

### (b) Target
A **mandatory** redaction layer that runs **inside** `askWithFallback` (single choke-point so no call site can bypass): mask PII/PHI/salary/IDs before egress; scan output for leaked patterns; **hard rule: RESTRICTED data never enters a prompt** (enforced upstream by Item 7's broker, defense-in-depth here).

### (c) Exact changes
1. New `backend/src/lib/ai-redaction.ts`:
   - `redactOutbound(text): {text, replacements}` — regex + dictionary masking:
     - Thai **national ID** (13-digit), phone numbers, emails, **bank account** patterns, **salary/amount** patterns near keywords (เงินเดือน/salary/net/gross/฿ followed by digits), employee/company UUIDs.
     - **Name masking:** pull active employee names for the company (already loaded by broker) and replace with stable pseudonyms (`[PERSON_1]`) — preserves utility, removes PII.
   - `scanInbound(text)` / `scanOutbound(text)` — detect residual RESTRICTED markers; if found in a place that should be clean → **block** (throw) and audit.
2. `ai-providers.ts askWithFallback` (`:220`): at the top, `const safe = redactOutbound(prompt); ... callProvider(provider, safe.text, options)`. Also redact `options.system` if it contains context. After a successful result: `const out = scanOutbound(result.text); if (out.leaked) { audit + mask }`. This is the **single enforcement point** covering chat/OCR/meetings/contracts/CEO — every site funnels through here.
   - **[NOTE]** vision path sends `imageBase64` — redaction can't see image content; document this limitation and keep vision on `RESTRICTED`-free flows only (broker decides).
3. Tie to logging — extend AI logs: migration `v16` add `ai_query_logs` (or augment `ai_logs`, `db.ts:145`):
   ```sql
   CREATE TABLE IF NOT EXISTS ai_query_logs (
     id TEXT PRIMARY KEY, company_id TEXT, user_id TEXT, provider TEXT, model TEXT,
     scope TEXT, redaction_count INTEGER DEFAULT 0, blocked INTEGER DEFAULT 0,
     restricted_attempt INTEGER DEFAULT 0, prompt_hash TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
   `askWithFallback`/`routeAI` write one row per call with `redaction_count`, whether output scan tripped, and (Item 7) whether a RESTRICTED class was requested+blocked. Never store raw prompt — store `prompt_hash` + counts only.
4. Config: `companies.settings.security.ai_redaction='shadow'|'enforce'`. Shadow = compute & log `redaction_count` but send original (to compare quality); enforce = send redacted. Default **enforce** for RESTRICTED-class blocking immediately (that path is never shadowed — RESTRICTED must never egress), shadow only for the pseudonymization of names while we tune false positives.

### (d) Backward-compat
- Choke-point change is transparent to call sites (same function signature). Output unchanged for non-sensitive prompts.
- Name-pseudonymization behind shadow flag to tune; PII/ID/salary regex masking + RESTRICTED block **on by default** (the whole point).

### (e) Risk + blast radius
- Over-redaction degrades answer quality (e.g., masking a name the user legitimately asked about) → shadow window + per-pattern flags + `redaction_count` telemetry to tune.
- Under-redaction = leak → covered by Item 7 broker as primary control (redaction is defense-in-depth).
- Every AI call now does regex work — negligible latency vs network call.

### (f) Verification
- Unit: golden cases — national ID, ฿ salary, phone, email, UUID all masked; benign text untouched; output scan catches a planted national ID.
- Integration: drive `/api/chat` company scope; assert outbound payload (mock provider) contains no raw national ID/salary and `ai_query_logs.redaction_count>0`.
- Sweep: a prompt engineered to ask "what is <employee>'s salary?" → with broker (Item 7) returns no salary; redaction ensures even leaked context is masked.

### (g) Rollback
- `ai_redaction='off'` flag (RESTRICTED hard-block stays on regardless — it's the non-negotiable rule). Revert the two-line `askWithFallback` wrap if needed.

---

## ITEM 7 — AI Data Broker: AI never reads PHI/payroll/salary directly

### (a) Current state
- `routeAI` (`ai-router.ts:47-66`) calls `buildOrgContext(companyId, userRole, userId)` (`rag-context.ts:9`) which queries DB **directly** and injects payslip gross/net/tax/SSO (`rag-context.ts:104-113`), attendance, leave, and full transaction sums (T2) into the prompt. Tier gating is coarse (`canViewTier`) and **admin/hr/finance see everything**, including the asking user's own payslip and, for admin/hr/finance branches, org-wide payroll/leave.
- `ai-context.ts buildPersonalContext`/`buildScopedContext` is a **second** direct-DB path with the same exposure.
- There is no single component that says "this AI request, on behalf of this user, may see X and must never see RESTRICTED classes."

### (b) Target
A **permission-filtered AI Data Broker** is the *only* way AI obtains org data. It:
1. Resolves the asking user's effective permissions (Item 1 `authz`), 2. Returns **only** rows/fields that user may see, 3. **Hard-blocks RESTRICTED classes (PHI, payroll/salary, HR-investigation, exec notes) from ever entering a prompt — regardless of the user's role or break-glass** (break-glass is for human UI view + audit, *not* for feeding an external LLM).

### (c) Exact changes
1. New `backend/src/lib/ai-broker.ts`:
   - `buildBrokeredContext({companyId, user, scope}): {text, sources, blocked: string[]}`.
   - Internally calls the existing builders but **routes every field through a classifier**: any field/table classified RESTRICTED (payslips, salary, patient/PHI, contracts T3, exec/HR-investigation notes) is **excluded entirely** and recorded in `blocked[]` → `ai_query_logs.restricted_attempt=1`.
   - CONFIDENTIAL (e.g. transaction totals) included **only** if the user passes `canViewClass` for CONFIDENTIAL (and is aggregate, not row-level PII).
   - Replaces the payslip block (`rag-context.ts:104-113`) and the `['admin','hr','finance']` payroll branch (`rag-context.ts:116-141`) with: *aggregate, non-PII operational signals only* (e.g. "payroll period open/closed", counts) — **never amounts tied to a person**, never raw salary.
2. **Rewire**:
   - `ai-router.ts:57-60`: replace `buildOrgContext(...)` call with `buildBrokeredContext(...)`. Keep `buildOrgContext` for any **internal, non-AI** report use, but mark `@deprecated for AI` and add a runtime guard: a thrown error if `buildOrgContext` is invoked from the AI path under a flag.
   - `chat.controller.ts` (`buildScopedContext`) and `ai-context.ts`: route through the broker too; the broker becomes the single context source for all AI scopes (personal/department/company).
3. **Belt-and-suspenders with Item 6:** even brokered text passes through `redactOutbound` before egress. RESTRICTED never gets in (broker); residual PII gets masked (redaction).
4. Config: `companies.settings.security.ai_broker='shadow'|'enforce'`. Shadow logs `blocked[]`/`restricted_attempt` and diffs broker-vs-legacy context; enforce uses broker output. **RESTRICTED exclusion is always on** (not shadowable).

### (d) Backward-compat
- Broker wraps existing builders; in shadow it computes both and logs the delta so we see exactly what stops flowing to AI before enforcing. Default flip to enforce once delta reviewed (expected delta = payslip/salary lines disappearing — which is the goal).
- Non-AI consumers of `buildOrgContext` untouched.

### (e) Risk + blast radius
- AI answers lose access to payroll/PHI specifics → **intended**. Risk is a legitimate workflow that *expected* AI to summarize salary; replace with a permissioned, audited, non-AI report path. **[CONFIRM]** no current product feature relies on AI reading salary (search shows payslip injection exists in `rag-context.ts` and CEO brief in `ceo.controller.ts` — review `ceo.controller.ts` before enforce).
- Two context paths (`rag-context` + `ai-context`) must both be rewired or the leak persists — verify both.

### (f) Verification
- Unit: broker excludes payslips/salary/patient for **every** role incl. admin/hr/finance; `restricted_attempt` logged.
- Integration: prompt "summarize <employee> payroll" on each role → response contains no amounts; `ai_query_logs.restricted_attempt=1`; outbound provider payload (mock) contains no salary digits.
- Grep gate (CI): fail build if any AI controller imports `buildOrgContext`/`buildPersonalContext` directly instead of the broker.
- Sweep + prod-like on Railway branch with live-shaped data.

### (g) Rollback
- `ai_broker='shadow'` to revert context to legacy (RESTRICTED block still enforced in redaction layer Item 6 as the floor). Full revert = restore `buildOrgContext` call in `ai-router.ts` (one line) — but **do not** disable the RESTRICTED exclusion.

---

## Ordered PR plan (small, independently shippable)

| PR | Title | Depends on | Risk | Ship gate |
|----|-------|-----------|------|-----------|
| **PR-0** | Security scaffolding: `company-settings.ts`, `security-flags.ts`, `writeAuditStrict`, sweep script | — | none | build + sweep enumerates routes |
| **PR-1** | ENCRYPTION_KEY fail-fast + key-versioning (Item 4, *no* new-column encryption yet) | PR-0 | **HIGH** (boot) | **CONFIRM Railway `ENCRYPTION_KEY` set & legacy ciphertext decryptable** before deploy |
| **PR-2** | `authz.ts` central module + `data_class` column + backfill; wrappers delegate; **shadow-only** admin bypass logging (Item 1a–e) | PR-0 | med | shadow flag default; no enforce |
| **PR-3** | Break-glass tables + endpoints + audit (Item 1f) | PR-2 | med | endpoints live, still shadow |
| **PR-4** | New roles `platform_superadmin` (+ `owner` [CONFIRM]) (Item 2) | PR-2 | low | additive, no live reassignment |
| **PR-5** | MFA/PIN/step-up: schema, `mfa.ts`, routes, `requireStepUp` middleware (Item 3) | PR-2, PR-3 | med | shadow; enrollment campaign |
| **PR-6** | AI redaction gate in `askWithFallback` + `ai_query_logs` (Item 6) | PR-0 | med | RESTRICTED block on; name-mask shadow |
| **PR-7** | AI Data Broker `ai-broker.ts`, rewire `ai-router`/`chat`/`ai-context`; CI grep gate (Item 7) | PR-2, PR-6 | med | shadow diff reviewed |
| **PR-8** | Token rotation: refresh/blocklist tables, `/refresh`/`logout`/`force-logout`, `token_version`; dual-accept (Item 5 backend) | PR-0 | med | shadow/dual-accept |
| **PR-9** | Frontend `nexasos/`: refresh interceptor, MFA enroll UI, break-glass UI, new-role pickers | PR-5, PR-8 | med | staging verify |
| **PR-10** | At-rest encryption for new columns (totp/PHI/contracts) via dual-write→backfill→contract + `reencrypt.ts` (Item 4 cont.) | PR-1, PR-5 | med-high | per-column expand/contract |
| **PR-11** | **ENFORCE flips** (per-company): least_privilege → step_up → token_rotation → ai_broker. One flag at a time, watch audit/`ai_query_logs`. | PR-2..10 | **HIGH** | shadow reports clean; rollback flag ready |

**Enforcement ordering rationale:** ship all expands + shadow logging first (PR-1..10, user-invisible). PR-11 flips flags **one at a time, per company**, each with the global `SECURITY_ENFORCE` kill-switch and per-flag rollback, watching `audit_log` (`authz.shadow_*`) and `ai_query_logs` between flips. RESTRICTED-never-to-AI (Item 6/7 floor) and ENCRYPTION fail-fast (Item 4) are the only behaviors enabled-by-default; everything else is shadow→enforce.

---

## Open confirmations (block specific PRs)
1. **[CONFIRM — blocks PR-1]** Is `ENCRYPTION_KEY` actually set on the Railway `nexus-api` service today, and was the live `users.salary`/PHI ciphertext written with it (vs. the hardcoded fallback)? Determines whether we need a `v1=legacy` key in `ENCRYPTION_KEYS`.
2. **[CONFIRM]** The architecture docs (17/19/21/22/26/15) are missing from the repo — reconcile T0–T3 ↔ PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED mapping and role taxonomy with the source of truth before PR-2.
3. **[CONFIRM]** Exact PHI/patient + payslip + contract table/column names in `nexus-*-schema.ts` for the encryption + broker exclusion lists (Items 4 & 7).
4. **[CONFIRM]** Whether any live feature relies on AI reading salary/payroll (review `ceo.controller.ts` `/api/ceo/brief`) before flipping `ai_broker` to enforce.
5. **[CONFIRM]** Step-up policy: TOTP-only for RESTRICTED, or allow LINE-OTP fallback; PIN allowed for which classes.
6. **[CONFIRM]** Introduce `owner` role distinct from first-user `admin`, and whether to reassign the live tenant owner (separate audited manual step).
