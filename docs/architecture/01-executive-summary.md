# 01 — Executive Summary (สรุปผู้บริหาร)
## NEXUS OS — AI Workforce OS สำหรับ Saduak Suay Mai PCL

> **บริษัท:** Saduak Suay Mai PCL (สะดวกสวยมาย · `saduaksuaymai.co`) — เครือคลินิกความงาม + ทันตกรรม แบบแฟรนไชส์ในประเทศไทย
> **ระบบฐาน:** NEXUS OS — Next.js 16 (`nexus-web`) + Express/TypeScript (`nexus-api`) + PostgreSQL บน Railway (deploy ด้วย `railway up` ราย service ไม่ใช่ GitHub auto-deploy)
> **ผู้รับเอกสาร:** คณะผู้บริหาร / Board / Owner / CEO Office
> **สถานะเอกสาร:** v1.0 · กลั่นจากเอกสารสถาปัตยกรรม 02–26 (organization, security, permission, AI access, database schema, audit, roadmap)
> **มาตรฐาน:** Production-ready (ไม่ใช่ demo / MVP) · deny-by-default · enforce ที่ backend ทุก API และทุก AI query

---

## 1. นี่คืออะไร (What the AI Workforce OS Is)

**NEXUS OS** คือระบบปฏิบัติการกลางสำหรับบริหาร "พนักงาน + งาน + ความรู้ + AI" ของทั้งเครือ Saduak Suay Mai ในที่เดียว — ไม่ใช่แค่ระบบ HR หรือ chatbot แต่เป็น **AI Workforce OS** ที่:

- รวมโครงสร้างองค์กร, ตำแหน่ง, KPI, ความรู้ (SOP/นโยบาย), งาน, การลา/OT, payroll และข้อมูลคนไข้ ไว้บนฐานข้อมูลเดียว (multi-tenant ด้วย `company_id`, รองรับหลายสาขาแฟรนไชส์)
- มี **AI ผู้ช่วยประจำองค์กร** ที่ตอบคำถาม/ช่วยงาน "ในนามของผู้ใช้แต่ละคน" ภายใต้หลักการ **"Copilot ไม่ใช่ Autopilot"** — AI ช่วยเสนอ ไม่ตัดสินใจแทนคนในเรื่องที่กระทบบุคคล/เงิน/สุขภาพ
- ทำงานบนกฎเหล็กว่า **AI มีสิทธิ์เห็นข้อมูลได้ไม่เกินสิทธิ์ของผู้ใช้ที่ถามเสมอ** — ถ้าคนถามเปิดหน้านั้นเองแล้วเห็น `****` AI ก็ต้องเห็น `****`

วันนี้ระบบทำงานได้จริงในโปรดักชัน (~55 ตาราง, RBAC 13 roles, AI router หลาย provider, payroll engine, ระบบลา/OT) เอกสารชุดนี้คือ **แผนยกระดับจากของที่ใช้งานได้ → enterprise-grade** ที่เข้มงวด ตรวจสอบย้อนหลังได้ และสอดคล้องกฎหมาย (PDPA)

---

## 2. องค์กรที่ระบบจำลอง (The Org We Model)

โครงสร้างองค์กรถูกออกแบบเป็น **6 ชั้น** และผูกกับข้อมูลจริงที่ seed อยู่ในระบบ:

```
Company → Department → Sub-Department → Team/Unit → Position → Employee
  (L0)        (L1)          (L2)           (L3)        (L4)       (L5)
```

- **10 แผนกหลัก** (1 แผนก = 1 system role): **CEO Office, Operations** (มี 3 sub-unit: Customer Support-Admin, Personal Care, Telesales), **Marketing, Medical, Finance & Accounting, People (HR), IT, Warehouse & Purchasing, Franchise, Dental**
- **สถานะ grounding:** L0–L2 (Company → Department → Sub-Department ของ Operations) **มีอยู่จริง** (seed ใน `org_units`/`departments`); ชั้น **Team/Unit (L3)** และ **ตำแหน่งละเอียดต่อแผนก (L4)** ยังเป็น target ที่ต้องสร้าง (migration)
- **จุดอ่อนที่ต้องแก้:** วันนี้การเป็นสมาชิกแผนกเป็น **free-text** (`users.department`) ไม่ใช่ FK เชิงอ้างอิง — roadmap จะ normalize เป็น `sub_departments`/`teams` first-class แล้วผูก authz กับโครงสร้างจริง

> **[ASSUMPTION]** จำนวนพนักงาน (headcount), รายชื่อสาขา, salary bands, KPI targets และ SLA ตัวเลข ทั้งหมดในเอกสารชุดนี้เป็นค่าสมมติที่สมเหตุสมผลกับธุรกิจคลินิกความงาม+ทันตกรรมในไทย **ต้องยืนยันกับ HR/CEO Office ก่อนใช้งานจริง** — ไม่มีการปั้นชื่อบุคคลจริงเป็นข้อเท็จจริง

---

## 3. ความปลอดภัย / สิทธิ์ / Audit / AI Governance (Posture)

