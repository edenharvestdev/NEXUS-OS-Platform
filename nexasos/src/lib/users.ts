import { api } from './api'

const TOKEN_KEY = 'nexasos_token'
const USER_KEY = 'nexasos_user'

function migrateLegacyKeys() {
  if (typeof window === 'undefined') return
  const legacyToken = localStorage.getItem('autosoft_token')
  const legacyUser = localStorage.getItem('autosoft_user')
  if (legacyToken && !localStorage.getItem(TOKEN_KEY)) {
    localStorage.setItem(TOKEN_KEY, legacyToken)
    localStorage.removeItem('autosoft_token')
  }
  if (legacyUser && !localStorage.getItem(USER_KEY)) {
    localStorage.setItem(USER_KEY, legacyUser)
    localStorage.removeItem('autosoft_user')
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

export async function login(email: string, password: string) {
  try {
    const res = await api.signin(email, password)
    setToken(res.token)
    setCachedUser(res.user)
    return { success: true, user: res.user }
  } catch (e: any) {
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
    return res.user
  } catch {
    clearToken()
    return null
  }
}
