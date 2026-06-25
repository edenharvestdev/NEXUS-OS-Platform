# 07 — KPI Matrix (เมทริกซ์ตัวชี้วัด 5 ระดับ)

**บริษัท:** Saduak Suay Mai PCL (สะดวกสวยมาย) — เครือคลินิกความงาม + ทันตกรรมแบบแฟรนไชส์
**ระบบ:** NEXUS OS (Next.js 16 + Express + PostgreSQL, Railway)
**เอกสาร:** 07 — KPI Matrix
**สถานะ:** Production-ready specification (ไม่ใช่ demo / ไม่ใช่ MVP)
**ภาษา:** ไทย narrative + English technical identifiers

---

## 0. หลักการออกแบบ KPI (Design Principles)

เอกสารนี้นิยาม KPI ครบ **5 ระดับ** ตามโครงสร้างองค์กร
`Company → Department → (Sub-Department) → Team/Unit → Position → Employee`

กฎเหล็ก (ไม่มีข้อยกเว้น):

1. **ทุก KPI ต้องมี `data_source` ที่เป็นตาราง/คอลัมน์จริง** ที่ derive ได้จาก NEXUS OS — ห้ามมี KPI ลอย ๆ ที่วัดไม่ได้
2. **ทุก KPI ต้องมี `owner` (คนรับผิดชอบตัวเลข)** และ `reviewer` (คนตรวจ/อนุมัติ) คนละคนกัน เพื่อ separation of duties
3. **ทุก KPI ต้องมี `frequency` (รอบวัด)** — ไม่มี KPI ที่ไม่มีรอบวัด
4. **`target` ที่ยังไม่ทราบค่าจริง** ทำเครื่องหมาย **[ASSUMPTION]** และตั้งให้สมจริงสำหรับคลินิกความงาม+ทันตกรรมแฟรนไชส์ในไทย — ห้าม invent เป็นข้อเท็จจริง
5. **`actual` ทุกตัวคำนวณจาก SQL จริง** บน data source ที่ระบุ — ไม่กรอกมือ (ยกเว้นที่ระบุว่าเป็น manual entry ผ่าน `kpi_entries`)
6. **`security_level`** ของ KPI สืบทอดจากระดับชั้นข้อมูลต้นทาง: BASIC / MEDIUM / HARD / RESTRICTED
7. **`audit_log_required = YES`** สำหรับ KPI ทุกตัวที่ระดับ HARD/RESTRICTED, ทุกตัวที่ผูกกับ payroll/medical/patient/AI-evaluation และทุกตัวที่ export ออกนอกระบบ

### 0.1 Mapping ระหว่าง Security Tier เดิม (T0–T3) กับ Security Level ใหม่ (4 ชั้น)

ระบบเดิมใช้ `security_tier` (T0–T3) ในตาราง `work_logs`, `knowledge_items`, `audit_log` เอกสารนี้ map เข้าสู่ 4 ชั้นตาม spec องค์กร:

| Security Level (ใหม่) | Tier เดิม | ใครเห็น | ตัวอย่าง KPI |
|---|---|---|---|
| **BASIC** | T0 | ทุกคนในบริษัท | จำนวนงานที่ทำเสร็จของตัวเอง, attendance ตัวเอง |
| **MEDIUM** | T1 | ทั้งแผนก (department-scoped) | KPI ทีม, KPI แผนก, conversion rate ทีมขาย |
| **HARD** | T2 | owner / manager / HR | KPI ระดับบริษัท, P&L, branch revenue, salary band aggregate |
| **RESTRICTED** | T3 | grant ตรงเท่านั้น | AI evaluation score รายบุคคล, medical/patient KPI ที่ระบุตัวคนไข้, payroll รายคน, HR investigation, executive notes |

> **กฎ ABAC สำหรับ KPI:** การ query KPI ใด ๆ ผ่าน API หรือผ่าน AI ต้องผ่าน policy engine (deny-by-default) เช็ค `role × department × position × security clearance × data-ownership` ก่อนคืนค่า — บังคับใน **backend** เท่านั้น (ไม่ใช่ frontend) และ AI ห้ามเปิดเผย KPI ที่ผู้ถามไม่มีสิทธิ์เห็น (เช่น staff ถาม "เงินเดือนเฉลี่ยทีมเท่าไร" → blocked + audit `blocked-access`)

---

## 1. แหล่งข้อมูล KPI (Data Source Registry) — grounded ใน NEXUS OS

ทุก KPI ในเอกสารนี้อ้างอิงแหล่งข้อมูลจากตารางจริงต่อไปนี้ คอลัมน์ที่ระบุคือคอลัมน์ที่ **มีอยู่จริง** ในสคีมา (✅ EXISTS) หรือ **ต้องเพิ่มผ่าน migration** (🆕 NEW)

