# 27 — Missing-Information Questions (รายการข้อมูลจริงที่ยังขาด)

> **เอกสารนี้คืออะไร** — รายการคำถาม "ข้อมูลโลกจริง" (real-world inputs) ทั้งหมดที่ยังต้องให้ผู้บริหาร/เจ้าของ Saduak Suay Mai PCL ยืนยัน ก่อนที่สถาปัตยกรรม NEXUS OS (เอกสาร 02–26) จะถูกนำไป implement เป็น production จริงได้
> ทุกคำถามมาจากการ scan จุดที่เอกสารอื่นทำเครื่องหมาย **[ASSUMPTION]** ไว้ — ค่าที่ทีมสถาปนิก "สมมติให้สมเหตุสมผล" แต่ **ห้ามใช้เป็นข้อเท็จจริงจนกว่าจะยืนยัน**
>
> **วิธีใช้** — ตอบเป็นรายข้อ (อ้างเลข). ข้อใดยังไม่ทราบให้ระบุ "ยังไม่ทราบ / ให้ทีมเสนอ default" ได้ ทีมจะ lock เป็น config (ไม่ hardcode). ทุกคำตอบจะกลายเป็น seed data / `companies.settings` JSON / migration constant.
>
> **สถานะ** — `[BLOCKER]` = ต้องมีก่อนเขียนโค้ด · `[PRE-LAUNCH]` = ต้องมีก่อน go-live · `[TUNABLE]` = ใส่ default ไปก่อน ปรับภายหลังได้
>
> **Legend ความรับผิดชอบในการตอบ** — 👤 CEO/Owner · 🧑‍💼 HR · 💰 Finance · 🩺 Medical/Dental Director · 📣 Marketing · 🛒 Warehouse · 🏢 Franchise · 🔧 IT/DevOps · ⚖️ Legal/DPO

---

## สารบัญ (กลุ่มคำถาม)

| # | กลุ่ม | จำนวนคำถาม | เจ้าของหลัก |
|---|-------|-----------|------------|
| A | Organization & Headcount | A1–A12 | 👤 🧑‍💼 |
| B | Positions & Reporting | B1–B14 | 👤 🧑‍💼 |
| C | KPI Targets & Formulas | C1–C16 | ทุกสาย |
| D | Branches & Franchise | D1–D13 | 🏢 👤 |
| E | Workflows & SLAs | E1–E15 | ทุกสาย |
| F | Security & Compliance | F1–F14 | ⚖️ 🔧 👤 |
| G | HR / Payroll Data | G1–G16 | 🧑‍💼 💰 |
| H | Medical / Dental / Patient Data & Consent | H1–H14 | 🩺 ⚖️ |
| I | AI Policy & Decision Rights | I1–I13 | 👤 🔧 |
| J | Deployment & Secrets | J1–J14 | 🔧 |

> รวม **131 คำถาม** ใน 10 กลุ่ม

---

## A. Organization & Headcount

> อ้างอิง: `02-organization-tree.md`, `03-department-breakdown/`. ปัจจุบัน headcount ต่อแผนกเป็น **[ASSUMPTION]** ทั้งหมด (เช่น Medical HC 18/30, Operations 28, Finance 10, HR 7, IT 8, Warehouse 9, Franchise 4) และ "Employee ×N" ทุกใบไม้คือ placeholder.

1. **[BLOCKER]** 👤 จำนวนพนักงานจริงทั้งบริษัท ณ วันเริ่มใช้ระบบ คือกี่คน (full-time / part-time / outsource แยกกัน)?
2. **[BLOCKER]** 🧑‍💼 Headcount จริงต่อ **10 แผนก** (CEO Office, Operations, Marketing, Medical, Finance & Accounting, People/HR, IT, Warehouse & Purchasing, Franchise, Dental) — ขอตัวเลขจริงแทนค่าสมมติ (Medical 18 vs 30 ในเอกสารยังไม่ตรงกัน — เลขจริงเท่าไร?)
3. **[BLOCKER]** 🧑‍💼 ภายใน Operations มี 4 sub-department (Customer Support, Admin, Personal Care, Telesales) — headcount จริงของแต่ละ sub-department?
4. **[PRE-LAUNCH]** 🧑‍💼 มี Team/Unit ย่อยกว่า sub-department หรือไม่ (เช่น Customer Support แยกเป็นทีมตามภาษา/ช่องทาง LINE/โทร)? ถ้ามี ขอชื่อทีม + headcount
5. **[PRE-LAUNCH]** 🧑‍💼 พนักงานที่ทำงานข้ามแผนก (matrix / dotted-line) มีกี่คน และใครบ้าง — เพราะ ABAC ใช้ `users.department` เดียว ต้องรู้ก่อนว่าต้องรองรับ multi-department membership หรือไม่
6. **[PRE-LAUNCH]** 👤 มีบริษัทในเครือ/นิติบุคคลอื่นนอกจาก "Saduak Suay Mai PCL" ที่จะอยู่ใน NEXUS เดียวกันไหม (กระทบ `company_id` / multi-tenant)?
7. **[BLOCKER]** 👤 Board of Directors อยู่ "นอกระบบ NEXUS" ตามที่สมมติไว้ — ยืนยันว่ากรรมการบริษัท **ไม่ต้องมี user account** ใช่หรือไม่? ถ้าต้องมี ต้องการสิทธิ์ระดับใด?
8. **[TUNABLE]** 🧑‍💼 อัตราการเติบโต/แผนรับคนปีหน้า (เพื่อ size license, capacity, payroll periods)?
9. **[PRE-LAUNCH]** 🧑‍💼 มีพนักงานที่ไม่มี email / ไม่มีสมาร์ทโฟน (เช่นแม่บ้าน, รปภ.) ที่ต้องมีตัวตนในระบบเพื่อจ่ายเงินเดือน แต่ไม่ login ไหม? (กระทบ login_logs, identity)
10. **[PRE-LAUNCH]** 🧑‍💼 พนักงานหนึ่งคนทำงานหลายสาขา (เวียนสาขา) มีไหม — ต้องผูก employee ↔ branch แบบ many-to-many หรือ 1:1?
11. **[TUNABLE]** 👤 ภาษาที่ใช้ใน UI: ไทยอย่างเดียว หรือ ไทย+อังกฤษ (สำหรับแพทย์ต่างชาติ/franchise ต่างจังหวัด)?
12. **[PRE-LAUNCH]** 🧑‍💼 มี "ที่ปรึกษา/แพทย์พาร์ทเนอร์" ที่เป็น external contractor ต้องเข้าถึงข้อมูลคนไข้บางส่วนไหม (กระทบ RESTRICTED + consent)?

