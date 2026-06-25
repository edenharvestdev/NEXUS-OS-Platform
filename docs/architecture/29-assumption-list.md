# 29 — Assumption List / รายการข้อสมมติฐานรวม (Consolidated Assumptions Register)

> **เอกสารฉบับยืนยันข้อมูล (Validation Document)** — รวบรวมทุก **[ASSUMPTION]** จากเอกสารสถาปัตยกรรมทั้งหมด (docs 02–26) มาไว้ในรายการเดียว เพื่อให้ทีมของ **Saduak Suay Mai PCL** (CEO Office / CFO / CHRO / Medical & Dental Director / IT / Legal-DPO / Franchise) ตรวจสอบและ **ยืนยันหรือแก้ไขในรอบเดียว** ก่อน go-live.

**เป้าหมายของเอกสาร:** ทุกตัวเลข, ทุก threshold, ทุก SLA, ทุก retention period, ทุกโครงสร้างองค์กรที่ทีมสถาปัตยกรรม *ไม่ทราบค่าจริง* ถูกตั้งให้สมจริงสำหรับเครือคลินิกความงาม + ทันตกรรมแฟรนไชส์ในไทย — **แต่ไม่ใช่ข้อเท็จจริง** จนกว่าท่านจะยืนยัน. กรุณาตอบแต่ละข้อด้วย ✅ **Confirm** (ตามนี้), ✏️ **Correct → [ค่าจริง]**, หรือ ❓ **Need discussion**.

**วิธีใช้ (How to use):**
- แต่ละข้อเขียนในรูปแบบ *"เราสมมติว่า X — ยืนยันไหม? (We assumed X — confirm?)"*
- คอลัมน์ **Source** ชี้ไปยังเอกสารต้นทาง เผื่อต้องดูบริบทเต็ม
- คอลัมน์ **Impact if wrong** บอกว่าถ้าค่าจริงต่างจากนี้ จะกระทบส่วนไหน (เพื่อจัดลำดับความสำคัญในการยืนยัน)
- รายการที่ทำเครื่องหมาย 🔴 = **blocker ก่อน go-live** (ต้องยืนยันก่อน implement), 🟡 = config-driven (เปลี่ยนได้ภายหลังโดยไม่ deploy ใหม่), 🟢 = informational/นโยบายภายใน

---

## สารบัญหัวข้อ (Topic Index)

| # | หัวข้อ (Topic) | จำนวนข้อ | ความสำคัญสูงสุด |
|---|----------------|:---:|:---:|
| A | บริษัทและขอบเขตทั่วไป (Company & Scope) | A1–A4 | 🔴 |
| B | โครงสร้างองค์กร: แผนก / Sub-Department / สาขา (Org Structure & Branches) | B1–B11 | 🔴 |
| C | กำลังคน / Headcount | C1–C5 | 🟡 |
| D | ตำแหน่ง / Positions / สาย reports_to | D1–D6 | 🟡 |
| E | เงินเดือน / Salary Band / Job Grade / โบนัส-Commission | E1–E5 | 🔴 |
| F | วงเงินอนุมัติ / Approval Thresholds | F1–F9 | 🔴 |
| G | KPI Targets & Formulas | G1–G10 | 🟡 |
| H | SLA / รอบเวลา (Cycle Times) | H1–H9 | 🟡 |
| I | Compliance / กฎหมาย / PDPA / ใบประกอบวิชาชีพ | I1–I8 | 🔴 |
| J | Retention / Data Lifecycle | J1–J9 | 🔴 |
| K | Security / Auth / MFA / PIN / Token | K1–K12 | 🔴 |
| L | AI Access / Redaction / Data-Residency | L1–L6 | 🔴 |
| M | Permission / Security-Level Mapping | M1–M5 | 🟡 |
| N | Infrastructure / Railway / Cloudflare / IdP | N1–N12 | 🟡 |
| O | Development Roadmap / Effort / Team | O1–O6 | 🟢 |

---

## A. บริษัทและขอบเขตทั่วไป (Company & Scope)

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Impact if wrong | Pri |
|---|----------------------------------------|--------|-----------------|:---:|
| **A1** | เราสมมติว่า **Saduak Suay Mai PCL เป็นบริษัทมหาชน (PCL)** ที่ดำเนินกิจการคลินิกความงาม + ทันตกรรมแบบแฟรนไชส์ในประเทศไทย — **ยืนยันไหม?** | 02 | กระทบ branding, compliance scope, มาตรฐานบัญชี | 🔴 |
| **A2** | เราสมมติว่า **ทุกตัวเลขในชุดเอกสารนี้** (headcount, จำนวนสาขา, salary band, KPI target, SLA, threshold, fee) เป็นค่าสมมติเชิงสมเหตุผล **ไม่ใช่ข้อเท็จจริง** จนกว่าจะยืนยันกับ HR/CEO Office/Finance — **รับทราบหลักการนี้ไหม?** | 02, 05, 11, 23, 26 | กรอบการยืนยันทั้งหมด | 🔴 |
| **A3** | เราสมมติว่าระบบมี **1 company tenant เดียว** (franchisor PCL); branch/franchise เป็นชั้นล่างใต้ tenant **ไม่ใช่ tenant แยก** — **ยืนยันไหม?** (กระทบสถาปัตยกรรม multi-tenancy ทั้งระบบ) | 18 | ถ้าแต่ละแฟรนไชส์เป็นนิติบุคคลแยก ต้องออกแบบ tenant isolation ใหม่ | 🔴 |
| **A4** | เราสมมติว่า **ชื่อบุคคลที่ปรากฏใน seed/taxonomy** (เช่น "CEO (พี่นัท)" ใน `tamada-data-taxonomy.ts`) เป็น **placeholder** — เอกสารอ้างถึง *ตำแหน่ง* ไม่ใช่ชื่อจริง — **ยืนยันว่าให้แทนที่ด้วยชื่อจริงตอน onboarding ไหม?** | 02, 03/01, 05 | mapping employee↔position จริง | 🟡 |