| Data Source (ตาราง) | คอลัมน์หลักที่ใช้คำนวณ KPI | สถานะ | Schema file |
|---|---|---|---|
| `transactions` | `type('income'/'expense')`, `amount`, `category`, `status`, `date`, `company_id` | ✅ EXISTS | `db.ts` core |
| `deals` | `value`, `stage`, `probability`, `user_id`, `created_at`, `updated_at` | ✅ EXISTS | `db.ts` core |
| `tamada_cases` | `branch_code`, `amount`, `treatment_code`, `doctor_id`, `booking_status`, `no_show`, `case_date` | ✅ EXISTS | `nexus-entity-schema.ts` |
| `sdx_cases` | `branch_code`, `amount`, `treatment_type`, `chair_minutes`, `doctor_id`, `case_date` | ✅ EXISTS | `nexus-entity-schema.ts` |
| `franchise_audits` | `branch_code`, `checklist_passed`, `checklist_total`, `mystery_score`, `audit_date` | ✅ EXISTS | `nexus-entity-schema.ts` |
| `campaigns` | `channel`, `budget`, `spent`, `reach`, `clicks`, `conversions`, `status` | ✅ EXISTS | `db.ts` core |
| `work_logs` | `action_type`, `status`, `kpi_impact`, `reviewed_by`, `department`, `created_at` | ✅ EXISTS | `nexus-schema.ts` |
| `skill_scores` | `skill_key`, `score`, `evidence_count`, `user_id` | ✅ EXISTS | `nexus-extended-schema.ts` |
| `skill_evidence` | `source_type`, `points`, `skill_key`, `created_at` | ✅ EXISTS | `nexus-extended-schema.ts` |
| `daily_ai_tasks` | `done`, `due_date`, `assigned_by`, `skill_key` | ✅ EXISTS | `nexus-full-schema.ts` |
| `tasks` | `done`, `priority`, `due_date`, `user_id` | ✅ EXISTS | `db.ts` core |
| `time_attendance` | `work_date`, `clock_in`, `clock_out`, `hours_worked` | ✅ EXISTS | `nexus-hr-schema.ts` |
| `leave_requests` | `type`, `days`, `status`, `start_date` | ✅ EXISTS | `db.ts` core |
| `payslips` | `gross`, `deductions`, `net`, `sso_employee`, `tax_wht`, `period_id` | ✅ EXISTS | `nexus-hr-schema.ts` |
| `salary_history` | `old_salary`, `new_salary`, `effective_date` | ✅ EXISTS | `nexus-hr-schema.ts` |
| `patients` | `consent_given`, `consent_at`, `visit_date` (encrypted PII) | ✅ EXISTS | `nexus-full-schema.ts` |
| `meetings` | `sentiment`, `duration_minutes`, `participants`, `decisions` | ✅ EXISTS | `db.ts` core |
| `ai_logs` | `agent`, `tokens_used`, `cost_thb`, `status` | ✅ EXISTS | `db.ts` core |
| `ai_query_logs` | `prompt`, `response`, `provider`, `model`, `tokens`, `latency_ms`, `decision`, `grounded`, `redacted`, `request_id` | 🆕 NEW (migration) | `nexus-ai-audit-schema.ts` (proposed) |
| `audit_log` | `action`, `result`, `failure_reason`, `target_security_level` | ✅ EXISTS (ต้องขยายคอลัมน์ before/after — ดู doc audit) | `nexus-schema.ts` |
| `kpi_entries` | `metric_key`, `metric_name`, `value`, `period`, `note` | ✅ EXISTS | `nexus-full-schema.ts` |
| `kpi_definitions` | `kpi_code`, `level`, `formula_sql`, `target`, `owner_position_id`, `reviewer_position_id`, `frequency`, `security_level`, `audit_required` | 🆕 NEW (migration) | `nexus-kpi-schema.ts` (proposed) |
| `kpi_snapshots` | `kpi_code`, `scope_id`, `period`, `actual_value`, `target_value`, `status_rag`, `computed_at`, `computed_by` | 🆕 NEW (migration) | `nexus-kpi-schema.ts` (proposed) |

> **หมายเหตุการ grounding:** ปัจจุบัน `kpi_entries` รองรับ KPI แบบ manual key/value ได้แล้ว แต่ **ไม่มี** definition registry (target/formula/owner/reviewer/frequency) และ **ไม่มี** snapshot table สำหรับเก็บผลคำนวณตามรอบ จึงต้องเพิ่ม `kpi_definitions` + `kpi_snapshots` เป็น migration ใหม่ (ดู §8) KPI ทั้งหมดด้านล่างถูกออกแบบให้คำนวณจากตารางที่มีอยู่จริงทั้งหมด

---

## 2. โครงสร้างคอลัมน์ KPI (Schema ของแต่ละแถวในตาราง KPI)

ทุกแถว KPI ในเอกสารนี้มี field ต่อไปนี้ครบ:

| Field | ความหมาย |
|---|---|
| `kpi_name` | ชื่อ KPI |
| `description` | นิยาม / สิ่งที่วัด |
| `formula` | สูตรคำนวณ (อ้างอิงคอลัมน์จริง / SQL ได้) |
| `data_source` | ตาราง/คอลัมน์ต้นทาง (ต้อง derive ได้จริง) |
| `owner` | ตำแหน่งที่รับผิดชอบตัวเลข |
| `frequency` | รอบวัด (daily/weekly/monthly/quarterly/yearly) |
| `target` | เป้าหมาย ([ASSUMPTION] ถ้ายังไม่ทราบจริง) |
| `actual` | ค่าจริง (คำนวณจาก SQL — ไม่กรอกมือ) |
| `reviewer` | ผู้ตรวจ/อนุมัติ KPI |
| `security_level` | BASIC / MEDIUM / HARD / RESTRICTED |
| `audit_log_required` | YES/NO |

---

## 3. LEVEL 1 — COMPANY KPI (ระดับบริษัท)

**Owner หลัก:** CEO Office | **Reviewer หลัก:** Board / CEO | **Scope:** ทั้งบริษัท (cross-branch, cross-department)
**Security:** ส่วนใหญ่ **HARD** (เห็นได้เฉพาะ owner/manager/exec); P&L รายสาขาและ margin = HARD; ตัวเลขรวมที่ใช้ภายในแผนก = MEDIUM

