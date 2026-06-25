# 05 — Responsibility Matrix (เมทริกซ์ความรับผิดชอบรายตำแหน่ง)

> **องค์กร:** Saduak Suay Mai PCL — เครือคลินิกความงาม + ทันตกรรม แบบแฟรนไชส์ในประเทศไทย
> **ระบบฐาน:** NEXUS OS (Next.js 16 + Express + PostgreSQL บน Railway — `nexus-web`, `nexus-api`, Postgres; deploy ด้วย `railway up` ราย service ไม่ใช่ GitHub auto-deploy)
> **ขอบเขตเอกสาร:** แตกความรับผิดชอบของ **ตำแหน่งหลัก (key positions)** ครบทั้ง **10 แผนก** เป็นจังหวะ **Daily / Weekly / Monthly / Quarterly / Yearly**
> **มาตรฐาน:** Production-grade · deny-by-default · **RBAC + ABAC + Data-Ownership** · enforce ที่ **Backend** ทุก API และทุก **AI query** · **Append-only Audit Log** · AI ห้ามอ่าน DB ตรง (AI-mediated access เท่านั้น)
> **ภาษา:** ไทย narrative + English technical identifiers ตามสไตล์องค์กร

---

## 0. วิธีอ่านเอกสาร (How to Read This Matrix)

แต่ละแผนกมีตารางจัดกลุ่ม **ตามตำแหน่ง (grouped by position)** และในแต่ละตำแหน่งจะแยกแถวตาม **จังหวะเวลา** (Daily / Weekly / Monthly / Quarterly / Yearly) ทุกแถวมีคอลัมน์มาตรฐาน 9 ช่อง:

| คอลัมน์ | ความหมาย | ที่มา (grounding) |
|---|---|---|
| **Task** | งานที่ต้องทำในจังหวะนั้น | — |
| **Data Used** | ข้อมูล/ตารางที่ "อ่าน" เพื่อทำงาน | ตารางจริงใน NEXUS OS หรือ **[NEW]** ถ้าต้อง migration |
| **Data Created/Updated** | ข้อมูล/ตารางที่ "เขียน" (create/update) | เช่นเดียวกัน |
| **Sends To** | ผลลัพธ์ส่งต่อไปยังตำแหน่ง/แผนก/ระบบใด | ตามสายอนุมัติ |
| **Approver** | ใครเป็นผู้อนุมัติ (deny-by-default — ถ้าไม่มี approver ระบุ ถือว่าทำเองได้ใน scope ตน) | — |
| **System Used** | โมดูล/endpoint ใน NEXUS OS ที่ใช้ | `MODULE_ACCESS` / route จริง |
| **Security Level** | ระดับชั้นข้อมูลของ task นั้น | `BASIC` / `MEDIUM` / `HARD` / `RESTRICTED` |
| **Audit Captured** | action ที่ต้องลง audit_log (append-only) | ตาม Audit spec ส่วนที่ 13 |

### 0.1 นิยาม Security Level (4 ระดับ — บังคับใช้ทั้งเอกสาร)

| ระดับ | ใครเห็น (scope ตั้งต้น) | ตัวอย่างข้อมูล |
|---|---|---|
| **BASIC** | ทุกคนในองค์กร (authenticated) | SOP สาธารณะ, ประกาศ, dictionary, todos ของตน, knowledge `T1` |
| **MEDIUM** | คนในแผนก/sub-unit เดียวกัน (ABAC `department` scope) | KPI แผนก, work_logs แผนก, ตารางเวร, campaign ภายใน |
| **HARD** | เจ้าของ/หัวหน้า/HR/Finance owner-tier เท่านั้น | salary_advances, payroll_items aggregate, deals มูลค่าสูง, vendor contract |
| **RESTRICTED** | **direct grant เท่านั้น** — ห้าม inherit จาก department scope | Medical/Dental/Patient PII, Salary/Payroll/Contract/Tax รายบุคคล, HR investigation, AI evaluation, Executive notes |

> **กฎตายตัว (จาก Global Design Rules):** Medical/Dental/Patient records · Salary/Payroll/Contract/Tax · HR investigation · AI evaluation · Executive notes = **RESTRICTED by default** ทุกกรณี

### 0.2 หลักการ enforcement ที่ใช้ตลอดเอกสาร

1. **Deny-by-default** — ถ้า policy ไม่ allow ชัดเจน = ปฏิเสธ (HTTP 403, ลง audit `blocked-access`)
2. **Backend-only enforcement** — RBAC `requireRole/requireModule` + ABAC `departmentScope/owner_id` ตรวจที่ API ทุกตัว frontend gating เป็นแค่ UX ไม่ใช่ security
3. **AI-mediated access** — ทุก task ที่มีคอลัมน์ AI จะวิ่งผ่าน flow: `user query → identify user → check role/dept/position/clearance → filter allowed data → ส่งเฉพาะข้อมูลที่เห็นได้ → response → redaction check → audit (ai-query + ai-response)` AI **ไม่อ่าน DB ตรง** และห้ามเปิดเผยข้อมูลที่ผู้ใช้เองเห็นไม่ได้
4. **Append-only audit** — ทุกแถวที่มี side-effect ลง `audit_log` แบบแก้/ลบไม่ได้ (hash-chain `prev_hash`, before/after JSON, ip/ua/request_id/session_id)

### 0.3 สถานะ Grounding กับ NEXUS OS ปัจจุบัน (EXISTS vs NEW)

| องค์ประกอบที่เมทริกซ์อ้างถึง | สถานะวันนี้ | หมายเหตุ migration |
|---|---|---|
| 13 system roles (`admin, ceo, operations, medical, dental, finance, hr, it, marketing, warehouse, franchise, sales, staff`) | **EXISTS** — `backend/src/lib/rbac.ts` `ROLES` | 1 แผนก = 1 role (ยกเว้น Operations sub-units, Personal Care/Telesales ใช้ scope ย่อย) |
| `MODULE_ACCESS` (~45 module keys) | **EXISTS** — `rbac.ts` | ใช้เป็น "System Used" ทุกแถว |
| ตาราง core (users, transactions, deals, meetings, action_items, documents, campaigns, tasks, leave_requests, ai_logs) | **EXISTS** — `db.ts initSchema()` | — |
| HR/Payroll (org_units, positions, employee_profiles, time_attendance, salary_advances, payroll_*, payslips, salary_history) | **EXISTS** — `nexus-hr-schema.ts` | — |
| Operational (patients, kpi_entries, knowledge_items, daily_ai_tasks, work_logs, tamada_cases, sdx_cases, franchise_audits) | **EXISTS** — full/entity schema | patients มี field `*_encrypted` + consent |
| `audit_log` แบบ append-only + before/after + hash-chain + ip/ua/request_id | **PARTIAL → NEW** — วันนี้มีแค่ `action/resource/security_tier/meta`, best-effort | ต้อง upgrade ตาม spec ส่วนที่ 13 |
| `ai_query_logs` (prompt+response+provider+model+tokens+latency+decision+grounded+redaction) | **NEW (migration)** — วันนี้ `ai_logs` faked metering | บังคับสำหรับทุก AI task |
| ตาราง **NEW** ที่เมทริกซ์เพิ่ม (เช่น `vendors`, `purchase_orders`, `inventory_*`, `franchise_leads`, `marketing_*`, `executive_notes`, `okrs`, `incidents`, `disciplinary_cases`, `cash_reconciliations`, ฯลฯ) | **NEW (migration)** | mark `[NEW]` ในคอลัมน์ Data |