ทั้งระบบยืนอยู่บนหลักการเดียวกัน: **deny-by-default, บังคับใช้ที่ backend เท่านั้น** (การซ่อนปุ่ม/เมนูใน frontend เป็นแค่ UX ไม่ใช่ขอบเขตความปลอดภัย)

### 3.1 Data Classification — 4 ระดับความปลอดภัย
| ระดับ | ใครเห็น (ตั้งต้น) | ตัวอย่างข้อมูล |
|---|---|---|
| **BASIC** | ทุกคนที่ login (ในบริษัทเดียวกัน) | SOP, ประกาศ, data dictionary, ความรู้ทั่วไป |
| **MEDIUM** | คนในแผนก/สาขาเดียวกัน | KPI แผนก, work logs, ตารางเวร |
| **HARD** | เจ้าของข้อมูล + manager สายตรง + HR + owner/CEO | KPI รายคน, payroll aggregate, advance |
| **RESTRICTED** | **direct grant เท่านั้น** (ไม่มี role ใดได้มาโดยปริยาย แม้แต่ admin/CEO) | Medical/Dental/Patient records, เงินเดือน/payslip/tax/contract รายคน, HR investigation, AI evaluation, Executive notes |

> ข้อมูลสุขภาพ (medical/dental/patient) ถือเป็น **sensitive personal data ตาม PDPA มาตรา 26** ต้องมี explicit consent — ระบบบังคับให้เป็นเช่นนั้น

### 3.2 Permission Model — RBAC + ABAC + Data-Ownership
ทุก request ต้องผ่านครบ 3 ชั้นแบบ **AND** ก่อนอนุญาต: **RBAC** (role แตะ module/action นี้ได้ไหม) × **ABAC** (record นี้อยู่ใน scope ของ user ไหม — company/branch/department/ownership) × **Data-Ownership** (เป็นเจ้าของหรือมีสายงานกับเจ้าของไหม) ระบบนิยาม **9 logical authority roles** (Super Admin → External) ที่ตั้งฉากกับ **13 app roles** (= แผนก) แล้ว combine กันใน policy engine กลาง

### 3.3 Audit Log — append-only, tamper-evident
ทุก action (login/logout/view/search/create/update/delete/soft-delete/restore/upload/download/export/approve/reject/permission-change/role-change/ai-query/ai-response/failed-access/blocked-access) ถูกบันทึกพร้อม actor, role, target table/id, **security level, before/after JSON, changed fields**, ip, device, user_agent, request_id, session_id, endpoint, result, failure_reason ตาราง `audit_logs` ใหม่จะ **แก้/ลบไม่ได้** (REVOKE UPDATE/DELETE + trigger) มี **hash-chain (`prev_hash → row_hash`)** เพื่อกันการแก้ย้อนหลัง และ AI logs แยกแต่ผูกกันด้วย `request_id`

### 3.4 AI Access Control — AI ไม่อ่าน DB ตรง
ทุก AI query วิ่งผ่าน pipeline เดียวที่ backend: **identify → role → department → position → clearance → filter ข้อมูลที่อนุญาต → redact ก่อนส่ง model → response → output redaction scan → audit log** AI ไม่เคยต่อ `DATABASE_URL` เอง, PII/PHI ถูก mask ก่อนออกไปยัง external provider (OpenAI/Claude/Gemini/Typhoon) และข้อมูล **RESTRICTED ไม่มีวันเข้า prompt** แม้ผู้ใช้จะมี grant

---

## 4. มีอยู่แล้ว vs กำลังสร้าง (Built vs Building)

| | **มีอยู่แล้ว (EXISTS / ใช้งานจริง)** | **กำลังสร้าง (NEW / migration)** |
|---|---|---|
| **Data** | ~55 ตาราง, dual-target PG/SQLite, migration runner (v1–v10) | base columns ครบทุกตาราง (`deleted_at`/`version`/`security_level`), org normalization (sub_departments/teams + FK) |
| **Audit** | ตาราง `audit_log` เดี่ยว (best-effort, error ถูกกลืน) | `audit_logs` append-only + before/after + hash-chain; `login_logs`, `file_access_logs`, `permission_change_logs`, `consent_logs` |
| **Permission** | RBAC 13 roles, ~45 module map, JWT auth, permission groups | central policy engine (RBAC+ABAC+ownership) + PostgreSQL **RLS** + direct-grant สำหรับ RESTRICTED |
| **AI** | AI router หลาย provider + fallback + decision rights | AI Data Broker, redaction pipeline (in/out), `ai_query_logs` + metering จริง |
| **Security** | helmet, CORS allow-list, rate-limit (in-memory) | secrets hardening, distributed rate-limit, token revocation/rotation, CSRF, login lockout, `request_id` |

**ช่องว่างสำคัญที่สุด 5 ข้อ:** (1) audit ไม่ append-only/ไม่มี before-after; (2) ไม่มี policy engine/RLS — tenant isolation พึ่ง predicate มือ; (3) AI ส่ง prompt + org context ดิบออก provider โดยไม่ redact (เสี่ยง PHI/PII leak); (4) **ไม่มี soft-delete เลยทั้ง codebase** (delete เป็น hard CASCADE — ลบแล้วกู้ไม่ได้); (5) org tables มีแต่ data ยังไม่ wire เข้า authz