| # | kpi_name | description | formula | data_source | owner | frequency | target | actual (SQL) | reviewer | security_level | audit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C-01 | Total Group Revenue (รายได้รวมเครือ) | รายได้รวมทุกสาขา ทุก entity (Tamada + SDX) ต่อเดือน | `SUM(amount) WHERE type='income' AND status='paid'` + `SUM(tamada_cases.amount)` + `SUM(sdx_cases.amount)` ในช่วงเดือน | `transactions`, `tamada_cases`, `sdx_cases` | CEO | Monthly | **[ASSUMPTION]** ฿18.0M/เดือน (เครือ) | `SELECT SUM(amount) FROM transactions WHERE company_id=$1 AND type='income' AND date>=date_trunc('month',now())` ∪ entity tables | CFO | HARD | YES |
| C-02 | Net Profit Margin (อัตรากำไรสุทธิ) | (รายได้ − รายจ่าย) / รายได้ | `(SUM(income) − SUM(expense)) / NULLIF(SUM(income),0)` | `transactions.type/amount/status` | CFO | Monthly | **[ASSUMPTION]** ≥ 18% | `SELECT (SUM(amount) FILTER(WHERE type='income') - SUM(amount) FILTER(WHERE type='expense')) / NULLIF(SUM(amount) FILTER(WHERE type='income'),0) FROM transactions WHERE company_id=$1 AND date_trunc('month',date)=date_trunc('month',now())` | CEO | HARD | YES |
| C-03 | Revenue per Branch (รายได้ต่อสาขา) | รายได้เฉลี่ยต่อสาขาที่เปิดดำเนินการ | `Total Group Revenue / COUNT(DISTINCT branch_code active)` | `tamada_cases.branch_code`, `sdx_cases.branch_code`, `transactions` | COO | Monthly | **[ASSUMPTION]** ≥ ฿1.5M/สาขา/เดือน | derived จาก C-01 / branch count | CEO | HARD | YES |
| C-04 | Group Patient Volume (จำนวนเคสรวม) | จำนวนเคสรักษา/หัตถการรวมทั้งเครือต่อเดือน | `COUNT(*) tamada_cases WHERE booking_status='completed'` + `COUNT(*) sdx_cases` ในเดือน | `tamada_cases`, `sdx_cases` | COO | Monthly | **[ASSUMPTION]** ≥ 6,500 เคส/เดือน | `SELECT COUNT(*) FROM tamada_cases WHERE company_id=$1 AND booking_status='completed' AND date_trunc('month',case_date)=date_trunc('month',now())` (+ sdx) | CEO | MEDIUM | YES |
| C-05 | Group No-Show Rate (อัตราไม่มาตามนัด) | สัดส่วนเคสที่ลูกค้าไม่มาตามนัดทั้งเครือ | `SUM(no_show) / COUNT(*)` | `tamada_cases.no_show`, `tamada_cases.booking_status` | COO | Weekly | **[ASSUMPTION]** ≤ 8% | `SELECT AVG(no_show::float) FROM tamada_cases WHERE company_id=$1 AND case_date>=now()-interval '7 day'` | CEO | MEDIUM | YES |
| C-06 | Group AR / Cash Collection (อัตราเก็บเงิน) | สัดส่วนรายการที่เก็บเงินสำเร็จเทียบยอดที่ออกบิล | `SUM(amount) FILTER(status='paid') / SUM(amount) FILTER(type='income')` | `transactions.status/amount` | CFO | Monthly | **[ASSUMPTION]** ≥ 95% | `SELECT SUM(amount) FILTER(WHERE status='paid')/NULLIF(SUM(amount),0) FROM transactions WHERE company_id=$1 AND type='income' AND date_trunc('month',date)=date_trunc('month',now())` | CEO | HARD | YES |
| C-07 | Franchise Compliance Index (ดัชนีมาตรฐานแฟรนไชส์) | ค่าเฉลี่ยผ่าน checklist + mystery score ทุกสาขา | `AVG(checklist_passed/checklist_total)` weighted กับ `AVG(mystery_score)` | `franchise_audits` | Franchise Director | Monthly | **[ASSUMPTION]** ≥ 90% | `SELECT AVG(checklist_passed::float/NULLIF(checklist_total,0)) FROM franchise_audits WHERE company_id=$1 AND date_trunc('month',audit_date)=date_trunc('month',now())` | CEO | HARD | YES |
| C-08 | Marketing ROAS (ผลตอบแทนค่าโฆษณา) | conversions ที่ตีมูลค่า / งบที่ใช้ | `SUM(conversions × avg_ticket) / NULLIF(SUM(spent),0)` | `campaigns.conversions/spent`, avg ticket จาก `tamada_cases.amount` | CMO | Monthly | **[ASSUMPTION]** ≥ 4.0x | `SELECT SUM(conversions)*<avg_ticket>/NULLIF(SUM(spent),0) FROM campaigns WHERE company_id=$1 AND status='active'` | CEO | MEDIUM | YES |
| C-09 | Employee Headcount & Attrition (กำลังคน/อัตราลาออก) | จำนวนพนักงาน active + อัตราลาออกต่อปี | `active users` ; attrition = `deactivated / avg_headcount` | `users.is_active` (และ `employee_profiles`) | CHRO (HR Director) | Monthly | **[ASSUMPTION]** attrition ≤ 18%/ปี | `SELECT COUNT(*) FROM users WHERE company_id=$1 AND is_active=true` | CEO | HARD | YES |
| C-10 | Group AI Adoption & Cost (การใช้ AI/ต้นทุน) | จำนวน AI query สำเร็จ + ต้นทุนรวม | `COUNT(ai_logs WHERE status='ok')`, `SUM(cost_thb)` | `ai_logs.status/cost_thb`, `ai_query_logs` (🆕) | CTO (IT Director) | Monthly | **[ASSUMPTION]** ต้นทุน AI ≤ 1.5% ของ OPEX | `SELECT COUNT(*), SUM(cost_thb) FROM ai_logs WHERE company_id=$1 AND status='ok' AND date_trunc('month',created_at)=date_trunc('month',now())` | CEO | HARD | YES |
| C-11 | Patient Consent Coverage (ความครอบคลุม consent) | สัดส่วนคนไข้ที่มี consent บันทึกไว้ (PDPA) | `SUM(consent_given) / COUNT(*)` | `patients.consent_given` | DPO / Medical Director | Monthly | 100% (regulatory) | `SELECT AVG(consent_given::float) FROM patients WHERE company_id=$1` | CEO + Legal | RESTRICTED | YES |

> **AI guard ตัวอย่าง (C-02):** ถ้า role = `staff` ถาม "กำไรบริษัทเดือนนี้เท่าไร" → policy engine ตรวจ `security_level=HARD` → staff ไม่มี clearance → AI ตอบ "ข้อมูลนี้จำกัดสิทธิ์การเข้าถึง" + เขียน `audit_log(action='blocked-access', target_security_level='HARD', result='denied')`

---

## 4. LEVEL 2 — DEPARTMENT KPI (ระดับแผนก, 10 แผนก)

**Scope:** ภายในแผนก (department-scoped via `departmentScope(user)`) | **Default security:** **MEDIUM** (ทั้งแผนกเห็น) ยกเว้น Finance/HR/Medical/Dental ที่เป็น **HARD/RESTRICTED**
**Owner:** หัวหน้าแผนก | **Reviewer:** CEO Office / COO

