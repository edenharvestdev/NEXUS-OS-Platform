import { queryAll, queryOne } from './db'
import { MODULE_ACCESS, normalizeRole } from './rbac'
import { shadowCheck } from './authz'

/** Effective modules = role defaults ∪ permission group modules */
export async function getUserModules(userId: string, role?: string): Promise<Set<string>> {
  const r = normalizeRole(role)
  if (r === 'admin') {
    // Super-admin bypass #3 — admin gets the '*' wildcard module set.
    shadowCheck('getUserModules:wildcard', true, { allowed: false, reason: 'admin wildcard "*" (no scoped module set under least-privilege)' })
    return new Set(['*'])
  }

  const modules = new Set<string>()
  for (const [mod, roles] of Object.entries(MODULE_ACCESS)) {
    if (roles.includes(r as any)) modules.add(mod)
  }

  const groups = await queryAll(
    `SELECT pg.modules FROM user_permission_groups upg
     JOIN permission_groups pg ON pg.id = upg.group_id
     WHERE upg.user_id = $1`,
    [userId],
  )
  for (const g of groups) {
    try {
      const list = JSON.parse(g.modules || '[]')
      if (Array.isArray(list)) list.forEach((m: string) => modules.add(m))
    } catch { /* ignore */ }
  }

  return modules
}

export async function userCanAccessModule(userId: string, role: string | undefined, module: string): Promise<boolean> {
  const mods = await getUserModules(userId, role)
  if (mods.has('*')) return true
  return mods.has(module)
}
