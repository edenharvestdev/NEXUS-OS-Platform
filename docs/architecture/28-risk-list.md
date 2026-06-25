# 28 — Risk List / Enterprise Risk Register (ทะเบียนความเสี่ยงระดับองค์กร)

> **บริษัท:** Saduak Suay Mai PCL — เครือคลินิกเสริมความงาม + ทันตกรรม (แฟรนไชส์)
> **ระบบฐาน:** NEXUS OS (Next.js 16 `nexus-web` + Express/TS `nexus-api` + PostgreSQL บน Railway, deploy ด้วย `railway up` ต่อ service — ไม่ใช่ GitHub auto-deploy)
> **เอกสารชุด:** Enterprise Risk Register / AI Workforce OS Risk Governance
> **สถานะ:** PRODUCTION-READY — strict, exhaustive, deny-by-default, backend-enforced
> **เวอร์ชันเอกสาร:** 1.0 | **เจ้าของเอกสาร:** Principal Enterprise Architect / Risk Owner Council
> **เอกสารที่เกี่ยวข้อง:** `10-security-matrix.md` (data classification), `11-permission-matrix.md` (RBAC/ABAC), `12-ai-access-matrix.md` (AI access), `17-audit-log-design.md` (audit), `22-security-architecture.md` (AuthN/Session), `24-railway-deployment-plan.md` (deploy), `25-cloudflare-security-plan.md` (edge/WAF), `26-development-roadmap.md` (delivery)

---

## 0. ขอบเขต วัตถุประสงค์ และวิธีใช้ (Scope, Purpose & How to Use)

เอกสารนี้คือ **ทะเบียนความเสี่ยงระดับองค์กร (Enterprise Risk Register)** ของโครงการสร้าง AI Workforce OS บนฐาน NEXUS OS สำหรับ Saduak Suay Mai PCL ทุกแถวคือ **risk ที่เป็นจริงและตรวจสอบได้** จากการ discovery โค้ดจริง (`/Users/paul/Desktop/nexus-os-deploy`) ไม่ใช่ความเสี่ยงสมมุติเชิงทฤษฎี เป้าหมายคือ:

1. ระบุความเสี่ยงที่ blocking ต่อการขึ้น production แบบ enterprise (โดยเฉพาะข้อมูล `RESTRICTED`: เวชระเบียน/ทันตกรรม/ผู้ป่วย, เงินเดือน/payroll/สัญญา/ภาษี, การสอบสวน HR, AI evaluation, executive notes)
2. ให้คะแนน **Likelihood × Impact → Severity** ที่จัดลำดับการแก้ได้จริง
3. ผูกทุก risk เข้ากับ **mitigation ที่ลงมือทำได้** และ **owner ที่รับผิดชอบเดี่ยว (single accountable owner)**
4. ใช้เป็น input ตรงให้ `26-development-roadmap.md` (จัดลำดับ sprint) และเป็น gate ของ go-live

### 0.1 หลักการให้คะแนน (Scoring Model)

| มิติ | ระดับ | นิยาม (enterprise, ไม่ผ่อนปรน) |
|---|---|---|
| **Likelihood (L)** | `Rare (1)` | < ปีละครั้ง ภายใต้สภาพปัจจุบัน |
| | `Unlikely (2)` | อาจเกิดได้แต่ต้องมีหลายเงื่อนไขประกอบ |
| | `Possible (3)` | คาดว่าเกิดได้ภายใน 6–12 เดือน |
| | `Likely (4)` | คาดว่าเกิดภายใน 1–3 เดือนถ้าไม่แก้ |
| | `Almost Certain (5)` | เกิดอยู่แล้ว/เกิดทันทีเมื่อ traffic จริงเข้า |
| **Impact (I)** | `Low (1)` | กระทบเฉพาะภายใน, ฟื้นได้เอง |
| | `Moderate (2)` | กระทบ workflow, ต้อง manual แก้ |
| | `Major (3)` | ข้อมูลภายในรั่ว/ดาวน์ไทม์, ต้องแจ้งผู้บริหาร |
| | `Severe (4)` | `RESTRICTED` รั่ว / PDPA breach / เวชระเบียนหลุด, ต้องแจ้ง PDPC + เจ้าของข้อมูล |
| | `Catastrophic (5)` | รั่วข้ามบริษัท (cross-tenant) หรือเวชระเบียนจำนวนมาก, ความรับผิดทางกฎหมาย/แบรนด์แฟรนไชส์เสียหายถาวร |

**Severity = L × I** (1–25) → จัดชั้น: **🟥 CRITICAL (≥15)** · **🟧 HIGH (9–14)** · **🟨 MEDIUM (4–8)** · **🟩 LOW (1–3)**

