# NEXUS OS Database

Schema ถูกสร้างอัตโนมัติเมื่อ backend start — ไฟล์ SQL ในโฟลเดอร์นี้เป็น reference สำหรับอ่าน/audit

## โครงสร้างแยกฝั่ง (Entity Sides)

ภายใต้ `company_id` เดียว แยกข้อมูลตาม 3 ฝั่งธุรกิจ:

| ฝั่ง | `entity_key` | ตารางหลัก | สาขา (branches) |
|------|--------------|-----------|-----------------|
| Tamada Clinic (Aesthetic) | `tamada` | `tamada_cases` | SUT, PUN, SYA |
| SDX Dental | `sdx` | `sdx_cases` | SDX-HQ |
| Franchise Network | `franchise` | `franchise_audits` | RNG, RTB |

### Registry

| Table | คำอธิบาย |
|-------|----------|
| `entities` | ลงทะเบียน 3 ฝั่งธุรกิจต่อ company |
| `branches` | สาขาทุกฝั่ง — มี `entity` + `branch_type` |

### ตารางร่วม (มี `entity` + `branch_code`)

`users`, `transactions`, `deals`, `patients`, `work_logs`, `campaigns`, `kpi_entries`, `knowledge_items`, `data_dictionary`

### ตารางเฉพาะฝั่ง

| Table | ฝั่ง | ข้อมูล |
|-------|------|--------|
| `tamada_cases` | Tamada | เคส aesthetic / TCS import |
| `sdx_cases` | SDX | เคสทันตกรรม / SDX MCS import |
| `franchise_audits` | Franchise | checklist audit, mystery score |

## Production (Railway)

1. Add **PostgreSQL** plugin ใน Railway project
2. Link `DATABASE_URL` ไปที่ **backend** service
3. Deploy — tables สร้างอัตโนมัติ (ไม่มี demo user)

**First use:** สมัครที่ `/login` → `POST /api/tamada/seed` เพื่อ seed entities + branches + dictionary

## Local Development

### Option A — PostgreSQL (แนะนำ)

```bash
./scripts/db-setup.sh docker
# ใส่ DATABASE_URL ใน backend/.env แล้ว npm run dev:backend
```

### Option B — SQLite (ไม่ต้อง Docker)

```bash
./scripts/db-setup.sh sqlite
# ไม่ใส่ DATABASE_URL → ใช้ backend/data/nexasos.db
```

### Docker Compose (full stack)

```bash
docker compose up
# API: localhost:4000 · Web: localhost:3000
# PG: postgres://nexus:nexus@localhost:5432/nexasos
```

## Schema Source (runtime)

| ไฟล์ | เนื้อหา |
|------|---------|
| `backend/src/lib/db.ts` | Core tables (companies, users, finance, CRM…) |
| `backend/src/lib/nexus-schema.ts` | L0/L5: dictionary, work_logs, audit |
| `backend/src/lib/nexus-extended-schema.ts` | L1/L4: departments, skills, LINE |
| `backend/src/lib/nexus-full-schema.ts` | L2/L3: knowledge, KPI, patients |
| `backend/src/lib/nexus-ai-schema.ts` | AI memory, notifications, files |
| `backend/src/lib/nexus-ops-schema.ts` | Migrations, job queue, backups |
| `backend/src/lib/nexus-entity-schema.ts` | **Entity sides** + scoping columns |

Migrations: `backend/src/lib/migrations.ts` (versioned ALTER TABLE)

## Data Import (CSV)

| target | ฝั่ง | ตารางปลายทาง |
|--------|------|--------------|
| `tamada_cases` / `tcs` | Tamada | `tamada_cases` |
| `sdx_cases` / `sdx_mcs` | SDX | `sdx_cases` |
| `franchise_audits` | Franchise | `franchise_audits` |
| `tamada_taxonomy` | ทุกฝั่ง | `entities`, `branches`, `data_dictionary` |

## Legacy SQL Files

`schema.sql`, `rls.sql`, `seed.sql` — ออกแบบสำหรับ Supabase เก่า **ไม่ถูกใช้** ที่ runtime