### 4.1 CEO Office
| kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|
| Strategic Initiative Completion | `COUNT(tasks done WHERE priority='high') / COUNT(*)` ของงานเชิงกลยุทธ์ | `tasks.done/priority` | Chief of Staff | Monthly | **[ASSUMPTION]** ≥ 85% | CEO | HARD | YES |
| Board Decision Throughput | `COUNT(meetings WHERE decisions IS NOT NULL)` ต่อไตรมาส | `meetings.decisions` | Chief of Staff | Quarterly | **[ASSUMPTION]** ≥ 12/ไตรมาส | CEO | HARD | YES |
| Executive AI Briefing Usage | `COUNT(ai_logs WHERE agent='strategy')` | `ai_logs.agent` | Chief of Staff | Monthly | **[ASSUMPTION]** ≥ 20/เดือน | CEO | RESTRICTED | YES |

### 4.2 Operations (มี 3 sub-units: Customer Support+Admin, Personal Care, Telesales)
| kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|
| Ops SLA Compliance | `COUNT(work_logs status='approved' ภายใน SLA) / COUNT(*)` | `work_logs.status/created_at`, `sla-escalation` | COO | Weekly | **[ASSUMPTION]** ≥ 92% | CEO | MEDIUM | YES |
| Booking-to-Show Rate | `1 − AVG(no_show)` (Tamada) | `tamada_cases.no_show` | Ops Manager | Weekly | **[ASSUMPTION]** ≥ 90% | COO | MEDIUM | YES |
| Telesales Conversion | `SUM(deals stage='ปิดการขาย') / COUNT(deals)` ของทีม Telesales | `deals.stage/user_id` | Telesales Lead | Weekly | **[ASSUMPTION]** ≥ 22% | COO | MEDIUM | YES |
| Customer Support First-Response | `AVG(time-to-first work_log accept)` ของเคส support | `work_logs.action_type='accept'/created_at` | CS Lead | Daily | **[ASSUMPTION]** ≤ 15 นาที | COO | MEDIUM | YES |

### 4.3 Marketing
| kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|
| Campaign CTR | `SUM(clicks)/NULLIF(SUM(reach),0)` | `campaigns.clicks/reach` | CMO | Weekly | **[ASSUMPTION]** ≥ 2.5% | CEO | MEDIUM | YES |
| Cost per Lead (CPL) | `SUM(spent)/NULLIF(SUM(conversions),0)` | `campaigns.spent/conversions` | Marketing Manager | Monthly | **[ASSUMPTION]** ≤ ฿250/lead | CMO | MEDIUM | YES |
| Lead-to-Deal Handoff | `COUNT(deals created จาก campaign) / SUM(conversions)` | `deals.created_at`, `campaigns.conversions` | Marketing Manager | Monthly | **[ASSUMPTION]** ≥ 60% | CMO | MEDIUM | YES |
| Budget Utilization | `SUM(spent)/NULLIF(SUM(budget),0)` | `campaigns.spent/budget` | CMO | Monthly | 85–100% | CFO | HARD | YES |

### 4.4 Medical (Aesthetic — Tamada entity)
| kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|
| Treatment Revenue (Aesthetic) | `SUM(amount)` หัตถการ Tamada | `tamada_cases.amount` | Medical Director | Monthly | **[ASSUMPTION]** ≥ ฿9.0M | CEO | HARD | YES |
| Avg Ticket per Case | `AVG(amount)` | `tamada_cases.amount` | Medical Director | Monthly | **[ASSUMPTION]** ≥ ฿4,500 | CFO | HARD | YES |
| Complication / Revision Rate | `COUNT(treatment_code='revision') / COUNT(*)` | `tamada_cases.treatment_code` | Medical Director | Monthly | **[ASSUMPTION]** ≤ 2% | CEO + Medical Board | RESTRICTED | YES |
| Patient Consent Compliance | `AVG(consent_given)` คนไข้ Medical | `patients.consent_given` | Medical Director / DPO | Monthly | 100% | Legal | RESTRICTED | YES |

### 4.5 Finance & Accounting
| kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|
| Monthly Close Cycle Time | วันที่ปิดงบ (จาก `transactions.status` ทุกตัว reconciled) | `transactions.status` | Finance Manager | Monthly | **[ASSUMPTION]** ≤ 5 วันทำการ | CFO | HARD | YES |
| Expense Ratio | `SUM(expense)/NULLIF(SUM(income),0)` | `transactions.type/amount` | CFO | Monthly | **[ASSUMPTION]** ≤ 82% | CEO | HARD | YES |
| Payroll Accuracy | `1 − (payslips ที่แก้ไขย้อนหลัง / total payslips)` | `payslips`, `salary_history` | Payroll Lead | Monthly | **[ASSUMPTION]** ≥ 99.5% | CFO | RESTRICTED | YES |
| WHT/SSO Filing Timeliness | สัดส่วน period ที่ยื่นภาษี/ประกันสังคมตรงเวลา | `payslips.tax_wht/sso_employee`, `payroll_periods` | Finance Manager | Monthly | 100% (regulatory) | CFO | RESTRICTED | YES |

### 4.6 People (HR)
| kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|
| Attendance Compliance | `COUNT(time_attendance with clock_in/out) / expected workdays` | `time_attendance.clock_in/out` | HR Manager | Monthly | **[ASSUMPTION]** ≥ 96% | CHRO | HARD | YES |
| Leave Approval Cycle Time | `AVG(approved_at − created_at)` | `leave_requests.status/created_at` | HR Manager | Monthly | **[ASSUMPTION]** ≤ 2 วันทำการ | CHRO | MEDIUM | YES |
| Onboarding Completion | `AVG(onboarding_state.completed)` พนักงานใหม่ | `onboarding_state.completed` | HR Manager | Monthly | **[ASSUMPTION]** ≥ 90% ภายใน 30 วัน | CHRO | MEDIUM | YES |
| Voluntary Attrition Rate | `deactivated voluntary / avg_headcount` | `users.is_active`, `employee_profiles` | CHRO | Quarterly | **[ASSUMPTION]** ≤ 18%/ปี | CEO | HARD | YES |