---

## B. Positions & Reporting

> อ้างอิง: `04-position-structure.md`, `05-responsibility-matrix.md`. ตำแหน่ง executive (COO/CFO/CMO) และสาย `reports_to` หลายเส้นเป็น **[ASSUMPTION]** (เช่น "Position: COO [L4 · NEW · ASSUMPTION]", "reports_to → CEO/CFO"). Job grade `G1..G8` เป็นค่าสมมติ.

1. **[BLOCKER]** 👤 มีตำแหน่ง C-level จริงตำแหน่งใดบ้าง? เอกสารสมมติ COO, CFO, CMO — บริษัทมีจริงครบไหม หรือ CEO คุมตรงบางสาย?
2. **[BLOCKER]** 👤 ใครคือ **CEO จริง** (1 คน) และใครรายงานตรงต่อ CEO บ้าง (direct reports ชั้นที่ 1)?
3. **[BLOCKER]** 🩺 Medical สมมติ "reports_to → CEO (clinical governance)" — ผู้อำนวยการแพทย์ (Medical Director) และทันตแพทย์หัวหน้า (Dental) รายงานต่อใครจริง? เป็นพนักงานประจำหรือที่ปรึกษา?
4. **[PRE-LAUNCH]** 🧑‍💼 ขอ **ผังตำแหน่งจริง** (org chart) ระบุ: ชื่อตำแหน่ง → ระดับ (L1..Ln) → reports_to → แผนก/sub-department. แทนที่ "Employee ×N" ทุกใบ
5. **[BLOCKER]** 🧑‍💼 ระบบ **job grade** จริงใช้ไหม? ถ้าใช้ มีกี่ระดับ ชื่ออะไร (เอกสารสมมติ G1–G8)? grade ผูกกับ salary band อย่างไร?
6. **[PRE-LAUNCH]** 🧑‍💼 ตำแหน่ง "Lead" (CS Lead, Telesales Lead, Personal Care Lead, Performance Lead, Senior TC) — มีจริงทุกตำแหน่งไหม หรือชื่อจริงต่างออกไป?
7. **[PRE-LAUNCH]** 🧑‍💼 ใครมีสิทธิ์ **อนุมัติ (approver)** ในแต่ละสาย และมี backup approver (เมื่อคนหลักลา) ไหม?
8. **[PRE-LAUNCH]** 🧑‍💼 1 ตำแหน่งมีได้หลายคนไหม (เช่น "Telesales Agent" 10 คน) — ใช้เป็น position template + headcount หรือ 1 row/คน?
9. **[PRE-LAUNCH]** 🧑‍💼 ใครเป็น **HR ที่เห็นข้อมูล RESTRICTED** ได้ (payroll/contract/investigation) — ระบุตำแหน่งเฉพาะ ไม่ใช่ทั้งแผนก HR
10. **[PRE-LAUNCH]** 👤 ใครเป็น "Executive" ที่เห็น Executive notes (RESTRICTED) — เฉพาะ CEO หรือรวม C-level อื่น?
11. **[TUNABLE]** 🧑‍💼 ตำแหน่งใดเป็น "manager" ตามนิยาม RBAC (`MANAGER_ROLES` = ทุก role ยกเว้น staff) — ยืนยันว่าทุกคนที่ไม่ใช่ staff คือ manager จริงไหม หรือต้องมี flag แยก?
12. **[PRE-LAUNCH]** 🩺 ทันตแพทย์/แพทย์ที่ทำหัตถการ ต้องผูกกับ **เลขใบประกอบวิชาชีพ (license no.)** ในระบบไหม (กระทบ field ใน employee_profiles + audit หัตถการ)?
13. **[PRE-LAUNCH]** 🧑‍💼 มีตำแหน่งที่เป็น "acting / รักษาการ" ที่ต้องสิทธิ์ชั่วคราว (time-boxed grant) ไหม?
14. **[TUNABLE]** 🧑‍💼 reporting line จะเปลี่ยนบ่อยแค่ไหน (กระทบว่าจะทำ effective-dated org history หรือไม่)?

---

## C. KPI Targets & Formulas

> อ้างอิง: `07-kpi-matrix.md`. `kpi_entries` (ค่า) มีอยู่จริง แต่ `target_value`/`default_target`/`formula` ส่วนใหญ่เป็น **[ASSUMPTION]** (เช่น `formula = 'conversion = closed/leads'`, `target_value REAL — NULL = pending`). ต้องการค่าเป้าและสูตรจริงต่อแผนก.

