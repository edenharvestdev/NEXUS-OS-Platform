import './middleware/async-guard' // MUST be first: patches Router so async handler errors return 500 instead of hanging
import express, { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import dotenv from 'dotenv'
dotenv.config()

// Fail fast (and loud, with explicit exit so the uncaughtException guard can't
// keep a keyless server alive) if a strong ENCRYPTION_KEY is missing in prod.
import { assertEncryptionReady } from './lib/encryption'
try { assertEncryptionReady() } catch (e) { console.error('🔐', (e as Error).message); process.exit(1) }

import { initSchema } from './lib/db'
import { corsMiddleware }     from './middleware/cors'
import authRoutes             from './routes/auth.route'
import employeesRoutes        from './routes/employees.route'
import transactionsRoutes     from './routes/transactions.route'
import dealsRoutes            from './routes/deals.route'
import meetingsRoutes         from './routes/meetings.route'
import chatRoutes             from './routes/chat.route'
import documentsRoutes        from './routes/documents.route'
import campaignsRoutes        from './routes/campaigns.route'
import aiStatsRoutes          from './routes/ai-stats.route'
import settingsRoutes          from './routes/settings.route'
import tasksRoutes             from './routes/tasks.route'
import leaveRoutes             from './routes/leave.route'
import workLogsRoutes        from './routes/work-logs.route'
import dataDictionaryRoutes  from './routes/data-dictionary.route'
import { getProviderStatus, anyAIConfigured } from './lib/ai-providers'
import healthRoutes          from './routes/health.route'
import aiRouterRoutes        from './routes/ai-router.route'
import skillWalletRoutes     from './routes/skill-wallet.route'
import auditLogRoutes        from './routes/audit-log.route'
import ingestionRoutes       from './routes/ingestion.route'
import twinRoutes            from './routes/twin.route'
import lineRoutes            from './routes/line.route'
import onboardingRoutes      from './routes/onboarding.route'
import selfServiceRoutes     from './routes/self-service.route'
import memoryRoutes          from './routes/memory.route'
import ceoRoutes             from './routes/ceo.route'
import departmentsRoutes     from './routes/departments.route'
import notificationsRoutes   from './routes/notifications.route'
import aiCommandRoutes       from './routes/ai-command.route'
import userAiRoutes          from './routes/user-ai.route'
import opsRoutes             from './routes/ops.route'
import tamadaRoutes          from './routes/tamada.route'
import hrRoutes              from './routes/hr.route'
import securityRoutes        from './routes/security.route'
import softDeleteRoutes      from './routes/soft-delete.route'
import { rateLimitMiddleware } from './middleware/rate-limit'
import { requestMetricsMiddleware } from './middleware/request-metrics'
import { requestContextMiddleware } from './middleware/request-context'
import { deepHealth } from './controllers/deep-health.controller'

const app = express()

// ── Security & Parsing ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(corsMiddleware)
app.use(rateLimitMiddleware)
app.use(requestMetricsMiddleware)
app.use(requestContextMiddleware) // establishes per-request AsyncLocalStorage context (for audit)
// Increase limit to 50MB to support base64-encoded images/PDFs for OCR
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ── Health Check ─────────────────────────────────────────────────
app.get('/health', (_: Request, res: Response) => {
  const ai = getProviderStatus()
  res.json({
    status: 'OK',
    app: 'NEXUS OS API',
    version: '3.0.0',
    database: process.env.DATABASE_URL ? 'PostgreSQL (Railway)' : 'SQLite (local)',
    ai: anyAIConfigured() ? `Multi-provider ✅ (primary: ${ai.openai.configured ? 'OpenAI' : ai.gemini.configured ? 'Gemini' : 'fallback'})` : 'Not configured ⚠️',
    models: {
      gemini: ai.gemini.configured,
      claude: ai.claude.configured,
      openai: ai.openai.configured,
      typhoon: ai.typhoon.configured,
      line: !!(process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN),
    },
    ai_models: ai,
    ts: new Date().toISOString(),
  })
})

app.get('/health/deep', deepHealth)

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/security',     securityRoutes)
app.use('/api/admin/soft-delete', softDeleteRoutes)
app.use('/api/employees',    employeesRoutes)
app.use('/api/transactions', transactionsRoutes)
app.use('/api/deals',        dealsRoutes)
app.use('/api/meetings',     meetingsRoutes)
app.use('/api/chat',         chatRoutes)
app.use('/api/documents',    documentsRoutes)
app.use('/api/campaigns',    campaignsRoutes)
app.use('/api/ai-stats',     aiStatsRoutes)
app.use('/api/settings',     settingsRoutes)
app.use('/api/tasks',        tasksRoutes)
app.use('/api/leave',        leaveRoutes)
app.use('/api/work-logs',    workLogsRoutes)
app.use('/api/dictionary',   dataDictionaryRoutes)
app.use('/api/health',       healthRoutes)
app.use('/api/ai-router',    aiRouterRoutes)
app.use('/api/skills',       skillWalletRoutes)
app.use('/api/audit',        auditLogRoutes)
app.use('/api/ingest',       ingestionRoutes)
app.use('/api/twin',         twinRoutes)
app.use('/api/line',         lineRoutes)
app.use('/api/onboarding',   onboardingRoutes)
app.use('/api/self-service', selfServiceRoutes)
app.use('/api/memory',       memoryRoutes)
app.use('/api/ceo',          ceoRoutes)
app.use('/api/departments',  departmentsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/ai-command',   aiCommandRoutes)
app.use('/api/user-ai',      userAiRoutes)
app.use('/api/ops',          opsRoutes)
app.use('/api/tamada',       tamadaRoutes)
app.use('/api/hr',           hrRoutes)

// ── 404 Fallback ─────────────────────────────────────────────────
app.use((_: Request, res: Response) =>
  res.status(404).json({ error: 'Route not found' }),
)

// ── Global Error Handler ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err)
  const status  = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'
  res.status(status).json({ error: message })
})

