import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ONBOARDING_TASKS,
  ONBOARDING_PHASES,
  CLINIC_DICTIONARY_SEED,
  SECURITY_CHECKLIST,
  WORK_LOG_FIELDS,
} from '../src/lib/workbook-template'

describe('workbook template', () => {
  it('has 15 onboarding tasks across 6 phases', () => {
    assert.equal(ONBOARDING_TASKS.length, 15)
    assert.equal(ONBOARDING_PHASES.length, 6)
    const phaseIds = new Set(ONBOARDING_TASKS.map(t => t.phase))
    assert.equal(phaseIds.size, 6)
  })

  it('clinic dictionary seed has 10 metrics', () => {
    assert.equal(CLINIC_DICTIONARY_SEED.length, 10)
  })

  it('security checklist and work log fields are defined', () => {
    assert.ok(SECURITY_CHECKLIST.length >= 7)
    assert.ok(WORK_LOG_FIELDS.length >= 5)
  })
})