1. **[BLOCKER]** 📣 **Telesales/Sales** — สูตร conversion จริง (closed/leads? booked/contacted?), เป้าต่อ agent ต่อเดือน, และนิยาม "lead", "qualified lead", "closed"
2. **[BLOCKER]** 📣 **Marketing** — KPI หลัก (CPL, CAC, ROAS, lead volume) เป้าจริงเท่าไร? ช่วง budget ที่ต้อง Finance co-approve สมมติไว้ **฿100,000/เดือน** — เลขจริงคือเท่าไร?
3. **[BLOCKER]** 🩺 **Medical/Dental** — KPI คลินิก (จำนวนเคส/วัน, อัตรา re-visit, รายได้ต่อเคส, อัตรา no-show) เป้าจริง + นิยาม
4. **[BLOCKER]** 🛒 **Operations / Customer Support** — SLA & KPI (first-response time, resolution time, CSAT) เป้าจริง
5. **[BLOCKER]** 💰 **Finance** — KPI (วันปิดงบ, % ใบแจ้งหนี้ตรงเวลา, AR aging) เป้าจริง
6. **[PRE-LAUNCH]** 🧑‍💼 **HR** — KPI (time-to-hire, turnover rate, training hours) เป้าจริง
7. **[PRE-LAUNCH]** 🛒 **Warehouse & Purchasing** — KPI (stock-out rate, inventory turnover, PO cycle time) เป้าจริง
8. **[PRE-LAUNCH]** 🏢 **Franchise** — KPI ต่อสาขา (ยอดขาย/สาขา, audit score, royalty on-time) เป้าจริง
9. **[BLOCKER]** ทุกสาย — KPI แต่ละตัว **คำนวณรายวัน/สัปดาห์/เดือน**? และ rollup ระดับ บุคคล → ทีม → แผนก → สาขา → บริษัท อย่างไร?
10. **[PRE-LAUNCH]** ทุกสาย — KPI ตัวไหนผูกกับ **โบนัส/คอมมิชชั่น** (กระทบ security_level → อาจ RESTRICTED + ผูก payroll)?
11. **[PRE-LAUNCH]** แต่ละ KPI **แหล่งข้อมูลต้นทาง** คืออะไร — กรอกมือ, มาจาก transaction/deals ใน NEXUS, หรือ sync จากระบบนอก (เช่น Meta Ads, คลินิกซอฟต์แวร์)?
12. **[TUNABLE]** เกณฑ์สี dashboard (เขียว/เหลือง/แดง) — % ของเป้าที่ถือว่า "on track" vs "at risk" vs "fail"?
13. **[PRE-LAUNCH]** weighting ของ KPI ในการประเมินผล (ถ้า AI evaluation ใช้) — แต่ละ KPI น้ำหนักเท่าไร? (กระทบ I-section AI evaluation)
14. **[PRE-LAUNCH]** มี KPI ที่เป็นความลับ (เห็นเฉพาะ owner/manager) เช่น margin ต่อเคส, ต้นทุนต่อ lead — ตัวไหนต้อง RESTRICTED?
15. **[TUNABLE]** ปีงบประมาณเริ่มเดือนใด (ม.ค. หรือ เม.ย. หรืออื่น) — กระทบ period rollup
16. **[PRE-LAUNCH]** baseline ปัจจุบัน (ค่า KPI 3–6 เดือนย้อนหลัง) เพื่อ seed กราฟและตั้งเป้าที่สมจริง

---

## D. Branches & Franchise

> อ้างอิง: `02`, `24`, ตาราง `branches` (migration v8), `franchise_audits`, `kpi_entries.branch_code`. รายชื่อสาขาจริงยังไม่มี — `branch_code` ทั้งหมดเป็น **[ASSUMPTION]**.

1. **[BLOCKER]** 🏢 **รายชื่อสาขาจริงทั้งหมด** ณ วันนี้: ชื่อสาขา, รหัส (branch_code), ที่อยู่/จังหวัด, ประเภท (เวชกรรม/ทันตกรรม/ทั้งคู่)
2. **[BLOCKER]** 🏢 แต่ละสาขาเป็น **owned (บริษัทเอง)** หรือ **franchise (เจ้าของแยก)**? นับจำนวนแต่ละแบบ
3. **[BLOCKER]** 🏢 สำหรับสาขา franchise — เจ้าของแฟรนไชส์ต้องมี user account ใน NEXUS ไหม? เห็นข้อมูลแค่สาขาตัวเองเท่านั้นใช่ไหม (data-ownership scope = branch)?
4. **[PRE-LAUNCH]** 🏢 พนักงานสาขา franchise เป็นพนักงานของบริษัทแม่หรือของผู้รับสิทธิ์? (กระทบ payroll, `company_id`, data isolation)
5. **[PRE-LAUNCH]** 🏢 ข้อมูลคนไข้ของสาขา franchise — บริษัทแม่เห็นได้แค่ไหน? (สำคัญมากต่อ PDPA + RESTRICTED)
6. **[PRE-LAUNCH]** 🏢 **Franchise audit** — เกณฑ์ checklist จริง, คะแนนผ่าน, ความถี่ (รายเดือน/ไตรมาส), ใครเป็นผู้ตรวจ?
7. **[PRE-LAUNCH]** 🏢 **Royalty / ค่าธรรมเนียม franchise** — สูตรคิด (% ยอดขาย? คงที่?), รอบจ่าย, ใครเห็นตัวเลขนี้?
8. **[TUNABLE]** 🏢 แผนเปิดสาขาใหม่ 12 เดือนข้างหน้า (จำนวน + ภูมิภาค) เพื่อ capacity planning
9. **[PRE-LAUNCH]** 🏢 สาขามี sub-unit ของตัวเองไหม (เช่นแผนกต้อนรับ/ห้องหัตถการ) ที่ต้อง map กับ org_units?
10. **[PRE-LAUNCH]** 🏢 KPI/รายงานต้อง **เทียบข้ามสาขา (branch benchmarking)** ไหม — ใครเห็น leaderboard ข้ามสาขาได้?
11. **[PRE-LAUNCH]** 🔧 audit log ควรเก็บ `branch_code` ของ action ทุกครั้งไหม (เอกสารสมมติว่า "ถ้าทราบ") — ยืนยันว่า action ทุกอันผูกสาขาได้จริง?
12. **[TUNABLE]** 🏢 เวลาทำการต่อสาขา (ต่างกันไหม) — กระทบ time_attendance, work_shifts, SLA นับเวลา
13. **[PRE-LAUNCH]** 🏢 แต่ละสาขามี timezone เดียวกัน (Asia/Bangkok) ทั้งหมดใช่ไหม?