---

## 5. Roadmap โดยสรุป (At a Glance)

8 เฟส เรียงตาม dependency จริง — **ความปลอดภัยพื้นฐานก่อน → รากฐาน data/audit → policy engine → AI gating → ฟีเจอร์สร้างมูลค่า → compliance**

| Phase | ชื่อ | Effort [ASSUMPTION] |
|---|---|---|
| **P0** | Production Hardening (secrets, rate-limit, token revoke, CSRF, request_id) | ~18 d |
| **P1** | Data Model + Audit Foundation (base columns, soft-delete, append-only audit) | ~34 d (critical path) |
| **P2** | Permission Engine (RBAC+ABAC+ownership + RLS + wire org) | ~30 d |
| **P3** | AI Access Control & Redaction (AI Data Broker, ai_query_logs) | ~26 d |
| **P4** | Digital Twin + Knowledge Vault | ~28 d |
| **P5** | Dashboards & Reports (role-scoped) | ~22 d |
| **P6** | Franchise / Multi-Branch scaling | ~26 d |
| **P7** | Compliance & Assurance (PDPA, retention, DSR, consent) | ~30 d |

**[ASSUMPTION] รวม ~214 engineer-days** ≈ **9–11 เดือน** ด้วยทีม 3 คน หรือ **~5–6 เดือน** ด้วยทีม 5 คนเมื่อ phase ขนานกันได้ ทุก deployment เป็น **`railway up` per service** ตามกลยุทธ์ Expand → Backfill → Contract (เปลี่ยน schema โดยไม่ down) และ feature flag ใน `companies.settings`

---

## 6. ความเสี่ยงหลัก (Headline Risks)

| # | ความเสี่ยง | ผลกระทบ | การลดความเสี่ยง |
|---|---|---|---|
| **R1** | **AI redaction ไม่ครบ → PHI/PII หลุดออก external provider** (มีตาราง `patients` = ข้อมูลสุขภาพ) | **สูงมาก — ละเมิด PDPA** | dry-run log, coverage metric, output filter ชั้นสอง, RESTRICTED ห้ามเข้า prompt เด็ดขาด |
| **R2** | **P1 base-column migration touch ~55 ตาราง** → lock/downtime | สูง | Expand→Backfill→Contract, แตก PR ต่อ schema-file, รัน off-peak |
| **R3** | **RLS เปิดผิด → ทั้งระบบเห็น 0 rows** | สูง | เปิดทีละตาราง, shadow mode, leak-test ก่อน enforce |
| **R4** | **Audit cutover ทำ trail หาย/ซ้ำ** | สูง | dual-write + shadow compare ก่อน flip; ไม่ตัดของเก่าจน clean N วัน |
| **R5** | **`admin` วันนี้เป็น hard super-user** (short-circuit ทุก check) ละเมิด least-privilege สำหรับ RESTRICTED | สูง | หุ้มด้วย break-glass + justification + audit บังคับ (P2) |
| **R6** | **Business ยังไม่ยืนยัน KPI/SLA/branch list/headcount จริง** | กลาง (ฉุด P5/P6) | mark [ASSUMPTION], ออกแบบ config-driven เปลี่ยนได้โดยไม่ deploy |
| **R7** | **ENCRYPTION_KEY fallback อ่อน + ไม่มี MFA/token revocation** วันนี้ | กลาง-สูง | P0 ปิดก่อนทุกฟีเจอร์: fail-fast boot, key-versioning, token revoke |

---

## 7. คำขอจากผู้บริหาร (What We Need from Leadership)

1. **อนุมัติลำดับเฟส** โดยเฉพาะ **P0 (hardening) + P1 (audit/data foundation) เป็นลำดับแรกแบบไม่ต่อรอง** — ห้ามสร้างฟีเจอร์ใหม่บนรากที่ audit เพิกถอนไม่ได้และ secret อ่อน
2. **ยืนยันข้อมูลจริงที่ติด [ASSUMPTION]:** headcount, รายชื่อสาขา, salary bands, KPI targets/สูตร, SLA — เพื่อปลด R6
3. **ตัดสินใจเชิงนโยบายความปลอดภัย:** MFA (TOTP vs LINE OTP), break-glass สำหรับ admin/RESTRICTED, นโยบาย retention และ consent ตาม PDPA
4. **จัดสรรทีม:** 3 คน (~9–11 เดือน) หรือ 5 คน (~5–6 เดือน) — ตัดสินใจ trade-off เวลา/งบ

> **บรรทัดสรุป:** NEXUS OS ใช้งานได้แล้ววันนี้ แต่ยัง "หลวม" ใน 5 มิติ enterprise (audit, permission, AI redaction, soft-delete, org wiring) เอกสารชุด 02–26 คือพิมพ์เขียวที่ปิดช่องว่างเหล่านี้แบบครบถ้วน production-ready โดยเริ่มจากความปลอดภัยและความสามารถในการตรวจสอบย้อนหลังก่อน เพื่อปกป้องข้อมูลคนไข้และพนักงานตามกฎหมาย PDPA
