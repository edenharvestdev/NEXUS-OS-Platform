import crypto from 'crypto'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'nexus_dev_encryption_change_in_production'
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptField(plain: string): string {
  if (!plain) return plain
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decryptField(value: string | null | undefined): string {
  if (!value || !value.startsWith('enc:')) return value || ''
  const [, ivHex, tagHex, dataHex] = value.split(':')
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(dataHex, 'hex', 'utf8') + decipher.final('utf8')
}

export function maskField(value: string | null | undefined, tier: string): string {
  if (!value) return ''
  if (tier === 'T3') return '****'
  if (tier === 'T2' && value.length > 4) return value.slice(0, 2) + '****' + value.slice(-2)
  return value
}

export function canViewTier(userRole: string, tier: string): boolean {
  const r = (userRole || 'staff').toLowerCase()
  if (tier === 'T0') return true
  if (tier === 'T1') return true
  if (tier === 'T2') return ['admin', 'finance', 'hr', 'it'].includes(r)
  if (tier === 'T3') return ['admin', 'hr'].includes(r)
  return false
}

export function sanitizeUserForRole(user: any, viewerRole: string): any {
  const u = { ...user }
  if (!canViewTier(viewerRole, 'T2')) {
    if (u.salary) u.salary = maskField(decryptField(u.salary), 'T2')
  } else if (u.salary?.startsWith?.('enc:')) {
    u.salary = decryptField(u.salary)
  }
  delete u.password_hash
  return u
}