---

## E. Workflows & SLAs

> อ้างอิง: `06-workflow-matrix.md`. Approval chains และ thresholds หลายจุดเป็น **[ASSUMPTION]** (เช่น ส่วนลด >15% → Finance/Director, budget >฿100k → Finance co-approve). SLA ตัวเลขยังไม่ยืนยัน.

1. **[BLOCKER]** 💰 **ส่วนลด (discount approval)** — threshold จริงที่ต้องขออนุมัติ (สมมติ >15%) และลำดับผู้อนุมัติ (TC → Senior TC → ?)
2. **[BLOCKER]** 💰 **อนุมัติงบ/รายจ่าย** — ช่วงวงเงิน → ผู้อนุมัติ (เช่น <฿X หัวหน้า, ฿X–฿Y ผู้จัดการ, >฿Y CFO/CEO). ขอตาราง matrix จริง
3. **[BLOCKER]** 📣 **Marketing budget** — เกณฑ์ Finance co-approve (สมมติ >฿100,000/เดือน) ค่าจริงเท่าไร และ chain: Media Buyer → Performance Lead → Mkt Manager → Finance?
4. **[BLOCKER]** 🧑‍💼 **การลา (leave)** — มี `leave_approval_config` อยู่แล้ว: ลาแต่ละประเภทผ่านกี่ขั้น ใครอนุมัติ? ลากี่วันต้องขึ้นถึงผู้จัดการ/HR?
5. **[BLOCKER]** 🧑‍💼 **OT** — `ot_approval_steps` มีอยู่: เกณฑ์อนุมัติ OT, อัตราคูณ (×1.5 / ×3 ตามกฎหมายแรงงาน?), เพดานต่อเดือน
6. **[PRE-LAUNCH]** 💰 **เบิกเงินล่วงหน้า (salary_advances)** — เพดาน, เงื่อนไข, ผู้อนุมัติ, หักคืนอย่างไร
7. **[PRE-LAUNCH]** 🛒 **จัดซื้อ (PO)** — chain อนุมัติตามวงเงิน, ใครเปิด PO, ใครรับของ, 3-way match ไหม?
8. **[PRE-LAUNCH]** 🩺 **เคสคนไข้ (tamada_cases / sdx_cases)** — workflow จากนัด → หัตถการ → follow-up มีขั้นตอน/สถานะอะไรบ้าง? ใครเปลี่ยนสถานะได้?
9. **[BLOCKER]** ทุกสาย — **SLA จริงต่อ workflow** (เช่น ตอบลูกค้าภายใน X นาที, อนุมัติส่วนลดภายใน Y ชม., ปิดเคสภายใน Z วัน). มี background SLA-escalation worker อยู่แล้ว ต้องรู้เลขจริง
10. **[PRE-LAUNCH]** ทุกสาย — เมื่อเกิน SLA จะ **escalate ไปใคร** และผ่านช่องทางใด (LINE / in-app notification / email)?
11. **[PRE-LAUNCH]** 🧑‍💼 **Onboarding** workflow (`onboarding_state`) — ขั้นตอนรับพนักงานใหม่จริง (เอกสาร, training, สิทธิ์เริ่มต้น)
12. **[PRE-LAUNCH]** 🧑‍💼 **Offboarding** — เมื่อพนักงานลาออก ต้อง revoke สิทธิ์/disable account ภายในกี่ชม. และใครเป็นผู้ trigger?
13. **[TUNABLE]** workflow ไหนต้องการ **idempotency** (กันกดซ้ำ) — มี `idempotency_keys` อยู่แล้ว ระบุ endpoint ที่ critical (จ่ายเงิน, อนุมัติ)
14. **[PRE-LAUNCH]** มี workflow ที่ต้อง **e-signature / ยืนยันตัวตนซ้ำ (step-up auth)** ไหม (เช่นอนุมัติเงินก้อนใหญ่, แก้เวชระเบียน)?
15. **[TUNABLE]** ช่องทาง notification ที่ใช้จริง: LINE (`LINE_CHANNEL_*` มีอยู่), email, in-app — อันไหนเป็นช่องทางหลักต่อ workflow?

---

## F. Security & Compliance

> อ้างอิง: `10-security-matrix.md`, `17-audit-log-design.md`, `22-security-architecture.md`, `25-cloudflare-security-plan.md`. Retention 10 ปี (patient) / 7 ปี (payroll) อ้าง PDPA/Revenue Code เป็น **[ASSUMPTION]** ต้องยืนยันกับ legal.

