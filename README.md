# NEXUS OS

**Enterprise Intelligence Transformation Platform** · Data First → AI Later

## Quick Start

```bash
npm run install:all
cp backend/.env.example backend/.env
cp nexasos/.env.example nexasos/.env.local
# Add GEMINI_API_KEY (minimum) to backend/.env
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/health |

## Implementation Workbook

Canonical template: `docs/NEXUS-OS-Implementation-Workbook.xlsx` (6 tabs)

| Tab | ในระบบ |
|-----|--------|
| 1 Data Taxonomy | Dictionary 10 ตัว (คลินิก) · `/dashboard/my-data` · Settings |
| 2 Log Checklist | `/dashboard/audit` · Security checklist |
| 3 Org Onboarding | `/dashboard/onboarding` · 6 Phase / 15 tasks |
| 4 Dev Timeline | `docs/ARCHITECTURE-MAP.md` |
| 5 Work Log | `/dashboard/worklog` · ฟิลด์มาตรฐาน + kpi_impact |
| 6 Security Reference | `/dashboard/audit` · T0–T3 |

Seed source: `backend/src/lib/workbook-template.ts`

## Getting Started (ไม่มี Demo User)

1. เปิด http://localhost:3000/login → แท็บ **สมัครสมาชิก**
2. สร้างองค์กรใหม่ → ได้บัญชี **Admin (Management)** + แผนกมาตรฐาน 7 แผนก
3. Admin/HR → **People** → เพิ่มพนักงานจริง (อีเมล + รหัสผ่าน + แผนก)
4. แต่ละแผนกได้สิทธิ์ระบบอัตโนมัติ (Finance → การเงิน, Sales → ขาย, ฯลฯ)

| แผนก | สิทธิ์ระบบ | โมดูลหลัก |
|------|-----------|-----------|
| Management | admin | ทั้งระบบ |
| Finance | finance | `/dashboard/finance` |
| HR | hr | `/dashboard/people` |
| Sales | sales | `/dashboard/sales` |
| Marketing | marketing | Marketing |
| IT | it | IT |
| Operation | staff | `/dashboard/staff` |

> ถ้าเคยรัน demo เก่า: ลบ `backend/data/nexasos.db` แล้ว restart API

## 7-Layer Architecture (Complete)

| Layer | Feature | Route |
|-------|---------|-------|
| L0 | Data Dictionary | Settings → L0 Dictionary |
| L1 | Digital Twin | `/api/twin` |
| L2 | AI Agent Workforce | Dashboard modules + `/api/ai-router` |
| L3 | Org Memory | Company GPT, Meeting, Doc Guardian |
| L4 | Skill Wallet | `/dashboard/skills` |
| L5 | Work Log + SLA | `/dashboard/worklog` |
| L6 | Health + Feasibility | Dashboard badge + `/dashboard/feasibility` |

## API Keys Required

| Key | Required | Purpose |
|-----|----------|---------|
| `GEMINI_API_KEY` | **Recommended** | AI features (fallback for all models) |
| `ANTHROPIC_API_KEY` | Optional | Claude strategy routing |
| `OPENAI_API_KEY` | Optional | GPT automation routing |
| `TYPHOON_API_KEY` | Optional | Thai market routing |
| `LINE_CHANNEL_*` | Optional | LINE OA work log + push notify |
| `RESEND_API_KEY` / `SMTP_*` | Optional | Email notifications |
| `DATABASE_URL` | Production | Railway PostgreSQL |
| `JWT_SECRET` | Production | Auth |
| `ENCRYPTION_KEY` | Production | T2/T3 field encryption |

## Docker Compose (local production-like)

```bash
cp backend/.env.example backend/.env   # add API keys
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/health |
| PostgreSQL | localhost:5432 (user/pass/db: nexus) |

## Deploy (Railway)

1. PostgreSQL plugin → `DATABASE_URL`
2. Backend service (`backend/`) — set env vars above
3. Frontend service (`nexasos/`) — `NEXT_PUBLIC_API_URL=https://your-api.railway.app`

## Stability & Ops

| Feature | Endpoint / Path |
|---------|-----------------|
| Deep health | `GET /health/deep` |
| Manual backup | `POST /api/ops/backup` (admin/it) |
| Job queue status | `GET /api/ops/queue` |
| Migrations | `GET /api/ops/migrations` |
| Slow requests | `GET /api/ops/metrics` |
| Backups (local) | `backend/data/backups/` |
| File storage | `backend/data/storage/` |
| Idempotency | Header `Idempotency-Key` on `POST /api/work-logs` |
| Rate limits | Auth/chat/signup routes |

Background workers (local + Railway): job queue (email/LINE delivery), daily backup, SLA escalation.

```bash
cd backend && npm test
```

## AI Architecture (3 ชั้น)

| ชั้น | Route | Model | สิทธิ์ |
|-----|-------|-------|--------|
| Personal AI | `/dashboard/my-ai` | Gemini 2.0 Flash | ทุกคน |
| Department AI | `/dashboard/dept-ai` | Typhoon v2 (fallback Gemini) | แผนก |
| CEO AI | `/dashboard/gpt` | Claude Sonnet 4 (fallback Gemini) | Admin |

งานเสร็จ → แจ้งหัวหน้า · วันที่ 1 ของเดือน → Skill Match รายเดือน (email/LINE ถ้าตั้งค่า)

## Docs

- [SYSTEM-SPEC.md](docs/SYSTEM-SPEC.md) — Full specification
- [ARCHITECTURE-MAP.md](docs/ARCHITECTURE-MAP.md) — Implementation map
