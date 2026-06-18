const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('autosoft_token')
}

export async function api(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'API Error')
  return data
}

export const apiGet    = (path: string)              => api(path)
export const apiPost   = (path: string, body: any)   => api(path, { method: 'POST',   body: JSON.stringify(body) })
export const apiPatch  = (path: string, body: any)   => api(path, { method: 'PATCH',  body: JSON.stringify(body) })
export const apiDelete = (path: string, body?: any)  => api(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined })
