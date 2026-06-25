/**
 * Express 4 does not forward rejections from async route handlers to the
 * error-handling middleware. An async `throw` becomes an unhandledRejection
 * (which our process guard keeps alive) — leaving the HTTP request hanging
 * forever with no response.
 *
 * This patches the Router so every route handler's rejection is routed to
 * next(err), letting the global error middleware return a clean 500 instead.
 * MUST be imported before any route file registers handlers (it is the first
 * import in index.ts).
 */
import express from 'express'

// Route-registration methods that take handler functions. Intentionally NOT
// patching `use` (it mounts sub-routers / global middleware).
const ROUTE_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all'] as const

function wrapHandler(fn: unknown): unknown {
  if (typeof fn !== 'function') return fn
  const f = fn as ((...a: unknown[]) => unknown) & { __asyncWrapped?: boolean; length: number }
  if (f.__asyncWrapped) return f
  // Leave Express error-handling middleware (arity 4) untouched.
  if (f.length >= 4) return f
  const wrapped = function (this: unknown, req: unknown, res: unknown, next: (e?: unknown) => void) {
    try {
      const out = f.call(this, req, res, next)
      if (out && typeof (out as Promise<unknown>).then === 'function') {
        ;(out as Promise<unknown>).then(undefined, next)
      }
    } catch (err) {
      next(err)
    }
  }
  ;(wrapped as { __asyncWrapped?: boolean }).__asyncWrapped = true
  return wrapped
}

const proto = Object.getPrototypeOf(express.Router()) as Record<string, unknown>
for (const method of ROUTE_METHODS) {
  const original = proto[method] as ((...a: unknown[]) => unknown) & { __patched?: boolean }
  if (typeof original !== 'function' || original.__patched) continue
  const patched = function (this: unknown, ...args: unknown[]) {
    return original.apply(this, args.map(wrapHandler))
  }
  ;(patched as { __patched?: boolean }).__patched = true
  proto[method] = patched
}

export {}