---

## B. โครงสร้างองค์กร: แผนก / Sub-Department / สาขา (Org Structure & Branches)

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Impact if wrong | Pri |
|---|----------------------------------------|--------|-----------------|:---:|
| **B1** | เราสมมติว่าโครงสร้าง 6 ชั้น **Company → Department → Sub-Department → Team/Unit → Position → Employee** เหมาะกับองค์กรของท่าน — **ยืนยันไหม?** | 02 | โครงสร้าง schema `org_units`/`positions` ทั้งหมด | 🔴 |
| **B2** | เราสมมติว่ามี **10 แผนก**: CEO Office, Operations, Marketing, Medical, Finance & Accounting, People (HR), IT, Warehouse & Purchasing, Franchise, Dental — **ครบและถูกต้องไหม?** | 02 | 1 แผนก = 1 system role (`getSystemRoleForDepartment`) | 🔴 |
| **B3** | เราสมมติว่าปัจจุบันโค้ดมี sub-unit จริง **เฉพาะ Operations** (Customer Support-Admin, Personal Care, Telesales) ส่วน sub-department ของแผนกอื่นทั้งหมดเป็น **ข้อเสนอใหม่ (migration v11)** — **อนุมัติให้ formalize ไหม?** | 02, 04(pos), 08 | สร้าง sub_departments table + re-map membership | 🔴 |
| **B4** | เราสมมติว่า **Marketing** มี 3 sub-dept: Digital/Performance, Content & Creative, CRM & Branch Marketing — **ยืนยันไหม?** | 02, 03/03, 04(pos) | org tree + permission scope | 🟡 |
| **B5** | เราสมมติว่า **Finance** มี 3 sub-dept: Accounting, Payroll & Tax, Treasury/Cashier — **ยืนยันไหม?** | 02, 03/05 | org tree + RESTRICTED scope | 🟡 |
| **B6** | เราสมมติว่า **HR** มี ~9 sub-units (People Operations, Learning & Development / Talent, Employee Relations & Compliance ฯลฯ) — **ยืนยันจำนวนและชื่อไหม?** | 02, 03/06 | org tree | 🟡 |
| **B7** | เราสมมติว่า **IT** มี functional sub-units (Infrastructure & Security, Applications/NEXUS Platform, IT Support/Helpdesk) โดย *1 คนอาจสวมหลายหมวก* และทุก sub-unit ต้องมี **named owner** — **ยืนยันไหม?** | 02, 03/07 | data-ownership + approval flow | 🟡 |
| **B8** | เราสมมติว่า **Medical 3 sub-dept** (Physician/Aesthetic Doctors, Aesthetic/Treatment Services, Clinical Quality & Compliance) และ **Dental 7 sub-units** + **Warehouse 2**, **Franchise 8** — **ยืนยันจำนวน sub-unit ของแต่ละแผนกไหม?** | 02, 03/04, 03/09, 03/10, 03/08 | org tree depth | 🟡 |
| **B9** | เราสมมติว่าเครือมี **คลังกลาง (Central Warehouse) 1 แห่ง** + สาขาที่ถือสต๊อกหน้าร้าน — **ยืนยันไหม?** | 03/08 | inventory/warehouse model | 🟡 |
| **B10** | เราสมมติว่า **รายชื่อสาขาจริง, จำนวนสาขา, และการ map พนักงานคลินิก ↔ สาขา ยังไม่ทราบ** — ตาราง `branches` (migration v8) มีแล้วแต่ Team/Unit ระดับสาขา (per-branch clinical team) ยังเป็น assumption; ต้องยืนยันกับ Franchise/Operations — **ขอรายชื่อสาขาจริง (master data) ได้ไหม?** | 02, 08, 16, 23 | per-branch authz, KPI per branch, dashboard | 🔴 |
| **B11** | เราสมมติว่า **branch ระดับล่างยังไม่ wired เข้า authz** (มีแค่เป็น data) และจะ wire เข้า ABAC ใน migration ใหม่ — **ยืนยันว่าต้องการ branch-level scoping จริงไหม?** | 02, 16, 19 | RBAC/ABAC engine | 🟡 |

---

## C. กำลังคน / Headcount

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Impact if wrong | Pri |
|---|----------------------------------------|--------|-----------------|:---:|
| **C1** | เราสมมติ **headcount รวมทั้งเครือ ~134 คน** — **ยืนยันตัวเลขจริงไหม?** | 02 | sizing, license cost, dashboard placeholder | 🟡 |
| **C2** | เราสมมติ **headcount ต่อแผนก = 4 / 28 / 12 / 30 / 10 / 8 / 7 / 9 / 8 / 18** (CEO Office / Operations / Marketing / Medical / Finance / HR / IT / Warehouse / Franchise / Dental) — **ยืนยันรายแผนกไหม?** | 02 | capacity planning, org tree | 🟡 |
| **C3** | เราสมมติ **CEO Office รวม ~8–14 คน, 1–3 คน/sub-unit** — **ยืนยันไหม?** | 03/01 | org tree | 🟢 |
| **C4** | เราสมมติ **IT headcount จริง ~6–12 คน** (คนเดียวหลายหมวก) — **ยืนยันไหม?** | 03/07 | org tree | 🟢 |
| **C5** | เราสมมติว่า dashboard ใช้ placeholder **headcount 218 / 9 branches / growth 2.4%** (ดึงจริงจาก DB ตอน runtime) — **ยืนยันว่าค่าจริงให้มาจาก DB ไม่ hardcode ไหม?** *(หมายเหตุ: เลข 218 ต่างจาก ~134 ใน doc 02 — ขอตัวเลขกลางที่ถูกต้อง)* | 20 | dashboard accuracy | 🟡 |