1. **[BLOCKER]** ⚖️ บริษัทมี **DPO (Data Protection Officer)** ตาม PDPA ไหม และใครคือผู้รับผิดชอบ legal/compliance ที่จะ sign-off นโยบายข้อมูล?
2. **[BLOCKER]** ⚖️ **Retention เวชระเบียน** — เอกสารสมมติ 10 ปี (3650 วัน). ค่าจริงตามประกาศแพทยสภา/ทันตแพทยสภา + PDPA คือเท่าไร?
3. **[BLOCKER]** ⚖️ **Retention payroll/contract/tax** — สมมติ 7 ปี (2555 วัน) ตามประมวลรัษฎากร/กฎหมายแรงงาน — ยืนยันเลขจริง
4. **[PRE-LAUNCH]** ⚖️ **Retention audit log** — ต้องเก็บ append-only กี่ปี? (กระทบ partitioning + storage cost)
5. **[PRE-LAUNCH]** ⚖️ ขอบเขต **PDPA consent** — ต้องเก็บ consent ของ (ก) ลูกค้า/คนไข้ (ข) พนักงาน อะไรบ้าง และมี consent form / นโยบายความเป็นส่วนตัวฉบับจริงไหม? (กระทบ `consent_logs` ที่ยังไม่มี)
6. **[BLOCKER]** ⚖️ ข้อมูลคนไข้เป็น **ข้อมูลอ่อนไหว (sensitive personal data)** ตาม PDPA — ยืนยันว่าต้อง explicit consent + RESTRICTED + เข้ารหัส at-rest ใช่ไหม?
7. **[PRE-LAUNCH]** 🔧 **การเข้ารหัส** — ต้องการ encryption at-rest ระดับ field สำหรับ field ใดบ้าง (ปัจจุบัน mask เฉพาะ salary by tier)? ขอรายการ field ที่ต้องเข้ารหัสจริง
8. **[BLOCKER]** 🔧 **MFA** — บังคับ MFA สำหรับ role ใด (สมมติ: ผู้เห็น RESTRICTED ทุกคน)? วิธีไหน (TOTP / SMS / email OTP)?
9. **[PRE-LAUNCH]** 🔧 **นโยบายรหัสผ่าน + login lockout** — ล็อกหลังพยายามผิดกี่ครั้ง, นานเท่าไร, อายุ session/JWT (ปัจจุบันไม่มี refresh/revocation)?
10. **[PRE-LAUNCH]** 🔧 **IP allow-listing** — จำกัดการเข้าถึง admin/payroll เฉพาะ IP สำนักงาน/สาขาไหม? มี IP คงที่ของแต่ละสาขาไหม?
11. **[PRE-LAUNCH]** ⚖️ **สิทธิ์เจ้าของข้อมูล (DSAR)** — เมื่อคนไข้/พนักงานขอดู/ลบข้อมูลตน ต้องตอบใน SLA กี่วัน และใครเป็นผู้ดำเนินการ? (กระทบ soft-delete + export)
12. **[PRE-LAUNCH]** ⚖️ มีข้อกำหนด **ส่งออกข้อมูลออกนอกประเทศ** ไหม (AI providers อยู่ US/EU) — ยอมรับการส่ง data ไป OpenAI/Anthropic/Google ไหม หรือบังคับใช้ Typhoon (ไทย) เท่านั้นสำหรับข้อมูลอ่อนไหว?
13. **[TUNABLE]** 🔧 มาตรฐานที่ต้อง comply เพิ่ม (ISO 27001 / SOC2 / HIPAA-equivalent) ที่กระทบ control ไหม?
14. **[PRE-LAUNCH]** 🔧 นโยบาย **backup & DR** — RPO/RTO ที่ยอมรับได้ (มี daily backup worker อยู่แล้ว) และเก็บ backup กี่วัน, ที่ไหน?

---

## G. HR / Payroll Data

> อ้างอิง: `13-employee-digital-twin.md`, `14-employee-data-collection-form.md`, ตาราง HR (`employee_profiles`, `payroll_*`, `salary_*`, `leave_*`, `work_shifts`). Salary band และ payroll rules เป็น **[ASSUMPTION]**.

