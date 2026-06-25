import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const LEGACY_DEV_SECRET = 'nexus_dev_encryption_change_in_production'

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * The ONE secret used to ENCRYPT new values. In production a strong
 * ENCRYPTION_KEY is mandatory — we never silently fall back to JWT_SECRET or a
 * hardcoded constant (key separation). assertEncryptionReady() makes a missing
 * key fail the boot loudly instead of encrypting under a guessable default.
 */
function primarySecret(): string {
  const k = process.env.ENCRYPTION_KEY
  if (k && k.length >= 16) return k
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ENCRYPTION_KEY is required in production and must be at least 16 chars — set a strong key on nexus-api (do NOT reuse JWT_SECRET).',
    )
  }
  return LEGACY_DEV_SECRET // dev/test only
}

/** Secrets to TRY when DECRYPTING — primary first, then legacy keys so values
 *  written before key separation still decrypt (backward compatibility). */
function decryptSecrets(): string[] {
  const out: string[] = []
  if (process.env.ENCRYPTION_KEY) out.push(process.env.ENCRYPTION_KEY)
  if (process.env.JWT_SECRET) out.push(process.env.JWT_SECRET) // legacy: old fallback chain
  out.push(LEGACY_DEV_SECRET) // legacy: old hardcoded constant
  return out
}

/** Call once at boot — fail fast in production if no strong encryption key. */
export function assertEncryptionReady(): void {
  primarySecret()
}

export function encryptField(plain: string): string {
  if (!plain) return plain
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, deriveKey(primarySecret()), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

export function decryptField(value: string | null | undefined): string {
  if (!value || !value.startsWith('enc:')) return value || ''
  const [, ivHex, tagHex, dataHex] = value.split(':')
  let lastErr: unknown
  for (const secret of decryptSecrets()) {
    try {
      const decipher = crypto.createDecipheriv(ALGO, deriveKey(secret), Buffer.from(ivHex, 'hex'))
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
      return decipher.update(dataHex, 'hex', 'utf8') + decipher.final('utf8')
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
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
