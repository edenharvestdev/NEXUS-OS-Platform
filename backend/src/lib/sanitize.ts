export function sanitizeUser(user: Record<string, unknown> | null | undefined) {
  if (!user) return null
  const { password_hash, ...safe } = user
  return {
    ...safe,
    dept: user.department,
    leaveUsed: user.leave_used,
  }
}

export function sanitizeUsers(users: Record<string, unknown>[]) {
  return users.map(u => sanitizeUser(u)!)
}