1. **[BLOCKER]** 🧑‍💼 **ฟิลด์พนักงานจริงที่ต้องเก็บ** — ยืนยัน schema `employee_profiles` ครบไหม (เลขบัตร ปชช., เลขประกันสังคม, เลขบัญชีธนาคาร, ที่อยู่, ผู้ติดต่อฉุกเฉิน, ใบประกอบวิชาชีพ)? อันไหนบังคับ
2. **[BLOCKER]** 💰 **โครงสร้างเงินเดือน** — เงินเดือน/ค่าจ้างคิดแบบ monthly salary หรือ daily wage หรือผสม? มี salary band ต่อ grade ไหม (ค่าจริง)?
3. **[BLOCKER]** 💰 **องค์ประกอบเงินได้** — เงินเดือนฐาน + ค่าวิชาชีพ + ค่าคอมมิชชั่น + เบี้ยขยัน + ค่าเดินทาง ฯลฯ มีอะไรบ้าง สูตรอย่างไร?
4. **[BLOCKER]** 💰 **รายการหัก** — ประกันสังคม (5% เพดาน ฿750?), ภาษีหัก ณ ที่จ่าย (สูตร?), กองทุนสำรองเลี้ยงชีพ, หักลา/ขาด/สาย — ยืนยันสูตรจริง
5. **[BLOCKER]** 💰 **รอบจ่ายเงินเดือน (payroll_periods)** — จ่ายวันที่เท่าไรของเดือน? รอบเดียวหรือสองรอบ? cut-off วันไหน?
6. **[PRE-LAUNCH]** 💰 **OT rate** — อัตราคูณตามกฎหมายแรงงานไทย (วันทำงาน ×1.5, วันหยุด ×2/×3) — ใช้ตามนี้ไหมหรือมี policy พิเศษ?
7. **[BLOCKER]** 🧑‍💼 **ประเภทการลา (leave_types)** — มีกี่ประเภท (พักร้อน/ป่วย/กิจ/คลอด/อื่น), โควตาต่อปีต่อประเภท (`employee_leave_quota`), สะสมข้ามปีได้ไหม?
8. **[PRE-LAUNCH]** 🧑‍💼 **กะการทำงาน (work_shifts)** — มีกี่กะ, เวลาเข้า-ออก, นโยบายสาย/ขาด, นับ OT จากเมื่อใด?
9. **[BLOCKER]** 🧑‍💼 **เวลาเข้างาน (time_attendance)** — บันทึกอย่างไร (สแกนนิ้ว / GPS / QR / manual)? มี `attendance_locations` (geofence) — รัศมีกี่เมตรต่อสาขา?
10. **[PRE-LAUNCH]** 💰 **ใครเห็น payslip ของใคร** — พนักงานเห็นเฉพาะตัวเอง (RESTRICTED, data-ownership), HR เห็นทุกคน, ผู้จัดการเห็นลูกทีมไหม?
11. **[PRE-LAUNCH]** 🧑‍💼 **salary_history** — เก็บการปรับเงินเดือนย้อนหลัง ใครเห็นได้, ปรับเงินเดือนต้องใครอนุมัติ?
12. **[PRE-LAUNCH]** 🧑‍💼 **probation** — ระยะทดลองงานกี่วัน, สิทธิ์ต่างจากพนักงานประจำไหม?
13. **[PRE-LAUNCH]** ⚖️🧑‍💼 **HR investigation** (RESTRICTED) — เคสสอบสวนวินัย ใครเข้าถึงได้ (เฉพาะ HR head + ?), เก็บ/ลบเมื่อไร?
14. **[PRE-LAUNCH]** 🧑‍💼 **สวัสดิการ** ที่กระทบ payroll/ระบบ (ประกันกลุ่ม, ส่วนลดบริการคลินิกพนักงาน) — มีอะไรบ้าง?
15. **[TUNABLE]** 🧑‍💼 ปฏิทินวันหยุดบริษัท/นักขัตฤกษ์จริงปีนี้ (กระทบ `employee_daily_calendar`)
16. **[PRE-LAUNCH]** 💰 ระบบบัญชี/เงินเดือนเดิมที่ใช้อยู่ (ถ้ามี) ต้อง integrate/ย้ายข้อมูลไหม — รูปแบบ export?

---

## H. Medical / Dental / Patient Data & Consent

> อ้างอิง: `09-data-ownership-matrix.md`, `15-database-schema.md`, ตาราง `patients`, `tamada_cases`, `sdx_cases`. ทั้งหมดเป็น RESTRICTED. รายละเอียดเวชระเบียนจริงและ consent flow ยังเป็น **[ASSUMPTION]**.

1. **[BLOCKER]** 🩺 **ฟิลด์เวชระเบียนจริง** — `patients` ต้องเก็บอะไรบ้าง (ประวัติแพ้ยา, โรคประจำตัว, ภาพก่อน-หลัง, ผล lab, แผนรักษา)? อันไหนบังคับ/อ่อนไหวสูงสุด?
2. **[BLOCKER]** 🩺 **ใครเข้าถึงเวชระเบียนได้** — แพทย์เจ้าของเคสเท่านั้น, หรือแพทย์ทุกคนในสาขา, หรือข้ามสาขาได้? พยาบาล/ผู้ช่วยเห็นแค่ไหน? (break-glass emergency access มีไหม)
3. **[BLOCKER]** 🩺 ความต่างระหว่าง **เวชกรรม (Medical) กับ ทันตกรรม (Dental)** — แยกตาราง/แยกสิทธิ์ไหม? แพทย์เวชกรรมเห็นข้อมูลทันตกรรมไหม?
4. **[BLOCKER]** ⚖️ **Patient consent** — รูปแบบ consent ที่ต้องเก็บ (รักษา, ใช้ภาพ marketing, ส่งข้อมูลให้ AI, ติดต่อ telesales). ขอ consent form จริง — กระทบ `consent_logs` (ยังไม่มี)
5. **[BLOCKER]** ⚖️ ลูกค้า/คนไข้ที่ "ยังไม่ยินยอม" ให้ใช้ข้อมูลกับ AI — ระบบต้อง **บล็อก AI ไม่ให้เห็น** record นั้นใช่ไหม (consent gate)?
6. **[PRE-LAUNCH]** 🩺 **ภาพถ่าย before/after** — เก็บที่ไหน (`user_files`?), เข้ารหัสไหม, ใครดาวน์โหลดได้, watermark ไหม? (กระทบ `file_access_logs` ที่ยังไม่มี)
7. **[PRE-LAUNCH]** 🩺 ลูกค้า/คนไข้ **คนเดียวกันข้ามสาขา** — มี master patient ID ไหม หรือซ้ำต่อสาขา? (กระทบ unique constraint + dedupe)
8. **[PRE-LAUNCH]** 🩺 **แผนการรักษาผูกราคา/ส่วนลด** — เชื่อม `deals`/`transactions` ไหม? ใครเห็นทั้งราคา+เวชระเบียน?
9. **[PRE-LAUNCH]** 🩺 **No-show / นัดหมาย** — บันทึกนัดอย่างไร, telesales/CS เห็นข้อมูลคนไข้แค่ไหนเพื่อโทรติดตาม (PII vs medical แยกสิทธิ์)?
10. **[BLOCKER]** ⚖️ ลูกค้าขอ **ลบข้อมูล (right to erasure)** — แต่กฎหมายเวชระเบียนบังคับเก็บ 10 ปี — นโยบาย reconcile อย่างไร (soft-delete + legal hold)?
11. **[PRE-LAUNCH]** 🩺 **อายุผู้รับบริการ** — มีผู้เยาว์ไหม (ต้อง consent ผู้ปกครอง)? กระทบ consent model
12. **[PRE-LAUNCH]** 🩺 ระบบคลินิก/เวชระเบียนเดิม (ถ้ามี) ต้อง migrate ข้อมูลคนไข้เข้ามาไหม — ปริมาณ + format?
13. **[PRE-LAUNCH]** 🩺 **หัตถการที่ต้องบันทึกพิเศษ** (เช่น ยาควบคุม, สารเสริมความงามที่ต้อง lot tracking) — เชื่อม Warehouse ไหม?
14. **[PRE-LAUNCH]** ⚖️ การใช้ข้อมูลคนไข้เพื่อ **marketing/telesales** (cross-sell) — ได้รับอนุญาตตาม consent ไหม และต้องแยก segment ที่ opt-in เท่านั้น?