---

## D. ตำแหน่ง / Positions / สาย reports_to

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Impact if wrong | Pri |
|---|----------------------------------------|--------|-----------------|:---:|
| **D1** | เราสมมติว่า **position catalog ทั้งหมดเป็น "representative catalog"** (โครงตำแหน่งมาตรฐาน) ไม่ใช่รายชื่อจริง — **ยืนยันให้ใช้เป็นโครงตั้งต้นแล้ว calibrate ภายหลังไหม?** | 04(pos) | positions seed | 🟡 |
| **D2** | เราสมมติว่ามี **ตำแหน่งระดับ exec: COO, CFO, CMO** เป็นสาย reports_to ใต้ CEO — **ยืนยันว่ามีตำแหน่งเหล่านี้จริงไหม?** (Board อยู่นอกระบบ NEXUS) | 02 | org tree top levels | 🟡 |
| **D3** | เราสมมติว่า **Board of Directors อยู่นอกระบบ NEXUS** (ไม่มี login/record ในระบบ) — **ยืนยันไหม?** | 02, 05 | reports_to ปลายสาย | 🟢 |
| **D4** | เราสมมติว่า **job grade ใช้รูปแบบ `G1`..`G8`** — **ยืนยัน/แก้ scheme ไหม?** | 15 | `employee_profiles.job_grade` | 🟡 |
| **D5** | เราสมมติว่า **position ↔ role mapping** (เช่น "Clinic Director" → role `ceo` ระดับสาขา, "Head Nurse" → role `medical` manager) อ้างจาก seed — **ยืนยันให้ปรับตามผังจริงตอน onboarding ไหม?** | 09 | derived persona / manager flag | 🟡 |
| **D6** | เราสมมติว่า **"Manager" เป็น derived persona** จาก ABAC (`is_manager=true` หรือ `org_units.manager_user_id`) ไม่ใช่ system role เดี่ยว — **ยืนยันแนวทางนี้ไหม?** | 20 | dashboard + permission logic | 🟡 |

---

## E. เงินเดือน / Salary Band / Job Grade / โบนัส-Commission

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Impact if wrong | Pri |
|---|----------------------------------------|--------|-----------------|:---:|
| **E1** | เราสมมติว่า **salary bands ทั้งหมดยังไม่ทราบจริง** และเป็น assumption — **ขอ salary band จริงต่อ job grade/ตำแหน่งได้ไหม?** | 02, 04(pos), 13 | payroll, comp band, pay-equity KPI | 🔴 |
| **E2** | เราสมมติว่า **โครงสร้างโบนัส/commission ของ Telesales และ Personal Care** ยังไม่ทราบ — **ขอสูตร commission/โบนัสจริงได้ไหม?** | 03/06, 05 | sales KPI, payroll | 🔴 |
| **E3** | เราสมมติว่า **market benchmark สำหรับ comp band** ต้องอ้างข้อมูลตลาดภายนอก (ยังไม่มี) — **ยืนยันแหล่ง benchmark ไหม?** | 03/06 | C&B process | 🟡 |
| **E4** | เราสมมติว่า **สิทธิประกันกลุ่ม / ทันตกรรมพนักงาน** มีอยู่จริง — **ยืนยัน/ระบุรายละเอียดไหม?** | 03/06 | benefits module | 🟢 |
| **E5** | เราสมมติว่ามี **ทีม Legal ภายใน** (อ้างใน ER investigation flow + DSAR) — **ยืนยันว่ามีทีม Legal ภายในหรือใช้ outside counsel ไหม?** | 03/06 | ER/DSAR approval routing | 🟡 |

---

## F. วงเงินอนุมัติ / Approval Thresholds

> ทุก threshold ด้านล่างตั้งให้ multi-tier และ config-driven (เปลี่ยนได้โดยไม่ deploy) — **ขอค่าจริงต่อ tier**

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Impact if wrong | Pri |
|---|----------------------------------------|--------|-----------------|:---:|
| **F1** | เราสมมติ **ส่วนลด Telesales:** Team Lead อนุมัติ > **10%**, Head of Ops > **20%** (เกินไป Finance/CEO) — **ยืนยัน %?** | 03/02, 06 | sales discount control | 🔴 |
| **F2** | เราสมมติ **งบโฆษณา Marketing:** Finance co-sign เมื่อ budget > **฿100,000/เดือน** — **ยืนยันตัวเลขไหม?** | 03/03, 05, 06 | marketing budget control | 🔴 |
| **F3** | เราสมมติ **PO/จัดซื้อ (Warehouse):** Warehouse Head < **฿50,000**, Finance Manager **฿50k–500k**, CEO Office > **฿500,000** — **ยืนยัน tier?** | 03/08, 06 | procurement control | 🔴 |
| **F4** | เราสมมติ **Finance approval ladder:** Finance Manager → CFO → CEO เมื่อเกิน **฿1,000,000** — **ยืนยันไหม?** | 03/05 | finance approval | 🔴 |
| **F5** | เราสมมติ **AR write-off** ต้อง CFO อนุมัติเมื่อ > **฿20,000** — **ยืนยันไหม?** | 03/05 | AR control | 🟡 |
| **F6** | เราสมมติ **Salary advance:** Payroll Manager ≤ **฿50,000**, HR Ops Manager ≤ **฿20,000** — **ยืนยันวงเงินไหม?** | 04(pos) | advance approval | 🟡 |
| **F7** | เราสมมติ **Medical/Dental:** แผนรักษา > **฿50,000** ต้อง Director sign-off; ส่วนลดเกิน **15%** ต้อง Director + Finance — **ยืนยันไหม?** | 03/04, 03/10, 06 | clinical pricing control | 🔴 |
| **F8** | เราสมมติ **IT cost:** scaling/network change ที่กระทบ cost > ฿X/เดือน ต้อง Finance co-approve — **ขอค่า ฿X จริงไหม?** | 03/07 | IT spend control | 🟡 |
| **F9** | เราสมมติ **contract วงเงินสูง** ต้อง CEO co-sign (threshold ปรับภายหลัง) — **ขอ threshold จริงไหม?** | 09(own) | contract approval | 🟡 |

