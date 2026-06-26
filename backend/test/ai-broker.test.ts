import { test } from 'node:test'
import assert from 'node:assert'
import { brokerEgress, classifyEgress } from '../src/lib/ai-broker'

test('AIEG-2: classifyEgress — explicit class wins, then task hint, then sensitive count', () => {
  assert.equal(classifyEgress({ dataClass: 'restricted' }), 'RESTRICTED')      // explicit, case-insensitive
  assert.equal(classifyEgress({ taskType: 'monthly payroll run' }), 'RESTRICTED')
  assert.equal(classifyEgress({ taskType: 'patient medical summary' }), 'RESTRICTED')
  assert.equal(classifyEgress({ sensitiveCount: 3 }), 'RESTRICTED')            // redactor masked tokens
  assert.equal(classifyEgress({ sensitiveCount: 0 }), 'MEDIUM')
  assert.equal(classifyEgress({ taskType: 'marketing copy' }), 'MEDIUM')
  assert.equal(classifyEgress({}), 'MEDIUM')
})

test('AIEG-2: SHADOW (default) — restricted egress would_block but does NOT block', () => {
  delete process.env.AI_BROKER_ENFORCE
  const d = brokerEgress({ sensitiveCount: 2 }) // sensitive content, no consent
  assert.equal(d.restricted, true)
  assert.equal(d.wouldBlock, true)
  assert.equal(d.block, false) // shadow — never blocks
  assert.equal(d.reason, 'restricted_egress_no_consent')
})

test('AIEG-2: consent bypasses the would_block (consent gate)', () => {
  const d = brokerEgress({ sensitiveCount: 5, consent: true })
  assert.equal(d.wouldBlock, false)
  assert.equal(d.block, false)
})

test('AIEG-2: ENFORCE — restricted egress blocks unless consented', () => {
  process.env.AI_BROKER_ENFORCE = 'on'
  try {
    assert.equal(brokerEgress({ sensitiveCount: 1 }).block, true)                  // blocked
    assert.equal(brokerEgress({ sensitiveCount: 1, consent: true }).block, false)  // consent passes
    assert.equal(brokerEgress({ dataClass: 'RESTRICTED' }).block, true)            // explicit class blocked
    assert.equal(brokerEgress({ sensitiveCount: 0 }).block, false)                 // medium never blocked
  } finally {
    delete process.env.AI_BROKER_ENFORCE
  }
})

test('AIEG-2: medium egress is always allowed', () => {
  const d = brokerEgress({ sensitiveCount: 0, taskType: 'marketing' })
  assert.equal(d.restricted, false)
  assert.equal(d.wouldBlock, false)
  assert.equal(d.block, false)
})
