import bcrypt from 'bcryptjs'
import { queryAll, queryOne, run, newId } from './db'
import { markSourcesImported } from './onboarding'
import { seedTamadaDictionary, seedTamadaBranches, seedTamadaEntities } from './tamada-seed'

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

  if (target === 'tamada_taxonomy') {
    const entities = await seedTamadaEntities(companyId, userId)
    const dictionary = await seedTamadaDictionary(companyId, userId)
    const branches = await seedTamadaBranches(companyId, userId)
    imported = entities + dictionary + branches
    await markSourcesImported(companyId)
    await run(
      `INSERT INTO ingestion_jobs (id, company_id, user_id, source, filename, rows_imported, status, meta)
       VALUES ($1,$2,$3,$4,$5,$6,'completed',$7)`,
      [
        newId(), companyId, userId, 'tamada_taxonomy', 'tamada_taxonomy.csv', imported,
        JSON.stringify({ target, entities, dictionary, branches }),
      ],
    )
    return { rows_imported: imported, errors }
  }

  for (const raw of rows) {
    const row = target === 'pos' ? normalizePosRow(raw) : raw
    try {
      if (target === 'transactions' || target === 'pos') {
        await run(
          `INSERT INTO transactions (id, company_id, user_id, description, amount, type, category, status, date, entity, branch_code)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10)`,
          [
            newId(), companyId, userId,
            row.description || row.desc || 'Imported',
            parseFloat(String(row.amount || '0').replace(/,/g, '')),
            row.type === 'income' ? 'income' : 'expense',
            row.category || (target === 'pos' ? 'POS' : 'Imported'),
            row.date || null,
            row.entity || 'all',
            row.branch_code || row.branch || null,
          ],
        )
        imported++
      } else if (target === 'tamada_cases' || target === 'tcs') {
        const branchCode = row.branch_code || row.branch
        if (!branchCode) { errors.push('branch_code required for tamada case'); continue }
        await run(
          `INSERT INTO tamada_cases (
            id, company_id, branch_code, user_id, treatment_code, treatment_name, amount,
            doctor_id, booking_status, no_show, case_date
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            newId(), companyId, branchCode, userId,
            row.treatment_code || row.customer_id || null,
            row.treatment_name || row.treatment_code || 'Treatment',
            parseFloat(String(row.amount || '0').replace(/,/g, '')),
            row.doctor_id || null,
            row.booking_status || 'completed',
            row.no_show === '1' || row.no_show === 'true' ? 1 : 0,
            row.date || row.case_date || null,
          ],
        )
        imported++
      } else if (target === 'sdx_cases' || target === 'sdx_mcs') {
        const branchCode = row.branch_code || 'SDX-HQ'
        await run(
          `INSERT INTO sdx_cases (
            id, company_id, branch_code, user_id, treatment_type, amount, chair_minutes, doctor_id, case_date
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            newId(), companyId, branchCode, userId,
            row.treatment_type || row.treatment_code || null,
            parseFloat(String(row.amount || '0').replace(/,/g, '')),
            parseInt(String(row.chair_minutes || '0'), 10),
            row.doctor_id || null,
            row.date || row.case_date || null,
          ],
        )
        imported++
      } else if (target === 'franchise_audits') {
        const branchCode = row.branch_code || row.branch
        if (!branchCode) { errors.push('branch_code required for franchise audit'); continue }
        await run(
          `INSERT INTO franchise_audits (
            id, company_id, branch_code, user_id, checklist_passed, checklist_total, mystery_score, notes, audit_date
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            newId(), companyId, branchCode, userId,
            parseInt(String(row.checklist_passed || '0'), 10),
            parseInt(String(row.checklist_total || '0'), 10),
            row.mystery_score ? parseFloat(row.mystery_score) : null,
            row.notes || null,
            row.date || row.audit_date || null,
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
            hash, row.role || 'staff', row.department || 'Operations',
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
      } else if (target === 'kpi') {
        await run(
          `INSERT INTO kpi_entries (id, company_id, user_id, metric_key, metric_name, value, period, note, branch_code)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            newId(), companyId, userId,
            row.metric_key || row.key,
            row.metric_name || row.name || row.metric_key,
            parseFloat(String(row.value || '0').replace(/,/g, '')),
            row.period || row.date || new Date().toISOString().slice(0, 10),
            row.note || null,
            row.branch_code || null,
          ],
        )
        imported++
      } else if (target === 'branches') {
        const code = row.code || row.branch_code
        if (!code) { errors.push('branch code required'); continue }
        const dup = await queryOne('SELECT id FROM branches WHERE company_id = $1 AND code = $2', [companyId, code])
        if (dup) continue
        await run(
          `INSERT INTO branches (id, company_id, code, name, entity, branch_type, franchisee, region)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            newId(), companyId, code,
            row.name || code,
            row.entity || 'tamada',
            row.branch_type || row.type || 'owned',
            row.franchisee || null,
            row.region || null,
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
