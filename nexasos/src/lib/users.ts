import { api, type ImpersonationState } from './api'

const TOKEN_KEY = 'nexasos_token'
const USER_KEY = 'nexasos_user'
const IMPERSONATION_KEY = 'nexasos_impersonation'

function migrateLegacyKeys() {
  if (typeof window === 'undefined') return
  for (const legacy of ['autosoft_token', 'autosoft_user']) {
    localStorage.removeItem(legacy)
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  migrateLegacyKeys()
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(IMPERSONATION_KEY)
}

export function getCachedUser(): any {
  if (typeof window === 'undefined') return null
  migrateLegacyKeys()
  const u = localStorage.getItem(USER_KEY)
  return u ? JSON.parse(u) : null
}

export function setCachedUser(user: any) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getImpersonation(): ImpersonationState | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(IMPERSONATION_KEY)
  return raw ? JSON.parse(raw) : null
}

function setImpersonation(state: ImpersonationState | null) {
  if (!state) {
    localStorage.removeItem(IMPERSONATION_KEY)
    return
  }
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state))
}

export async function login(email: string, password: string) {
  try {
    const res = await api.signin(email.trim().toLowerCase(), password)
    setToken(res.token)
    setCachedUser(res.user)
    setImpersonation(null)
    return { success: true, user: res.user }
  } catch (e: any) {
    const msg = String(e.message || '')
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      return { success: false, error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่' }
    }
    return { success: false, error: e.message || 'เข้าสู่ระบบไม่ได้' }
  }
}

export async function register(
  email: string,
  password: string,
  name: string,
  companyName: string,
) {
  try {
    const res = await api.signup(email, password, name, companyName)
    return { success: true, message: res.message }
  } catch (e: any) {
    return { success: false, error: e.message || 'สมัครสมาชิกไม่ได้' }
  }
}

export function logout() {
  clearToken()
}

export function getUser(): any {
  return getCachedUser()
}

export function hasAccess(user: any, roleRequired?: string): boolean {
  if (!user) return false
  if (user.role?.toLowerCase() === 'admin') return true
  if (!roleRequired) return true
  return user.role?.toLowerCase() === roleRequired.toLowerCase()
}

export async function refreshUser(): Promise<any> {
  try {
    const res = await api.getMe()
    setCachedUser(res.user)
    setImpersonation(res.impersonation ?? null)
    return res.user
  } catch {
    clearToken()
    return null
  }
}

export async function refreshSession(): Promise<{ user: any; impersonation: ImpersonationState | null } | null> {
  try {
    const res = await api.getMe()
    setCachedUser(res.user)
    setImpersonation(res.impersonation ?? null)
    return { user: res.user, impersonation: res.impersonation ?? null }
  } catch {
    clearToken()
    return null
  }
}

export async function startImpersonate(userId: string) {
  const res = await api.impersonate(userId)
  setToken(res.token)
  setCachedUser(res.user)
  setImpersonation(res.impersonation)
  return res
}

export async function stopImpersonate() {
  const res = await api.stopImpersonate()
  setToken(res.token)
  setCachedUser(res.user)
  setImpersonation(res.impersonation)
  return res
}

export function canUseImpersonation(impersonation: ImpersonationState | null): boolean {
  if (!impersonation) return false
  return impersonation.active || !!impersonation.canImpersonate
}
