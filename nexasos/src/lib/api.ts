// ─── NEXUS OS API Client ────────────────────────────────────────
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export type ImpersonationState = {
  active: boolean
  canImpersonate?: boolean
  actor?: { id: string; name: string; email: string; role?: string }
}

if (process.env.NODE_ENV === 'production' && BASE_URL.includes('localhost')) {
  console.warn('⚠️ NEXT_PUBLIC_API_URL is not set. API calls will default to localhost and likely fail in production.')
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('nexasos_token')
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const api = {
  // ── Health ────────────────────────────────────────────────────
  health: () => request('/health'),

  // ── Auth ──────────────────────────────────────────────────────
  signin: (email: string, password: string) =>
    request<{ token: string; user: any }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (email: string, password: string, name: string, companyName: string) =>
    request<{ success: boolean; message: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, companyName }),
    }),

  getMe: () => request<{ user: any; impersonation?: ImpersonationState }>('/api/auth/me'),

  getImpersonateTargets: () =>
    request<{ data: Array<{ id: string; name: string; email: string; role: string; department: string }> }>(
      '/api/auth/impersonate/targets',
    ),

  impersonate: (userId: string) =>
    request<{ token: string; user: any; impersonation: ImpersonationState }>('/api/auth/impersonate', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  stopImpersonate: () =>
    request<{ token: string; user: any; impersonation: ImpersonationState }>('/api/auth/impersonate/stop', {
      method: 'POST',
    }),

  // ── Departments ──────────────────────────────────────────────
  getDepartments: () =>
    request<{ data: any[]; definitions: Array<{ name: string; systemRole: string; label_th: string }> }>(
      '/api/departments',
    ),

  // ── Employees ────────────────────────────────────────────────
  getEmployees: () => request<{ data: any[] }>('/api/employees'),
  createEmployee: (data: any) =>
    request<{ data: any }>('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: any) =>
    request<{ data: any }>(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) =>
    request<{ success: boolean }>(`/api/employees/${id}`, { method: 'DELETE' }),
  reviewEmployee: (id: string) =>
    request<{ data: any }>(`/api/employees/${id}/review`, { method: 'POST' }),

  // ── Transactions ─────────────────────────────────────────────
  getTransactions: () => request<{ data: any[] }>('/api/transactions'),
  createTransaction: (data: any) =>
    request<{ data: any }>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransactionStatus: (id: string, status: string) =>
    request<{ data: any }>(`/api/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteTransaction: (id: string) =>
    request<{ success: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' }),
  ocrReceipt: (fileBase64: string, fileMime: string) =>
    request<{ result: any }>('/api/transactions/ocr', {
      method: 'POST',
      body: JSON.stringify({ fileBase64, fileMime }),
    }),
  exportTransactionsCSV: async () => {
    const token = getToken()
    const res = await fetch(`${BASE_URL}/api/transactions/export/csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Export failed')
    return res.blob()
  },

  // ── Deals ────────────────────────────────────────────────────
  getDeals: () => request<{ data: any[] }>('/api/deals'),
  createDeal: (data: any) =>
    request<{ data: any }>('/api/deals', { method: 'POST', body: JSON.stringify(data) }),
  updateDeal: (id: string, data: any) =>
    request<{ data: any }>(`/api/deals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDeal: (id: string) =>
    request<{ success: boolean }>(`/api/deals/${id}`, { method: 'DELETE' }),
  analyzeLead: (id: string) =>
    request<{ data: any }>(`/api/deals/${id}/analyze`, { method: 'POST' }),

  // ── Meetings ─────────────────────────────────────────────────
  getMeetings: () => request<{ data: any[] }>('/api/meetings'),
  analyzeMeeting: (data: any) =>
    request<{ data: any }>('/api/meetings/analyze', { method: 'POST', body: JSON.stringify(data) }),
  toggleMeetingAction: (id: string) =>
    request<{ success: boolean }>(`/api/meetings/action/${id}`, { method: 'PATCH' }),
  updateMeeting: (id: string, data: any) =>
    request<{ success: boolean }>(`/api/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ── Chat (Personal / Department / CEO) ───────────────────────
  sendMessage: (message: string, scope: 'personal' | 'department' | 'company' = 'personal') =>
    request<{ text: string; sources?: string[]; scope?: string; agent?: any; provider?: string; model?: string; decision_rights?: string; task_type?: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, scope }),
    }),
  getChatAgents: () => request<{ agents: any; scopes: any[] }>('/api/chat/agents'),
  getChatHistory: (scope: 'personal' | 'department' | 'company' = 'personal') =>
    request<{ data: any[]; scope?: string; agent?: any }>(`/api/chat/history?scope=${scope}`),
  clearChatHistory: (scope: 'personal' | 'department' | 'company' = 'personal') =>
    request<{ success: boolean }>(`/api/chat/history?scope=${scope}`, { method: 'DELETE' }),
  getAIAgents: () => request<{ agents: any }>('/api/chat/agents'),

  // ── Notifications ────────────────────────────────────────────
  getNotifications: () => request<{ data: any[] }>('/api/notifications'),
  getUnreadNotifications: () => request<{ count: number }>('/api/notifications/unread'),
  markNotificationRead: (id: string) =>
    request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    request('/api/notifications/read-all', { method: 'POST' }),

  // ── AI Command (Admin / Dept heads) ──────────────────────────
  getAICommandCenter: () => request<any>('/api/ai-command/command-center'),
  recommendEmployees: (skillKey?: string, department?: string) => {
    const q = new URLSearchParams()
    if (skillKey) q.set('skill_key', skillKey)
    if (department) q.set('department', department)
    return request<{ data: any[] }>(`/api/ai-command/recommend?${q}`)
  },
  assignTask: (data: any) =>
    request('/api/ai-command/assign', { method: 'POST', body: JSON.stringify(data) }),

  // ── User AI (files + memory) ─────────────────────────────────
  getUserFiles: () => request<{ data: any[] }>('/api/user-ai/files'),
  uploadUserFile: (data: { name: string; mime_type?: string; content_base64: string; security_tier?: string }) =>
    request('/api/user-ai/files', { method: 'POST', body: JSON.stringify(data) }),
  deleteUserFile: (id: string) =>
    request(`/api/user-ai/files/${id}`, { method: 'DELETE' }),
  getUserAIMemory: () => request<{ data: any[] }>('/api/user-ai/memory'),

  // ── Documents ────────────────────────────────────────────────
  getDocuments: () => request<{ data: any[] }>('/api/documents'),
  analyzeDocument: (data: any) =>
    request<{ data: any }>('/api/documents/analyze', { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (id: string) =>
    request<{ success: boolean }>(`/api/documents/${id}`, { method: 'DELETE' }),
  updateDocumentRisks: (id: string, risks: any[]) =>
    request<{ data: any }>(`/api/documents/${id}/risks`, {
      method: 'PATCH',
      body: JSON.stringify({ risks }),
    }),

  // ── Campaigns ────────────────────────────────────────────────
  getCampaigns: () => request<{ data: any[] }>('/api/campaigns'),
  createCampaign: (data: any) =>
    request<{ data: any }>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id: string, data: any) =>
    request<{ data: any }>(`/api/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCampaign: (id: string) =>
    request<{ success: boolean }>(`/api/campaigns/${id}`, { method: 'DELETE' }),
  analyzeCampaign: (id: string) =>
    request<{ data: any }>(`/api/campaigns/${id}/analyze`, { method: 'POST' }),

  // ── AI Stats ─────────────────────────────────────────────────
  getAIStats: () => request<{ data: any }>('/api/ai-stats'),

  // ── Settings ─────────────────────────────────────────────────
  getSettings: () => request<{ company: any; profile: any; settings: any }>('/api/settings'),
  updateCompany: (data: any) =>
    request('/api/settings/company', { method: 'PATCH', body: JSON.stringify(data) }),
  updateProfile: (data: any) =>
    request('/api/settings/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  updatePreferences: (data: any) =>
    request('/api/settings/preferences', { method: 'PATCH', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/api/settings/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // ── Tasks ────────────────────────────────────────────────────
  getTasks: () => request<{ data: any[] }>('/api/tasks'),
  createTask: (data: any) =>
    request<{ data: any }>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: any) =>
    request<{ data: any }>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (id: string) =>
    request<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  // ── Leave ────────────────────────────────────────────────────
  getLeaveRequests: () => request<{ data: any[] }>('/api/leave'),
  createLeaveRequest: (data: any) =>
    request<{ data: any }>('/api/leave', { method: 'POST', body: JSON.stringify(data) }),
  updateLeaveStatus: (id: string, status: string) =>
    request<{ data: any }>(`/api/leave/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ── NEXUS OS L0/L5/L6 ────────────────────────────────────────
  getDictionary: (layer?: string) =>
    request<any[]>(`/api/dictionary${layer ? `?layer=${layer}` : ''}`),
  getDictionaryLayers: () => request<any[]>('/api/dictionary/layers'),
  createDictionaryEntry: (data: any) =>
    request('/api/dictionary', { method: 'POST', body: JSON.stringify(data) }),
  getWorkLogs: () => request<any[]>('/api/work-logs'),
  createWorkLog: (data: any) =>
    request('/api/work-logs', { method: 'POST', body: JSON.stringify(data) }),
  reviewWorkLog: (id: string, status: string) =>
    request(`/api/work-logs/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getHealthScore: () => request<any>('/api/health/score'),
  simulateFeasibility: (data: any) =>
    request('/api/health/simulate', { method: 'POST', body: JSON.stringify(data) }),
  getAIRouterStatus: () => request<any>('/api/ai-router/status'),
  probeAIProviders: () =>
    request<any>('/api/ai-router/probe', { method: 'POST', body: JSON.stringify({}) }),
  routeAI: (prompt: string, task_type?: string, grounded?: boolean) =>
    request<any>('/api/ai-router/route', {
      method: 'POST',
      body: JSON.stringify({ prompt, task_type, grounded }),
    }),

  getSkillWallet: (userId?: string) =>
    request<{ data: any[]; recommendations?: any }>(userId ? `/api/skills?user_id=${userId}` : '/api/skills/me'),
  getSkills: () => request<{ data: any[] }>('/api/skills'),

  getAuditLogs: () => request<{ data: any[] }>('/api/audit'),
  getTwin: () => request<any>('/api/twin'),

  importCSV: (csv: string, target: string) =>
    request('/api/ingest/import', { method: 'POST', body: JSON.stringify({ csv, target }) }),
  getIngestionJobs: () => request<{ data: any[] }>('/api/ingest/jobs'),
  getLineConfig: () => request<any>('/api/line/config'),

  updateDictionaryEntry: (id: string, data: any) =>
    request(`/api/dictionary/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDictionaryEntry: (id: string) =>
    request(`/api/dictionary/${id}`, { method: 'DELETE' }),

  // ── Self-service (all employees) ─────────────────────────────
  getSelfHub: () => request<any>('/api/self-service/hub'),
  updateSelfProfile: (data: any) =>
    request('/api/self-service/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  addSelfKpi: (data: any) =>
    request('/api/self-service/kpi', { method: 'POST', body: JSON.stringify(data) }),
  addSelfKnowledge: (data: any) =>
    request('/api/self-service/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  addPatient: (data: any) =>
    request('/api/self-service/patient', { method: 'POST', body: JSON.stringify(data) }),
  getPatients: () => request<{ data: any[] }>('/api/self-service/patients'),
  addSelfSkillEvidence: (data: any) =>
    request('/api/self-service/skill-evidence', { method: 'POST', body: JSON.stringify(data) }),
  getDailyTasks: () => request<{ data: any[] }>('/api/self-service/daily-tasks'),
  completeDailyTask: (id: string) =>
    request(`/api/self-service/daily-tasks/${id}/complete`, { method: 'PATCH' }),
  createSelfDepartment: (name: string) =>
    request('/api/self-service/department', { method: 'POST', body: JSON.stringify({ name }) }),

  // ── Onboarding wizard ────────────────────────────────────────
  getOnboarding: () => request<any>('/api/onboarding'),
  selectIndustry: (industry: string) =>
    request('/api/onboarding/industry', { method: 'POST', body: JSON.stringify({ industry }) }),
  applyIndustryTemplate: (industry: string) =>
    request('/api/onboarding/apply-template', { method: 'POST', body: JSON.stringify({ industry }) }),
  advanceOnboardingStep: (step: number) =>
    request('/api/onboarding/step', { method: 'POST', body: JSON.stringify({ step }) }),
  updateOnboardingTask: (taskId: string, status: string) =>
    request<any>(`/api/onboarding/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getWorkbookTemplate: () => request<any>('/api/onboarding/workbook'),
  getSecurityChecklist: () => request<{ data: any[] }>('/api/onboarding/security-checklist'),
  confirmDecisionRights: (rights: Record<string, string>) =>
    request<any>('/api/onboarding/decision-rights', { method: 'POST', body: JSON.stringify({ rights }) }),

  // ── L3 Memory ────────────────────────────────────────────────
  searchMemory: (q: string) => request<any>(`/api/memory/search?q=${encodeURIComponent(q)}`),
  explainMemory: (topic: string) =>
    request('/api/memory/explain', { method: 'POST', body: JSON.stringify({ topic }) }),

  // ── L6 Readiness & CEO ─────────────────────────────────────────
  getReadiness: () => request<any>('/api/health/readiness'),
  getCeoBrief: () => request<any>('/api/ceo/brief'),

  // ── Tamada Taxonomy v2.0 ───────────────────────────────────────
  getTamadaTaxonomy: (domain?: string) =>
    request<any>(`/api/tamada/taxonomy${domain ? `?domain=${domain}` : ''}`),
  getTamadaEntities: () => request<any>('/api/tamada/entities'),
  getTamadaBranches: () => request<any>('/api/tamada/branches'),
  getTamadaIngestMapping: () => request<any>('/api/tamada/ingest-mapping'),
  seedTamada: () => request<any>('/api/tamada/seed', { method: 'POST' }),

  // ── HR Engine (Phases 0-4) ─────────────────────────────────────
  getOrgUnits: () => request<{ data: any[] }>('/api/hr/org-units'),
  createOrgUnit: (data: any) => request('/api/hr/org-units', { method: 'POST', body: JSON.stringify(data) }),
  getPositions: () => request<{ data: any[] }>('/api/hr/positions'),
  getPermissionGroups: () => request<{ data: any[] }>('/api/hr/permission-groups'),
  createPermissionGroup: (data: any) => request('/api/hr/permission-groups', { method: 'POST', body: JSON.stringify(data) }),
  updatePermissionGroup: (id: string, data: any) => request(`/api/hr/permission-groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  assignPermissionGroup: (id: string, userId: string) =>
    request(`/api/hr/permission-groups/${id}/assign`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  getRbacMatrix: () => request<any>('/api/hr/rbac-matrix'),
  clockIn: (data?: { source?: string; shift_id?: string; lat?: number; lng?: number }) =>
    request('/api/hr/attendance/clock-in', { method: 'POST', body: JSON.stringify(data || {}) }),
  clockOut: () => request('/api/hr/attendance/clock-out', { method: 'POST' }),
  getAttendance: (params?: { user_id?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams()
    if (params?.user_id) q.set('user_id', params.user_id)
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    return request<{ data: any[] }>(`/api/hr/attendance?${q}`)
  },
  getHrAdvances: () => request<{ data: any[] }>('/api/hr/advances'),
  createHrAdvance: (data: { amount: number; reason?: string; user_id?: string }) =>
    request('/api/hr/advances', { method: 'POST', body: JSON.stringify(data) }),
  reviewHrAdvance: (id: string, status: 'approved' | 'rejected') =>
    request(`/api/hr/advances/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getPayrollSettings: () => request<{ data: any }>('/api/hr/payroll/settings'),
  updatePayrollSettings: (data: any) =>
    request('/api/hr/payroll/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  getPayrollPeriods: () => request<{ data: any[] }>('/api/hr/payroll/periods'),
  createPayrollPeriod: (year: number, month: number) =>
    request('/api/hr/payroll/periods', { method: 'POST', body: JSON.stringify({ year, month }) }),
  getPayrollPeriod: (id: string) => request<any>(`/api/hr/payroll/periods/${id}`),
  buildPayrollCalendar: (id: string) =>
    request(`/api/hr/payroll/periods/${id}/calendar`, { method: 'POST' }),
  calculatePayrollPeriod: (id: string) =>
    request(`/api/hr/payroll/periods/${id}/calculate`, { method: 'POST' }),
  finishPayrollPeriod: (id: string) =>
    request(`/api/hr/payroll/periods/${id}/finish`, { method: 'POST' }),
  getEmployeeCalendar: (userId: string, periodId?: string) =>
    request<{ data: any[] }>(`/api/hr/payroll/employee/${userId}/calendar${periodId ? `?period_id=${periodId}` : ''}`),
  getPayslip: (userId: string, periodId: string) =>
    request<{ data: any }>(`/api/hr/payroll/payslip/${userId}/${periodId}`),
  getHrReport: (type: string, params?: { period_id?: string; year?: number; month?: number }) => {
    const q = new URLSearchParams()
    if (params?.period_id) q.set('period_id', params.period_id)
    if (params?.year) q.set('year', String(params.year))
    if (params?.month) q.set('month', String(params.month))
    return request<any>(`/api/hr/reports/${type}?${q}`)
  },
  recordSalaryChange: (data: { user_id: string; new_salary: number; effective_date?: string; note?: string }) =>
    request('/api/hr/salary-change', { method: 'POST', body: JSON.stringify(data) }),

  getLeaveTypes: () => request<{ data: any[] }>('/api/hr/leave-types'),
  getHrLeaveRequests: () => request<{ data: any[] }>('/api/hr/leave-requests'),
  createHrLeaveRequest: (data: any) =>
    request('/api/hr/leave-requests', { method: 'POST', body: JSON.stringify(data) }),
  approveHrLeaveStep: (id: string, action: 'approve' | 'reject', note?: string) =>
    request(`/api/hr/leave-requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ action, note }) }),
  getOtTypes: () => request<{ data: any[] }>('/api/hr/overtime/types'),
  getOtRequests: () => request<{ data: any[] }>('/api/hr/overtime/requests'),
  createOtRequest: (data: any) =>
    request('/api/hr/overtime/requests', { method: 'POST', body: JSON.stringify(data) }),
  reviewOtRequest: (id: string, status: 'approved' | 'rejected') =>
    request(`/api/hr/overtime/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  exportPayslipUrl: (userId: string, periodId: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    return `${base}/api/hr/payroll/payslip/${userId}/${periodId}/export`
  },
  exportTaxFormUrl: (type: string, periodId: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    return `${base}/api/hr/payroll/export/${type}?period_id=${periodId}`
  },
  getMyModules: () => request<{ data: string[] }>('/api/hr/me/modules'),
  getLeaveApprovalConfig: () => request<{ data: any[] }>('/api/hr/leave-approval-config'),
  updateLeaveApprovalConfig: (levels: any[]) =>
    request('/api/hr/leave-approval-config', { method: 'PATCH', body: JSON.stringify({ levels }) }),
  getLeaveQuotas: (year?: number) =>
    request<{ data: any[] }>(`/api/hr/leave-quotas${year ? `?year=${year}` : ''}`),
  updateLeaveQuota: (id: string, quota_days: number) =>
    request('/api/hr/leave-quotas', { method: 'PATCH', body: JSON.stringify({ id, quota_days }) }),
  getAttendanceLocations: () => request<{ data: any[] }>('/api/hr/attendance/locations'),
  createAttendanceLocation: (data: any) =>
    request('/api/hr/attendance/locations', { method: 'POST', body: JSON.stringify(data) }),
  deleteAttendanceLocation: (id: string) =>
    request(`/api/hr/attendance/locations/${id}`, { method: 'DELETE' }),
  clockInQr: (data: { qr_token: string; lat?: number; lng?: number }) =>
    request('/api/hr/attendance/clock-in-qr', { method: 'POST', body: JSON.stringify(data) }),
  getShifts: () => request<{ data: any[] }>('/api/hr/shifts'),
  createShift: (data: any) => request('/api/hr/shifts', { method: 'POST', body: JSON.stringify(data) }),
  updateShift: (id: string, data: any) =>
    request(`/api/hr/shifts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getGroupMembers: (groupId: string) =>
    request<{ data: any[] }>(`/api/hr/permission-groups/${groupId}/members`),
  unassignPermissionGroup: (groupId: string, userId: string) =>
    request(`/api/hr/permission-groups/${groupId}/members`, { method: 'DELETE', body: JSON.stringify({ user_id: userId }) }),
  approveOtStep: (id: string, action: 'approve' | 'reject', note?: string) =>
    request(`/api/hr/overtime/requests/${id}`, { method: 'PATCH', body: JSON.stringify({ action, note }) }),
}
