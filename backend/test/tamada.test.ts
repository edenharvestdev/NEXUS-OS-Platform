import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  TAMADA_DICTIONARY_SEED,
  TAMADA_DOMAIN_SUMMARY,
  getTamadaMetricsByDomain,
} from '../src/lib/tamada-data-taxonomy'
import { TAMADA_BRANCHES, TAMADA_ENTITIES } from '../src/lib/tamada-entities'
import { TAMADA_INGEST_MAPPINGS } from '../src/lib/tamada-ingest-mapping'

describe('tamada taxonomy v2.0', () => {
  it('has 59 canonical metrics', () => {
    assert.equal(TAMADA_DICTIONARY_SEED.length, 59)
  })

  it('domain summary counts match total', () => {
    const sum = TAMADA_DOMAIN_SUMMARY.reduce((a, d) => a + d.count, 0)
    assert.equal(sum, TAMADA_DICTIONARY_SEED.length)
  })

  it('covers 10 domains including marketing and franchise', () => {
    assert.equal(TAMADA_DOMAIN_SUMMARY.length, 10)
    assert.equal(getTamadaMetricsByDomain('marketing').length, 10)
    assert.equal(getTamadaMetricsByDomain('franchise').length, 3)
  })

  it('includes workbook gap metrics', () => {
    const keys = new Set(TAMADA_DICTIONARY_SEED.map(m => m.metric_key))
    assert.ok(keys.has('cost_saving'))
    assert.ok(keys.has('patient_record'))
    assert.ok(keys.has('new_doctor_ramp'))
  })
})

describe('tamada entities & ingest', () => {
  it('defines 3 entities and 6 branches', () => {
    assert.equal(TAMADA_ENTITIES.length, 3)
    assert.equal(TAMADA_BRANCHES.length, 6)
  })

  it('maps external systems to L0 targets', () => {
    assert.ok(TAMADA_INGEST_MAPPINGS.length >= 7)
    const sources = TAMADA_INGEST_MAPPINGS.map(m => m.source)
    assert.ok(sources.includes('tcs'))
    assert.ok(sources.includes('sdx_mcs'))
    assert.ok(sources.includes('pos'))
  })
})
