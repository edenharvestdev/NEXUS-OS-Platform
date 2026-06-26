# Role Hierarchy v1 — NEXUS OS

> Baseline as of ROLE-1 (additive/dark). Regenerate the table from code any time:
> `cd backend && node --require ts-node/register scripts/role-matrix.ts`.
> Source of truth: `backend/src/lib/rbac.ts` (ROLES, MODULE_ACCESS, ROLE_HIERARCHY),
> `backend/src/lib/authz.ts` (HARD_ROLES / data-class policy), `backend/src/lib/break-glass.ts` (APPROVER_ROLES).

## The matrix

| rank | tier | role | modules | data by role | break-glass approver |
|---:|---|---|---:|---|:---:|
| 100 | platform | **platform_superadmin** | 21 | MEDIUM (T0/T1) | — |
| 90 | owner | **owner** | 39 | HARD (T2) | ✅ |
| 80 | executive | ceo | 29 | HARD (T2) | ✅ |
| 70 | executive | admin | 39 | HARD (T2) | ✅ |
| 60 | function-lead | finance | 17 | MEDIUM (T0/T1) | — |
| 60 | function-lead | hr | 17 | HARD (T2) | — |
| 60 | function-lead | **it_security** | 16 | MEDIUM (T0/T1) | ✅ |
| 50 | function-lead | it | 21 | MEDIUM (T0/T1) | — |
| 40 | manager | operations · medical · dental · marketing · warehouse · franchise · sales | 12 | MEDIUM (T0/T1) | — |
| 10 | staff | staff | 11 | MEDIUM (T0/T1) | — |

`**bold**` = roles added in ROLE-1. "data by role" is what the **least-privilege policy** grants
without break-glass; the legacy live `canViewTier` is wider for some roles (finance/it see T2 today —
flagged by the AUTHZ shadow report, to be tightened at enforce).

## Tiers & boundaries

- **platform_superadmin (100)** — platform/security operator. Gets security/ops modules
  (settings, users-admin, audit, guardian, taxonomy, ingest, …) but **NOT** business-data
  modules (payroll, finance, people, advances, medical, dental, reports) and **NOT** HARD/RESTRICTED
  data by role. It is **not** a break-glass approver. → A platform admin can run the platform but
  cannot read or grant access to salary/PHI. **owner-vs-platform_superadmin boundary.**
- **owner (90)** — business owner. Top business authority: every executive module, HARD (salary)
  by role, and a break-glass approver. RESTRICTED still requires break-glass (like everyone).
- **ceo / admin (executive)** — `admin` is the legacy operational super-admin being scoped down by
  AUTHZ (its module wildcard + RESTRICTED bypass are observed in shadow today).
- **function-leads (60/50)** — hr (HARD, for people data), finance/it/it_security (MEDIUM by role).
  **it_security** is a break-glass approver but does **not** read HARD by role — it authorizes
  others' emergency access without holding the data itself.
- **manager (40)** — department heads (operations, medical, dental, sales, marketing, warehouse,
  franchise): their own department modules + company-wide; MEDIUM data.
- **staff (10)** — company-wide basics only.

## Data classes (least-privilege)

| class | who, by role |
|---|---|
| BASIC / MEDIUM (T0/T1) | every authenticated user in the company |
| HARD (T2 — salary) | owner, admin, ceo, hr |
| RESTRICTED (T3 — PHI/payroll detail) | **no role** — active break-glass grant only (incl. owner) |

## Break-glass eligibility

- **Request:** any authenticated user, with a fresh MFA step-up (single-use). The grant is shadow-only
  until AUTHZ enforce.
- **Approve (>15 min two-person):** `owner, ceo, admin, it_security`. `platform_superadmin` is
  intentionally **excluded** (it must not grant access to business data); generic `it` is **replaced**
  by `it_security`.

## Status / notes

- **Additive & dark.** New roles are appended to `ROLES`; **no user is reassigned** (no role-change
  migration), so prod behavior is unchanged. No enforcement here.
- **Frontend mirror** (`nexasos/` RBAC copy) is **not** updated yet — that is **FE-1**. No user holds a
  new role, so the mirror gap is inert.
- **Enforce gates still open:** audit the admin module wildcard, confirm finance/it HARD policy, final
  AUTHZ_SHADOW report review, FE-1 MFA enrollment/UX — then the gated ENFORCE flips.
- This document is the **baseline for Soft Delete** (next), so deletion/restore permissions reason
  against a stable role model.
