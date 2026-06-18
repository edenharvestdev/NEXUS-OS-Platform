# 🗄️ NEXUS OS Database — Railway PostgreSQL

## Production (Railway)

Schema is **auto-created** on API startup via `backend/src/lib/db.ts`.

1. Add **PostgreSQL** plugin in Railway project
2. Link `DATABASE_URL` to the **backend** service
3. Deploy backend — tables created automatically (no demo users)

**First use:** Sign up at `/login` → add real employees per department in People

## Tables

| Table | Description |
|-------|-------------|
| `companies` | Company profile + settings JSON |
| `users` | Employees (bcrypt passwords) |
| `transactions` | Finance income/expense |
| `deals` | CRM pipeline |
| `meetings` | Meeting summaries |
| `action_items` | Meeting follow-ups |
| `chat_messages` | Company GPT history |
| `documents` | Document risk analysis |
| `campaigns` | Marketing campaigns |
| `ai_logs` | AI usage tracking |
| `tasks` | Dashboard tasks |
| `leave_requests` | HR leave management |

## Local Development

Without `DATABASE_URL`, API uses **SQLite** at `backend/data/nexasos.db`.

## Legacy SQL Files

`schema.sql`, `rls.sql`, `seed.sql` were designed for Supabase and are **not used** by the runtime. Active schema lives in `backend/src/lib/db.ts`.