### 4.7 IT
| kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|
| System Uptime (API/Web) | `1 − (downtime / total)` จาก healthcheck `/health`, `/` | `request_metrics`, Railway healthcheck | IT Director | Monthly | **[ASSUMPTION]** ≥ 99.5% | CEO | HARD | YES |
| AI Provider Success Rate | `COUNT(ai_logs status='ok') / COUNT(*)` | `ai_logs.status` | IT Director | Weekly | **[ASSUMPTION]** ≥ 98% | CTO | MEDIUM | YES |
| Failed-Access / Security Events | `COUNT(audit_log result='denied'/'blocked')` | `audit_log.result` | IT Director / Security | Weekly | trend ↓; spike alert | CEO | HARD | YES |
| Backup Success Rate | `COUNT(backup_records status='ok') / scheduled` | `backup_records` | IT Director | Daily | 100% | CTO | HARD | YES |

### 4.8 Warehouse & Purchasing
| kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|
| Procurement Cost Variance | `(actual expense − budget) / budget` หมวดจัดซื้อ | `transactions.category='จัดซื้อ'/amount` | Purchasing Manager | Monthly | **[ASSUMPTION]** ≤ ±5% | CFO | HARD | YES |
| Stock-Out Incidents | `COUNT(work_logs object='stock-out' action='issue')` | `work_logs.object/action_type` | Warehouse Manager | Weekly | **[ASSUMPTION]** ≤ 3/เดือน | COO | MEDIUM | YES |
| Supply Fulfillment Lead Time | `AVG(submit − accept)` ของ work_log จัดซื้อ | `work_logs.created_at/action_type` | Purchasing Manager | Monthly | **[ASSUMPTION]** ≤ 7 วัน | COO | MEDIUM | YES |

### 4.9 Franchise
| kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|
| Audit Pass Rate | `AVG(checklist_passed/checklist_total)` | `franchise_audits` | Franchise Director | Monthly | **[ASSUMPTION]** ≥ 90% | CEO | HARD | YES |
| Mystery Shopper Score | `AVG(mystery_score)` | `franchise_audits.mystery_score` | Franchise Director | Quarterly | **[ASSUMPTION]** ≥ 4.2/5 | CEO | HARD | YES |
| Branch Revenue Contribution | `SUM(tamada+sdx amount) per branch / group revenue` | `tamada_cases`, `sdx_cases` per `branch_code` | Franchise Director | Monthly | **[ASSUMPTION]** ทุกสาขา ≥ break-even | CFO | HARD | YES |

### 4.10 Dental (SDX entity)
| kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|
| Dental Treatment Revenue | `SUM(amount)` SDX | `sdx_cases.amount` | Dental Director | Monthly | **[ASSUMPTION]** ≥ ฿6.0M | CEO | HARD | YES |
| Chair Utilization | `SUM(chair_minutes) / available_chair_minutes` | `sdx_cases.chair_minutes` | Dental Director | Weekly | **[ASSUMPTION]** ≥ 70% | COO | MEDIUM | YES |
| Revenue per Chair-Hour | `SUM(amount) / (SUM(chair_minutes)/60)` | `sdx_cases.amount/chair_minutes` | Dental Director | Monthly | **[ASSUMPTION]** ≥ ฿3,000/ชม. | CFO | HARD | YES |
| Dental Consent Compliance | `AVG(consent_given)` คนไข้ SDX | `patients.consent_given` | Dental Director / DPO | Monthly | 100% | Legal | RESTRICTED | YES |

---

## 5. LEVEL 3 — TEAM / UNIT KPI (ระดับทีม/หน่วยย่อย)

**Scope:** ทีม/unit ภายในแผนก (sub-department หรือ team) | **Default security:** **MEDIUM**
**Owner:** Team Lead | **Reviewer:** หัวหน้าแผนก

ตัวอย่างทีมที่มีจริงในโครงสร้าง (จาก `org_units` level-3 + `DEPARTMENT_DEFINITIONS`):

| team/unit | kpi_name | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|---|
| Telesales Team (Ops) | Calls-to-Booking Conversion | `COUNT(deals stage advanced) / COUNT(deals created by team)` | `deals.stage/user_id` (team members) | Telesales Lead | Daily | **[ASSUMPTION]** ≥ 25% | Ops Manager | MEDIUM | YES |
| Telesales Team | Avg Deal Value | `AVG(deals.value)` ของทีม | `deals.value` | Telesales Lead | Weekly | **[ASSUMPTION]** ≥ ฿8,000 | Ops Manager | MEDIUM | YES |
| Customer Support+Admin Unit | Ticket Resolution Rate | `COUNT(work_logs status='approved') / COUNT(work_logs)` | `work_logs.status/department` | CS Lead | Weekly | **[ASSUMPTION]** ≥ 95% | Ops Manager | MEDIUM | YES |
| Personal Care Unit | Aftercare Follow-up Rate | `COUNT(follow-up tamada_cases) / COUNT(completed)` | `tamada_cases.case_date/patient_id` | Personal Care Lead | Weekly | **[ASSUMPTION]** ≥ 80% | Ops Manager | MEDIUM | YES |
| Marketing Content Team | Campaigns Launched on Time | `COUNT(campaigns status='active' on schedule) / planned` | `campaigns.status/created_at` | Content Lead | Sprint (2wk) | **[ASSUMPTION]** ≥ 90% | Marketing Manager | MEDIUM | YES |
| Marketing Performance Team | Channel ROAS (per channel) | `SUM(conversions×ticket)/SUM(spent) GROUP BY channel` | `campaigns.channel/spent/conversions` | Performance Lead | Weekly | **[ASSUMPTION]** ≥ 4.0x | Marketing Manager | MEDIUM | YES |
| Medical Aesthetic Team (per branch) | Doctor Productivity | `COUNT(tamada_cases) GROUP BY doctor_id` | `tamada_cases.doctor_id` | Branch Medical Lead | Weekly | **[ASSUMPTION]** ≥ 12 เคส/วัน/หมอ | Medical Director | HARD | YES |
| Dental Team (per branch) | Chair Throughput | `COUNT(sdx_cases) / chairs / day` | `sdx_cases.chair_minutes/doctor_id` | Branch Dental Lead | Weekly | **[ASSUMPTION]** ≥ 8 เคส/เก้าอี้/วัน | Dental Director | HARD | YES |
| Accounting Team | Reconciliation Backlog | `COUNT(transactions status='pending')` | `transactions.status` | Accounting Lead | Daily | **[ASSUMPTION]** ≤ 20 รายการค้าง | Finance Manager | HARD | YES |
| Payroll Team | Payslip On-Time Issue | `COUNT(payslips status='issued' by cutoff) / total` | `payslips.status` | Payroll Lead | Monthly | 100% | Finance Manager | RESTRICTED | YES |
| HR Recruitment Team | Time-to-Fill | `AVG(วันจาก req → hire)` | `employee_profiles.hire_date`, `tasks` | Recruitment Lead | Monthly | **[ASSUMPTION]** ≤ 30 วัน | HR Manager | MEDIUM | YES |
| IT SRE/Ops Team | Mean Time to Restore (MTTR) | `AVG(restore − incident)` จาก escalation logs | `work_logs.action_type='escalate'`, `request_metrics` | IT Ops Lead | Monthly | **[ASSUMPTION]** ≤ 2 ชม. | IT Director | HARD | YES |
| Purchasing Team | PO Cycle Time | `AVG(submit − accept)` ของ PO | `work_logs.created_at/action_type` | Purchasing Lead | Weekly | **[ASSUMPTION]** ≤ 5 วัน | Warehouse Manager | MEDIUM | YES |
| Franchise Audit Team | Audits Completed | `COUNT(franchise_audits) per period vs planned` | `franchise_audits.audit_date` | Audit Lead | Monthly | **[ASSUMPTION]** 100% ของแผน | Franchise Director | HARD | YES |