---

## I. AI Policy & Decision Rights

> อ้างอิง: `12-ai-access-matrix.md`, `21-ai-architecture.md`. `ai_router` มี decision rights `auto|suggest|human` ต่อ task แต่ override ต่อบริษัทใน `companies.settings.ai_decision_rights` ยังว่าง. "AI evaluation" = RESTRICTED. Redaction layer ยังไม่มี.

1. **[BLOCKER]** 👤 **หลักการ AI** — ยืนยัน "Copilot not Autopilot": AI ตัวไหนทำได้เอง (`auto`), ตัวไหนแค่เสนอ (`suggest`), ตัวไหนต้องคนอนุมัติ (`human`) ต่อ task type (strategy/automation/research/thai_market/general)?
2. **[BLOCKER]** ⚖️ **ส่งข้อมูลอ่อนไหวให้ AI provider ภายนอกได้ไหม** — ปัจจุบันส่ง full org context + raw prompt ไป OpenAI/Anthropic/Google **ไม่ redact**. ยอมรับไหม หรือบังคับ redact PII/medical/salary ก่อนเสมอ?
3. **[BLOCKER]** ⚖️ ข้อมูลอ่อนไหวสูง (medical, salary, investigation) — บังคับใช้ **Typhoon (โฮสต์ไทย)** หรือ on-prem model เท่านั้นไหม? หรือห้าม AI แตะเลย?
4. **[BLOCKER]** 🔧 **AI access scope** — ยืนยันว่า AI ต้องเห็นข้อมูล **เท่ากับสิทธิ์ของผู้ถามเป๊ะ** (ไม่มากกว่า). มี role ใดที่ AI ถูกปิดทั้งหมดไหม (เช่น staff ถาม AI เรื่อง payroll = block)?
5. **[PRE-LAUNCH]** 🧑‍💼 **AI evaluation (RESTRICTED)** — AI ช่วยประเมินผลพนักงานจริงไหม? ถ้าใช่ ใครเห็นผล (เฉพาะ HR/manager เจ้าของ), พนักงานเห็นผลตัวเองไหม, มี human-in-the-loop บังคับไหม?
6. **[PRE-LAUNCH]** 🔧 **Redaction rules** — รายการ field/pattern ที่ต้อง mask ก่อนเข้า prompt (เลขบัตร, เบอร์, ชื่อคนไข้, เงินเดือน) — ขอ list จริงเพื่อตั้ง redaction policy
7. **[PRE-LAUNCH]** 🔧 **Output filtering** — ถ้า AI เผลอจะตอบข้อมูลเกินสิทธิ์ ต้อง block + log ใช่ไหม (มี `ai_query_logs` ที่ต้องสร้าง)?
8. **[PRE-LAUNCH]** 👤 **AI ทำ action อัตโนมัติ** ตัวไหนได้บ้าง (ส่ง LINE หาลูกค้า, สร้าง task, ตอบแชต)? ตัวไหนต้องห้ามเด็ดขาด?
9. **[TUNABLE]** 🔧 **AI cost & quota** — งบ AI ต่อเดือน, เพดาน token ต่อ user/แผนก (ปัจจุบัน metering เป็นของปลอม length/4, ฿0.5 คงที่)? ต้อง meter จริงไหม
10. **[PRE-LAUNCH]** 🔧 **Provider priority** — ยืนยันลำดับ fallback `openai → claude → gemini → typhoon` หรือเปลี่ยน? มี data-residency constraint บังคับลำดับไหม?
11. **[PRE-LAUNCH]** ⚖️ **AI กับข้อมูลคนไข้** — ลูกค้าต้อง consent ก่อน AI ประมวลผลข้อมูลเขาไหม (ผูก H4/H5)?
12. **[TUNABLE]** 👤 AI ต้อง **อ้างอิงแหล่งที่มา (grounded/citation)** เสมอไหม สำหรับคำตอบเชิงข้อมูล (กระทบ grounded flag ใน log)?
13. **[PRE-LAUNCH]** 🔧 ใครเป็นผู้ **กำหนด/แก้ AI policy** ในระบบ (admin/it เท่านั้น?) และการแก้ต้องถูก audit (`permission_change_logs`) ใช่ไหม?

---

## J. Deployment & Secrets

> อ้างอิง: `24-railway-deployment-plan.md`, `25-cloudflare-security-plan.md`, MEMORY (deploy = `railway up` per service). Autoscaling/secret ownership หลายจุดเป็น **[ASSUMPTION]**.

