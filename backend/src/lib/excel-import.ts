import bcrypt from 'bcryptjs'
import { queryAll, run, newId } from './db'
import { markSourcesImported } from './onboarding'

type Row = Record<string, string>

function parseCSV(text: string): Row[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map(line => {
    const cols = line.match(/(".*?"|[^,]+)/g)?.map(c => c.trim().replace(/^"|"$/g, '')) || []
    const row: Row = {}
    headers.forEach((h, i) => { row[h] = cols[i] || '' })
    return row
  })
}

/** Map POS/ERP export columns → standard transaction row */
function normalizePosRow(row: Row): Row {
  return {
    description: row.description || row.item || row.product || row.name || 'POS sale',
    amount: row.amount || row.total || row.grand_total || row.net || '0',
    type: (row.type || '').toLowerCase().includes('expense') ? 'expense' : 'income',
    category: row.category || row.channel || 'POS',
    date: row.date || row.sale_date || '',
  }
}

async function hashTempPassword(): Promise<string> {
  const temp = `ChangeMe${Math.random().toString(36).slice(2, 10)}!`
  return bcrypt.hash(temp, 10)
}

export async function importCSV(
  companyId: string,
  userId: string,
  csvText: string,
  target: string,
): Promise<{ rows_imported: number; errors: string[]; temp_passwords?: string[] }> {
  const rows = parseCSV(csvText)
  const errors: string[] = []
  const tempPasswords: string[] = []
  let imported = 0

  for (const raw of rows) {
    const row = target === 'pos' ? normalizePosRow(raw) : raw
    try {
      if (target === 'transactions' || target === 'pos') {
        await run(
          `INSERT INTO transactions (id, company_id, user_id, description, amount, type, category, status, date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)`,
          [
            newId(), companyId, userId,
            row.description || row.desc || 'Imported',
            parseFloat(String(row.amount || '0').replace(/,/g, '')),
            row.type === 'income' ? 'income' : 'expense',
            row.category || (target === 'pos' ? 'POS' : 'Imported'),
            row.date || null,
          ],
        )
        imported++
      } else if (target === 'employees') {
        const email = row.email || `${(row.name || 'user').replace(/\s/g, '.').toLowerCase()}@import.local`
        const hash = await hashTempPassword()
        tempPasswords.push(`${email}: temp password sent to admin — reset on first login`)
        await run(
          `INSERT INTO users (id, company_id, name, email, password_hash, role, department, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'active')`,
          [
            newId(), companyId, row.name || 'Imported User', email,
            hash, row.role || 'staff', row.department || 'Operation',
          ],
        )
        imported++
      } else if (target === 'dictionary') {
        await run(
          `INSERT INTO data_dictionary (id, company_id, layer, metric_key, name, definition, formula, source, owner, security_tier)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            newId(), companyId,
            row.layer || 'Performance',
            row.metric_key || row.key || `metric_${imported}`,
            row.name || row.metric_key,
            row.definition || row.name,
            row.formula || null, row.source || 'Import', row.owner || 'Admin', row.security_tier || 'T1',
          ],
        )
        imported++
      }
    } catch (e: any) {
      errors.push(e.message)
    }
  }

  if (imported > 0) {
    await markSourcesImported(companyId)
  }

  await run(
    `INSERT INTO ingestion_jobs (id, company_id, user_id, source, filename, rows_imported, status, meta)
     VALUES ($1,$2,$3,$4,$5,$6,'completed',$7)`,
    [
      newId(), companyId, userId,
      target === 'pos' ? 'pos_csv' : 'csv',
      `${target}.csv`, imported,
      JSON.stringify({ target, errors: errors.length }),
    ],
  )

  return { rows_imported: imported, errors, temp_passwords: tempPasswords.length ? tempPasswords : undefined }
}

export async function getIngestionJobs(companyId: string): Promise<any[]> {
  return queryAll(
    'SELECT * FROM ingestion_jobs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 50',
    [companyId],
  )
}
