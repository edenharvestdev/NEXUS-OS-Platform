import { test } from 'node:test'
import assert from 'node:assert'
import { base32Encode, base32Decode, totp, verifyTOTP, generateSecret } from '../src/lib/totp'

// RFC 6238 Appendix B shared secret for SHA1 = ASCII "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'))

test('TOTP: base32 round-trips and matches the RFC test secret', () => {
  assert.equal(RFC_SECRET, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  assert.equal(base32Decode(RFC_SECRET).toString(), '12345678901234567890')
})

test('TOTP: RFC 6238 Appendix B vectors (SHA1, 6 digits)', () => {
  const vectors: Array<[number, string]> = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ]
  for (const [t, code] of vectors) assert.equal(totp(RFC_SECRET, t * 1000), code, `T=${t}`)
})

test('TOTP: verify accepts current code, rejects wrong, tolerates ±1 drift only', () => {
  const t = 1111111109 * 1000
  assert.equal(verifyTOTP(RFC_SECRET, '081804', t), true)
  assert.equal(verifyTOTP(RFC_SECRET, '000000', t), false)
  assert.equal(verifyTOTP(RFC_SECRET, '081804', t + 30_000), true)  // +1 step (within window)
  assert.equal(verifyTOTP(RFC_SECRET, '081804', t + 90_000), false) // +3 steps (outside window)
  assert.equal(verifyTOTP(RFC_SECRET, 'abc', t), false)             // non-numeric rejected
})

test('TOTP: generateSecret yields a 160-bit decodable base32 secret', () => {
  const s = generateSecret()
  assert.ok(/^[A-Z2-7]+$/.test(s))
  assert.equal(base32Decode(s).length, 20)
})
