import { AsyncLocalStorage } from 'async_hooks'

/**
 * Per-request context carried through the async call stack (AsyncLocalStorage)
 * so that any code — however deep — can attach who/where/which-request to an
 * audit log WITHOUT threading it through every function signature. Populated by
 * the request-context middleware (request/transport fields) and the auth
 * middleware (actor fields). Nothing CONSUMES it yet — the append-only audit
 * writer (A3) will read it. Purely additive/dark.
 */
export type RequestContext = {
  requestId?: string
  sessionId?: string
  actorUserId?: string
  actorEmployeeId?: string
  actorRole?: string
  companyId?: string
  impersonatedBy?: string
  ip?: string
  device?: string
  userAgent?: string
  endpoint?: string
  method?: string
}

const storage = new AsyncLocalStorage<RequestContext>()

/** Run `fn` (and everything it awaits) with `ctx` as the active context. */
export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn)
}

/** The active context, or {} outside a request (e.g. background jobs). */
export function getRequestContext(): RequestContext {
  return storage.getStore() ?? {}
}

/** Merge fields into the active context (e.g. after auth resolves the user). */
export function patchContext(patch: Partial<RequestContext>): void {
  const ctx = storage.getStore()
  if (ctx) Object.assign(ctx, patch)
}
