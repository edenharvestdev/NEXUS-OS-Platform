import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

/** Mirror POS normalization for unit test without DB */
function normalizePosRow(row: Record<string, string>): Record<string, string> {
  return {
    description: row.description || row.item || row.product || row.name || 'POS sale',
    amount: row.amount || row.total || row.grand_total || row.net || '0',
    type: (row.type || '').toLowerCase().includes('expense') ? 'expense' : 'income',
    category: row.category || row.channel || 'POS',
    date: row.date || row.sale_date || '',
  }
}

describe('POS row normalization', () => {
  it('maps ERP columns to transaction fields', () => {
    const row = normalizePosRow({ sale_date: '2026-06-01', grand_total: '1500', product: 'ตรวจสุขภาพ' })
    assert.equal(row.date, '2026-06-01')
    assert.equal(row.amount, '1500')
    assert.equal(row.description, 'ตรวจสุขภาพ')
    assert.equal(row.type, 'income')
    assert.equal(row.category, 'POS')
  })

  it('detects expense type', () => {
    const row = normalizePosRow({ total: '500', type: 'expense_refund' })
    assert.equal(row.type, 'expense')
  })
})
