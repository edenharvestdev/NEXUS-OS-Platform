import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import { _resetRateLimits } from '../src/middleware/rate-limit'
import { saveFileToDisk, readFileFromDisk, deleteFileFromDisk } from '../src/lib/file-storage'

describe('rate limit', () => {
  beforeEach(() => _resetRateLimits())

  it('exports reset helper', () => {
    assert.equal(typeof _resetRateLimits, 'function')
  })
})

describe('file storage', () => {
  const companyId = 'test-co'
  const userId = 'test-user'
  const fileId = 'file-1'
  const content = Buffer.from('hello nexus').toString('base64')

  it('writes and reads round-trip', () => {
    const { storagePath } = saveFileToDisk(companyId, userId, fileId, 'note.txt', content)
    const buf = readFileFromDisk(storagePath)
    assert.ok(buf)
    assert.equal(buf!.toString(), 'hello nexus')
    deleteFileFromDisk(storagePath)
    assert.equal(readFileFromDisk(storagePath), null)
  })

  it('rejects path traversal read', () => {
    assert.equal(readFileFromDisk('../etc/passwd'), null)
  })
})

describe('migrations module', () => {
  it('loads migration list', async () => {
    const { MIGRATIONS } = await import('../src/lib/migrations')
    assert.ok(MIGRATIONS.length >= 4)
    assert.equal(MIGRATIONS[0].version, 1)
  })
})