---

## 6. LEVEL 4 — POSITION KPI (ระดับตำแหน่ง)

**Scope:** มาตรฐาน KPI ตาม "ตำแหน่งงาน" (ทุกคนในตำแหน่งเดียวกันใช้ชุด KPI เดียวกัน — เป็น role profile) | **Owner:** ผู้ครองตำแหน่ง | **Reviewer:** หัวหน้าโดยตรง (line manager)
**Default security:** **MEDIUM** (KPI ของตำแหน่ง); ตัวเลขรายบุคคลที่ใช้ตัดสินผลงาน = **HARD/RESTRICTED**

| position | kpi_name | formula | data_source | owner (ผู้ครองตำแหน่ง) | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|---|
| Telesales Agent | Personal Conversion Rate | `COUNT(deals closed by user) / COUNT(deals assigned)` | `deals.stage/user_id` | Telesales Agent | Weekly | **[ASSUMPTION]** ≥ 20% | Telesales Lead | HARD | YES |
| Telesales Agent | Revenue Generated | `SUM(deals.value WHERE stage='ปิดการขาย' AND user_id=me)` | `deals.value/user_id` | Telesales Agent | Monthly | **[ASSUMPTION]** ≥ ฿300K | Ops Manager | HARD | YES |
| CS Agent | Tickets Resolved | `COUNT(work_logs status='approved' user_id=me)` | `work_logs.user_id/status` | CS Agent | Weekly | **[ASSUMPTION]** ≥ 80/สัปดาห์ | CS Lead | MEDIUM | YES |
| Aesthetic Doctor | Cases Performed | `COUNT(tamada_cases doctor_id=me)` | `tamada_cases.doctor_id` | Doctor | Weekly | **[ASSUMPTION]** ≥ 60/สัปดาห์ | Medical Director | HARD | YES |
| Aesthetic Doctor | Revision Rate (personal) | `revisions/cases doctor_id=me` | `tamada_cases.treatment_code/doctor_id` | Doctor | Monthly | **[ASSUMPTION]** ≤ 2% | Medical Director | RESTRICTED | YES |
| Dentist | Chair-Hour Revenue (personal) | `SUM(amount)/(SUM(chair_minutes)/60) doctor_id=me` | `sdx_cases.amount/chair_minutes/doctor_id` | Dentist | Monthly | **[ASSUMPTION]** ≥ ฿3,000/ชม. | Dental Director | HARD | YES |
| Marketing Specialist | Campaign Performance | `AVG(CTR) ของ campaigns ที่ user สร้าง` | `campaigns.clicks/reach/user_id` | Specialist | Monthly | **[ASSUMPTION]** CTR ≥ 2.5% | Marketing Manager | MEDIUM | YES |
| Accountant | Entries Reconciled | `COUNT(transactions status→'paid' by user)` | `transactions.status/user_id` | Accountant | Daily | **[ASSUMPTION]** ≥ 50/วัน | Accounting Lead | HARD | YES |
| HR Officer | Requests Processed | `COUNT(leave_requests approved by user)` | `leave_requests.status` | HR Officer | Weekly | **[ASSUMPTION]** ≥ 95% ภายใน SLA | HR Manager | MEDIUM | YES |
| IT Engineer | Incidents Resolved | `COUNT(work_logs action='escalate'→'approve' by user)` | `work_logs.user_id/action_type` | Engineer | Monthly | **[ASSUMPTION]** MTTR ≤ 2 ชม. | IT Director | HARD | YES |
| Purchasing Officer | POs Processed on Time | `COUNT(PO work_logs submit on time by user)` | `work_logs.user_id/created_at` | Officer | Weekly | **[ASSUMPTION]** ≥ 95% | Purchasing Lead | MEDIUM | YES |
| Franchise Auditor | Audits per Month | `COUNT(franchise_audits user_id=me)` | `franchise_audits.user_id` | Auditor | Monthly | **[ASSUMPTION]** ≥ 8 สาขา | Franchise Director | HARD | YES |
| Branch Manager | Branch P&L | `SUM(income−expense) for branch` | `tamada_cases`/`sdx_cases`/`transactions` per `branch_code` | Branch Manager | Monthly | **[ASSUMPTION]** ≥ break-even +15% | COO | HARD | YES |
| Manager (any) | Team KPI Roll-up Achievement | `% ของ team KPI ที่ ≥ target` | `kpi_snapshots.status_rag` (🆕) | Manager | Monthly | **[ASSUMPTION]** ≥ 80% green | หัวหน้าแผนก | HARD | YES |

