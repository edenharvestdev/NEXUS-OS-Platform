import { apiPost } from './api'

export async function signUp(
  email: string,
  password: string,
  name: string,
  companyName: string,
) {
  return apiPost('/auth/signup', { email, password, name, companyName })
}

export async function signIn(email: string, password: string) {
  const data = await apiPost('/auth/signin', { email, password })
  localStorage.setItem('autosoft_token', data.token)
  localStorage.setItem('autosoft_user', JSON.stringify(data.user))
  return data
}

export function signOut() {
  localStorage.removeItem('autosoft_token')
  localStorage.removeItem('autosoft_user')
}

export function getUser() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem('autosoft_user') || 'null')
  } catch {
    return null
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('autosoft_token')
}

export function isLoggedIn(): boolean {
  return !!getToken()
}