---

## G. KPI Targets & Formulas

> ทุก KPI target เก็บใน `kpi_definitions` แบบ config-driven (`target_value` NULL = pending; `target_note` เก็บ '[ASSUMPTION]'). **ขอ target/สูตร/น้ำหนักจริงต่อแผนก**

### G1 — Company / Executive (C-01..C-10)

| # | KPI | Assumed Target | Confirm? |
|---|-----|:--:|:--:|
| **G1.1** | Total Group Revenue | **฿18.0M/เดือน** | ☐ |
| **G1.2** | Net Profit Margin | **≥ 18%** | ☐ |
| **G1.3** | Revenue per Branch | **≥ ฿1.5M/สาขา/เดือน** | ☐ |
| **G1.4** | Group Patient Volume | **≥ 6,500 เคส/เดือน** | ☐ |
| **G1.5** | Group No-Show Rate | **≤ 8%** | ☐ |
| **G1.6** | Group AR / Cash Collection | **≥ 95%** | ☐ |
| **G1.7** | Franchise Compliance Index | **≥ 90%** | ☐ |
| **G1.8** | Marketing ROAS | **≥ 4.0x** | ☐ |
| **G1.9** | Employee Attrition | **≤ 18%/ปี** | ☐ |
| **G1.10** | AI Cost as % of OPEX | **≤ 1.5%** | ☐ |

**G1 — เราสมมติ company-level KPI targets ข้างต้น (C-01..C-10) — ยืนยันแต่ละค่าไหม?** Source: 07

### G2 — Department KPI targets (สรุป)

**G2 — เราสมมติ target ระดับแผนกดังนี้ — ยืนยันไหม?** Source: 07

- **CEO Office:** Strategic Initiative Completion ≥ 85%; Board Decision Throughput ≥ 12/ไตรมาส; Exec AI Briefing Usage ≥ 20/เดือน
- **Operations:** SLA Compliance ≥ 92%; Booking-to-Show ≥ 90%; Telesales Conversion ≥ 22%; CS First-Response ≤ 15 นาที
- **Marketing:** CTR ≥ 2.5%; CPL ≤ ฿250/lead; Lead-to-Deal Handoff ≥ 60%
- **Medical:** Treatment Revenue ≥ ฿9.0M; Avg Ticket ≥ ฿4,500; Complication/Revision ≤ 2%; Record Completeness ≥ 98%; AE rate ≤ 1%
- **Finance:** Monthly Close ≤ 5 วันทำการ; Expense Ratio ≤ 82%; Payroll Accuracy ≥ 99.5%
- **HR:** Attendance Compliance ≥ 96%; Leave Approval ≤ 2 วัน; Onboarding Completion ≥ 90% ใน 30 วัน; Voluntary Attrition ≤ 18%/ปี
- **IT:** System Uptime ≥ 99.5%; AI Provider Success ≥ 98%; MTTR ≤ 2–4 ชม.
- **Warehouse & Purchasing:** Procurement Cost Variance ≤ ±5%; Stock-Out ≤ 3/เดือน; Supply Lead Time ≤ 7 วัน
- **Franchise:** Audit Pass Rate ≥ 90%; Mystery Shopper ≥ 4.2/5; New Branch ≥ 8 สาขา/ปี; ทุกสาขา ≥ break-even
- **Dental:** Treatment Revenue ≥ ฿6.0M; Chair Utilization ≥ 70%; Revenue per Chair-Hour ≥ ฿3,000; No-show ≤ 10%; set-up turnaround ≤ 10 นาที

### G3–G10 — Team / Individual KPI

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source |
|---|----------------------------------------|--------|
| **G3** | เราสมมติ **team-level targets** (เช่น Telesales Calls-to-Booking ≥ 25%, Avg Deal Value ≥ ฿8,000, Doctor Productivity ≥ 12 เคส/วัน, Chair Throughput ≥ 8 เคส/เก้าอี้/วัน, Reconciliation Backlog ≤ 20) — **ยืนยันไหม?** | 07 |
| **G4** | เราสมมติ **individual targets** (เช่น Telesales Agent conversion ≥ 20% & รายได้ ≥ ฿300K/เดือน, CS Agent ≥ 80 tickets/สัปดาห์, Doctor ≥ 60 เคส/สัปดาห์, Accountant ≥ 50 entries/วัน, Auditor ≥ 8 สาขา/เดือน) — **ยืนยันไหม?** | 07 |
| **G5** | เราสมมติ **employee universal KPI** (Task Completion ≥ 90%, AI Daily Task Adherence ≥ 85%, Skill Wallet ≥ 70/100, Skill Evidence ≥ 4/เดือน, Work-Log Approval ≥ 90%, Attendance ≥ 96%) — **ยืนยันไหม?** | 07, 13 |
| **G6** | เราสมมติ **AI Performance Evaluation Score target ≥ 75** (weighted model, RESTRICTED, ต้อง human sign-off) — **ยืนยัน target + น้ำหนักไหม?** | 07, 13 |
| **G7** | เราสมมติว่า **สูตร/น้ำหนัก KPI จริง** (telesales conversion %, ยอด treatment ต่อหมอ ฯลฯ) ต้องให้ HR + หัวหน้าแผนกยืนยัน และ **ห้าม AI สมมุติเป็น fact** — **รับทราบไหม?** | 13, 18 |
| **G8** | เราสมมติ **HR-specific KPI** (Cost-per-Hire, Quality-of-Hire, Calibration Spread, PIP Success, Pay Equity Ratio, Span of Control, Engagement Score) เป็น target ที่ต้องนิยาม — **ขอ target จริงไหม?** | 03/06 |
| **G9** | เราสมมติ **Franchise New Branch target = 8 สาขา/ปี** — **ยืนยันไหม?** | 03/09 |
| **G10** | เราสมมติว่า **KPI target/formula มี security level = MEDIUM (dept)** และ cross-branch comparison = HARD — **ยืนยันไหม?** | 18 |