นโยบาย gate: ทุก risk ระดับ **CRITICAL ต้องมี mitigation ปิดก่อน go-live ของข้อมูล `RESTRICTED`**; **HIGH ต้องมีแผนและเจ้าของ + วันที่ก่อน production**; รับความเสี่ยง (accept) ได้เฉพาะ MEDIUM/LOW โดยมีลายเซ็น Risk Owner Council

### 0.2 รายชื่อ Risk Owner (Accountable Owners)

| รหัสเจ้าของ | บทบาท | ขอบเขตความรับผิดชอบ |
|---|---|---|
| `CISO` | Chief Security Architect | authN/Z, secrets, edge/WAF, immutability, incident |
| `CDA` | Chief Data Architect | schema, soft-delete/versioning, tenant isolation, retention |
| `CAIA` | Chief AI Architect | AI redaction, AI access control, AI audit, decision rights |
| `DPO` | Data Protection Officer **[ASSUMPTION: ต้องแต่งตั้งตาม PDPA]** | PDPA, consent, เวชระเบียน, DSR, breach notification |
| `PMO` | Delivery Lead / Engineering Manager | delivery scope, roadmap, environment parity, release gate |
| `SRE` | Platform/SRE Lead | Railway topology, DR/backup, observability, rate-limit |
| `DPLEAD` | Medical/Dental Compliance Lead **[ASSUMPTION]** | พ.ร.บ.สถานพยาบาล, ความลับผู้ป่วย, สิทธิ์บุคลากรการแพทย์ |

---

## 1. Heat Map สรุป (Executive Heat Map)

```mermaid
quadrantChart
    title NEXUS OS — Risk Heat Map (Likelihood vs Impact)
    x-axis Low Likelihood --> High Likelihood
    y-axis Low Impact --> High Impact
    quadrant-1 ACT NOW (Critical)
    quadrant-2 PLAN & OWN (High Impact)
    quadrant-3 MONITOR (Low)
    quadrant-4 PROCESS (Frequent, Lower Impact)
    R01 AI Over-Disclosure: [0.92, 0.95]
    R02 Cross-Tenant Leak: [0.62, 0.98]
    R03 RESTRICTED Exposure: [0.85, 0.9]
    R04 Audit Non-Guaranteed: [0.9, 0.78]
    R05 No Soft-Delete: [0.95, 0.7]
    R06 Permission Bypass: [0.7, 0.82]
    R07 Secrets Fallback: [0.8, 0.85]
    R08 SQLite Divergence: [0.75, 0.6]
    R09 Single-Region Railway: [0.55, 0.8]
    R10 PDPA/Medical: [0.7, 0.95]
    R11 Rate-Limit In-Memory: [0.85, 0.45]
    R12 Delivery Scope: [0.8, 0.65]
```

> หมายเหตุ: heat map เป็นภาพรวม; ตำแหน่งจริงต่อ risk ดูคะแนน L×I ในตารางหลัก §3

---

## 2. สรุปจำนวนความเสี่ยงตามชั้นและหมวด (Risk Distribution)

| Severity | จำนวน | Risk IDs |
|---|---|---|
| 🟥 CRITICAL (≥15) | 9 | R01, R02, R03, R04, R05, R07, R10, R13, R21 |
| 🟧 HIGH (9–14) | 11 | R06, R08, R09, R12, R14, R15, R16, R17, R19, R22, R24 |
| 🟨 MEDIUM (4–8) | 7 | R11, R18, R20, R23, R25, R26, R27 |
| 🟩 LOW (1–3) | 1 | R28 |

| หมวด (Category) | จำนวน |
|---|---|
| Security | 8 |
| Data | 6 |
| AI | 4 |
| Compliance | 4 |
| Operational | 4 |
| Delivery | 1 |
| Vendor | 1 |

---

## 3. ทะเบียนความเสี่ยงหลัก (Master Risk Register)

> โครงสร้างทุกแถว: **ID · Category · Risk · Likelihood · Impact · Severity · Mitigation · Owner**
> คอลัมน์ **Grounding** ระบุหลักฐานจากโค้ดจริงเพื่อยืนยันว่าเป็นความเสี่ยงจริง ไม่ใช่สมมุติ

### 3.1 หมวด AI (AI Over-Disclosure / Redaction / Decision Rights)

