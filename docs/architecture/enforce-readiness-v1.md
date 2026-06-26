# Enforce Readiness Review v1 — NEXUS OS

> **This is an assessment, NOT a flip.** No flag is enabled by this document. It
> rates each shipped-dark layer's readiness to enforce, grounded in the live
> shadow data (read 2026-06-26), and recommends an order. Every flip still needs
> explicit sign-off.

## Live shadow signals (prod)

| signal | value | read |
|---|---|---|
| MFA enrolled users | **0** | no one can obtain a step-up → break-glass is unusable |
| AUTHZ shadow would_deny | 6, all `getUserModules:wildcard` | thin; only the admin wildcard observed, no `canViewTier` RESTRICTED hits |
| Step-up would_block | 0 | `requireStepUp` is wired to no route yet |
| Break-glass grants | 0 real | mechanism live, unused |
| AI egress class | 3 RESTRICTED / 1 MEDIUM (+9 legacy null) | only the AIEG-2 smoke; ~no real traffic |
| Redaction (shadow) | 0 tokens masked / 13 calls | no structured PII seen in real traffic |
| Active users | **8 admin** + dept roles; 0 owner/platform_superadmin/it_security | enforce would scope 8 admins' wildcard → 39 modules |

**Overarching finding:** shadow coverage is **thin** — real usage hasn't exercised the data-sensitive paths enough to validate enforcement. The data-sensitive flips (AUTHZ, AIEG) need a longer observation window first.

## Per-layer readiness

| layer | flag | gates remaining | ready? | risk |
|---|---|---|---|---|
| **Soft Delete** | `SOFT_DELETE` | run() row-count + execMulti-atomic (2 chips); confirm per-resource deleteRoles | **CLOSEST** | Low — recoverable, tenant-safe, tested; flipping is *strictly safer* than hard-delete |
| **AI Redaction** (AIEG-1) | `AI_REDACTION=enforce` | confirm masking doesn't corrupt legit prompts (thin data) | near | Low — content floor; masks structured PII before send |
| **Role assignment** | (manual, not a flag) | FE-1 role pickers; business decides who is owner/platform_superadmin/it_security | manual step | Low — additive; no flag |
| **AUTHZ least-privilege** | `AUTHZ_SHADOW`→enforce | break-glass USABLE (needs MFA); audit 8 admins' wildcard; confirm finance/it HARD; reconcile legacy `it`; **more shadow data** | **NOT yet** | High — 8 admins affected; RESTRICTED lockout risk without usable break-glass |
| **AIEG Broker** | `AI_BROKER_ENFORCE` | classification validation on real shadow logs; names-in-isolation false-neg; over-block false-pos; wire caller hints | **NOT yet** | High — false-pos = AI availability cliff; false-neg = PHI leak |
| **Step-Up** | `STEP_UP_ENFORCE` | MFA enrollment campaign; FE-1 enroll UI; wire `requireStepUp` to RESTRICTED routes | **LAST** | High — 0 enrolled → enforcing locks everyone out |

## Critical path (why order matters)

```
MFA enrollment + FE-1  ─→  break-glass usable  ─→  AUTHZ RESTRICTED enforce
        (0 enrolled today — the chain's gating dependency)
```

Break-glass requires a step-up (MFA); AUTHZ RESTRICTED enforce requires a usable break-glass (else admin/hr lose salary/medical with no unlock). So **MFA enrollment is the gating dependency** for the data-sensitive layers — yet it is at **0**.

## Recommended order (when each layer's gates clear)

1. **Soft Delete** (`SOFT_DELETE=on`) — first; lowest risk, recoverable, well-tested. Do the 2 chips first.
2. **AI Redaction enforce** (`AI_REDACTION=enforce`) — content floor; mask structured PII before egress.
3. *(parallel, non-flag)* **Role assignment** + FE-1 — assign real owner/it_security; ship MFA enroll UI.
4. **MFA enrollment campaign** → then **Step-Up** wiring (shadow → enforce on RESTRICTED routes).
5. **AUTHZ least-privilege** — after break-glass is usable + the admin-wildcard audit + a fuller shadow window.
6. **AIEG Broker** (`AI_BROKER_ENFORCE`) — after classification is validated/tuned on real shadow logs.

## Before ANY flip (standing gates)

- Gather a **longer real-usage shadow window** (current data is thin) — re-run `authz-shadow-report.ts` and the `ai_query_logs` / redaction queries.
- Keep the master kill `SECURITY_ENFORCE=off` honored; flip **one flag at a time**, per-company first if possible, with the smoke sweep before/after.
- Each flip = explicit sign-off. This review recommends sequence + readiness only.