---

## H. SLA / รอบเวลา (Cycle Times)

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Pri |
|---|----------------------------------------|--------|:---:|
| **H1** | เราสมมติ **Leave approval SLA = 24 ชม.** — **ยืนยันไหม?** | 03/06 | 🟡 |
| **H2** | เราสมมติ **Lead handoff (Marketing→Telesales)** = qualified lead handoff ≤ **30 นาที** ในเวลาทำการ + Telesales accept ≤ **2 ชม.** (มิฉะนั้น SLA-escalation) — **ยืนยันไหม?** | 03/03 | 🟡 |
| **H3** | เราสมมติ **DSAR (คำขอข้อมูลส่วนบุคคล) response = 30 วัน** — **ยืนยันไหม?** | 03/06 | 🔴 |
| **H4** | เราสมมติ **Data breach response = 72 ชม.** (แจ้งเหตุ) — **ยืนยันตาม PDPA ไหม?** | 03/06 | 🔴 |
| **H5** | เราสมมติ **IT MTTR (mean time to restore) ≤ 2–4 ชม.** — **ยืนยันไหม?** | 03/07, 07 | 🟡 |
| **H6** | เราสมมติ **Inbox SLA (CEO Office) = response ≤ 24h** — **ยืนยันไหม?** | 03/01 | 🟢 |
| **H7** | เราสมมติ **Cert/หนังสือรับรอง issuance TAT** ต้องนิยาม — **ขอ target จริงไหม?** | 03/06 | 🟢 |
| **H8** | เราสมมติ **Dental sterilization set-up turnaround ≤ 10 นาที** — **ยืนยันไหม?** | 03/10 | 🟢 |
| **H9** | เราสมมติว่า **second-opinion policy / high-risk procedure policy** สำหรับหัตถการความเสี่ยงสูงมีอยู่จริง — **ขอนโยบายจริงไหม?** | 03/04, 06 | 🔴 |

---

## I. Compliance / กฎหมาย / PDPA / ใบประกอบวิชาชีพ

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Pri |
|---|----------------------------------------|--------|:---:|
| **I1** | เราสมมติว่าองค์กรอยู่ภายใต้ **PDPA (พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562)** และข้อมูลสุขภาพ (medical/dental/patient) เป็น **sensitive personal data ตาม ม.26** ต้องมี **explicit consent** → จัด `RESTRICTED` โดยปริยาย — **ยืนยันไหม?** | 10, 14, 22, 25 | 🔴 |
| **I2** | เราสมมติว่าโฆษณาสถานพยาบาลในไทยอยู่ใต้ **พ.ร.บ.สถานพยาบาล + ประกาศ อย.** → ทุก creative ที่มี medical/dental claim ต้องผ่าน **Medical/Dental review (mandatory gate)** — **ยืนยันไหม?** | 03/03, 06 | 🔴 |
| **I3** | เราสมมติว่ามาตรฐานบัญชี = **TFRS for NPAEs** (จนกว่าจะเข้าตลาด) — **ยืนยัน NPAEs หรือ PAEs ไหม?** | 03/05 | 🔴 |
| **I4** | เราสมมติว่ามี **professional licenses / CPD requirements** สำหรับสายแพทย์/ทันตแพทย์ (ตาราง `professional_licenses` ใหม่) — **ขอรายละเอียด license/CPD จริงไหม?** | 13, 23 | 🟡 |
| **I5** | เราสมมติว่า **ยา/สารควบคุมบางรายการ** (เช่น Botulinum toxin, lidocaine) อยู่ใต้กฎ อย. ต้องมี **batch traceability + บันทึกผู้เบิก** (field-level audit) — **ยืนยันไหม?** | 03/08 | 🔴 |
| **I6** | เราสมมติว่า **ฟอร์มเก็บข้อมูลพนักงานจะไม่เก็บ** ศาสนา/เชื้อชาติ/ประวัติอาชญากรรม/ข้อมูลชีวภาพ เว้นแต่จำเป็นและขอ consent แยก — **ยืนยันนโยบายนี้ไหม?** | 14 | 🔴 |
| **I7** | เราสมมติว่า **enum lists** (industry list, degree levels), การบังคับ/ไม่บังคับบาง section, และ consent versioning cadence เป็นค่าตั้งต้น — **ให้ HR/Legal-DPO ยืนยันก่อน production ไหม?** | 14 | 🟡 |
| **I8** | เราสมมติว่า CEO Office กำกับ compliance ภายใต้ **พ.ร.บ.สถานพยาบาล + PDPA + license คลินิก + ข้อกำหนดแฟรนไชส์** — **ยืนยันขอบเขต compliance ไหม?** | 03/01 | 🟡 |

---

## J. Retention / Data Lifecycle