---

## 7. LEVEL 5 — EMPLOYEE KPI (ระดับบุคคล)

**Scope:** รายบุคคล (data-ownership: `user_id = me`) | **Owner:** พนักงานเอง | **Reviewer:** หัวหน้าโดยตรง
**Default security:** ตัวเองเห็นของตัวเอง = **BASIC**; หัวหน้าเห็นของลูกน้องในแผนก = **HARD**; **AI evaluation score = RESTRICTED** (grant ตรงเท่านั้น)

ระบบมี Skill Wallet (`skill_scores`, `skill_evidence`) และ AI daily tasks (`daily_ai_tasks`) อยู่แล้ว — ใช้เป็นฐาน KPI รายบุคคลได้ทันที

| # | kpi_name | description | formula | data_source | owner | frequency | target | reviewer | security | audit |
|---|---|---|---|---|---|---|---|---|---|---|
| E-01 | Task Completion Rate | สัดส่วนงานที่ทำเสร็จตรงเวลา | `COUNT(tasks done=1 AND ≤ due_date) / COUNT(tasks user_id=me)` | `tasks.done/due_date/user_id` | Employee | Weekly | **[ASSUMPTION]** ≥ 90% | Line Manager | BASIC (self) / HARD (mgr) | YES |
| E-02 | AI Daily Task Adherence | ทำ AI-assigned task ครบ | `AVG(daily_ai_tasks.done WHERE user_id=me)` | `daily_ai_tasks.done` | Employee | Daily | **[ASSUMPTION]** ≥ 85% | Line Manager | BASIC / HARD | YES |
| E-03 | Skill Wallet Score | คะแนนทักษะรวมจาก evidence | `AVG(skill_scores.score WHERE user_id=me)` | `skill_scores.score/evidence_count` | Employee | Monthly | **[ASSUMPTION]** ≥ 70/100 | Line Manager / HR | MEDIUM / HARD | YES |
| E-04 | Skill Evidence Accrual | จำนวนหลักฐานทักษะใหม่ต่อเดือน | `COUNT(skill_evidence WHERE user_id=me ในเดือน)` | `skill_evidence.created_at` | Employee | Monthly | **[ASSUMPTION]** ≥ 4/เดือน | Line Manager | MEDIUM | YES |
| E-05 | Work-Log Approval Rate | งานที่ส่งแล้วผ่านการอนุมัติ (ไม่ถูก reject/revision) | `COUNT(work_logs status='approved') / COUNT(submit)` | `work_logs.status/user_id` | Employee | Weekly | **[ASSUMPTION]** ≥ 90% | Reviewer (`reviewed_by`) | MEDIUM / HARD | YES |
| E-06 | Productivity Output (role-specific) | ผลผลิตตามตำแหน่ง (เคส/ดีล/ตั๋ว) | mapped ต่อ position (ดู §6) | `tamada_cases`/`sdx_cases`/`deals`/`work_logs` by `user_id`/`doctor_id` | Employee | Weekly | per position | Line Manager | HARD | YES |
| E-07 | Attendance & Punctuality | มาทำงานครบ/ตรงเวลา | `COUNT(time_attendance clock_in ≤ shift start) / workdays` | `time_attendance.clock_in/work_date` | Employee | Monthly | **[ASSUMPTION]** ≥ 96% | HR / Line Manager | BASIC (self) / HARD (HR) | YES |
| E-08 | Leave Utilization | ใช้สิทธิ์ลาในเกณฑ์ | `SUM(leave_requests.days approved) vs quota` | `leave_requests.days/status`, `employee_leave_quota` | Employee | Quarterly | ภายในโควต้า | HR | HARD | YES |
| E-09 | Capacity Utilization | ภาระงานเทียบกำลัง | `user_capacity.workload_score` | `user_capacity.workload_score/hours_per_day` | Employee | Weekly | 50–85 (สมดุล) | Line Manager | MEDIUM | YES |
| E-10 | **AI Performance Evaluation Score** | คะแนนประเมินผลงานที่ AI ช่วยสังเคราะห์ (รวม E-01..E-09 + qualitative) | weighted model: `f(task_completion, approval_rate, skill_growth, attendance, productivity)` → 0–100 | `kpi_snapshots` (🆕) สังเคราะห์จาก data sources ข้างต้น | AI Agent (suggest) + Line Manager (decide) | Monthly/Quarterly | **[ASSUMPTION]** ≥ 75 | HR + Line Manager (human sign-off) | **RESTRICTED** | YES |

> **กฎสำคัญสำหรับ E-10 (AI evaluation):**
> - เป็น **RESTRICTED** เสมอ — เห็นได้เฉพาะ HR, line manager โดยตรง และเจ้าตัว (grant ตรง)
> - AI มีสิทธิ์แค่ **suggest** (Copilot not Autopilot) — การตัดสินผลงานสุดท้ายต้องมี **human sign-off** เสมอ ตาม `ai_decision_rights`
> - ทุกการคำนวณ/เปิดดู E-10 ต้องเขียน `audit_log` (`action='ai-evaluation-view'`/`'ai-response'`) + `ai_query_logs` (prompt/response/grounded/redacted) linked by `request_id`
> - ก่อนส่งข้อมูลพนักงานให้โมเดล: ต้อง **redact PII** (ชื่อจริง, เลขบัตร, ข้อมูลเงินเดือน) — ส่งเฉพาะ feature ที่จำเป็นและ allowed ตาม clearance ของผู้ขอ

---

## 8. การ Implement: Migration ที่ต้องเพิ่ม (NEW)

KPI ทั้งหมดข้างบนคำนวณจากตารางที่ **มีอยู่จริง** แต่เพื่อให้มี registry + snapshot + RAG ตามรอบ ต้องเพิ่ม 2 ตารางใหม่ (และ extend `ai_query_logs` ตาม doc audit/AI)