| ID | Category | Risk | L | I | Severity | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| **R01** | AI | **AI over-disclosure — prompt + full org RAG context ส่งออกไป OpenAI/Anthropic/Gemini/Typhoon แบบไม่ redact.** `ai-router.ts` เรียก `buildOrgContext` แล้วส่ง raw prompt + context ตรงเข้าผู้ให้บริการนอก โดย `sanitize.ts` ตัดแค่ `password_hash` และ `encryption.ts` mask แค่ salary — ทั้งคู่ **ไม่อยู่ใน AI path**. ผลลัพธ์: เวชระเบียน/เงินเดือน/RESTRICTED ออกไปนอกประเทศแบบ un-redacted; AI ตอบข้อมูลที่ user ไม่มีสิทธิ์เห็นได้ | 5 | 5 | 🟥 **25** | (1) **NEW** AI Access Gateway บังคับ flow: query → identify user → ตรวจ role/department/position/clearance → filter เหลือเฉพาะ data ที่อนุญาต → ส่งเฉพาะที่อนุญาตเข้าโมเดล → response → **redaction check** → audit. (2) **NEW** PII/PHI redaction layer ก่อนทุก provider call (mask ชื่อ-HN-เลขบัตร-เงินเดือน-สัญญา). (3) Output filter เทียบสิทธิ์ผู้ถามก่อนคืนคำตอบ. (4) ห้ามส่ง `RESTRICTED` เข้าโมเดล public โดยเด็ดขาด (deny-by-default ใน AI path). | `CAIA` |
| **R23** | AI | **ไม่มี `ai_query_logs` แยก — ตรวจสอบย้อนหลังไม่ได้ว่า AI เห็น/ตอบอะไร.** `ai_logs` ปัจจุบันเก็บแค่ `agent, action, tokens_used (=len/4), cost_thb (=0.5 hardcoded)`; **ไม่เก็บ prompt/response/provider/model/latency/grounded/redaction/decision**. เมื่อเกิดข้อโต้แย้งหรือ breach จะพิสูจน์ไม่ได้ | 4 | 4 | 🟥 **16** | **NEW** ตาราง `ai_query_logs` (prompt, response, provider, model, tokens จริง, latency, decision `auto/suggest/human`, grounded flag, redaction_status, allowed_scope_snapshot) append-only, ผูกกับ `audit_log` ด้วย `request_id`. เมตเตอร์ token/cost จริงจาก provider response | `CAIA` |
| **R24** | AI | **Decision rights หลวม — AI อาจ "auto" ในงานที่ควร "human".** `ROUTES` ตั้ง default ต่อ task และ override ผ่าน `companies.settings.ai_decision_rights` JSON ที่ไม่มี schema validation; งาน RESTRICTED (AI evaluation, executive) อาจถูกตั้ง auto ผิดพลาด | 4 | 3 | 🟧 **12** | บังคับ "Copilot not Autopilot" เป็นกฎแข็ง: งานที่แตะ `RESTRICTED` หรือ `HARD` = `human` เสมอ (ห้าม override เป็น auto), validate `ai_decision_rights` ด้วย JSON schema, log ทุกการเปลี่ยน decision-rights เข้า `permission_change_logs` | `CAIA` |
| **R27** | AI | **AI hallucination / ungrounded answer ในบริบทคลินิก.** ตอบข้อมูลทางการแพทย์/ราคา/โปรโมชันที่ไม่มี grounding ทำให้พนักงานสื่อสารผิดต่อผู้ป่วย | 3 | 2 | 🟨 **6** | บังคับ grounded-only mode สำหรับ medical/dental/pricing (ตอบจาก knowledge_items + อ้างอิงแหล่ง), แสดง confidence + ปุ่ม escalate-to-human, เก็บ grounded flag ใน `ai_query_logs` | `CAIA` |

### 3.2 หมวด Security (Permission / Secrets / Audit Immutability / Edge)

