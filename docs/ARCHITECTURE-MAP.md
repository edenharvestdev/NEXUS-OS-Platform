# NEXUS OS — Architecture Map (100% Spec + Self-Service)

> **Principle:** Data First → AI Later · ทุกพนักงานกรอก/ตั้งค่าระบบเองได้ผ่าน **My Data** + **Setup Wizard**

## Layer Status

| Layer | Module | Status | Self-service entry |
|-------|--------|--------|-------------------|
| **L0** | Data Dictionary + KPI entries | ✅ | `/dashboard/my-data` → Dictionary & KPI tabs |
| **L0** | Customer T3 (Patients PDPA) | ✅ | My Data → Customer T3 (consent + AES encrypt) |
| **L1** | Digital Twin (dept, capacity, skill graph) | ✅ | My Data → People · `/api/twin` |
| **L2** | AI Daily Tasks + Burnout | ✅ | My Data → Daily Tasks · `/api/self-service/daily-tasks` |
| **L3** | Unified Memory Search | ✅ | `/dashboard/memory` · `/api/memory/search` |
| **L4** | Skill Wallet + self evidence | ✅ | My Data → Skills · Work Log approve flow |
| **L5** | Work Log + SLA escalation | ✅ | `/dashboard/worklog` · LINE webhook |
| **L6** | Health Score + Readiness + CEO Agent | ✅ | `/dashboard/readiness` · `/api/ceo/brief` |
| **P5** | CSV/LINE ingest | ✅ | `/dashboard/ingest` |
| **§14** | Industry onboarding wizard | ✅ | `/dashboard/onboarding` (6 industries) |

## Self-Service Matrix (ทุก role ยกเว้น admin-only exec views)

| Role | My Data | Wizard | Memory | Work Log | Readiness/CEO |
|------|---------|--------|--------|----------|---------------|
| staff | ✅ | ✅ | ✅ | ✅ | — |
| hr/finance/sales/marketing/it | ✅ | ✅ | ✅ | ✅ | — |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |

## API Routes (new)

- `GET/PATCH /api/self-service/*` — hub, profile, KPI, knowledge, patient, skills, daily tasks
- `GET/POST /api/onboarding/*` — industry template wizard
- `GET /api/memory/search` · `POST /api/memory/explain`
- `GET /api/health/readiness` · `GET /api/ceo/brief`

## Remaining (needs external keys / infra only)

- Vector DB (Pinecone/pgvector) — SQL memory search implemented as beachhead
- LINE Login OAuth — webhook LOG: works; full OAuth needs LINE keys
- ERP/POS connectors — CSV ingest ready
- Production PostgreSQL + `ENCRYPTION_KEY` + API keys in `.env`

## Run

```bash
npm run dev
# สมัครองค์กรใหม่ที่ /login → เพิ่มพนักงานแยกแผนกที่ People
```