```sql
-- 🆕 migration: nexus-kpi-schema.ts  (เพิ่มใน migrations.ts เป็น v11)
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kpi_code        TEXT NOT NULL,                       -- e.g. 'C-01','E-10'
  level           TEXT NOT NULL CHECK (level IN ('company','department','team','position','employee')),
  scope_ref       TEXT,                                -- department/org_unit/position/user id ที่ผูก
  kpi_name        TEXT NOT NULL,
  description     TEXT,
  formula_sql     TEXT NOT NULL,                       -- สูตรจริง (parameterized, read-only)
  data_source     TEXT NOT NULL,                       -- ตาราง/คอลัมน์ต้นทาง (must be real)
  owner_position  TEXT NOT NULL,                       -- ห้าม NULL: KPI ต้องมีเจ้าของ
  reviewer_position TEXT NOT NULL,                     -- ห้าม NULL: KPI ต้องมีผู้ตรวจ
  frequency       TEXT NOT NULL CHECK (frequency IN ('daily','weekly','sprint','monthly','quarterly','yearly')),
  target_value    REAL,                                -- NULL = [ASSUMPTION] pending
  target_note     TEXT,                                -- เก็บ '[ASSUMPTION] ...'
  security_level  TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (security_level IN ('BASIC','MEDIUM','HARD','RESTRICTED')),
  audit_required  BOOLEAN NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  created_by      TEXT, updated_by TEXT, deleted_by TEXT,
  UNIQUE (company_id, kpi_code, scope_ref),
  CHECK (data_source IS NOT NULL AND owner_position IS NOT NULL AND frequency IS NOT NULL) -- no KPI without source/owner/cycle
);
CREATE INDEX idx_kpi_def_company_level ON kpi_definitions(company_id, level, is_active);

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id              TEXT PRIMARY KEY,
  company_id      TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  kpi_code        TEXT NOT NULL,
  scope_id        TEXT,                                -- branch/department/user ที่คำนวณให้
  period          TEXT NOT NULL,                       -- '2026-06' / '2026-W25' / '2026-06-25'
  actual_value    REAL NOT NULL,                       -- คำนวณจาก SQL จริง — ไม่กรอกมือ
  target_value    REAL,
  status_rag      TEXT CHECK (status_rag IN ('green','amber','red')),
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  computed_by     TEXT NOT NULL DEFAULT 'system',      -- system | ai | user_id
  security_level  TEXT NOT NULL DEFAULT 'MEDIUM',
  version         INTEGER NOT NULL DEFAULT 1,
  UNIQUE (company_id, kpi_code, scope_id, period)
);
CREATE INDEX idx_kpi_snap_lookup ON kpi_snapshots(company_id, kpi_code, period);
```

**Worker:** เพิ่ม background job (ในชุดเดียวกับ job queue / monthly skill review ที่มีอยู่) ชื่อ `kpi-snapshot-worker` รันตาม `frequency` ของแต่ละ KPI → execute `formula_sql` (read-only, parameterized ด้วย `company_id`/`scope_id`) → เขียน `kpi_snapshots` → ทุกการ compute/read ที่ระดับ HARD/RESTRICTED เขียน `audit_log`

---

## 9. Enforcement: KPI × RBAC/ABAC × Audit (สรุปกฎบังคับ)

1. **Deny-by-default:** ทุก endpoint `GET /api/kpi/*` ต้องผ่าน `requireModule('reports')` + policy engine เช็ค `security_level` ของ KPI กับ clearance ของผู้ขอ ก่อนคืนค่า
2. **Department scoping:** Level 2–3 KPI ถูกกรองด้วย `departmentScope(user)` — manager เห็นเฉพาะแผนก/ทีมตน; admin/exec เห็นทั้งองค์กร
3. **Data-ownership:** Level 5 (employee) KPI ผูก `user_id = me`; หัวหน้าเห็นของลูกน้องเฉพาะที่ `same-department AND not-self` (ตาม `canReviewWorkLog` pattern)
4. **AI guard:** ทุก AI query ที่แตะ KPI ต้อง: identify user → check clearance → filter เฉพาะ KPI ที่ allowed → redact PII → ส่งให้โมเดล → output filter (ห้ามหลุด KPI ที่ผู้ถามไม่มีสิทธิ์) → เขียน `ai_query_logs` + `audit_log`
5. **Audit:** ทุก KPI ที่ `audit_required=TRUE` (ทุกตัวระดับ HARD/RESTRICTED + payroll/medical/AI-eval) ต้องเขียน `audit_log` ทุกครั้งที่ view/compute/export/permission-change พร้อม `actor, role, target, target_security_level, result, request_id`
6. **No orphan KPI:** DB constraint บังคับ `data_source`, `owner_position`, `frequency` NOT NULL — สร้าง KPI ที่ไม่มีแหล่งข้อมูล/เจ้าของ/รอบวัด **ไม่ได้**

---

## 10. สรุป (Summary)

- ครอบคลุม KPI ครบ **5 ระดับ**: Company (11), Department (10 แผนก × 3–4 ตัว), Team/Unit (14+), Position (14), Employee (10)
- **ทุก KPI มี data source จริง** จากตาราง NEXUS OS ที่มีอยู่ (`transactions`, `tamada_cases`, `sdx_cases`, `franchise_audits`, `campaigns`, `work_logs`, `skill_scores`, `daily_ai_tasks`, `time_attendance`, `payslips`, `leave_requests`, `patients`, `ai_logs` ฯลฯ)
- **ทุก KPI มี owner + reviewer (แยกคน) + frequency** — ไม่มี KPI ลอย
- ค่า target ที่ยังไม่ทราบจริงทำเครื่องหมาย **[ASSUMPTION]** ทั้งหมด — ต้องให้ผู้บริหาร Saduak ยืนยันก่อน go-live
- `security_level` 4 ชั้น + `audit_log_required` กำหนดครบทุกแถว; medical/patient/payroll/AI-evaluation = **RESTRICTED**
- ต้องเพิ่ม **2 migration ใหม่** (`kpi_definitions`, `kpi_snapshots`) + worker คำนวณตามรอบ ส่วนที่เหลือคำนวณบนสคีมาที่มีอยู่แล้ว