> **ค่าเหล่านี้กระทบ schema/partitioning/archival โดยตรง — ต้องให้ที่ปรึกษากฎหมาย PDPA/กรมสรรพากร ยืนยัน**

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Pri |
|---|----------------------------------------|--------|:---:|
| **J1** | เราสมมติ **เวชระเบียน / clinical / patient = เก็บ ≥ 10 ปีหลัง encounter/visit ล่าสุด** แล้ว anonymize (อิงแนวเวชระเบียน/แพทยสภา) — **ยืนยันไหม?** *(หมายเหตุ: doc 08 seed ใช้ 10y; doc 16 บางจุดอ้าง 7y — ขอค่ากลางที่ถูกต้อง)* | 09, 04/med, 08, 16, 17 | 🔴 |
| **J2** | เราสมมติ **payroll / contract / tax = เก็บ 5–7 ปี** (อิงประมวลรัษฎากร/พ.ร.บ.บัญชี) — **ยืนยัน 5 หรือ 7 ปีไหม?** *(doc 08 seed=7y; doc 03/05=5y financial; doc 17=7y payroll)* | 03/05, 08, 16, 17, 18 | 🔴 |
| **J3** | เราสมมติ **audit_log ทั่วไป = 3 ปี; audit ที่เกี่ยว medical/financial = 7 ปี; HR audit = 5–7 ปี** (immutable, append-only) — **ยืนยันแต่ละชั้นไหม?** | 03/05, 03/06, 16, 18 | 🔴 |
| **J4** | เราสมมติ **AI query logs (prompt+response) = เก็บ 1–2 ปี** แล้ว purge (legal hold ได้) — **ยืนยัน 1 หรือ 2 ปีไหม?** | 09, 16 | 🟡 |
| **J5** | เราสมมติ **applicant/ผู้สมัคร = soft-delete + retention 6–12 เดือน** (ตามที่ยินยอม) — **ยืนยันไหม?** | 03/06 | 🟡 |
| **J6** | เราสมมติ **entities (ลูกค้า/ลีด) = 3 ปีหลัง inactive → anonymize; line_events = 2 ปี → purge** — **ยืนยันไหม?** | 09 | 🟡 |
| **J7** | เราสมมติ **AI evaluation/skill = 3 ปี → archive** — **ยืนยันไหม?** | 09 | 🟢 |
| **J8** | เราสมมติ **hot retention ใน DB = 18–24 เดือน** จากนั้น cold-archive (Parquet/NDJSON เข้ารหัส) เก็บ **7 ปี** — **ยืนยัน window ไหม?** | 15, 24 | 🟡 |
| **J9** | เราสมมติ **Cloudflare/edge log retention = 365 วัน** (R2/SIEM ภายนอก) ตาม PDPA — **ยืนยันไหม?** | 25 | 🟡 |

---

## K. Security / Auth / MFA / PIN / Token

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Pri |
|---|----------------------------------------|--------|:---:|
| **K1** | เราสมมติว่าใช้ **TOTP 2FA (authenticator app)** สำหรับ role-level step-up (manager/HR/finance/CEO) + **transaction PIN 6 หลัก** สำหรับเปิด record RESTRICTED ราย item — **ยืนยันแนวทางนี้ไหม?** | 10, 22 | 🔴 |
| **K2** | เราสมมติว่า **MFA เป็น P0-stretch (optional ในรอบแรก)** เพราะต้องเลือก provider (TOTP/LINE OTP) ผูกกับ business decision — **ยืนยันว่าให้ทำ MFA เลย หรือเลื่อนไปได้?** | 26 | 🔴 |
| **K3** | เราสมมติ **PIN step-up = อายุ `pin_ok_until` 5 นาที** — **ยืนยันไหม?** | 22 | 🟡 |
| **K4** | เราสมมติ **password hashing = argon2id** (`memory=19MiB, iterations=2, parallelism=1`, OWASP-aligned; ถ้า bcrypt cost ≥ 12) — **ยืนยันไหม?** | 22 | 🟡 |
| **K5** | เราสมมติ **key rotation: JWT_SECRET/ENCRYPTION_KEY ทุก 90 วัน, AI keys ทุก 180 วัน (หรือเมื่อรั่ว)** + dual-key grace period — **ยืนยันรอบไหม?** | 22, 24, 03/07 | 🟡 |
| **K6** | เราสมมติ **impossible-travel threshold = 800 km/h** → reject + บังคับ MFA ใหม่ — **ยืนยันไหม?** | 22 | 🟢 |
| **K7** | เราสมมติ **token lifetime / revocability** (access สั้น, refresh ยาว, เพิกถอนได้) ตามตารางใน doc 22 — **ยืนยันค่า TTL จริงไหม?** | 22 | 🟡 |
| **K8** | เราสมมติ **upload size limit ต่อประเภท: รูป 10MB, เอกสาร 25MB** (จากเดิม body 50MB) — **ยืนยันไหม?** | 22 | 🟢 |
| **K9** | เราสมมติ **break-glass (admin emergency access) ต้อง review โดย CEO/DPO ภายใน 24 ชม.** ทุกครั้ง + auto-expire grant ภายใน **2 ชม.** — **ยืนยันไหม?** | 09, 10 | 🔴 |
| **K10** | เราสมมติ **bulk export ของ patient/payroll (D1–D8) ต้องผ่าน DPO sign-off เสมอ** และห้าม export ไปอุปกรณ์นอก allow-list — **ยืนยันไหม?** | 10 | 🔴 |
| **K11** | เราสมมติ **WebAuthn/passkey = roadmap phase 2** (ยังไม่บังคับรอบแรก) — **ยืนยันไหม?** | 22 | 🟢 |
| **K12** | เราสมมติ **rate-limits ใหม่:** AI route 30/min/user, export & download 10/min/user, permission grant 20/min/user — **ยืนยันไหม?** | 18 | 🟡 |

---

