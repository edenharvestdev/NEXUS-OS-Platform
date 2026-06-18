export const DEMO_USERS = [
  {
    id: 1,
    username: 'admin@autosoft.com',
    password: 'admin1234',
    name: 'คุณสมชาย วงศ์ใหญ่',
    role: 'CEO',
    department: 'Executive',
    avatar: 'สว',
    color: '#8B6F47',
    access: 'all',
  },
  {
    id: 2,
    username: 'hr@autosoft.com',
    password: 'hr1234',
    name: 'คุณสมหญิง รักงาน',
    role: 'HR Manager',
    department: 'HR & People',
    avatar: 'สร',
    color: '#6B8E6E',
    access: ['people', 'meeting', 'gpt'],
  },
  {
    id: 3,
    username: 'finance@autosoft.com',
    password: 'finance1234',
    name: 'คุณประสิทธิ์ บัญชีดี',
    role: 'Finance Manager',
    department: 'Finance',
    avatar: 'ปบ',
    color: '#C4956A',
    access: ['finance', 'gpt', 'guardian'],
  },
  {
    id: 4,
    username: 'sales@autosoft.com',
    password: 'sales1234',
    name: 'คุณวิภา ขายเก่ง',
    role: 'Sales Manager',
    department: 'Sales',
    avatar: 'วข',
    color: '#3498DB',
    access: ['sales', 'marketing', 'meeting', 'gpt'],
  },
  {
    id: 5,
    username: 'staff@autosoft.com',
    password: 'staff1234',
    name: 'คุณมานะ ตั้งใจทำ',
    role: 'Staff',
    department: 'Operations',
    avatar: 'มต',
    color: '#9B59B6',
    access: ['gpt', 'meeting'],
  },
]

export function login(username: string, password: string) {
  const user = DEMO_USERS.find(
    u => u.username === username && u.password === password
  )
  if (user) {
    localStorage.setItem('autosoft_user', JSON.stringify(user))
    return { success: true, user }
  }
  return { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }
}

export function getUser() {
  if (typeof window === 'undefined') return null
  const u = localStorage.getItem('autosoft_user')
  return u ? JSON.parse(u) : null
}

export function logout() {
  localStorage.removeItem('autosoft_user')
}

export function hasAccess(user: any, module: string) {
  if (user?.access === 'all') return true
  return Array.isArray(user?.access) && user.access.includes(module)
}
