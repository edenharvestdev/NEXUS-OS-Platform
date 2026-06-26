/**
 * RFC 6238 TOTP (+ RFC 4226 HOTP) implemented with Node's built-in crypto — no
 * external dependency (the plan listed `otplib`; a ~60-line standard-algorithm
 * implementation keeps the supply-chain surface at zero and is validated against
 * the official RFC 6238 Appendix-B test vectors in totp.test.ts).
 *
 * SHA1 / 6 digits / 30s period — the defaults every authenticator app expects.
 */
import crypto from 'crypto'

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' // RFC 4648 base32 alphabet

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(s: string): Buffer {
  const clean = (s || '').toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '')
  let bits = 0, value = 0
  const out: number[] = []
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch)
    bits += 5
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8 }
  }
  return Buffer.from(out)
}

/** A fresh base32 TOTP secret (default 20 random bytes = 160 bits, per RFC 4226). */
export function generateSecret(bytes = 20): string {
  return base32Encode(crypto.randomBytes(bytes))
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0) // high 32 bits
  buf.writeUInt32BE(counter >>> 0, 4)                        // low 32 bits
  const hmac = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const bin = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3]
  return (bin % 1_000_000).toString().padStart(6, '0')
}

export function totp(secret: string, atMs: number = Date.now(), stepSec = 30): string {
  return hotp(secret, Math.floor(atMs / 1000 / stepSec))
}

/** Verify a 6-digit code, tolerating ±`window` steps of clock drift (default ±1
 *  = ±30s). Constant-time compare to avoid leaking via timing. */
export function verifyTOTP(secret: string, token: string, atMs: number = Date.now(), window = 1, stepSec = 30): boolean {
  if (!/^\d{6}$/.test(token || '')) return false
  const counter = Math.floor(atMs / 1000 / stepSec)
  const tokenBuf = Buffer.from(token)
  for (let w = -window; w <= window; w++) {
    const candidate = Buffer.from(hotp(secret, counter + w))
    if (candidate.length === tokenBuf.length && crypto.timingSafeEqual(candidate, tokenBuf)) return true
  }
  return false
}

/** otpauth:// URI for QR-code enrollment in an authenticator app. */
export function otpauthURI(secret: string, account: string, issuer = 'NEXUS OS'): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' })
  return `otpauth://totp/${label}?${params.toString()}`
}
