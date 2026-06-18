# NEXUS OS — เอกสารรายละเอียดระบบฉบับสมบูรณ์

**Enterprise Intelligence Transformation Platform · System Detail Document**

เวอร์ชัน: 1.0 · ลูกค้านำร่อง: คลินิก (Beachhead) · หลักการ: **Data First → AI Later**

---

## สารบัญ

1. [ภาพรวมระบบ (Overview)](#1-ภาพรวมระบบ-overview)
2. [ปัญหาที่แก้ และกลุ่มเป้าหมาย](#2-ปัญหาที่แก้-และกลุ่มเป้าหมาย)
3. [สถาปัตยกรรมระบบ (7 ชั้น L0–L6)](#3-สถาปัตยกรรมระบบ-7-ชั้น-l0l6)
4. [Layer 0 — Data Taxonomy & Universal Data Model](#4-layer-0--data-taxonomy--universal-data-model)
5. [Layer 1 — Organization Digital Twin](#5-layer-1--organization-digital-twin)
6. [Layer 2 — AI Agent Workforce](#6-layer-2--ai-agent-workforce)
7. [Layer 3 — Organizational Memory](#7-layer-3--organizational-memory)
8. [Layer 4 — Skill Wallet](#8-layer-4--skill-wallet)
9. [Layer 5 — Workflow & Work Log System](#9-layer-5--workflow--work-log-system)
10. [Layer 6 — Health Score & Feasibility Simulation](#10-layer-6--health-score--feasibility-simulation)
11. [AI Connector Layer (RAG · Routing · Decision Rights)](#11-ai-connector-layer)
12. [ผู้ใช้และสิทธิ์การเข้าถึง](#12-ผู้ใช้และสิทธิ์การเข้าถึง)
13. [ความปลอดภัยและการจัดการความเสี่ยง](#13-ความปลอดภัยและการจัดการความเสี่ยง)
14. [สถาปัตยกรรม Multi-Tenant (Copy วางได้)](#14-สถาปัตยกรรม-multi-tenant)
15. [โมเดลธุรกิจและการคิดราคา](#15-โมเดลธุรกิจและการคิดราคา)
16. [แผนพัฒนา (Dev Plan & Tech Stack)](#16-แผนพัฒนา-dev-plan--tech-stack)
17. [ความเสี่ยงและข้อควรระวัง](#17-ความเสี่ยงและข้อควรระวัง)
18. [Roadmap 12 เดือน](#18-roadmap-12-เดือน)
19. [อภิธานศัพท์ (Glossary)](#19-อภิธานศัพท์-glossary)

---

## 1. ภาพรวมระบบ (Overview)

NEXUS OS คือ **ระบบปฏิบัติการสำหรับองค์กรยุค AI** ที่เปลี่ยนองค์กรซึ่งมีข้อมูลกระจัดกระจาย ให้กลายเป็นองค์กรที่ AI เข้าใจและทำงานร่วมกับคนได้

แก่นของระบบ **ไม่ใช่ตัว AI** (ใครก็ต่อ AI ได้) แต่คือ **วิธีจัดหมวดข้อมูลให้เป็นมาตรฐาน** เพื่อให้ AI รู้ว่าต้องดึงข้อมูลจากไหนมาวิเคราะห์ — เหมือนที่บริษัทที่ปรึกษาแฟรนไชส์วางระบบคู่มือและหมวดข้อมูลให้องค์กร นี่คือทรัพย์สินทางปัญญา (IP) และคูเมือง (moat) ที่แท้จริง

**ลำดับที่ถูกต้อง:** จัดฐานข้อมูลเป็นหมวด → วาง KPI/Skill/Knowledge ให้เป็นมาตรฐาน → ค่อยเชื่อม AI  
องค์กรส่วนใหญ่พลาดเพราะ "ซื้อ AI ก่อน แล้วค่อยหาข้อมูล" ทำให้ AI ตอบกว้างและไม่แม่น

---

## 2. ปัญหาที่แก้ และกลุ่มเป้าหมาย

### 2.1 ปัญหา 4 ระดับ

| ระดับ | ปัญหา | อาการ |
|-------|-------|-------|
| 1 | Data Chaos | ข้อมูลกระจายใน Excel, Drive, LINE, ERP, POS, CRM — ไม่รู้ข้อมูลจริงอยู่ไหน |
| 2 | Process Chaos | งานอยู่ในหัวคน หัวหน้ารู้ ลูกน้องไม่รู้ พนักงานลาออก = งานหาย |
| 3 | Management Chaos | ผู้บริหารมองไม่เห็น KPI จริง, Productivity จริง, ปัญหาจริง |
| 4 | AI Chaos | ซื้อ AI มาแล้วใช้ไม่เป็น ตอบกว้างเพราะไม่รู้ข้อมูลองค์กร |

### 2.2 กลุ่มเป้าหมาย 2 ประเภท

**Type 1 — องค์กรข้อมูลกระจัดกระจาย (คลินิก/SME):** ใช้เป็น Beachhead เพราะเจ้าของตัดสินใจซื้อเอง รอบสั้น และ "วิธีจัดหมวดข้อมูล" ของเราเป็นพระเอกเต็มตัว

**Type 2 — องค์กรที่มีฐานข้อมูลรวมแล้ว (ประกัน/คอมมิชชัน):** ข้อมูลสะอาด ใช้ระบบเราเป็น "ชั้นวิเคราะห์เพิ่มเติม" — เป็นขั้นทำเงินหลังพิสูจน์ methodology แล้ว

---

## 3. สถาปัตยกรรมระบบ (7 ชั้น)

| ชั้น | ชื่อ | หน้าที่ | สถานะ | ความสำคัญ |
|------|------|---------|-------|-----------|
| L0 | Data Taxonomy & Universal Model | จัดหมวดข้อมูลเป็นมาตรฐาน 6 Layer | หัวใจ — ทำก่อน | ★★★★★ |
| L1 | Organization Digital Twin | จำลองโครงสร้าง คน สกิล capacity | รากฐาน | ★★★★ |
| L2 | AI Agent Workforce | ทีม AI เฉพาะทางต่อแผนก | ตัวขับเคลื่อน | ★★★★ |
| L3 | Organizational Memory | สมององค์กร เก็บความรู้ไม่ให้หาย | มูลค่าสูง | ★★★★ |
| L4 | Skill Wallet | กระเป๋าทักษะรายคน | จุดชนะคู่แข่ง | ★★★ |
| L5 | Workflow & Work Log | login ส่งงาน หลักฐาน escalation | การใช้งานจริง | ★★★★★ |
| L6 | Health Score & Simulation | สุขภาพองค์กร + จำลองอนาคต | เป้าหมายสุดท้าย | ★★★★ |

ทุกชั้นเชื่อมผ่าน **AI Connector Layer** ที่ทำหน้าที่ grounding (ดึงข้อมูลจริง) + routing (เลือกโมเดล) + บังคับ Decision Rights

---

## 4. Layer 0 — Data Taxonomy & Universal Data Model

### 4.1 Universal Data Model — 6 Layer (ใช้โครงเดียวทุกอุตสาหกรรม)

| Layer | เก็บอะไร | ตัวอย่างคลินิก |
|-------|----------|----------------|
| People | พนักงาน, Job Desc, Skill | หมอ, พยาบาล, เคาน์เตอร์ |
| Customer | ลูกค้า, Retention, พฤติกรรม | คนไข้, คอร์สที่ใช้ |
| Financial | รายรับ-รายจ่าย, ต้นทุน | Doctor Revenue, ต้นทุนวัสดุ |
| Operation | งาน, Workflow, หน้างาน | คิว, นัด, หัตถการ |
| Knowledge | SOP, คู่มือ, Policy | ขั้นตอนหัตถการ, นโยบาย |
| Performance | KPI, ผลงาน, คุณภาพ | No-show, Complaint Rate |

คลินิก/ร้านอาหาร/โรงงาน/ประกัน/อสังหาฯ ต่างกันแค่ "ข้อมูลที่ใส่" แต่โครงสร้างเดียวกัน

### 4.2 Data Dictionary — นิยามทุกตัวเลข

ทุกตัวชี้วัดต้องมี: **นิยาม · สูตรคำนวณ · แหล่งข้อมูล · เจ้าของ · Security Tier · ความถี่อัปเดต**

ตัวอย่าง:

- **Doctor Revenue** = ยอดหัตถการในชื่อหมอ − ต้นทุนวัสดุ (แหล่ง: HIS+บัญชี · Tier T2)
- **Customer Retention** = ลูกค้าซ้ำใน 90 วัน ÷ ลูกค้าทั้งหมด × 100
- **Complaint Rate** = จำนวนคอมเพลน ÷ เคสทั้งหมด × 100

ถ้านิยามไม่ชัด AI จะวิเคราะห์ผิด — นี่คือเหตุผลที่ L0 ต้องทำก่อนเสมอ

---

## 5. Layer 1 — Organization Digital Twin

องค์กรจำลองแบบ real-time ประกอบด้วย:

- **โครงสร้างแผนก** — แตกย่อยทุกแผนก (Marketing, Sales, HR, Finance, Operation)
- **Skill Graph รายคน** — Hard Skill, Soft Skill, Leadership, Product Knowledge
- **Capacity Graph** — ชั่วโมงทำงาน/วัน และงานค้าง เพื่อให้ AI ไม่โยนงานเกินกำลัง (ป้องกัน Burnout)
- **เคสพิเศษ:** หมอใหม่วัดจากวันที่ 1–30 — อัตราเพิ่มลูกค้าเก่า, คอร์สที่เชี่ยวชาญ, เคสที่มีปัญหา (ไม่ใช่แค่ยอดขาย)

---

## 6. Layer 2 — AI Agent Workforce

ไม่ใช่ AI ตัวเดียว แต่เป็นทีม AI เฉพาะทางต่อแผนก เช่น Ops Agent, Finance Agent, Marketing Agent, CEO Agent

**ความสามารถสำคัญ:**

- จัด Daily Task ตาม Skill Matrix + ตรวจ Workload ให้สมดุล
- ทำหน้าที่ **หัวหน้าแผนกชั่วคราว** เมื่อแผนกขาดหัวหน้า
- เตือนความเสี่ยง Burnout / Turnover / ต้นทุนผิดปกติ

แต่ละ Agent เลือกโมเดลตามงาน (ดูข้อ 11)

---

## 7. Layer 3 — Organizational Memory

สมองขององค์กรที่เก็บ Chat, Meeting, SOP, Ticket, Task, KPI ทั้งหมด → พนักงานลาออกแต่ความรู้ไม่หาย และพนักงานใหม่ออนบอร์ดได้เร็วเพราะ AI รู้ประวัติทุกอย่าง

ตัวอย่างการใช้: *"ปีที่แล้วทำไมยอดสาขานี้ตก?"* → AI ดึงเหตุผลจริงจากบันทึก ไม่ใช่เดา

---

## 8. Layer 4 — Skill Wallet

LinkedIn ภายในองค์กร — ทุกคนมีกระเป๋าสกิล โดย Skill Score คำนวณจากงานจริง + KPI + หลักฐานที่ส่ง (ไม่ใช่ให้คนกรอกเอง = เชื่อถือได้) AI แนะนำคอร์ส/Mentor/งานใหม่ให้อัตโนมัติ

---

## 9. Layer 5 — Workflow & Work Log System

### 9.1 Flow การทำงาน

พนักงาน Login (ผ่าน Browser หรือ LINE) → รับงานที่ AI จัดให้ตาม Skill/Capacity → เริ่มงาน → ส่งงานพร้อมหลักฐาน (รูป/QR/เอกสาร) → หัวหน้า Approve/Reject → ถ้าเกิน SLA จะ Auto-Escalation 4 ระดับ ทุกขั้นถูกบันทึก Timestamp

### 9.2 Work Log Schema (มาตรฐานเดียวทุกองค์กร)

| Field | Type | Required | คำอธิบาย |
|-------|------|----------|----------|
| log_id | string | ✔ | รหัส Log ไม่ซ้ำ |
| timestamp | datetime | ✔ | วันเวลาที่เกิดเหตุการณ์ |
| org_id | string | ✔ | รหัสองค์กร (รองรับหลายองค์กร) |
| user_id | string | ✔ | รหัสพนักงาน |
| role / dept | string | ✔ | บทบาท / แผนก |
| action_type | enum | ✔ | รับงาน/เริ่ม/ส่ง/อนุมัติ/ปัญหา |
| object | string | | สิ่งที่ทำ |
| task_id | string | | รหัสงานที่ผูก |
| status | enum | ✔ | ผ่าน/ตีกลับ/ขอแก้ไข/รอตรวจ |
| evidence_url | string | | ลิงก์หลักฐาน |
| kpi_impact | number | | ผลต่อ KPI |
| reviewed_by | string | | หัวหน้าที่อนุมัติ |
| security_tier | enum | ✔ | ชั้นความลับของ Log |

> **Implementation note:** ใน codebase ปัจจุบัน `org_id` map เป็น `company_id` ในตาราง `work_logs`

---

## 10. Layer 6 — Health Score & Feasibility Simulation

- **Organization Health Score** — คะแนนสุขภาพองค์กร real-time จาก 4 มิติ (People, Operation, Finance, Customer)
- **Daily Readiness** — ความพร้อมก่อนเปิดบริการ
- **Feasibility Simulation** — ตอบคำถาม "ถ้าเปิดสาขาใหม่คุ้มไหม?" ออกมาเป็น % โอกาสสำเร็จ + ช่วงความเชื่อมั่น + สมมติฐาน

> **หมายเหตุสำคัญ:** ช่วงแรกที่ข้อมูลยังน้อย ตัวเลข % คือ "การจำลองสถานการณ์พร้อมสมมติฐาน" ไม่ใช่ความน่าจะเป็นทางสถิติที่แม่นยำเป๊ะ ยิ่งมีข้อมูลมากยิ่งแม่นขึ้น

---

## 11. AI Connector Layer

### 11.1 Grounding (RAG) — Anti-Sycophancy

ทุกคำตอบของ AI ดึงจากฐานข้อมูลองค์กรจริงและอ้างอิงแหล่งได้ ไม่ใช่ตอบกว้างหรือตอบเอาใจ

### 11.2 Model Routing — เลือกโมเดลตามงาน

| โมเดล | ใช้กับ |
|-------|--------|
| Claude | วิเคราะห์เชิงลึก, กลยุทธ์, refactor |
| GPT | งานระบบ, automation, function calling |
| Gemini | ค้นคว้า, context ยาว |
| Typhoon (TH) | สถิติ/ตลาดไทยโดยเฉพาะ |

ทำเป็น layer บางๆ ที่ไม่ผูกกับเจ้าใดเจ้าหนึ่ง → คุมต้นทุนและต่อรองได้ ค่า token องค์กรเป็นผู้จ่าย (pass-through)

### 11.3 Decision Rights — Copilot ไม่ใช่ Autopilot

| ระดับ | ตัวอย่าง | AI ทำเอง |
|-------|---------|----------|
| ตอบคำถาม | จาก SOP/ข้อมูลในระบบ | ✅ |
| แนะนำ + คนยืนยัน | จัด Daily Task, เตือนความเสี่ยง | ต้องให้คน Approve |
| อนุมัติงาน | จ่ายเงิน, เปลี่ยนกะ | AI เสนอ % + คนตัดสิน |
| ตัดสินใจเชิงกลยุทธ์ | เปิดสาขา/จ้างคน | คนตัดสิน |

---

## 12. ผู้ใช้และสิทธิ์การเข้าถึง

| บทบาท | เห็นอะไร |
|--------|----------|
| พนักงาน | งานวันนี้, KPI ตัวเอง, SOP, AI Assistant, ส่งงานพร้อมหลักฐาน |
| หัวหน้า | งานทีม, Approve/Reject, วิเคราะห์พนักงานรายคน + วิธีพัฒนา |
| ผู้บริหาร | Health Score, KPI รายคน/สาขา, ต้นทุนที่ประหยัด, Feasibility |

ทุกบทบาทดึงจาก **ฐานข้อมูลเดียวกัน** แต่หน้าตาและสิทธิ์ต่างตาม Role

---

## 13. ความปลอดภัยและการจัดการความเสี่ยง

### 13.1 ชั้นความลับ (Security Tier)

| Tier | ชื่อ | ตัวอย่าง | การควบคุม |
|------|------|----------|-----------|
| T0 | Public | โปรโมชั่น, ชั่วโมงเปิด | ไม่ต้องควบคุมพิเศษ |
| T1 | Internal | SOP, KPI ทีม | Login + Log การเข้าถึง |
| T2 | Confidential | ยอด/ต้นทุนรายคน, กลยุทธ์ | เข้ารหัส + จำกัด Role + Audit |
| T3 | Restricted (PDPA) | คนไข้, เงินเดือน, เลขบัตร | เข้ารหัสบังคับ + Masking + Audit เต็ม + ขอความยินยอม |

### 13.2 หลักการ Risk Management

- ให้สิทธิ์น้อยที่สุดเท่าที่จำเป็น (Least Privilege)
- การเข้าถึง T2/T3 ต้องมี Log เพื่อ Audit ย้อนหลัง
- ข้อมูลคนไข้/สุขภาพ = ข้อมูลอ่อนไหวตาม PDPA
- AI เข้าถึงข้อมูลตามชั้นเดียวกับ Role ที่ถาม — ไม่เห็นทุกอย่างเสมอไป
- มี Backup + แผนกู้คืน (DR) ก่อนขึ้นระบบจริง

> ควรปรึกษาที่ปรึกษากฎหมาย/PDPA จริงก่อนเปิดระบบที่เก็บข้อมูลคนไข้

---

## 14. สถาปัตยกรรม Multi-Tenant (Copy วางได้)

ระบบออกแบบให้ **Core เดียว + Industry Module** — เปลี่ยนแค่ Module ตามอุตสาหกรรม โครงสร้างฐานข้อมูล (6 Layer) และ Log Schema เหมือนกันทุกองค์กร แยกข้อมูลด้วย `org_id`

**ขั้นตอนเปิดองค์กรใหม่:**

1. เลือก Industry Module
2. กรอก Data Dictionary ตามเทมเพลต
3. จัดชั้น Security
4. นำเข้าข้อมูล (Excel/LINE/ERP)
5. ตั้งสิทธิ์ → พนักงาน Login ใช้งาน

---

## 15. โมเดลธุรกิจและการคิดราคา

| # | ธุรกิจ | คำอธิบาย | ราคา |
|---|--------|----------|------|
| 1 | AI Transformation Consulting | Audit + Mapping + ส่งมอบ Manual/Architecture/Roadmap | ฿500K–5M / โปรเจกต์ |
| 2 | Data Architecture Framework | Universal Data Model + Dictionary (IP ขายซ้ำได้) | License / Subscription |
| 3 | Enterprise Intelligence Platform (SaaS) | พนักงาน Login เห็นงาน/KPI/SOP/AI | รายเดือน/seat + module |
| 4 | AI Workforce Marketplace | เลือกใช้ AI เฉพาะทางเหมือน App Store (อนาคต) | Rev-share / ต่อ agent |

รายได้ช่วงแรกมาจากธุรกิจ 1 (Consulting) · ธุรกิจ 2 คือ IP · ธุรกิจ 3 คือ recurring · ธุรกิจ 4 คืออนาคต

---

## 16. แผนพัฒนา (Dev Plan & Tech Stack)

### 16.1 ลำดับพัฒนา (Data First)

| งาน | Phase | Owner | Start | Dur | End |
|-----|-------|-------|-------|-----|-----|
| Data Schema + Universal Model | P1-2 | Backend | wk1 | 3wk | wk3 |
| สิทธิ์ + ชั้น Security (RBAC) | P2 | Backend | wk3 | 2wk | wk4 |
| ระบบเก็บ Log มาตรฐาน | P2-3 | Backend | wk4 | 3wk | wk6 |
| Audit Trail | P3 | Backend | wk6 | 2wk | wk7 |
| Browser Workspace | P4 | Frontend | wk7 | 3wk | wk9 |
| Executive Dashboard | P4 | Frontend | wk9 | 2wk | wk10 |
| ส่งงาน + Evidence + Timestamp | P4 | Fullstack | wk9 | 3wk | wk11 |
| Data Ingestion (Excel/LINE/ERP) | P5 | Backend | wk11 | 3wk | wk13 |
| AI Connector + Model Router | P6 | AI | wk13 | 3wk | wk15 |
| RAG Grounding | P6 | AI | wk13 | 3wk | wk15 |
| Digital Twin / Feasibility | P6 | AI | wk15 | 2wk | wk16 |
| QA + Security Audit + Go-live | P6 | ทั้งทีม | wk17 | 2wk | wk18 |

รวม ≈ **18 สัปดาห์ (4–5 เดือน)**

### 16.2 Tech Stack ที่แนะนำ

- **Frontend:** React (Browser Workspace + Dashboard) — ปัจจุบัน: Next.js ใน `nexasos/`
- **Backend:** Node/Express + PostgreSQL (multi-tenant ด้วย `org_id` / `company_id`)
- **Auth/RBAC:** สิทธิ์ตาม Role + Security Tier
- **AI Layer:** Orchestrator + Model Router (GPT/Claude/Gemini/Typhoon) + RAG (Vector DB)
- **Integration:** LINE OA (Thai-first), Excel/CSV import, ERP/POS connector
- **Log/Audit:** ตาราง `work_logs` + `audit_log` แยก, เข้ารหัส T2/T3

---

## 17. ความเสี่ยงและข้อควรระวัง

| ความเสี่ยง | การรับมือ |
|-----------|-----------|
| Scope ใหญ่เกินไป สร้างไม่เสร็จ | เริ่ม wedge เดียว (คลินิก + ส่งงาน→KPI) พิสูจน์ ROI ก่อน |
| Cold-start: SME ไม่มีข้อมูลสะอาด | Wizard + AI ร่าง Skill/SOP ให้ก่อน แล้วคนแก้ |
| คู่แข่ง enterprise (Copilot/Agentforce) | ชนะด้วย Thai/LINE-first + ราคาเอื้อม + taxonomy IP |
| ต้นทุน API บานปลาย | Cost-aware routing + pass-through ให้ลูกค้า |
| ความเชื่อถือเรื่อง % Feasibility | แสดงสมมติฐาน + ช่วงความเชื่อมั่น อย่าโชว์ตัวเลขเป๊ะ |
| ข้อมูลคนไข้ (PDPA) | จัด T3 + เข้ารหัส + ปรึกษากฎหมาย |

---

## 18. Roadmap 12 เดือน

| ช่วง | สร้างอะไร |
|------|-----------|
| เดือน 1–2 | Blueprint + Data Taxonomy (ยังไม่โค้ด) |
| เดือน 3–4 | Data Dictionary + KPI/Skill Framework |
| เดือน 5–6 | Knowledge Framework (SOP/Policy/Training) |
| เดือน 7–9 | Browser Workspace + Dashboard |
| เดือน 10–12 | AI Connector Layer + Digital Twin |

**ผลลัพธ์:** ไม่ใช่แค่ SaaS แต่เป็น **Operating System สำหรับองค์กรยุค AI**

---

## 19. อภิธานศัพท์ (Glossary)

| คำศัพท์ | ความหมาย |
|---------|----------|
| Universal Data Model | โครงสร้างข้อมูล 6 Layer ที่ใช้ได้ทุกอุตสาหกรรม |
| Data Dictionary | เอกสารนิยามทุกตัวชี้วัด (นิยาม/สูตร/แหล่ง/เจ้าของ) |
| Digital Twin | องค์กรจำลองแบบ real-time |
| Skill Wallet | กระเป๋าทักษะรายคนที่คำนวณจากงานจริง |
| Grounding / RAG | การให้ AI ตอบจากข้อมูลจริงขององค์กร |
| Model Routing | การเลือกโมเดล AI ตามประเภทงาน |
| Decision Rights | ขอบเขตที่ AI ตัดสินใจเอง / แนะนำ / ต้องให้คนอนุมัติ |
| Security Tier (T0–T3) | ชั้นความลับของข้อมูล |
| Multi-Tenant | ระบบเดียวรองรับหลายองค์กรแยกด้วย org_id |

---

**Related:** [ARCHITECTURE-MAP.md](./ARCHITECTURE-MAP.md) — สถานะ implementation ปัจจุบัน vs เป้าหมาย