// ── Crash containment ────────────────────────────────────────────
// Express 4 does not forward rejections from async route handlers to the
// error middleware, so an unhandled rejection would otherwise terminate the
// whole process — turning one bad query into a full outage (and a restart
// crash-loop on Railway). Keep the server alive and log instead.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled promise rejection (server kept alive):', reason)
})
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught exception (server kept alive):', err)
})

// ── Start Server ─────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000

// Initialization logic
async function initialize() {
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production (use Railway PostgreSQL)')
    }
    if (process.env.DATABASE_URL) {
      await initSchema()
    } else if (!process.env.VERCEL) {
      await import('./lib/db-sqlite')
    }

    const { runMigrations } = await import('./lib/migrations')
    const { applied, current } = await runMigrations()
    if (applied > 0) console.log(`📦 Migrations: ${applied} applied (v${current})`)

    if (!process.env.VERCEL) {
      const { startJobWorker } = await import('./lib/job-queue')
      const { scheduleDailyBackup } = await import('./lib/backup')
      const { startSlaJob } = await import('./lib/sla-escalation')
      const { scheduleMonthlySkillReview } = await import('./lib/monthly-task-agent')
      startJobWorker()
      scheduleDailyBackup()
      scheduleMonthlySkillReview()
      startSlaJob()
    }
  } catch (err) {
    console.error('Failed to initialize database:', err)
    if (!process.env.VERCEL) process.exit(1)
  }
}

// Trigger initialization
initialize()

// Standard Express listen (only for non-Vercel environments)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    const db = process.env.DATABASE_URL ? '🐘 PostgreSQL (Railway)' : '🗄️  SQLite (local)'
    const ai = process.env.GEMINI_API_KEY ? '🤖 Gemini 2.0 Flash' : '⚠️  AI not configured'
    console.log(`🚀 NEXUS OS API → http://localhost:${PORT}`)
    console.log(`📦 Database: ${db}`)
    console.log(`${ai}`)
    console.log(`📋 Health: http://localhost:${PORT}/health`)
  })
}

export default app