1. **[BLOCKER]** 🔧 **ใครถือ secrets จริง** — ค่าจริงของ `JWT_SECRET`, `ENCRYPTION_KEY` (ห้าม fallback เป็น JWT_SECRET/dev string ตามที่ inventory เตือน), AI keys, `LINE_CHANNEL_*`? เก็บใน Railway env หรือ secrets manager?
2. **[BLOCKER]** 🔧 **Production `DATABASE_URL`** — Postgres ของ Railway เป็น production จริงไหม, ขนาด/แผน, มี read-replica ไหม, `rejectUnauthorized:false` (SSL) ยอมรับไหมหรือต้องแก้?
3. **[BLOCKER]** 🔧 **โดเมนจริง** — `FRONTEND_URL` (CORS allow-list) และ `NEXT_PUBLIC_API_URL` ใช้โดเมนอะไร (custom domain ของ Saduak)? มี cert/Cloudflare หน้าไหม?
4. **[PRE-LAUNCH]** 🔧 **Cloudflare** — ใช้จริงไหม (เอกสาร 25)? ใครถือ account, เปิด WAF/rate-limit/bot management ระดับใด?
5. **[PRE-LAUNCH]** 🔧 **Autoscaling** — เกณฑ์ที่สมมติ (p95 >800ms หรือ CPU >70% 5 นาที, min web=2/api=2) — ยืนยัน/แก้ตาม budget Railway จริง?
6. **[PRE-LAUNCH]** 🔧 **Rate limiter** — ปัจจุบัน in-memory ต่อ instance (พังเมื่อ scale). ยอมรับชั่วคราวไหม หรือต้องย้ายไป Redis/Cloudflare ก่อน launch?
7. **[PRE-LAUNCH]** 🔧 **Environments** — มี staging แยกจาก production ไหม? seed data ต่างกันอย่างไร? ใคร approve deploy ขึ้น prod?
8. **[BLOCKER]** 🔧 **Migration policy** — boot รัน `initSchema()` + `runMigrations()` อัตโนมัติ. ยอมรับ auto-migrate ตอน deploy ไหม หรือต้อง gate manual? (สำคัญเพราะจะเพิ่ม soft-delete/audit/RLS migrations ใหม่จำนวนมาก)
9. **[PRE-LAUNCH]** 🔧 **Backup destination** — daily backup worker เก็บไป object storage ไหน (S3/R2)? credential ใคร? เก็บกี่วัน (ผูก F14)?
10. **[PRE-LAUNCH]** 🔧 **Monitoring/alerting** — ใช้อะไร (Railway metrics, Sentry, อื่น)? แจ้งเตือน on-call ใคร เมื่อ API down/healthcheck fail?
11. **[PRE-LAUNCH]** 🔧 **AI provider keys** — key ของใคร (บัญชีบริษัท), เพดานค่าใช้จ่ายต่อเดือน, key rotation policy?
12. **[PRE-LAUNCH]** 🔧 **LINE OA** — `LINE_CHANNEL_SECRET/ACCESS_TOKEN` ของ Official Account ตัวจริงตัวไหน, ใครเป็น admin, ใช้ webhook prod URL อะไร?
13. **[TUNABLE]** 🔧 **CI/CD** — deploy ผ่าน `railway up` มือ ตาม MEMORY — ต้องการ pipeline (GitHub Action → railway) ไหม หรือคงไว้ manual โดยตั้งใจ?
14. **[PRE-LAUNCH]** 🔧 **Data seeding production** — seed Saduak org (10 แผนก/13 role) รันตอน signup เท่านั้น (ตาม MEMORY). ยืนยันว่า org/branch/employee จริงจะถูก import ด้วยสคริปต์ใด และใคร run บน prod?

---

## ภาคผนวก — สรุปตัวเลข [ASSUMPTION] ที่ต้องยืนยันด่วนที่สุด (Top blockers)

| # | ค่าที่สมมติไว้ | อยู่เอกสาร | ต้องการค่าจริง |
|---|----------------|-----------|----------------|
| 1 | Headcount ต่อแผนก (Medical 18 **vs** 30 ขัดกัน; Ops 28; Finance 10; HR 7; IT 8; WH 9; Franchise 4) | 02 | A2, A3 |
| 2 | ตำแหน่ง C-level (COO/CFO/CMO) มีจริงไหม + reports_to | 02, 04 | B1–B3 |
| 3 | Job grade G1–G8 + salary band | 04, G | B5, G2 |
| 4 | Discount approval > **15%**, Marketing budget co-approve > **฿100,000/เดือน** | 06 | E1, E3 |
| 5 | Retention เวชระเบียน **10 ปี** / payroll **7 ปี** | 15, 17 | F2, F3 |
| 6 | รายชื่อสาขา + branch_code ทั้งหมด (ตอนนี้ placeholder) | 02, 24 | D1, D2 |
| 7 | KPI formula/target ทุกสาย (`conversion=closed/leads` ฯลฯ NULL pending) | 07 | C1–C9 |
| 8 | AI ส่ง data ออกนอกประเทศ + redaction (ตอนนี้ส่ง raw) | 12, 21 | F12, I2, I3, I6 |
| 9 | Patient consent + AI consent gate (consent_logs ยังไม่มี) | 09, 12 | H4, H5, I11 |
| 10 | Secrets/ENCRYPTION_KEY จริง (เลี่ยง fallback อ่อน) + โดเมน prod | 22, 24 | J1, J2, J3 |

> **หมายเหตุ** — จนกว่าจะได้คำตอบข้อ `[BLOCKER]` ทั้งหมด ทีมจะ implement โดยใช้ค่า **[ASSUMPTION]** เป็น default ที่ถอดเปลี่ยนได้ (config-driven ผ่าน `companies.settings` JSON, ตาราง `data_dictionary`, seed scripts) — **ไม่ hardcode** — เพื่อให้แทนที่ด้วยค่าจริงได้โดยไม่ต้องแก้โค้ด/redeploy schema.
