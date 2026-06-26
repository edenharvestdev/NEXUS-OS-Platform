# Security Chain v1 — NEXUS OS

> First production-hardening baseline. Everything below is **shipped to prod and
> running DARK** (flag-gated / shadow / additive) — no behavior change until the
> gated enforce flips. Established before the AI Gateway (AIEG-2) work begins.

## The chain

```
MFA (TOTP) → Step-Up → Break-Glass → AUTHZ (least-privilege) → Role Hierarchy → Soft Delete
                                                                      │
                                                          (Audit spine underpins all)
```

| # | Layer | PR | What it does | Flag / state (prod) | Enforce gate(s) |
|---|---|---|---|---|---|
| 0 | **Audit spine** + encryption + AI redaction | Foundation | append-only `audit_logs` (hash-chain), request-context, AI egress redaction, key separation | `AUDIT_V2`/`AI_REDACTION` shadow | F1 hash-chain race; F2 redaction tuning |
| 1 | **MFA-1 (TOTP step-up)** | #17 | TOTP enroll/confirm; short-lived single-use step-up token (jti) | `STEP_UP_ENFORCE` off | enrollment campaign + FE-1; re-enroll needs step-up; consumeStepUp PK→replayed |
| 2 | **AUTHZ-1/2 (least-privilege)** | #15/#16 | central policy engine; `DATA_CLASS_POLICY` (BASIC/MEDIUM/HARD/RESTRICTED); shadow-logs admin bypass | `AUTHZ_SHADOW` **on (observe)** | break-glass live (✓); confirm finance/it HARD; audit admin module wildcard; reconcile legacy `it` |
| 3 | **BG-1 (break-glass)** | #18 | RESTRICTED unlock — hybrid (≤15m self-service / >15m two-person); step-up gated; T3 audited | endpoints live, no enforce | wire `hasActiveBreakGlass` into the data path at enforce |
| 4 | **ROLE-1 + Role Hierarchy v1** | #19 | adds `platform_superadmin`/`owner`/`it_security`; central rank; owner-vs-platform boundary | additive, no reassignment | FE-1 mirror; role-assignment path review |
| 5 | **SOFT-DELETE-1** | #20 | recoverable delete for documents/deals/campaigns; tenant+role gated; full visibility; T2/T1 audit | `SOFT_DELETE` off | run() row-count → skip 0-row audit; execMulti atomic on SQLite |

## Cross-cutting guarantees (all enforced in code today)

- **Tenant isolation** — every mutation (break-glass approve/deny/revoke, soft-delete/restore) compares the row's company to the actor's `req.user.company_id`; cross-tenant is masked as `not_found`. `platform_superadmin` is VIEW-only across tenants, never mutate.
- **Two-person + step-up** — break-glass >15m needs a second privileged approver (≠ requester); a request consumes a single-use MFA step-up.
- **Least-privilege data classes** — RESTRICTED (T3) is break-glass-only for **every** role incl. owner; HARD (T2) = owner/admin/ceo/hr; platform_superadmin/it_security get **no** business data by role.
- **Audit completeness** — security events write `writeAuditStrict` (T2/T3, throws→reverts) for mutations; best-effort `writeAudit` (T1) for sensitive reads + denied attempts. Append-only on Postgres.
- **Adversarial-reviewed** — each layer passed a multi-agent 4–5-dimension review; the reviews caught and fixed a cross-company IDOR (BG-1) and a non-atomic audit (SOFT-DELETE-1) before prod.

## Reference deliverables

- `docs/architecture/role-hierarchy-v1.md` (+ `backend/scripts/role-matrix.ts`)
- `docs/architecture/soft-delete-matrix-v1.md` (+ `backend/scripts/soft-delete-matrix.ts`)
- `backend/scripts/authz-shadow-report.ts` (run with prod `DATABASE_URL` for the would-deny report)

## Status & next

- **Posture:** mechanisms in place + observable; **nothing enforced** — safe baseline.
- **Before any enforce flip:** clear the per-layer gates above + a final `AUTHZ_SHADOW` report review + FE-1 (MFA enrollment / break-glass UI / role pickers).
- **Next:** **AIEG-2 (AI Gateway / broker)** — the redaction floor + ai_query_logs (AIEG-1) and these authz/audit primitives are the substrate the gateway will enforce on. Then **Enforce Readiness Review**.
