/**
 * Ingest column mapping — external systems → NEXUS OS Single Source
 * TCS, BC365, SDX MCS, HR, Warehouse, LINE
 */

export type IngestSource = 'tcs' | 'bc365' | 'sdx_mcs' | 'hr' | 'warehouse' | 'line' | 'feedback_xlsx' | 'pos'

export interface IngestFieldMap {
  source: IngestSource
  label: string
  target: 'transactions' | 'dictionary' | 'kpi' | 'employees' | 'branches' | 'work_logs'
  columns: Array<{ external: string; internal: string; metric_key?: string; notes?: string }>
  sample_header: string
}

export const TAMADA_INGEST_MAPPINGS: IngestFieldMap[] = [
  {
    source: 'tcs',
    label: 'TCS / HIS / Booking',
    target: 'kpi',
    sample_header: 'date,branch_code,customer_id,doctor_id,treatment_code,amount,booking_status,no_show,branch',
    columns: [
      { external: 'date', internal: 'period', notes: 'YYYY-MM-DD' },
      { external: 'branch_code', internal: 'branch_code', metric_key: 'branch_pnl' },
      { external: 'customer_id', internal: 'customer_id', metric_key: 'customer_retention_rate' },
      { external: 'doctor_id', internal: 'doctor_id', metric_key: 'doctor_revenue' },
      { external: 'treatment_code', internal: 'category', metric_key: 'treatment_revenue_category' },
      { external: 'amount', internal: 'value', metric_key: 'revenue_cost_profit' },
      { external: 'booking_status', internal: 'status', metric_key: 'treatment_completion_rate' },
      { external: 'no_show', internal: 'no_show_flag', metric_key: 'no_show_rate' },
    ],
  },
  {
    source: 'bc365',
    label: 'BC365 ERP / Finance',
    target: 'transactions',
    sample_header: 'date,branch_code,description,amount,type,category,account_code',
    columns: [
      { external: 'date', internal: 'date' },
      { external: 'branch_code', internal: 'category', notes: 'map to branch code SUT/PUN/SYA' },
      { external: 'description', internal: 'description' },
      { external: 'amount', internal: 'amount' },
      { external: 'type', internal: 'type', notes: 'income|expense' },
      { external: 'account_code', internal: 'category', metric_key: 'revenue_cost_profit' },
    ],
  },
  {
    source: 'sdx_mcs',
    label: 'SDX Dental MCS',
    target: 'kpi',
    sample_header: 'date,branch_code,treatment_type,amount,chair_minutes,doctor_id,customer_id',
    columns: [
      { external: 'treatment_type', internal: 'category', metric_key: 'dental_revenue_type' },
      { external: 'amount', internal: 'value', metric_key: 'dental_revenue_type' },
      { external: 'chair_minutes', internal: 'value', metric_key: 'chair_utilization' },
      { external: 'branch_code', internal: 'branch_code', notes: 'SDX-HQ' },
    ],
  },
  {
    source: 'hr',
    label: 'HR / Payroll',
    target: 'employees',
    sample_header: 'name,email,department,role,branch_code,employee_id',
    columns: [
      { external: 'name', internal: 'name' },
      { external: 'email', internal: 'email' },
      { external: 'department', internal: 'department' },
      { external: 'role', internal: 'role' },
      { external: 'branch_code', internal: 'branch' },
    ],
  },
  {
    source: 'warehouse',
    label: 'Warehouse / Purchasing',
    target: 'kpi',
    sample_header: 'date,branch_code,item_code,quantity,usage_qty,treatment_type',
    columns: [
      { external: 'item_code', internal: 'category', metric_key: 'remaining_stock' },
      { external: 'quantity', internal: 'value', metric_key: 'remaining_stock' },
      { external: 'usage_qty', internal: 'value', metric_key: 'historical_usage' },
    ],
  },
  {
    source: 'feedback_xlsx',
    label: 'feedback_2026.xlsx (Complaint/NPS)',
    target: 'work_logs',
    sample_header: 'date,branch,complaint_type,description,resolution_hours,nps_score',
    columns: [
      { external: 'complaint_type', internal: 'action_type', notes: 'issue' },
      { external: 'description', internal: 'object' },
      { external: 'resolution_hours', internal: 'kpi_impact', metric_key: 'complaint_rate' },
      { external: 'nps_score', internal: 'value', metric_key: 'nps_csat' },
    ],
  },
  {
    source: 'line',
    label: 'LINE OA — Daily Readiness',
    target: 'kpi',
    sample_header: 'date,branch_code,checklist_passed,checklist_total,user_id',
    columns: [
      { external: 'checklist_passed', internal: 'value', metric_key: 'daily_readiness_score' },
      { external: 'checklist_total', internal: 'category', notes: 'denominator' },
    ],
  },
  {
    source: 'pos',
    label: 'POS Export (generic)',
    target: 'transactions',
    sample_header: 'date,total,product,channel,branch_code',
    columns: [
      { external: 'date', internal: 'date' },
      { external: 'total', internal: 'amount' },
      { external: 'product', internal: 'description' },
      { external: 'channel', internal: 'category' },
    ],
  },
]

export function getIngestMapping(source: string): IngestFieldMap | undefined {
  return TAMADA_INGEST_MAPPINGS.find(m => m.source === source)
}