## L. AI Access / Redaction / Data-Residency

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Pri |
|---|----------------------------------------|--------|:---:|
| **L1** | เราสมมติว่า **context ที่มี patient/medical (RESTRICTED) ห้ามออกไป provider ที่ไม่มี DPA / มี training-retention** → ต้องตั้ง `AI_RESTRICTED_PROVIDER` ชี้ self-hosted Typhoon หรือ provider ที่ปิด data-retention + BAA-equivalent; ถ้าไม่มี → **block** — **ยืนยัน policy นี้ไหม?** | 21 | 🔴 |
| **L2** | เราสมมติ **k-anonymity threshold: k=5 (payroll/HR), k=10 (patient cohort)** สำหรับ aggregate บน HARD/RESTRICTED มิฉะนั้น block — **ยืนยัน k ไหม?** | 21, 20 | 🔴 |
| **L3** | เราสมมติว่า **ตาราง sensitive** (`patients`, `employee_performance`, payslip/contract files, `salary_history`, `employee_profiles.bank/tax/national_id`) ตั้ง `ai_exposable=FALSE` หรือ `redaction_strategy='mask'` เป็นค่าตั้งต้น — **ยืนยันนโยบายนี้ไหม?** | 15 | 🔴 |
| **L4** | เราสมมติว่า **scope รายแผนกใน AI access matrix** (เช่น marketing เห็น campaigns เต็มแต่ deals aggregate) อิงโครงสร้าง 10 แผนก/13 role และ **ปรับใน `ai_data_scopes` ตามนโยบายที่ owner/HR อนุมัติ** ไม่ hardcode — **ยืนยันแนวทางไหม?** | 12 | 🟡 |
| **L5** | เราสมมติว่า **ราคา per-1K-token เป็น config ใน env/`ai_pricing`** (ไม่ hardcode) และ **FX USD→THB ดึงรายวัน/fix รายเดือน** — **ยืนยันแนวทาง metering ไหม?** | 21 | 🟡 |
| **L6** | เราสมมติว่า **AI evaluation ที่กระทบสถานะงานต้อง human-in-the-loop** และพนักงานต้องได้รับแจ้งว่าใช้ AI ประเมิน (PDPA automated-decision) + สิทธิอุทธรณ์ผ่าน HR — **ยืนยันไหม?** | 09 | 🔴 |

---

## M. Permission / Security-Level Mapping

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Pri |
|---|----------------------------------------|--------|:---:|
| **M1** | เราสมมติ **tier เดิม T0–T3 แม็พ 4 ระดับใหม่:** `T0→BASIC, T1→MEDIUM, T2→HARD, T3→RESTRICTED` (ใช้ migrate แถวเดิม) — **ยืนยัน mapping ไหม?** | 19 | 🔴 |
| **M2** | เราสมมติว่า **Medical/Dental default_security_level = RESTRICTED; Finance = HARD** (payroll/contract = RESTRICTED ระดับตาราง) — **ยืนยันไหม?** | 15 | 🔴 |
| **M3** | เราสมมติว่า **default security clearance ↔ level เป็นค่าตั้งต้น** override per-position/per-employee ได้ (RESTRICTED ต้อง direct grant เท่านั้น) — **ยืนยันหลักการไหม?** | 04(pos) | 🟡 |
| **M4** | เราสมมติว่าจะ **เพิ่มคอลัมน์ `security_level, owner_id, branch_id, sub_department_id`** ให้ core tables (ALTER) — **อนุมัติ schema change นี้ไหม?** | 19 | 🟡 |
| **M5** | เราสมมติว่า **Data Governance Owner = IT Lead (รักษาการ)** และ **ai_query_logs owner = IT Lead + DPO** — **ยืนยันผู้รับผิดชอบ (named owner) ไหม?** | 09 | 🟡 |

---

## N. Infrastructure / Railway / Cloudflare / IdP

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Pri |
|---|----------------------------------------|--------|:---:|
| **N1** | เราสมมติว่าเริ่มด้วย **2 environments (staging + production)** ก่อน แล้วเพิ่ม preview ภายหลัง — **ยืนยันไหม?** | 24 | 🟢 |
| **N2** | เราสมมติ **backup: daily snapshot 35 วัน, PITR window 7 วัน** (ปรับตามแพ็กเกจ Railway) — **ยืนยันไหม?** | 24 | 🟡 |
| **N3** | เราสมมติ **off-site retention tiering: daily 35d → weekly 12w → monthly 12m;** financial/tax archive ≥ 5 ปีแยก — **ยืนยันไหม?** | 24 | 🟡 |
| **N4** | เราสมมติ **RPO/RTO target** เหมาะกับคลินิกแฟรนไชส์ (ตามตาราง doc 24) — **ขอ RPO/RTO ที่ธุรกิจยอมรับได้จริงไหม?** | 24 | 🔴 |
| **N5** | เราสมมติว่าใช้ **external uptime monitor + log sink (เช่น Datadog/Logtail/BetterStack)** สำหรับ observability ระยะยาว (Railway logs ไม่ใช่ audit trail) — **ยืนยัน/เลือก vendor ไหม?** | 24, 25 | 🟡 |
| **N6** | เราสมมติ **autoscaling: scale api เมื่อ p95 > 800ms หรือ CPU > 70% ต่อเนื่อง 5 นาที;** min web=2/api=2 หลัง pilot; read-replica เมื่อ > ~30 สาขา — **ยืนยันไหม?** | 24 | 🟡 |
| **N7** | เราสมมติ **alert routing:** healthcheck fail 2 ครั้งติด, crash-loop > 3/10 นาที, error rate > 2% → แจ้ง ops ทันที — **ยืนยันไหม?** | 24 | 🟡 |
| **N8** | เราสมมติ **custom domain = `saduak.co.th` / `app.saduak.co.th`** (placeholder) — **ขอโดเมนจริงไหม?** | 25 | 🔴 |
| **N9** | เราสมมติ **Cloudflare plan = Pro/Business + Bot Management + Zero Trust (Access)** ~10–20 seats สำหรับ admin/IT — **ยืนยัน tier/budget ไหม?** | 25 | 🟡 |
| **N10** | เราสมมติว่าใช้ **Google Workspace หรือ Microsoft Entra ID เป็น IdP กลาง (SAML/OIDC)** + MFA, group map กับ RBAC — **ยืนยัน IdP ไหม?** | 25 | 🔴 |
| **N11** | เราสมมติว่า **พนักงานหลักอยู่ในประเทศไทย** → geo rules (W9 challenge นอกไทย, W17 country block-list `{KP}`) อิงสมมติฐานนี้; สาขานอกพื้นที่ต้องเพิ่ม allow-list — **ยืนยันไหม?** | 25, 24 | 🟡 |
| **N12** | เราสมมติว่าต้องดึง **LINE webhook IP ranges + office/branch IPs จริง** ตอน setup (placeholder ในเอกสาร) — **ยืนยันแหล่งข้อมูลไหม?** | 25 | 🟡 |