> **[ASSUMPTION]** ชื่อบุคคล, headcount, KPI target/สูตร, salary band, รายชื่อสาขา, SLA ตัวเลข — ทั้งหมดเป็น **[ASSUMPTION]** ที่สมจริงสำหรับเครือคลินิกความงาม+ทันตกรรมในไทย เอกสารอ้างถึง **ตำแหน่ง** ไม่ใช่ชื่อจริง

### 0.4 สารบัญแผนก (Department Index)

1. [CEO Office (สำนักซีอีโอ)](#1-ceo-office-สำนักซีอีโอ--role-ceo)
2. [Operations (ปฏิบัติการ)](#2-operations-ปฏิบัติการ--role-operations)
3. [Marketing (การตลาด)](#3-marketing-การตลาด--role-marketing)
4. [Medical (การแพทย์ / ความงาม)](#4-medical-การแพทย์--ความงาม--role-medical)
5. [Finance & Accounting (การเงินและบัญชี)](#5-finance--accounting-การเงินและบัญชี--role-finance)
6. [People / HR (ทรัพยากรบุคคล)](#6-people--hr-ทรัพยากรบุคคล--role-hr)
7. [IT (เทคโนโลยีสารสนเทศ)](#7-it-เทคโนโลยีสารสนเทศ--role-it)
8. [Warehouse & Purchasing (คลังสินค้าและจัดซื้อ)](#8-warehouse--purchasing-คลังสินค้าและจัดซื้อ--role-warehouse)
9. [Franchise (แฟรนไชส์)](#9-franchise-แฟรนไชส์--role-franchise)
10. [Dental (ทันตกรรม)](#10-dental-ทันตกรรม--role-dental)

---

# 1. CEO Office (สำนักซีอีโอ) · role `ceo`

> **Department default = `RESTRICTED`** สำหรับ Executive notes / Board material / M&A / Succession / AI evaluation ของผู้บริหาร CEO Office เป็น department เดียวที่ **read-across ทั้งองค์กร** แต่เห็นข้อมูล RESTRICTED ของแผนกอื่นแบบ **aggregated/redacted** เท่านั้น (raw PII ต้อง direct grant + เหตุผลลง audit)

## 1.1 Position: Chief Executive Officer (CEO / ประธานเจ้าหน้าที่บริหาร)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | ดู Readiness/Executive dashboard ภาพรวมทั้งเครือ (revenue, no-show, capacity) | `transactions`, `kpi_entries`, `franchise_audits`, `tamada_cases`/`sdx_cases` (aggregated, redacted) | — | — | self | `ceo` / `readiness` (`/api/ceo`, `/api/twin`) | RESTRICTED (aggregate) | `view`, `ai-query`, `ai-response` |
| **Daily** | ถาม AI Twin เชิงกลยุทธ์ ("สาขาไหน margin ตก") | RAG org context (redacted) `[NEW] ai_query_logs` | `ai_query_logs` **[NEW]** | — | self | `/api/ai-router/route` (task=strategy, decision=suggest) | RESTRICTED | `ai-query`, `ai-response`, redaction flag |
| **Weekly** | อนุมัติ/ปฏิเสธ decision ระดับองค์กร (capex, expansion) | `decisions_log` **[NEW]**, board material | `decisions_log` **[NEW]**, `executive_notes` **[NEW]** | CFO, Franchise Head | Board **[ASSUMPTION]** | `ceo` | RESTRICTED | `approve`/`reject`, `create`, before/after |
| **Monthly** | Review OKR ทั้งองค์กร + ปรับ initiative | `okrs` **[NEW]**, `kpi_entries`, dept reports | `okrs` **[NEW]** | Dept Heads | self | `ceo` / `reports` | HARD | `update`, before/after |
| **Quarterly** | Board packet + ผลประกอบการรายไตรมาส | `payroll_runs` (aggregate), `transactions`, `franchise_audits` | `board_packets` **[NEW]** | Board, Auditor | Board | `ceo` / `reports` | RESTRICTED | `export`, `create` |
| **Yearly** | กลยุทธ์ประจำปี + budget + succession plan | ทุก aggregate report, `salary_history` (band only, redacted) | `strategic_plan` **[NEW]**, `succession_plan` **[NEW]** | Board, HR Head | Board | `ceo` / `feasibility` | RESTRICTED | `create`, `export`, `permission-change` (grant access) |

## 1.2 Position: Chief of Staff / Executive Assistant (EA)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | จัดคิว/บันทึก meeting + action items ของ CEO | `meetings`, `action_items` | `meetings`, `action_items` | Dept Heads | CEO | `meeting` (`/api/meetings`) | HARD | `create`, `update`, `view` |
| **Weekly** | รวบรวม dept weekly report เป็น exec summary | `work_logs`, `kpi_entries` (aggregate) | `executive_notes` **[NEW]** (draft) | CEO | CEO | `ceo` / `worklog` | RESTRICTED (draft) | `create`, `view` |
| **Monthly** | ติดตามสถานะ decision/initiative | `decisions_log` **[NEW]**, `okrs` **[NEW]** | `decisions_log` **[NEW]** (status update) | CEO, Dept Heads | CEO | `ceo` | HARD | `update`, before/after |
| **Quarterly** | เตรียม board logistics + เอกสารประกอบ | `board_packets` **[NEW]** (metadata) | `documents` (board folder, restricted) | CEO, Board | CEO | `documents` (`/api/documents`) | RESTRICTED | `upload`, `download` (logged), `view` |

---

# 2. Operations (ปฏิบัติการ) · role `operations`

> **Sub-units:** Customer Support-Admin · Personal Care · Telesales (EXISTS เป็น `org_units` level-3, seed จาก `subUnits`) ABAC scope = `department='Operations'` + sub-unit code

## 2.1 Position: Head of Operations / COO

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | Monitor SLA คิวบริการ + no-show รายสาขา | `tamada_cases`, `sdx_cases` (booking_status, no_show), `kpi_entries` | — | Branch leads | self | `operations` (`/api/ops`) | MEDIUM | `view`, `search` |
| **Daily** | Escalation เคส service failure | `action_items`, `notifications` | `action_items`, `incidents` **[NEW]** | Medical/Dental, Branch | self | `operations` | MEDIUM | `create`, `update` |
| **Weekly** | ทบทวน work_logs ทีม + อนุมัติ | `work_logs` (dept scope) | `work_logs` (reviewed) | HR, CEO Office | self (`canReviewWorkLog`) | `worklog` (`/api/work-logs`) | MEDIUM | `approve`/`reject`, before/after |
| **Monthly** | สรุป KPI ปฏิบัติการ (utilization, CSAT) | `kpi_entries`, `user_capacity` | `kpi_entries` (dept rollup) | CEO Office, Finance | self | `operations` / `reports` | MEDIUM | `create`, `export` |
| **Quarterly** | ปรับ workflow/SOP + capacity plan | `knowledge_items` (SOP), `user_capacity` | `knowledge_items`, `user_capacity` | All sub-units, HR | CEO | `operations` / `dictionary` | MEDIUM | `update`, before/after |

## 2.2 Position: Customer Support / Admin Officer (ลูกค้าสัมพันธ์ / แอดมิน)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | รับ inbound (LINE/โทร) + บันทึกนัด | `line_events`, `patients` (ชื่อ/เบอร์ via decrypt, consent-gated) | `tamada_cases`/`sdx_cases` (booking), `chat_messages` | Personal Care, Medical | self | `operations` / `line` (`/api/line`) | RESTRICTED (PII) | `view` (PII access), `create`, consent-check |
| **Daily** | ตอบแชต/แก้ปัญหาเบื้องต้น | `knowledge_items` (SOP T1), `chat_messages` | `chat_messages`, `action_items` | Supervisor | self | `support` / `chat` (`/api/chat`) | BASIC→MEDIUM | `create`, `ai-query` (assist) |
| **Weekly** | สรุปเคสค้าง + แจ้งหัวหน้า | `action_items` (own/dept) | `work_logs` | Head of Ops | self | `worklog` | MEDIUM | `create` |
| **Monthly** | บันทึก KPI ตน (เคส/วัน, FCR) | `kpi_entries` (own) | `kpi_entries` | Head of Ops | self | `mydata` (`/api/self-service`) | MEDIUM | `create` |

## 2.3 Position: Telesales Officer (เทเลเซลส์)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | โทรหา lead + บันทึกผล + จองนัด | `deals` (own, lead list), `patients` (consent-gated) | `deals` (stage update), `tamada_cases` (booking) | Customer Support, Medical | self | `sales` (`/api/deals`) | RESTRICTED (PII) | `view` (PII), `update`, before/after |
| **Daily** | บันทึก follow-up + objection | `deals`, `daily_ai_tasks` | `action_items`, `daily_ai_tasks` | Supervisor | self | `sales` / `myai` | MEDIUM | `create`, `ai-query` |
| **Weekly** | ทบทวน pipeline + conversion | `deals` (own pipeline) | `kpi_entries` (conversion) | Head of Ops, Marketing | self | `sales` / `mydata` | MEDIUM | `create`, `view` |
| **Monthly** | สรุปยอด + commission base **[ASSUMPTION]** | `deals` (closed), `transactions` (own) | `kpi_entries` | Finance, HR | Head of Ops | `sales` / `reports` | HARD | `create`, `export` |

---

# 3. Marketing (การตลาด) · role `marketing`

## 3.1 Position: Head of Marketing / CMO

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | Monitor campaign performance + ad spend | `campaigns`, `marketing_metrics` **[NEW]** | — | — | self | `marketing` (`/api/campaigns`) | MEDIUM | `view`, `search` |
| **Weekly** | อนุมัติ creative + budget shift | `campaigns`, `marketing_budget` **[NEW]** | `campaigns` (status/budget), `marketing_budget` **[NEW]** | Finance, CEO Office | CFO (เกิน threshold **[ASSUMPTION]** ฿X) | `marketing` | HARD (budget) | `approve`/`reject`, `update`, before/after |
| **Monthly** | สรุป ROAS/CAC + lead-to-booking | `campaigns`, `deals`, `tamada_cases` (attribution) | `kpi_entries`, `marketing_metrics` **[NEW]** | CEO Office, Finance | self | `marketing` / `reports` | MEDIUM | `create`, `export` |
| **Quarterly** | แผนแคมเปญไตรมาส + brand calendar | `campaigns` (history), `kpi_entries` | `campaigns` (planned), `content_calendar` **[NEW]** | All branches, Ops | CEO | `marketing` | MEDIUM | `create`, `update` |
| **Yearly** | กลยุทธ์ brand + งบการตลาดประจำปี | aggregate ทั้งปี | `marketing_strategy` **[NEW]**, `marketing_budget` **[NEW]** | CEO, Finance | CEO/Board | `marketing` / `feasibility` | HARD | `create`, `export` |

## 3.2 Position: Digital Marketing / Content Officer

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | ลงคอนเทนต์ + ตอบ comment + บันทึก engagement | `content_calendar` **[NEW]**, `campaigns` | `marketing_metrics` **[NEW]**, `documents` (asset) | Head of Marketing | self | `marketing` / `documents` | BASIC | `create`, `upload` |
| **Daily** | สร้าง draft คอนเทนต์ด้วย AI (ตรวจ brand) | RAG brand context (no PII) | `ai_query_logs` **[NEW]**, draft asset | Head of Marketing | Head of Marketing (publish) | `myai` / `/api/ai-router/route` (task=general, decision=suggest) | BASIC | `ai-query`, `ai-response` |
| **Weekly** | รายงาน reach/engagement | `marketing_metrics` **[NEW]** | `kpi_entries` (own) | Head of Marketing | self | `mydata` | MEDIUM | `create` |
| **Monthly** | บันทึก KPI คอนเทนต์ | `marketing_metrics` **[NEW]** | `kpi_entries` | Head of Marketing | self | `mydata` | MEDIUM | `create` |

---

# 4. Medical (การแพทย์ / ความงาม) · role `medical`

> **Department default = `RESTRICTED`** สำหรับ Patient records ทั้งหมด เข้าถึงผ่าน decrypt + **consent gate** (`patients.consent_given`) + direct ownership/care-team grant เท่านั้น ทุก view ของ patient PII = audited

## 4.1 Position: Medical Director / Lead Physician (ผู้อำนวยการแพทย์)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | Review เคสหัตถการ + complication | `tamada_cases`, `patients` (medical_notes_encrypted, care-team) | `tamada_cases` (clinical note), `incidents` **[NEW]** | Physician, Ops | self | `medical` | RESTRICTED | `view` (PHI), `update`, before/after |
| **Daily** | อนุมัติ treatment plan ความเสี่ยงสูง | `patients`, `treatment_protocols` **[NEW]** | `tamada_cases` (approved) | Physician | self (Director) | `medical` | RESTRICTED | `approve`, before/after |
| **Weekly** | Clinical audit + เวชระเบียนคุณภาพ | `tamada_cases`, `patients` (care-team scope) | `clinical_audits` **[NEW]** | CEO Office, Compliance | self | `medical` / `audit` | RESTRICTED | `create`, `view`, `export` (de-identified) |
| **Monthly** | สรุป clinical KPI (no-show, satisfaction, complication rate) | `tamada_cases` (aggregate), `kpi_entries` | `kpi_entries` (de-identified) | CEO Office, Ops | self | `medical` / `reports` | HARD (aggregate) | `create`, `export` |
| **Quarterly** | ปรับ protocol + drug/consumable formulary | `treatment_protocols` **[NEW]**, `knowledge_items` | `treatment_protocols` **[NEW]**, `knowledge_items` | Physicians, Warehouse | CEO | `medical` / `dictionary` | MEDIUM (protocol) | `update`, before/after |
| **Yearly** | License/CPD compliance + แผนกำลังคนแพทย์ | `employee_profiles` (license), `time_attendance` | `compliance_register` **[NEW]** | HR, CEO | CEO | `medical` / `people` | RESTRICTED | `update`, `view` |

## 4.2 Position: Physician / Aesthetic Doctor (แพทย์/แพทย์ความงาม)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | ตรวจ/ทำหัตถการ + บันทึกเวชระเบียน | `patients` (own care, consent), `tamada_cases` | `patients` (medical_notes_encrypted), `tamada_cases` | Nurse, Ops | Medical Director (high-risk) | `medical` | RESTRICTED | `view` (PHI), `create`, `update`, consent-check |
| **Daily** | ขอ consumable/ยา ตามเคส | `inventory_items` **[NEW]** (read) | `inventory_requests` **[NEW]** | Warehouse | Medical Director | `medical` → `warehouse` | MEDIUM | `create` |
| **Weekly** | บันทึก KPI ตน (เคส/วัน, revenue/chair) | `tamada_cases` (own) | `kpi_entries` (own) | Medical Director | self | `mydata` | HARD | `create` |
| **Monthly** | ทบทวน complication/outcome ตน | `tamada_cases` (own), `incidents` **[NEW]** | `work_logs` | Medical Director | self | `worklog` | RESTRICTED | `create`, `view` |

## 4.3 Position: Nurse / Aesthetic Therapist (พยาบาล/นักบำบัด)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | เตรียมเคส + assist + บันทึก vital/aftercare | `patients` (care-team, consent), `tamada_cases` | `tamada_cases` (nursing note) | Physician | Physician | `medical` | RESTRICTED | `view` (PHI), `update`, consent-check |
| **Daily** | ตรวจนับ consumable หน้างาน | `inventory_items` **[NEW]** | `inventory_counts` **[NEW]** | Warehouse | Physician | `warehouse` | MEDIUM | `create` |
| **Weekly** | บันทึกชั่วโมงทำงาน + KPI | `time_attendance` (own) | `kpi_entries`, `work_logs` | Medical Director | self | `mydata` / `worklog` | MEDIUM | `create` |

---

# 5. Finance & Accounting (การเงินและบัญชี) · role `finance`

> **Department default = `RESTRICTED`** สำหรับ Salary/Payroll/Contract/Tax รายบุคคล Finance owner-tier เห็น aggregate ได้ (HARD) แต่ payslip/salary รายคน = RESTRICTED (direct grant)

## 5.1 Position: CFO / Finance Controller

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | Review cashflow + รายรับรายสาขา | `transactions`, `tamada_cases`/`sdx_cases` (amount) | — | — | self | `finance` (`/api/transactions`) | HARD | `view`, `search` |
| **Daily** | อนุมัติเบิกเงินทดรองสูง | `salary_advances`, `transactions` | `salary_advances` (approved) | HR, Employee | self (CFO) | `advances` (`/api/hr`) | RESTRICTED | `approve`/`reject`, before/after |
| **Weekly** | กระทบยอด (reconciliation) | `transactions`, `cash_reconciliations` **[NEW]** | `cash_reconciliations` **[NEW]** | CEO Office | self | `finance` / `guardian` | HARD | `create`, `update`, before/after |
| **Monthly** | ปิดงบเดือน + อนุมัติ payroll run | `payroll_runs`, `payroll_items`, `payslips` | `payroll_runs` (finalized), `payslips` (status) | HR, CEO, RD **[ASSUMPTION]** | CEO | `payroll` (`/api/hr`) | RESTRICTED | `approve`, `create`, `export` |
| **Quarterly** | งบการเงินไตรมาส + ภาษี (PND/VAT) **[ASSUMPTION]** | `transactions`, `payroll_runs` (WHT), `tax_filings` **[NEW]** | `financial_statements` **[NEW]**, `tax_filings` **[NEW]** | CEO, Board, RD | CEO | `finance` / `reports` | RESTRICTED | `create`, `export` |
| **Yearly** | งบประมาณ + งบการเงินประจำปี + audit support | aggregate ทั้งปี, `audit_log` (financial) | `annual_budget` **[NEW]**, `financial_statements` **[NEW]** | CEO, Board, Auditor | Board | `finance` / `feasibility` | RESTRICTED | `create`, `export`, `download` |

## 5.2 Position: Accountant / AP-AR Officer (นักบัญชี)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | บันทึกรายรับ-รายจ่าย + แนบหลักฐาน | `transactions`, `documents` (invoice) | `transactions`, `documents` | CFO | CFO (เกิน threshold) | `finance` / `documents` | HARD | `create`, `upload`, before/after |
| **Daily** | ตรวจ vendor invoice เทียบ PO | `purchase_orders` **[NEW]**, `vendors` **[NEW]** | `transactions` (AP) | Warehouse, CFO | CFO | `finance` / `ingest` | HARD | `create`, `view` |
| **Weekly** | ออก payslip draft + ตรวจ payroll items | `payroll_items`, `payslips`, `employee_profiles` | `payslips` (draft) | CFO, HR | CFO | `payroll` | RESTRICTED | `create`, `view` (salary) |
| **Monthly** | นำเข้า bank statement + กระทบยอด | `transactions`, `idempotency_keys` | `cash_reconciliations` **[NEW]** | CFO | CFO | `finance` / `ingest` (`/api/ingestion`) | HARD | `create`, `upload` |

---

# 6. People / HR (ทรัพยากรบุคคล) · role `hr`

> **Department default = `RESTRICTED`** สำหรับ HR investigation / disciplinary / salary HR เป็น 1 ใน 2 role (กับ admin) ที่ `departmentScope = null` (เห็นข้าม dept) ตาม `departments.ts` — แต่การเห็น salary รายคน/investigation = RESTRICTED + audit ทุกครั้ง

## 6.1 Position: HR Director / Head of People

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | อนุมัติใบลา + เบิกล่วงหน้า | `leave_requests`, `leave_approval_steps`, `salary_advances` | `leave_requests` (approved), `salary_advances` | Employee, Finance | self (HR) / Finance (เงิน) | `advances` / `leave` (`/api/leave`) | HARD | `approve`/`reject`, before/after |
| **Daily** | จัดการเคส HR investigation | `disciplinary_cases` **[NEW]**, `audit_log` | `disciplinary_cases` **[NEW]** | CEO Office, Legal | CEO | `people` (`/api/employees`) | RESTRICTED | `create`, `update`, `view`, before/after |
| **Weekly** | ตรวจ time_attendance + ลงเวลาผิดปกติ | `time_attendance`, `employee_daily_calendar` | `time_attendance` (corrected) | Dept Heads, Finance | self | `people` / `org` | MEDIUM | `update`, before/after |
| **Monthly** | จัดทำ payroll input (OT, ลา, advance) | `overtime_requests`, `leave_requests`, `salary_advances`, `payroll_items` | `payroll_items` | Finance | CFO | `payroll` | RESTRICTED | `create`, `view` (salary) |
| **Quarterly** | ทบทวน org structure + position + permission group | `org_units`, `positions`, `permission_groups`, `user_permission_groups` | `org_units`, `positions`, `permission_groups` | IT, CEO Office | CEO | `org` / `user-groups` | HARD | `role-change`, `permission-change`, before/after |
| **Yearly** | ประเมินผล + salary review + manpower plan | `salary_history`, `skill_scores`, `kpi_entries` | `salary_history`, `performance_reviews` **[NEW]** | CEO, Finance | CEO | `people` / `reports` | RESTRICTED | `create`, `update` (salary), `export` |

## 6.2 Position: HR Officer / Payroll Officer (เจ้าหน้าที่ HR)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | รับ/ตรวจใบลา + onboarding พนักงานใหม่ | `leave_requests`, `onboarding_state`, `users` | `users` (new), `employee_profiles`, `onboarding_state` | HR Director, IT | HR Director | `people` / `onboarding` | HARD | `create`, `update` |
| **Daily** | บันทึก/แก้ time_attendance | `time_attendance`, `work_shifts` | `time_attendance` | HR Director | HR Director | `org` | MEDIUM | `create`, `update`, before/after |
| **Weekly** | ตรวจ leave quota + แจ้งเตือน | `employee_leave_quota`, `leave_types` | `notifications` | Employees | self | `leave` | MEDIUM | `create`, `view` |
| **Monthly** | รัน payroll calc (draft) + payslip | `payroll_periods`, `payroll_items`, `employee_profiles` | `payroll_runs` (draft), `payslips` (draft) | HR Director, Finance | HR Director → CFO | `payroll` | RESTRICTED | `create`, `view` (salary) |

---

# 7. IT (เทคโนโลยีสารสนเทศ) · role `it`

> IT มีสิทธิ์ `settings`, `ai`, `user-groups`, `users-admin`, `memory`, `taxonomy`, `audit` — เป็น role ที่ทรงพลัง การ action ใดๆ บน permission/role/AI config = RESTRICTED + audit เข้มงวด (separation of duties: IT ตั้งค่าระบบได้ แต่ไม่ควรเป็น approver ของข้อมูลธุรกิจ)

## 7.1 Position: IT Manager / Head of IT

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | Monitor health/metrics + AI provider status | `request_metrics`, `job_queue`, `ai_logs` | — | — | self | `settings` / `ai` (`/api/ai-router/status`, `/probe`) | MEDIUM | `view` |
| **Daily** | ตรวจ failed-access / blocked-access ใน audit | `audit_log` (security events) | `incidents` **[NEW]** (security) | CEO Office, HR | self | `audit` (`/api/audit`) | RESTRICTED | `view`, `search`, `export` |
| **Weekly** | จัดการ user/role + permission group | `users`, `permission_groups`, `user_permission_groups` | `users` (role), `permission_groups` | HR, requester | HR Director (role-change) | `users-admin` / `user-groups` | HARD | `role-change`, `permission-change`, before/after |
| **Monthly** | ตรวจ backup + restore drill | `backup_records`, `schema_migrations` | `backup_records` | CEO Office | self | `settings` / `guardian` | HARD | `create`, `download` |
| **Quarterly** | Review AI config + decision rights + redaction policy | `companies.settings.ai_decision_rights`, `ai_query_logs` **[NEW]** | `companies.settings` (AI), `ai_policies` **[NEW]** | CEO, Compliance | CEO | `ai` / `settings` | RESTRICTED | `update`, before/after |
| **Yearly** | Security review + access recertification | `users`, `user_permission_groups`, `audit_log` | `access_recertification` **[NEW]** | CEO, HR, Auditor | CEO | `audit` / `users-admin` | RESTRICTED | `permission-change`, `export` |

## 7.2 Position: IT Support / DevOps Engineer

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | รับ ticket + แก้ปัญหา user/อุปกรณ์ | `incidents` **[NEW]**, `notifications` | `incidents` **[NEW]**, `action_items` | IT Manager | self | `support` | BASIC→MEDIUM | `create`, `update` |
| **Daily** | Deploy `railway up` per service + ตรวจ health | `schema_migrations`, `/health` | deployment log (external) | IT Manager | IT Manager (prod) | (Railway CLI, นอกระบบ) + `settings` | HARD | `update` (config), deployment note |
| **Weekly** | Reset password / unlock + ตรวจ login anomaly | `users`, `login_logs` **[NEW]** | `users` (credential reset) | User, IT Manager | IT Manager | `users-admin` | HARD | `update`, `permission-change` |
| **Monthly** | ตรวจ data dictionary + taxonomy ingestion | `data_dictionary`, `ingestion_jobs` | `data_dictionary`, `ingestion_jobs` | IT Manager | IT Manager | `taxonomy` / `dictionary` / `ingest` | MEDIUM | `create`, `update` |

---

# 8. Warehouse & Purchasing (คลังสินค้าและจัดซื้อ) · role `warehouse`

> ตาราง inventory/PO/vendor ส่วนใหญ่เป็น **[NEW]** (วันนี้ NEXUS OS ยังไม่มี inventory module เต็มรูป) Vendor contract/ราคา = HARD; consumable ที่เป็นยา/เวชภัณฑ์ผูกกับ Medical/Dental ต้อง care-team scope

## 8.1 Position: Warehouse & Purchasing Manager

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | ตรวจสต็อก + reorder point + คำขอจากคลินิก | `inventory_items` **[NEW]**, `inventory_requests` **[NEW]** | `purchase_orders` **[NEW]** (draft) | Finance, Vendors | self (ต่ำกว่า threshold) | `warehouse` (`/api/ops`) | MEDIUM | `view`, `create` |
| **Daily** | อนุมัติ/ออก PO | `purchase_orders` **[NEW]**, `vendors` **[NEW]** | `purchase_orders` **[NEW]** (issued) | Finance, Vendor | CFO (เกิน threshold **[ASSUMPTION]** ฿X) | `warehouse` → `finance` | HARD | `approve`, `create`, before/after |
| **Weekly** | รับของ + ตรวจรับ + กระทบ PO | `purchase_orders` **[NEW]**, `goods_receipts` **[NEW]** | `goods_receipts` **[NEW]**, `inventory_items` **[NEW]** | Finance | self | `warehouse` | MEDIUM | `create`, `update` |
| **Monthly** | ตรวจนับสต็อก (stock count) + ปรับยอด | `inventory_items` **[NEW]**, `inventory_counts` **[NEW]** | `inventory_adjustments` **[NEW]** | Finance, CEO Office | CFO | `warehouse` / `reports` | HARD | `create`, `update`, before/after |
| **Quarterly** | ประเมิน vendor + ต่อสัญญา/ราคา | `vendors` **[NEW]**, `vendor_contracts` **[NEW]** | `vendor_contracts` **[NEW]**, `vendor_scorecards` **[NEW]** | Finance, CEO | CFO/CEO | `warehouse` / `finance` | HARD | `create`, `update` (price), before/after |
| **Yearly** | แผนจัดซื้อประจำปี + safety stock policy | `inventory_items` **[NEW]** (history), `tamada_cases` (consumption) | `procurement_plan` **[NEW]** | CEO, Finance | CEO | `warehouse` / `feasibility` | MEDIUM | `create`, `export` |

## 8.2 Position: Inventory / Stock Officer (เจ้าหน้าที่คลัง)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | จ่ายของให้สาขา/คลินิก + บันทึกตัด stock | `inventory_requests` **[NEW]**, `inventory_items` **[NEW]** | `stock_movements` **[NEW]**, `inventory_items` **[NEW]** | Warehouse Manager, Branch | self | `warehouse` | MEDIUM | `create`, `update` |
| **Daily** | ตรวจ lot/expiry เวชภัณฑ์ | `inventory_items` **[NEW]** (lot/expiry) | `inventory_alerts` **[NEW]** | Manager, Medical/Dental | self | `warehouse` | MEDIUM | `create` |
| **Weekly** | สรุปยอดเข้า-ออก + ของใกล้หมด | `stock_movements` **[NEW]** | `kpi_entries` (stock) | Warehouse Manager | self | `mydata` | MEDIUM | `create` |

---

# 9. Franchise (แฟรนไชส์) · role `franchise`

## 9.1 Position: Head of Franchise / Franchise Director

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | ดูสถานะ lead แฟรนไชส์ + คำขอเปิดสาขา | `franchise_leads` **[NEW]**, `deals` (franchise) | `franchise_leads` **[NEW]** (stage) | CEO Office, Finance | self | `franchise` (`/api/ops`) | HARD | `view`, `update`, before/after |
| **Weekly** | Review franchise audit ผลตรวจสาขา | `franchise_audits`, `branches` | `action_items` (CAPA) | Branch owners, Ops | self | `franchise` | MEDIUM | `view`, `create` |
| **Monthly** | สรุป royalty/fee + compliance รายสาขา | `franchise_audits`, `transactions` (royalty), `franchise_contracts` **[NEW]** | `kpi_entries`, `royalty_invoices` **[NEW]** | Finance, CEO Office | CFO | `franchise` / `finance` | HARD | `create`, `export` |
| **Quarterly** | ทบทวนสัญญาแฟรนไชส์ + ผลประกอบการสาขา | `franchise_contracts` **[NEW]**, `transactions` (per branch) | `franchise_contracts` **[NEW]** (amend) | CEO, Legal, Finance | CEO/Board | `franchise` / `feasibility` | RESTRICTED (contract) | `update`, before/after |
| **Yearly** | แผนขยายแฟรนไชส์ + territory + แพ็กเกจ | `branches`, aggregate revenue | `franchise_expansion_plan` **[NEW]** | CEO, Board | CEO/Board | `franchise` / `ceo` | HARD | `create`, `export` |

## 9.2 Position: Franchise Support / Field Auditor (เจ้าหน้าที่สนับสนุนแฟรนไชส์)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | ตอบคำถามสาขา + แจกจ่าย SOP/มาตรฐาน | `knowledge_items` (franchise SOP), `chat_messages` | `chat_messages`, `action_items` | Branch, Head of Franchise | self | `franchise` / `support` | BASIC | `create` |
| **Weekly** | ลงตรวจสาขา (mystery/checklist audit) | `branches`, audit checklist | `franchise_audits` (checklist, mystery_score) | Head of Franchise, Branch | Head of Franchise | `franchise` | MEDIUM | `create`, before/after |
| **Monthly** | ติดตาม CAPA + สรุปคะแนนสาขา | `franchise_audits`, `action_items` | `kpi_entries` (compliance) | Head of Franchise | self | `franchise` / `mydata` | MEDIUM | `create`, `update` |

---

# 10. Dental (ทันตกรรม) · role `dental`

> **Department default = `RESTRICTED`** เหมือน Medical — Patient/Dental records ทั้งหมดเข้าถึงผ่าน decrypt + consent gate + care-team grant ใช้ entity `sdx` (`sdx_cases`, branch `SDX-*`) ทุก view PHI = audited

## 10.1 Position: Dental Director / Lead Dentist (ผู้อำนวยการทันตกรรม)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | Review เคสทันตกรรม + chair utilization | `sdx_cases` (chair_minutes), `patients` (care-team) | `sdx_cases` (clinical note) | Dentist, Ops | self | `dental` | RESTRICTED | `view` (PHI), `update`, before/after |
| **Daily** | อนุมัติ treatment plan ซับซ้อน (ผ่าตัด/รากเทียม) | `patients`, `dental_protocols` **[NEW]** | `sdx_cases` (approved plan) | Dentist | self (Director) | `dental` | RESTRICTED | `approve`, before/after |
| **Weekly** | Clinical/x-ray quality audit | `sdx_cases`, `documents` (x-ray, restricted) | `clinical_audits` **[NEW]** | CEO Office, Compliance | self | `dental` / `audit` | RESTRICTED | `create`, `view`, `download` (PHI) |
| **Monthly** | สรุป KPI (chair time, case mix, revenue/chair) | `sdx_cases` (aggregate), `kpi_entries` | `kpi_entries` (de-identified) | CEO Office, Finance | self | `dental` / `reports` | HARD | `create`, `export` |
| **Quarterly** | ปรับ protocol + เครื่องมือ/วัสดุทันตกรรม | `dental_protocols` **[NEW]**, `inventory_items` **[NEW]** | `dental_protocols` **[NEW]** | Dentists, Warehouse | CEO | `dental` / `dictionary` | MEDIUM | `update`, before/after |
| **Yearly** | License/compliance ทันตแพทย์ + แผนกำลังคน | `employee_profiles` (license), `time_attendance` | `compliance_register` **[NEW]** | HR, CEO | CEO | `dental` / `people` | RESTRICTED | `update`, `view` |

## 10.2 Position: Dentist (ทันตแพทย์)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | รักษาคนไข้ + บันทึกเวชระเบียนทันตกรรม | `patients` (own care, consent), `sdx_cases` | `patients` (notes_encrypted), `sdx_cases` | Dental Assistant, Ops | Dental Director (ซับซ้อน) | `dental` | RESTRICTED | `view` (PHI), `create`, `update`, consent-check |
| **Daily** | ขอวัสดุ/เครื่องมือ ตามเคส | `inventory_items` **[NEW]** | `inventory_requests` **[NEW]** | Warehouse | Dental Director | `dental` → `warehouse` | MEDIUM | `create` |
| **Weekly** | บันทึก KPI ตน (เคส/วัน, chair time) | `sdx_cases` (own) | `kpi_entries` (own) | Dental Director | self | `mydata` | HARD | `create` |
| **Monthly** | ทบทวน outcome/complication ตน | `sdx_cases` (own), `incidents` **[NEW]** | `work_logs` | Dental Director | self | `worklog` | RESTRICTED | `create`, `view` |

## 10.3 Position: Dental Assistant (ผู้ช่วยทันตแพทย์)

| Cadence | Task | Data Used | Data Created/Updated | Sends To | Approver | System Used | Security Level | Audit Captured |
|---|---|---|---|---|---|---|---|---|
| **Daily** | เตรียม chair + assist + sterilize + บันทึก | `patients` (care-team, consent), `sdx_cases` | `sdx_cases` (assist note) | Dentist | Dentist | `dental` | RESTRICTED | `view` (PHI), `update`, consent-check |
| **Daily** | ตรวจนับ/เบิกวัสดุ + ตรวจ expiry | `inventory_items` **[NEW]** | `inventory_counts` **[NEW]** | Warehouse | Dentist | `warehouse` | MEDIUM | `create` |
| **Weekly** | บันทึกชั่วโมงทำงาน + KPI ตน | `time_attendance` (own) | `kpi_entries`, `work_logs` | Dental Director | self | `mydata` / `worklog` | MEDIUM | `create` |

---

# 11. Cross-Department Approval & Escalation Map (สายอนุมัติข้ามแผนก)

ตารางสรุปสายอนุมัติที่ตัดข้ามแผนก — ใช้เป็น single source of truth ของคอลัมน์ **Approver**:

| งานที่ต้องอนุมัติ | ผู้ขอ (Initiator) | ผู้อนุมัติชั้น 1 | ผู้อนุมัติชั้น 2 / final | Security | ตารางหลัก |
|---|---|---|---|---|---|
| ใบลา (leave) | พนักงานทุกแผนก | หัวหน้าแผนก | HR Director (`leave_approval_steps`) | HARD | `leave_requests` |
| เบิกเงินทดรอง (advance) | พนักงาน | หัวหน้าแผนก | HR → CFO | RESTRICTED | `salary_advances` |
| OT request | พนักงาน | หัวหน้าแผนก | HR (`ot_approval_steps`) | MEDIUM | `overtime_requests` |
| Payroll run | HR Officer | HR Director | CFO → CEO | RESTRICTED | `payroll_runs` |
| Purchase Order เกิน threshold | Warehouse Mgr | Warehouse Mgr | CFO | HARD | `purchase_orders` **[NEW]** |
| Marketing budget shift | Marketing Officer | Head of Marketing | CFO | HARD | `marketing_budget` **[NEW]** |
| High-risk treatment plan | Physician/Dentist | Medical/Dental Director | — | RESTRICTED | `tamada_cases`/`sdx_cases` |
| Role / permission change | requester | HR Director | IT (execute) | HARD | `user_permission_groups` |
| Franchise contract amend | Head of Franchise | CEO | Board/Legal | RESTRICTED | `franchise_contracts` **[NEW]** |
| Capex / expansion | Dept Head | CFO | CEO/Board | RESTRICTED | `decisions_log` **[NEW]** |
| Access to RESTRICTED data (direct grant) | any | data owner | CEO Office / HR (review) | RESTRICTED | `permission_grants` **[NEW]** + audit |

---

# 12. Security-Level Quick Reference per Position (สรุประดับข้อมูลสูงสุดที่แต่ละตำแหน่งแตะ)

| Position | ระดับสูงสุดที่แตะ | ตัวอย่าง RESTRICTED ที่เห็นได้ (direct grant) | `departmentScope` |
|---|---|---|---|
| CEO | RESTRICTED | aggregate ทุกแผนก (redacted), executive notes | `null` (read-across, redacted) |
| EA / Chief of Staff | RESTRICTED (draft) | exec summary, board logistics | CEO Office |
| Head of Operations | MEDIUM | — (PHI ต้อง grant) | Operations |
| Customer Support / Telesales | RESTRICTED (PII) | patient ชื่อ/เบอร์ (consent-gated) | Operations + sub-unit |
| Head of Marketing | HARD | budget, ROAS | Marketing |
| Marketing Officer | BASIC→MEDIUM | — | Marketing |
| Medical/Dental Director | RESTRICTED | PHI ทุกเคสในแผนก (care-team) | Medical/Dental |
| Physician / Dentist | RESTRICTED | PHI เฉพาะ own care-team | own care-team |
| Nurse / Dental Assistant | RESTRICTED | PHI เฉพาะ care-team | own care-team |
| CFO | RESTRICTED | payroll/salary/contract/tax | Finance (full org financial) |
| Accountant | RESTRICTED | salary (payslip prep), AP/AR | Finance |
| HR Director | RESTRICTED | salary, investigation ทุกคน | `null` (cross-dept) |
| HR Officer | RESTRICTED | salary (payroll prep), profiles | HR |
| IT Manager | RESTRICTED | permission/AI config/audit (ไม่ใช่ business PII) | IT (system scope) |
| IT Support | HARD | credentials, login logs | IT |
| Warehouse Manager | HARD | vendor contract/price | Warehouse |
| Stock Officer | MEDIUM | — | Warehouse |
| Head of Franchise | RESTRICTED | franchise contract | Franchise |
| Franchise Support | MEDIUM | — | Franchise |

> **กฎ separation of duties:** ไม่มีตำแหน่งใดเป็นทั้ง **ผู้สร้าง** และ **ผู้อนุมัติ** ของรายการเดียวกัน (เช่น HR Officer สร้าง payroll draft แต่ CFO อนุมัติ; Warehouse Mgr ออก PO แต่ CFO อนุมัติเกิน threshold; Accountant บันทึก AP แต่ CFO sign-off) IT ตั้งค่า permission ได้แต่ HR Director เป็น approver ของ role-change

---

# 13. Audit Log — สิ่งที่ "ทุกแถว" ในเมทริกซ์นี้ต้องบันทึก (Append-only Spec)

ทุก action ในคอลัมน์ **Audit Captured** จะถูกบันทึกในตาราง `audit_log` **(NEW upgrade จากของเดิม)** แบบ append-only ห้ามแก้/ลบ ด้วย schema เป้าหมาย:

```sql
-- NEW (migration): upgrade audit_log ให้ครบ enterprise spec
CREATE TABLE IF NOT EXISTS audit_log (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  request_id      TEXT NOT NULL,                 -- correlate กับ ai_query_logs
  session_id      TEXT,
  actor_user_id   TEXT NOT NULL,
  actor_role      TEXT NOT NULL,                 -- snapshot role ขณะ action
  action          TEXT NOT NULL CHECK (action IN (
                    'login','logout','view','search','create','update','delete',
                    'soft-delete','restore','upload','download','export',
                    'approve','reject','permission-change','role-change',
                    'ai-query','ai-response','failed-access','blocked-access','consent-check')),
  target_table    TEXT,
  target_id       TEXT,
  target_security_level TEXT CHECK (target_security_level IN ('BASIC','MEDIUM','HARD','RESTRICTED')),
  before_state    JSONB,                         -- null สำหรับ create/view
  after_state     JSONB,                         -- null สำหรับ delete/view
  changed_fields  TEXT[],
  ip_address      TEXT,
  user_agent      TEXT,
  device          TEXT,
  endpoint        TEXT,
  http_method     TEXT,
  result          TEXT NOT NULL CHECK (result IN ('success','denied','error')),
  failure_reason  TEXT,
  prev_hash       TEXT,                          -- hash-chain (tamper-evident)
  row_hash        TEXT NOT NULL,                 -- sha256(prev_hash || canonical_row)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- บังคับ append-only: REVOKE UPDATE/DELETE + trigger ปฏิเสธการแก้ + retention policy
REVOKE UPDATE, DELETE ON audit_log FROM PUBLIC;
```

**AI logs แยกตารางแต่ผูกด้วย `request_id`** (ทุกแถวที่มี `ai-query`/`ai-response`):

```sql
-- NEW (migration): ai_query_logs (วันนี้มีแค่ ai_logs ที่ faked metering)
CREATE TABLE IF NOT EXISTS ai_query_logs (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id),
  request_id      TEXT NOT NULL,                 -- = audit_log.request_id
  user_id         TEXT NOT NULL,
  user_role       TEXT NOT NULL,
  task_type       TEXT,                          -- strategy|automation|research|thai_market|general
  provider        TEXT, model TEXT,
  prompt_redacted TEXT,                          -- หลัง redaction เท่านั้น
  response_text   TEXT,
  data_scope      JSONB,                         -- tables/rows ที่อนุญาตให้ AI เห็น
  decision_right  TEXT CHECK (decision_right IN ('auto','suggest','human')),
  grounded        BOOLEAN DEFAULT false,         -- ใช้ org RAG หรือไม่
  redaction_applied BOOLEAN DEFAULT true,
  pii_blocked     BOOLEAN DEFAULT false,
  tokens_in INT, tokens_out INT, latency_ms INT, cost_thb NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**กฎ AI access control (บังคับทุกแถวที่มี AI ในเมทริกซ์):**
1. resolve user → role/department/position/clearance ก่อนเสมอ
2. filter ข้อมูลให้เหลือเฉพาะที่ user เห็นได้ (เช่น Telesales ไม่เห็น patient medical_notes; CEO เห็น aggregate redacted)
3. ส่งเฉพาะข้อมูลที่ allow ไป model + redact PII (`patients.*_encrypted`, salary, tax id)
4. output redaction check ก่อนคืน — AI ห้ามเปิดเผยข้อมูลที่ user เห็นเองไม่ได้
5. ลง `ai_query_logs` + `audit_log` (`ai-query`,`ai-response`) ผูกด้วย `request_id`

---

# 14. หมายเหตุ Grounding & สิ่งที่เป็น NEW (Migration Backlog ที่เมทริกซ์นี้สมมุติ)

| หมวด | EXISTS (ใช้ได้เลย) | NEW (ต้อง migration) |
|---|---|---|
| Org/HR | `org_units`, `positions`, `employee_profiles`, `time_attendance`, `leave_*`, `payroll_*`, `payslips`, `salary_history`, `salary_advances`, `overtime_requests` | `performance_reviews`, `disciplinary_cases`, `access_recertification` |
| Clinical | `patients` (encrypted+consent), `tamada_cases`, `sdx_cases` | `treatment_protocols`, `dental_protocols`, `clinical_audits`, `incidents`, `compliance_register` |
| Sales/Mktg | `deals`, `campaigns` | `marketing_metrics`, `marketing_budget`, `content_calendar`, `marketing_strategy` |
| Finance | `transactions`, `payroll_runs`, `documents` | `cash_reconciliations`, `financial_statements`, `tax_filings`, `annual_budget`, `vendors`, `vendor_contracts` |
| Warehouse | (ยังไม่มี inventory module เต็ม) | `inventory_items`, `inventory_requests`, `purchase_orders`, `goods_receipts`, `stock_movements`, `inventory_counts`, `inventory_adjustments`, `procurement_plan` |
| Franchise | `franchise_audits`, `branches`, `entities` | `franchise_leads`, `franchise_contracts`, `royalty_invoices`, `franchise_expansion_plan` |
| CEO/Gov | `kpi_entries`, readiness/twin | `executive_notes`, `decisions_log`, `okrs`, `board_packets`, `strategic_plan`, `succession_plan` |
| Audit/AI | `audit_log` (basic), `ai_logs` (faked) | `audit_log` upgrade (append-only + before/after + hash-chain), `ai_query_logs`, `login_logs`, `file_access_logs`, `consent_logs`, `permission_change_logs`, `permission_grants` |

> ทุกตาราง **[NEW]** ต้องมีคอลัมน์มาตรฐานองค์กร: `id, company_id, created_at, updated_at, deleted_at, created_by, updated_by, deleted_by, is_active, version, security_level` + FK/UNIQUE/CHECK/composite index + soft-delete + versioning (ตาม Global Design Rules)

> **ข้อจำกัดที่ระบุชัด:** ตัวเลข SLA, threshold อนุมัติ (฿X), KPI target/สูตร, commission, salary band, รายชื่อสาขา และ headcount ทั้งหมดในเอกสารนี้เป็น **[ASSUMPTION]** — ต้อง confirm กับเจ้าขององค์กร (Saduak Suay Mai PCL) ก่อน implement