| ID | Category | Risk | L | I | Severity | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| **R02** | Security | **Cross-tenant data leak — tenant isolation พึ่ง `company_id = $1` ที่เขียนมือทุก query ไม่มี enforcement.** ถ้า query ใดลืม WHERE จะรั่วข้ามบริษัท/แฟรนไชส์ ไม่มี Row-Level Security ใน Postgres | 3 | 5 | 🟥 **15** | **NEW** เปิด Postgres **RLS** ผูก `company_id` กับ session var (`SET app.company_id`), ห้าม raw query เลี่ยง repository layer, เพิ่ม test ที่จงใจลบ WHERE แล้วต้อง fail, code-scan หา query ที่ไม่มี `company_id` | `CDA` |
| **R03** | Security | **RESTRICTED exposure — admin/ceo เป็น super-user short-circuit ทุก check (`rbac.ts`).** `admin` ลัดทุกการตรวจ จึงเห็นเวชระเบียน/เงินเดือน/การสอบสวน HR ทั้งที่ spec กำหนด RESTRICTED = direct grant only แม้แต่ CEO/admin | 4 | 5 | 🟥 **20** | ยกเลิก admin short-circuit สำหรับ `RESTRICTED`; บังคับ **direct grant + step-up (PIN/reason)** ตาม `22-security-architecture.md`; แยก break-glass ที่ต้อง 2-person approval + audit แดง; default เวชระเบียน/ทันตกรรม/payroll/HR-investigation/AI-eval/exec-notes = RESTRICTED | `CISO` |
| **R04** | Security | **Audit ไม่การันตี — `writeAudit()` เป็น fire-and-forget ใน `try/catch {}` (ทิ้ง error เงียบ).** ไม่มี before/after JSON, ไม่มี ip/ua/request_id/session_id, ไม่มี append-only enforcement (ไม่มี trigger/REVOKE/hash-chain). audit หายได้โดยไม่มีใครรู้ | 5 | 4 | 🟥 **20** | **NEW** audit append-only จริง: เพิ่ม before_state/after_state/changed_fields/ip/ua/request_id/session_id/endpoint/method/result/failure_reason; DB trigger ห้าม UPDATE/DELETE + REVOKE จาก app role; **hash-chain `prev_hash`** ตรวจ tamper; เขียนแบบ **fail-closed สำหรับ action ที่แตะ RESTRICTED** (ถ้า audit เขียนไม่ได้ ปฏิเสธ action); retention policy + WORM | `CISO` |
| **R06** | Security | **Permission bypass — ไม่มี policy engine กลาง; ownership/ABAC เป็น ad-hoc (เทียบ string department).** `departmentScope` คืน null=ทั้งองค์กรสำหรับ admin/hr; ไม่มี `owner_id`/data-ownership model, ไม่มี branch/sub-unit scoping, ไม่มี resource ACL | 3 | 4 | 🟧 **12** | **NEW** central Policy Decision Point (RBAC+ABAC+ownership), `owner_id` + `data_ownership` ต่อ resource, ผูก `org_units/branches` เข้า authz, deny-by-default ทุก endpoint, contract test ต่อ matrix ใน `11-permission-matrix.md` | `CISO` |
| **R07** | Security | **Secrets handling อ่อน — `ENCRYPTION_KEY` fallback เป็น `JWT_SECRET` แล้วเป็น hardcoded dev string** (`encryption.ts:6`). `JWT_SECRET` มี dev fallback; ไม่มี secrets manager; ถ้า env หลุด/ไม่ตั้ง จะใช้คีย์ที่เดาได้ ถอดรหัสข้อมูล RESTRICTED ได้ | 4 | 5 | 🟥 **20** | บังคับ fail-closed: ไม่มี `ENCRYPTION_KEY`/`JWT_SECRET` ใน production = **refuse to boot** (ลบ fallback chain); ใช้ Railway secret + แผนหมุนคีย์ (key rotation/versioned keys); แยกคีย์ enc กับ jwt; เก็บ key ใน secret manager **[ASSUMPTION: Railway shared variables + sealed]** | `CISO` |
| **R11** | Security | **Rate limiter เป็น in-memory ต่อ instance (`new Map()`), defeated เมื่อ scale แนวนอน.** signin 10/min, signup 5/min รีเซ็ตต่อ process; brute-force หลบได้โดยกระจาย request ข้าม instance | 4 | 2 | 🟨 **8** | ย้ายไป distributed rate-limit (Redis/Cloudflare) ตาม `25-cloudflare-security-plan.md`; เพิ่ม login lockout + exponential backoff + MFA สำหรับบัญชีสิทธิ์สูง | `SRE` |
| **R13** | Security | **ไม่มี file/download/export access trail — `user_files` เสิร์ฟด้วยแค่ `security_tier` label ไม่มี log การเข้าถึง.** ไฟล์เวชระเบียน/สัญญา/payslip ดาวน์โหลดได้โดยไม่มีหลักฐานว่าใครดึง | 4 | 4 | 🟥 **16** | **NEW** `file_access_logs` (view/download/export/print) + ตรวจ permission ต่อไฟล์ตาม security_level + signed-URL หมดอายุสั้น + watermark สำหรับ RESTRICTED; export ทุกครั้งเข้า audit | `CISO` |
| **R16** | Security | **ไม่มี login/auth event log — failed login, lockout, token refresh, impersonation ไม่ถูกบันทึก.** `auth.ts` รองรับ impersonation (`impersonated_by`) แต่ไม่มี `login_logs`; สืบสวน account takeover ไม่ได้ | 3 | 3 | 🟧 **9** | **NEW** `login_logs` (success/fail/lockout/refresh/impersonation-start-stop, ip, ua, device), แจ้งเตือน anomaly, ผูก impersonation ทุกครั้งกับ audit แดง + reason | `CISO` |
| **R17** | Security | **ไม่มี token rotation/revocation, ไม่มี CSRF, ไม่มี MFA.** JWT bearer ออกแล้วเพิกถอนไม่ได้จนหมดอายุ; ไม่มี CSRF protection; ไม่มี MFA สำหรับสิทธิ์สูง (`auth.ts` gaps) | 3 | 4 | 🟧 **12** | refresh + revocation list (jti blacklist), CSRF token สำหรับ state-changing, **MFA บังคับ** สำหรับ admin/ceo/hr/finance/medical/dental ตาม `22-security-architecture.md`, อายุ access token สั้น | `CISO` |
| **R21** | Security | **TLS verify ปิด — `ssl: { rejectUnauthorized: false }` บน PG pool (`db.ts:21`).** เปิดช่อง MITM ต่อ DB connection; cert ปลอมไม่ถูกตรวจ | 4 | 4 | 🟥 **16** | เปิด `rejectUnauthorized: true` + ฝัง Railway CA cert (`ssl.ca`); ตรวจ cert chain; ห้าม disable verify ใน production | `SRE` |