---

## O. Development Roadmap / Effort / Team

| # | ข้อสมมติฐาน (We assumed … — confirm?) | Source | Pri |
|---|----------------------------------------|--------|:---:|
| **O1** | เราสมมติ **effort รวม ~214 engineer-days (+20% buffer ≈ 257)** ≈ 9–11 เดือนปฏิทินด้วยทีม 3 คน — **ยืนยันสมมติฐานนี้ไหม?** | 26 | 🟢 |
| **O2** | เราสมมติ **ทีม 3 senior backend devs** (D1 foundation/security, D2 permission/AI, D3 features), เริ่ม **2026-07-01**, ~21 working-day/เดือน — **ยืนยัน team shape + วันเริ่มไหม?** | 26 | 🟡 |
| **O3** | เราสมมติว่าหน่วย effort = **engineer-day (1 senior backend dev เต็มวัน)** รวม implement+test+migration+review+doc แต่ **ไม่รวม** PM/QA/UAT — **ยืนยันนิยามไหม?** | 26 | 🟢 |
| **O4** | เราสมมติว่า **distributed rate-limit** จะย้ายไป Postgres token-bucket / **Redis (Railway Redis add-on)** — **ยืนยันให้เพิ่ม Redis ไหม?** | 26 | 🟡 |
| **O5** | เราสมมติว่า **ตัวเลข business (KPI/SLA/branch/headcount/salary band) ทั้งหมดเป็น config-driven** เปลี่ยนได้โดยไม่ deploy ใหม่ และ roadmap เป็น living document ที่ re-baseline ทุกสิ้น phase — **รับทราบไหม?** | 26 | 🟢 |
| **O6** | เราสมมติว่า **API version prefix `/api/v1/...`** จะถูกเพิ่มก่อน production hardening (ปัจจุบันไม่มี) — **ยืนยันไหม?** | 18 | 🟡 |

---

## หมายเหตุความไม่สอดคล้องที่พบ (Cross-Doc Inconsistencies to Resolve)

ระหว่างรวบรวม พบค่าที่ **ต่างกันระหว่างเอกสาร** — ขอให้ท่านชี้ค่ามาตรฐานเดียว:

1. **Headcount รวม:** doc 02 = **~134**; doc 20 (dashboard placeholder) = **218**. → ขอตัวเลขกลาง (ดู C1, C5).
2. **จำนวนสาขา:** doc 20 placeholder = **9 branches**; doc 09 = **~25 สาขาแฟรนไชส์**. → ขอ branch master จริง (ดู B10, G9).
3. **Retention เวชระเบียน:** ส่วนใหญ่ = **10 ปี** (doc 04/med, 08, 17); doc 16 บางจุด = **7 ปี**. → ขอค่ามาตรฐาน (ดู J1).
4. **Retention payroll/tax:** doc 03/05 = **5 ปี**; doc 08/17 = **7 ปี**. → ขอค่ามาตรฐาน (ดู J2).
5. **IT MTTR:** doc 07 = **≤ 2 ชม.**; doc 03/07 = **≤ 4 ชม.**. → ขอ target เดียว (ดู H5).

---

## สรุปการดำเนินการ (Action Checklist สำหรับฝ่ายธุรกิจ)

| ผู้รับผิดชอบ (Owner) | ข้อที่ต้องยืนยัน (Confirm these) |
|----------------------|----------------------------------|
| **CEO Office / Board** | A1–A4, B1–B2, D2–D3, F3–F4, K9 |
| **CFO / Finance** | E1–E5, F1–F9, G1, I3, J2 |
| **CHRO / HR** | C1–C5, D1, D4–D6, E1–E5, G5–G8, H1, J5 |
| **Medical & Dental Director** | F7, G2 (Medical/Dental), H9, I2, I4, I5, J1 |
| **Legal / DPO** | H3, H4, I1, I6, I7, J1–J9, K9–K10, L1, L6 |
| **IT / Security** | K1–K12, L1–L5, M1–M5, N1–N12, O1–O6 |
| **Franchise / Operations** | B3–B11, F1, G2 (Franchise/Ops), G9, H2 |

---

> **สถานะเอกสาร:** เอกสารนี้รวบรวมทุก **[ASSUMPTION]** จาก docs 02–26 ของชุดสถาปัตยกรรม NEXUS OS × Saduak Suay Mai PCL (snapshot 2026-06-25). ทุกข้อข้างต้น **ยังไม่ใช่ข้อเท็จจริง** จนกว่าจะได้รับการยืนยันจากเจ้าของระบบ — กรุณาตอบกลับเป็นรอบเดียว (one-pass validation) เพื่อให้ทีมพัฒนา freeze ค่าจริงก่อน implement/go-live. ค่าทุกตัวถูกออกแบบเป็น **config-driven** เพื่อให้แก้ภายหลังได้โดยไม่ deploy ใหม่ (ยกเว้นรายการ 🔴 ที่เป็น schema/security blocker).