### 3.3 หมวด Data (Soft-Delete / Versioning / Schema Integrity)

| ID | Category | Risk | L | I | Severity | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| **R05** | Data | **ไม่มี soft-delete/versioning เลย — 0 `deleted_at` ในโค้ดทั้งหมด, มี `ON DELETE CASCADE` 108 จุด.** ลบจริงแบบ cascade: ลบ user/department ลากข้อมูลผูกพันหายถาวร ฟื้นไม่ได้ และทำลายหลักฐาน audit/medical | 5 | 4 | 🟥 **20** | **NEW** เพิ่ม `deleted_at/deleted_by/is_active/version` ทุก core table ตาม GLOBAL RULES; เปลี่ยน delete เป็น soft-delete + restore; แทน `ON DELETE CASCADE` ด้วย `RESTRICT`/soft-cascade; optimistic lock ด้วย `version`; ห้าม hard-delete เวชระเบียน/audit | `CDA` |
| **R14** | Data | **ไม่มี history/versioning ของข้อมูล mutable (มีแค่ `salary_history` ครั้งเดียว).** การแก้เวชระเบียน/KPI/permission ไม่เก็บประวัติก่อนแก้ → field-level change ตรวจไม่ได้ | 4 | 3 | 🟧 **12** | บังคับ before/after capture เข้า audit (เชื่อม R04); ตาราง history/temporal สำหรับ entity สำคัญ (patients, payroll, permission_groups); `version` ทุก mutable row | `CDA` |
| **R15** | Data | **Org-structure tables ไม่ถูกผูกเข้า authz — membership เป็น free-text `users.department` string ไม่ใช่ FK.** `departments/org_units/branches` มีแต่เป็น data เฉย ๆ; พิมพ์ department ผิด = สิทธิ์ผิด/หลุด scope | 4 | 3 | 🟧 **12** | **NEW** บังคับ FK `users.department_id → departments.id` + sub_department/team/position FK; เลิกใช้ string; seed 10 แผนก→13 role ให้เป็น referential; ผูก org tree เข้า ABAC scope | `CDA` |
| **R18** | Data | **Backup/restore ไม่ได้ทดสอบจริง — มี `backup_records` + daily backup worker แต่ไม่มี restore drill.** backup ที่ restore ไม่ได้ = ไม่มี backup | 3 | 3 | 🟨 **9** | กำหนด RPO/RTO **[ASSUMPTION: RPO 24h, RTO 4h สำหรับ clinic ops]**, ทดสอบ restore เป็นรอบ (quarterly), เก็บ backup encrypted นอก region, ตรวจ integrity (checksum) | `SRE` |
| **R20** | Data | **Retention/immutability policy ไม่มี — audit/medical/financial เก็บไม่จำกัด ไม่มี WORM, ไม่มี legal hold.** เสี่ยงทั้งเก็บเกินจำเป็น (PDPA) และลบก่อนกำหนดกฎหมาย | 3 | 2 | 🟨 **6** | นโยบาย retention ต่อ classification (เวชระเบียนตามกฎหมายสถานพยาบาล, audit ≥ ระยะที่ตรวจสอบได้, payroll ตามภาษี), WORM/immutable storage สำหรับ audit, legal-hold flag | `DPO` |
| **R26** | Data | **`patients` (health PII) และ salary เป็นข้อมูลอ่อนไหวเดียวที่มี tier handling — ขาด data-classification ครอบทั้งระบบ.** ข้อมูลอ่อนไหวอื่น (สัญญา, การสอบสวน, exec notes) ไม่มี classification ผูก | 3 | 2 | 🟨 **6** | **NEW** data-classification framework ครอบทุกตาราง (`security_level` ทุก core table ตาม GLOBAL RULES), ผูก classification → masking → AI policy → retention เป็นชั้นเดียวกัน | `CDA` |

### 3.4 หมวด Compliance (PDPA / Medical / Consent)

| ID | Category | Risk | L | I | Severity | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| **R10** | Compliance | **PDPA + ความลับเวชระเบียนไม่ครบ — ข้อมูลผู้ป่วยรั่วผ่าน AI/ไม่มี consent/ไม่มี DSR.** เวชระเบียนคลินิกความงาม+ทันตกรรมคือข้อมูลสุขภาพตาม PDPA (ต้องฐานความยินยอมเข้ม) และ พ.ร.บ.สถานพยาบาล/วิชาชีพ; ปัจจุบันไม่มี `consent_logs`, ไม่มีกลไก DSR, ไม่มี breach notification flow | 4 | 5 | 🟥 **20** | แต่งตั้ง **DPO**; **NEW** `consent_logs` + กลไก consent ต่อ purpose; รองรับ DSR (เข้าถึง/แก้/ลบ/portability) บน soft-delete; breach notification ภายใน 72 ชม.; DPA กับผู้ให้บริการ AI; ไม่ส่งข้อมูลสุขภาพข้ามชายแดนโดยไม่มีฐานกฎหมาย (เชื่อม R01) | `DPO` |
| **R19** | Compliance | **ข้อมูลสุขภาพข้ามชายแดน (cross-border) ไปผู้ให้บริการ AI ต่างประเทศ.** OpenAI/Anthropic/Gemini อยู่ต่างประเทศ; PDPA จำกัดการโอนข้อมูลสุขภาพข้ามแดน | 4 | 4 | 🟥 **16** | บังคับ redaction ก่อนส่ง (เชื่อม R01); ใช้ Typhoon (ไทย) สำหรับงานที่แตะข้อมูลอ่อนไหวเมื่อเป็นไปได้; DPA + SCC กับ provider; option self-host/in-region model สำหรับ PHI; consent ครอบคลุมการประมวลผลด้วย AI | `DPO` |
| **R22** | Compliance | **สิทธิ์เข้าถึงเวชระเบียนไม่ผูกกับใบประกอบวิชาชีพ/บทบาทคลินิก.** spec ให้เวชระเบียน=RESTRICTED; ปัจจุบัน role `medical/dental` กว้าง ไม่แยกแพทย์/ผู้ช่วย/หน้าเคาน์เตอร์ และไม่ผูกผู้ป่วยกับสาขา/ผู้ดูแล | 3 | 4 | 🟧 **12** | ABAC: เข้าถึงเวชระเบียนเฉพาะผู้ดูแลผู้ป่วยรายนั้น/สาขานั้น + บทบาทวิชาชีพ; แยก position (แพทย์/ทันตแพทย์/ผู้ช่วย/เคาน์เตอร์); step-up + reason ทุกการเปิดเวชระเบียน | `DPLEAD` |
| **R25** | Compliance | **ไม่มี permission-change audit — แก้ `permission_groups`/`user_permission_groups` ไม่ถูกบันทึก.** การยกระดับสิทธิ์เพื่อเข้า RESTRICTED ตรวจสอบย้อนหลังไม่ได้ | 3 | 3 | 🟨 **9** | **NEW** `permission_change_logs` (before/after role/group, ผู้อนุมัติ, reason), บังคับ approval สำหรับการให้สิทธิ์ RESTRICTED, alert เมื่อมีการยกสิทธิ์ | `CISO` |

### 3.5 หมวด Operational (Environment Parity / Resilience / Observability)

| ID | Category | Risk | L | I | Severity | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| **R08** | Operational | **SQLite/Postgres divergence — SQLite mirror ครอบแค่ 12/~55 ตาราง.** dev บน SQLite ไม่เจอ schema/constraint/RLS/trigger ที่มีแค่ฝั่ง Postgres → "ผ่านบน dev พังบน prod" (ตรงกับ MEMORY: verify บน production build) | 4 | 3 | 🟧 **12** | ใช้ **Postgres ทุก environment** (ลบ SQLite path หรือจำกัดเฉพาะ unit test ที่ไม่แตะ schema-critical); ถ้าคงไว้ ต้อง parity test เทียบ DDL; CI รัน migration จริงบน Postgres ชั่วคราว; ห้าม merge ถ้า migration ไม่รันบน Postgres | `PMO` |
| **R09** | Operational | **Single-region Railway — ไม่มี DR/failover, deploy เป็น `railway up` แมนนวลต่อ service.** region เดียวล่ม = ระบบทั้งเครือแฟรนไชส์ดับ; deploy แมนนวลเสี่ยง human error/ลืม service | 3 | 4 | 🟧 **12** | กำหนด DR plan + RPO/RTO; backup นอก region (เชื่อม R18); standby/cold-region plan; ทำ deploy เป็น scripted/checklisted (`24-railway-deployment-plan.md`); health/uptime monitoring + alert; **[ASSUMPTION: SLA 99.5% clinic hours]** | `SRE` |
| **R28** | Operational | **`.railway-config-pull-65609/railway.ts` เป็น IaC stub ไม่ authoritative — สับสน topology จริง.** มี IaC placeholder service "web" เดี่ยวที่ไม่ตรงกับ nexus-web/nexus-api จริง | 2 | 1 | 🟩 **2** | ลบ/แยก stub ออกจาก repo หรือทำให้ authoritative; เอกสาร topology จริงใน `24-railway-deployment-plan.md` เป็นแหล่งเดียว | `PMO` |

### 3.6 หมวด Delivery & Vendor

| ID | Category | Risk | L | I | Severity | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| **R12** | Delivery | **Scope creep / ลำดับผิด — งาน enterprise (soft-delete, audit, RLS, AI redaction) แทรกทุกตารางและทุก API; ถ้าจัดลำดับผิดจะส่งของช้าหรือปล่อย RESTRICTED ทั้งที่ยังไม่ปิดช่อง.** การ retrofit soft-delete/versioning/RLS บน ~55 ตารางคือ migration ใหญ่ | 4 | 3 | 🟧 **12** | จัดลำดับตาม severity ในเอกสารนี้เป็น input ของ `26-development-roadmap.md`; **gate go-live ของข้อมูล RESTRICTED ด้วยการปิด CRITICAL ทั้งหมด**; แบ่งเฟส (foundation: audit+softdelete+RLS+secrets → AI gateway → compliance); migration แบบ idempotent มี rollback | `PMO` |
| **R30** *(reserved)* | Delivery | *(ช่องสำรองสำหรับ risk ส่งมอบเพิ่มเติมเมื่อ roadmap ละเอียดขึ้น)* | — | — | — | ทบทวนรอบถัดไป | `PMO` |
| **R31** | Vendor | **AI vendor lock-in / availability / pricing — พึ่งผู้ให้บริการนอก 4 ราย (OpenAI/Anthropic/Gemini/Typhoon) ผ่าน env keys; ราคา/นโยบาย/ดาวน์ไทม์อยู่นอกการควบคุม และ DPA อาจไม่ครอบ PHI.** | 3 | 3 | 🟨 **9** | fallback chain มีอยู่แล้ว (`askWithFallback`) — รักษา multi-provider; เซ็น DPA/BAA ที่ครอบ PHI; เมตเตอร์ cost จริง (เชื่อม R23) + budget alert; abstraction layer ให้สลับ provider/self-host ได้; ตรวจ data-retention policy ของ provider (opt-out training) | `CAIA` |

> หมายเหตุการนับ: ID เรียงตามลำดับการค้นพบ ไม่ใช่ลำดับ severity; R30 เป็นช่องสำรอง (ไม่นับในสถิติ §2)

---

## 4. CRITICAL Risks — รายละเอียดและ Gate ก่อน Go-Live

ความเสี่ยง CRITICAL ทั้ง 9 รายการต่อไปนี้คือ **blocking gate**: ห้ามเปิดให้ข้อมูล `RESTRICTED` (เวชระเบียน/ทันตกรรม/payroll/HR-investigation/AI-eval/exec-notes) ขึ้น production จนกว่าจะปิดครบ

| ID | Risk (ย่อ) | Gate Owner | เงื่อนไขปิด (Definition of Done) |
|---|---|---|---|
| R01 | AI over-disclosure | `CAIA` | AI Gateway + redaction + output filter live; ทดสอบ user สิทธิ์ต่ำถาม AI แล้ว **ไม่ได้** ข้อมูล RESTRICTED |
| R02 | Cross-tenant leak | `CDA` | RLS เปิด; ลบ WHERE ใน test แล้ว query **fail** ไม่ใช่รั่ว |
| R03 | RESTRICTED exposure (admin short-circuit) | `CISO` | admin เข้า RESTRICTED ไม่ได้หากไม่มี direct grant + step-up; break-glass ต้อง 2-person + audit |
| R04 | Audit non-guaranteed | `CISO` | audit append-only (trigger+REVOKE+hash-chain); action RESTRICTED fail-closed เมื่อ audit เขียนไม่ได้ |
| R05 | No soft-delete/versioning | `CDA` | core tables มี `deleted_at/version`; delete = soft; ฟื้นเวชระเบียน/audit ไม่ได้ |
| R07 | Secrets fallback | `CISO` | ไม่มี ENCRYPTION_KEY/JWT_SECRET จริง = refuse boot; แยกคีย์ + rotation |
| R10 | PDPA/medical | `DPO` | consent_logs + DSR + breach flow + DPA กับ AI provider |
| R13 | File access trail | `CISO` | `file_access_logs` + permission ต่อไฟล์ + signed URL |
| R21 | TLS verify off | `SRE` | `rejectUnauthorized: true` + CA pin บน PG |

---

## 5. มาตรการที่แก้หลาย risk พร้อมกัน (Cross-Cutting Controls)

| Control (NEW/มีอยู่) | ปิด/ลด Risk |
|---|---|
| Central Policy Engine (RBAC+ABAC+ownership, deny-by-default) | R02, R03, R06, R15, R22 |
| Append-only audit + hash-chain + before/after + fail-closed | R04, R13, R14, R16, R25 |
| AI Access Gateway + PII/PHI redaction + ai_query_logs | R01, R19, R23, R24, R27 |
| Soft-delete + versioning + RESTRICT (แทน CASCADE) | R05, R14, R20 |
| Secrets hardening (no-fallback, rotation, TLS verify) | R07, R21 |
| Postgres-everywhere + CI migration parity | R08, R12 |
| DR/backup drill + observability + distributed rate-limit | R09, R11, R18 |
| Compliance pack (DPO, consent, DSR, retention, DPA) | R10, R19, R20, R22, R26, R31 |

---

## 6. การกำกับและทบทวน (Risk Governance & Cadence)

1. **เจ้าของเดี่ยว (single accountable owner)** ต่อทุก risk ตาม §0.2 — ห้ามไม่มีเจ้าของ
2. **ทบทวนรายเดือน** โดย Risk Owner Council; CRITICAL ทบทวนทุกสปรินต์จนปิด
3. **Accept ได้เฉพาะ MEDIUM/LOW** โดยมีลายเซ็นและวันหมดอายุการ accept; CRITICAL/HIGH ห้าม accept ต้อง mitigate
4. **เชื่อมกับ delivery** — risk register นี้เป็น input บังคับของ `26-development-roadmap.md`; ทุกการปิด risk ต้องมี migration/PR อ้างอิง
5. **Trigger ทบทวนนอกรอบ** เมื่อ: เพิ่ม AI provider, เพิ่มสาขา/แฟรนไชส์, เปลี่ยน schema RESTRICTED, มี incident/near-miss, หรือเปลี่ยนกฎหมาย PDPA/สถานพยาบาล
6. **ตัวชี้วัดสุขภาพความเสี่ยง [ASSUMPTION]:** จำนวน CRITICAL ที่ยังเปิด = 0 ก่อน go-live RESTRICTED; % ตารางที่มี soft-delete; % API ที่ผ่าน policy-engine; % AI call ที่ผ่าน redaction; audit hash-chain integrity = 100%

---

## 7. หมายเหตุข้อสมมุติ (Assumptions Ledger)

ค่าต่อไปนี้ถูกทำเครื่องหมาย **[ASSUMPTION]** — ต้องยืนยันกับธุรกิจจริงก่อนใช้เป็นข้อเท็จจริง:

- การมี/แต่งตั้ง **DPO** และ **Medical/Dental Compliance Lead** (จำเป็นตาม PDPA/พ.ร.บ.สถานพยาบาล)
- เป้า **RPO 24h / RTO 4h** และ **SLA 99.5%** ในช่วงเวลาทำการคลินิก
- ความต้องการ self-host/in-region AI สำหรับ PHI
- ตัวเลข metric สุขภาพความเสี่ยงใน §6 ข้อ 6
- ระยะ retention ตามกฎหมายเฉพาะของเวชระเบียน/ภาษี (ต้องอ้างกฎหมายจริง)

> รายชื่อพนักงาน, KPI/สูตรเฉพาะ, รายชื่อสาขา, headcount, salary band — **ไม่ถูกประดิษฐ์เป็นข้อเท็จจริง** ในเอกสารนี้ตาม GLOBAL DESIGN RULES
