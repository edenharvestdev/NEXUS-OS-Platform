'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { DataProvider } from '@/lib/data'

// ─── Types ────────────────────────────────────────────────────────
type Theme = 'dark' | 'light'
type Lang  = 'th' | 'en'

interface AppContextType {
  theme: Theme
  lang: Lang
  toggleTheme: () => void
  toggleLang: () => void
  t: (key: string) => string
  colors: typeof darkColors
}

// ─── Color Palettes ───────────────────────────────────────────────
export const darkColors = {
  bg:         '#0A0604',
  bg2:        'rgba(19, 12, 6, 0.5)',
  bg3:        'rgba(28, 17, 8, 0.4)',
  sidebar:    'rgba(16, 10, 5, 0.4)',
  surface:    'rgba(255,255,255,0.03)',
  surface2:   'rgba(255,255,255,0.06)',
  border:     'rgba(255,255,255,0.06)',
  border2:    'rgba(255,255,255,0.12)',
  gold:       '#E2B989',
  gold2:      '#B48648',
  goldLight:  'rgba(196,149,106,0.15)',
  text:       'rgba(255,255,255,0.92)',
  text2:      'rgba(255,255,255,0.60)',
  text3:      'rgba(255,255,255,0.35)',
  green:      '#4CAF7D',
  greenL:     'rgba(76,175,125,0.12)',
  red:        '#E05252',
  redL:       'rgba(224,82,82,0.12)',
  blue:       '#4A9EDB',
  blueL:      'rgba(74,158,219,0.12)',
  purple:     '#9B72CF',
  purpleL:    'rgba(155,114,207,0.12)',
  shadow:     '0 8px 32px rgba(0,0,0,0.5)',
}

export const lightColors = {
  bg:         '#FFFFFF',
  bg2:        'rgba(255, 255, 255, 0.5)',
  bg3:        'rgba(243, 244, 246, 0.4)',
  sidebar:    'rgba(255, 255, 255, 0.4)',
  surface:    'rgba(255, 255, 255, 0.6)',
  surface2:   'rgba(249, 250, 251, 0.7)',
  border:     'rgba(0,0,0,0.05)',
  border2:    'rgba(0,0,0,0.1)',
  gold:       '#B48648',
  gold2:      '#9C713B',
  goldLight:  'rgba(180,134,72,0.1)',
  text:       '#111827',
  text2:      '#4B5563',
  text3:      '#9CA3AF',
  green:      '#059669',
  greenL:     'rgba(5,150,105,0.1)',
  red:        '#DC2626',
  redL:       'rgba(220,38,38,0.1)',
  blue:       '#2563EB',
  blueL:      'rgba(37,99,235,0.1)',
  purple:     '#7C3AED',
  purpleL:    'rgba(124,58,237,0.1)',
  shadow:     '0 4px 24px rgba(0,0,0,0.04)',
}

// ─── Translations ─────────────────────────────────────────────────
const translations: Record<Lang, Record<string, string>> = {
  th: {
    // Nav
    'nav.home':       'หน้าหลัก',
    'nav.dashboard':  'แดชบอร์ด',
    'nav.people':     'บุคลากร',
    'nav.finance':    'การเงิน',
    'nav.sales':      'ขาย',
    'nav.marketing':  'การตลาด',
    'nav.meeting':    'สรุปการประชุม',
    'nav.gpt':        'ที่ปรึกษาผู้บริหาร',
    'nav.guardian':   'ตรวจสัญญา',
    'nav.ai':         'ศูนย์ควบคุม AI',
    'nav.settings':   'ตั้งค่า',
    'nav.worklog':    'บันทึกงาน',
    'nav.skills':     'ทักษะ',
    'nav.feasibility':'จำลองอนาคต',
    'nav.ingest':     'นำเข้าข้อมูล',
    'nav.taxonomy':   'พจนานุกรมข้อมูล',
    'nav.audit':      'ความปลอดภัย',
    'nav.staff':      'หน้าหลัก',
    'nav.mydata':     'ข้อมูลของฉัน',
    'nav.myai':       'AI ส่วนตัว',
    'nav.deptai':     'AI แผนก',
    'nav.onboarding': 'ตั้งค่าองค์กร',
    'nav.memory':     'ค้นหาความรู้',
    'nav.readiness':  'สุขภาพองค์กร',
    'nav.menu':       'เมนู',
    'nav.section.org':      'ข้อมูลองค์กร',
    'nav.section.reports':  'รายงาน',
    'nav.section.settings': 'ตั้งค่า',
    'nav.company':      'ข้อมูลบริษัท',
    'nav.hrOrg':        'โครงสร้างองค์กร',
    'nav.payroll':      'เงินเดือน',
    'nav.attendance':   'ลงเวลา',
    'nav.hrLeave':      'จัดการลา',
    'nav.leaveQuotas':  'โควตาการลา',
    'nav.overtime':     'ล่วงเวลา (OT)',
    'nav.todos':        'งานที่ต้องทำ',
    'nav.advances':     'เบิกล่วงหน้า',
    'nav.userGroups':   'กลุ่มผู้ใช้',
    'nav.settingsShifts': 'กะการทำงาน',
    'nav.settingsPayroll': 'ตั้งค่าเงินเดือน',
    'nav.settingsLeaveWf': 'อนุมัติลา 8 ขั้น',
    'nav.settingsAttLoc': 'จุดลงเวลา GPS/QR',
    'nav.usersAdmin':   'ผู้ใช้งาน',
    'nav.domain':       'โดเมน',
    'nav.support':      'ช่วยเหลือ',
    'nav.report.annualTime':    'รายงานเวลาประจำปี',
    'nav.report.groupPeople':   'รายงานบุคลากร',
    'nav.report.peopleRegistry': 'ทะเบียนบุคลากร',
    'nav.report.salaryChange':  'เปลี่ยนแปลงเงินเดือน',
    'nav.report.groupTime':     'รายงานเวลา',
    'nav.report.timeCalc':      'คำนวณเวลา',
    'nav.report.attendance':    'ลงเวลา',
    'nav.report.groupLeave':    'รายงานลา',
    'nav.report.leaveQuota':    'โควต้าลา',
    'nav.report.groupPayroll':  'รายงานเงินเดือน',
    'nav.report.payrollPeriod': 'เงินเดือนสุทธิ (งวด)',
    'nav.report.payrollAnnual': 'เงินเดือนสุทธิ (ปี)',
    'nav.report.groupSso':      'รายงานประกันสังคม',
    'nav.report.ssoMonthly':    'ประกันสังคมรายเดือน',
    'nav.report.ssoKt20':       'กท.20',
    'nav.report.groupTax':      'รายงานภาษี',
    'nav.report.taxPnd1':       'ภงด.1',
    'nav.report.taxPnd1k':      'ภงด.1ก',
    'nav.report.taxPnd3':       'ภงด.3',
    'nav.report.groupAccounting': 'รายงานบัญชี',
    'nav.report.accountingNet': 'เงินเดือนสุทธิ',
    'nav.report.accountingDept': 'แยกตามแผนก',
    // Nav sections
    'nav.section.work':   'งานของฉัน',
    'nav.section.ai':     'AI',
    'nav.section.dept':   'แผนก',
    'nav.section.exec':   'ผู้บริหาร',
    'nav.section.daily':  'งานของฉัน',
    'nav.section.tools':  'AI',
    'nav.section.admin':  'ผู้บริหาร',
    'nav.section.self':  'SELF-SERVICE',
    'nav.section.modules': 'MODULES',
    'nav.section.system':  'SYSTEM',
    // Header
    'header.search':    'ค้นหาทั้งระบบ...',
    'header.company':   'บริษัท',
    'impersonate.active': 'กำลังสวมสิทธิ์',
    'impersonate.adminHint': 'โหมดผู้ดูแล — สลับดูมุมมองพนักงานได้',
    'impersonate.switch': 'สลับผู้ใช้',
    'impersonate.stop': 'ออกจากโหมดสวมสิทธิ์',
    'impersonate.empty': 'ไม่พบรายชื่อพนักงาน',
    // Dashboard
    'dash.greeting':    'สวัสดีตอนเช้า, คุณ',
    'dash.pending':     'งาน รอดำเนินการ',
    'dash.ask_ai':      'ถาม AI',
    'dash.summarize':   'สรุปประชุม',
    'dash.upload':      'อัพโลดใบเสร็จ',
    'dash.modules':     'Modules',
    'dash.tasks':       'Tasks วันนี้',
    'dash.ai_activity': 'AI Activity',
    'dash.ai_saved':    'AI ประหยัดให้คุณวันนี้',
    'dash.ai_actions':  'จาก 342 actions อัตโนมัติ',
    'dash.target':      '% ของเป้าหมายรายเดือน',
    // KPIs
    'kpi.employees':   'พนักงานทั้งหมด',
    'kpi.revenue':     'รายได้เดือนนี้',
    'kpi.pipeline':    'Sales Pipeline',
    'kpi.ai_actions':  'AI Actions วันนี้',
    'kpi.deals':       '18 deals active',
    'kpi.save':        'ประหยัด ฿24K',
    // Login
    'login.tagline':   'ENTERPRISE INTELLIGENCE PLATFORM',
    'login.hero1':     'เปลี่ยนข้อมูลกระจัด',
    'login.hero2':     'ให้ AI เข้าใจองค์กร',
    'login.desc':      'NEXUS OS — จัดหมวดข้อมูลเป็นมาตรฐาน (Data First) แล้วค่อยเชื่อม AI Agent ทีมละแผนก · Beachhead: คลินิก & SME',
    'login.trust':     'Data First → AI Later',
    'login.tab_in':    'เข้าสู่ระบบ',
    'login.tab_up':    'สมัครใช้งาน',
    'login.welcome':   'ยินดีต้อนรับกลับ 👋',
    'login.sub':       'เข้าสู่ระบบเพื่อจัดการธุรกิจของคุณ',
    'login.email':     'อีเมล',
    'login.password':  'รหัสผ่าน',
    'login.forgot':    'ลืมรหัสผ่าน?',
    'login.remember':  'จดจำฉันไว้ 30 วัน',
    'login.btn_in':    'เข้าสู่ระบบ →',
    'login.loading':   'กำลังเข้าสู่ระบบ...',
    'login.or':        'หรือ',
    'login.demo':      '🎮 ทดลองใช้ Demo Account',
    'login.signup_title': 'สร้างบัญชีใหม่ ✨',
    'login.signup_sub':   'ทดลองใช้ฟรี 14 วัน — ไม่ต้องใส่บัตรเครดิต',
    'login.name':      'ชื่อ-นามสกุล',
    'login.company':   'ชื่อบริษัท',
    'login.btn_up':    'เริ่มใช้งานฟรี →',
    'login.terms':     'โดยการสมัคร คุณยอมรับ',
    'login.and':       'และ',
    'login.tos':       'Terms of Service',
    'login.privacy':   'Privacy Policy',
    // Features
    'feat.ai_title':   'L2 AI Agent Workforce',
    'feat.ai_sub':     'ทีม AI เฉพาะทางต่อแผนก — Copilot ไม่ใช่ Autopilot',
    'feat.sec_title':  'T0–T3 Security Tier',
    'feat.sec_sub':    'Least Privilege · Audit Trail · PDPA-ready',
    'feat.setup_title':'L0 Data Taxonomy',
    'feat.setup_sub':  'Universal Data Model 6 Layer — โครงเดียวทุกอุตสาหกรรม',
    // Common
    'common.logout':   'ออกจากระบบ',
    'common.save':     'บันทึก',
    'common.cancel':   'ยกเลิก',
    'common.add':      'เพิ่ม',
    'common.delete':   'ลบ',
    'common.edit':     'แก้ไข',
    'common.view':     'ดู',
    'common.search':   'ค้นหา',
  },
  en: {
    'nav.home':       'Home',
    'nav.dashboard':  'Dashboard',
    'nav.people':     'People',
    'nav.finance':    'Finance',
    'nav.sales':      'Sales',
    'nav.marketing':  'Marketing',
    'nav.meeting':    'Meeting Summary',
    'nav.gpt':        'Executive AI',
    'nav.guardian':   'Contract Review',
    'nav.ai':         'AI Control',
    'nav.settings':   'Settings',
    'nav.worklog':    'Work Log',
    'nav.skills':     'Skills',
    'nav.feasibility':'Feasibility',
    'nav.ingest':     'Data Import',
    'nav.taxonomy':   'Data Dictionary',
    'nav.audit':      'Security',
    'nav.staff':      'Home',
    'nav.mydata':     'My Data',
    'nav.myai':       'Personal AI',
    'nav.deptai':     'Department AI',
    'nav.onboarding': 'Org Setup',
    'nav.memory':     'Knowledge Search',
    'nav.readiness':  'Org Health',
    'nav.menu':       'Menu',
    'nav.section.org':      'ORGANIZATION',
    'nav.section.reports':  'REPORTS',
    'nav.section.settings': 'SETTINGS',
    'nav.company':      'Company Info',
    'nav.hrOrg':        'Org Structure',
    'nav.payroll':      'Payroll',
    'nav.attendance':   'Attendance',
    'nav.hrLeave':      'Leave Management',
    'nav.leaveQuotas':  'Leave Quotas',
    'nav.overtime':     'Overtime (OT)',
    'nav.todos':        'My Tasks',
    'nav.advances':     'Advances',
    'nav.userGroups':   'User Groups',
    'nav.settingsShifts': 'Work Shifts',
    'nav.settingsPayroll': 'Payroll Settings',
    'nav.settingsLeaveWf': 'Leave Workflow (8 steps)',
    'nav.settingsAttLoc': 'Attendance GPS/QR',
    'nav.usersAdmin':   'Users',
    'nav.domain':       'Domain',
    'nav.support':      'Help',
    'nav.report.annualTime':    'Annual Time Report',
    'nav.report.groupPeople':   'People Reports',
    'nav.report.peopleRegistry': 'Employee Registry',
    'nav.report.salaryChange':  'Salary Changes',
    'nav.report.groupTime':     'Time Reports',
    'nav.report.timeCalc':      'Time Calculation',
    'nav.report.attendance':    'Attendance',
    'nav.report.groupLeave':    'Leave Reports',
    'nav.report.leaveQuota':    'Leave Quota',
    'nav.report.groupPayroll':  'Payroll Reports',
    'nav.report.payrollPeriod': 'Net Pay (Period)',
    'nav.report.payrollAnnual': 'Net Pay (Annual)',
    'nav.report.groupSso':      'Social Security',
    'nav.report.ssoMonthly':    'SSO Monthly',
    'nav.report.ssoKt20':       'KT.20',
    'nav.report.groupTax':      'Tax Reports',
    'nav.report.taxPnd1':       'PND.1',
    'nav.report.taxPnd1k':      'PND.1K',
    'nav.report.taxPnd3':       'PND.3',
    'nav.report.groupAccounting': 'Accounting',
    'nav.report.accountingNet': 'Net Payroll',
    'nav.report.accountingDept': 'แยกตามแผนก',
    'nav.section.work':   'MY WORK',
    'nav.section.ai':     'AI',
    'nav.section.dept':   'DEPARTMENTS',
    'nav.section.exec':   'EXECUTIVE',
    'nav.section.daily':  'MY WORK',
    'nav.section.tools':  'AI',
    'nav.section.admin':  'EXECUTIVE',
    'nav.section.self':  'SELF-SERVICE',
    'nav.section.modules': 'MODULES',
    'nav.section.system':  'SYSTEM',
    'header.search':    'Search everything...',
    'header.company':   'Company',
    'impersonate.active': 'Viewing as',
    'impersonate.adminHint': 'Admin mode — switch to another employee view',
    'impersonate.switch': 'Switch user',
    'impersonate.stop': 'Exit impersonation',
    'impersonate.empty': 'No employees found',
    'dash.greeting':    'Good morning,',
    'dash.pending':     'tasks pending',
    'dash.ask_ai':      'Ask AI',
    'dash.summarize':   'Summarize Meeting',
    'dash.upload':      'Upload Receipt',
    'dash.modules':     'Modules',
    'dash.tasks':       "Today's Tasks",
    'dash.ai_activity': 'AI Activity',
    'dash.ai_saved':    'AI Saved You Today',
    'dash.ai_actions':  'From 342 automated actions',
    'dash.target':      '% of monthly target',
    'kpi.employees':   'Total Employees',
    'kpi.revenue':     'Monthly Revenue',
    'kpi.pipeline':    'Sales Pipeline',
    'kpi.ai_actions':  'AI Actions Today',
    'kpi.deals':       '18 deals active',
    'kpi.save':        'Saved ฿24K',
    'login.tagline':   'ENTERPRISE INTELLIGENCE PLATFORM',
    'login.hero1':     'From Data Chaos',
    'login.hero2':     'to AI that understands',
    'login.desc':      'NEXUS OS — Standardize data taxonomy first (Data First), then connect per-dept AI agents. Beachhead: Clinic & SME.',
    'login.trust':     'Data First → AI Later',
    'login.tab_in':    'Sign In',
    'login.tab_up':    'Sign Up',
    'login.welcome':   'Welcome back 👋',
    'login.sub':       'Sign in to manage your business',
    'login.email':     'Email',
    'login.password':  'Password',
    'login.forgot':    'Forgot password?',
    'login.remember':  'Remember me for 30 days',
    'login.btn_in':    'Sign In →',
    'login.loading':   'Signing in...',
    'login.or':        'or',
    'login.demo':      '🎮 Try Demo Account',
    'login.signup_title': 'Create New Account ✨',
    'login.signup_sub':   '14-day free trial — No credit card required',
    'login.name':      'Full Name',
    'login.company':   'Company Name',
    'login.btn_up':    'Start Free →',
    'login.terms':     'By signing up, you agree to our',
    'login.and':       'and',
    'login.tos':       'Terms of Service',
    'login.privacy':   'Privacy Policy',
    'feat.ai_title':   'L2 AI Agent Workforce',
    'feat.ai_sub':     'Per-dept agents — Copilot, not Autopilot',
    'feat.sec_title':  'T0–T3 Security Tier',
    'feat.sec_sub':    'Least Privilege · Audit · PDPA-ready',
    'feat.setup_title':'L0 Data Taxonomy',
    'feat.setup_sub':  'Universal 6-Layer Model — same schema, any industry',
    'common.logout':   'Sign Out',
    'common.save':     'Save',
    'common.cancel':   'Cancel',
    'common.add':      'Add',
    'common.delete':   'Delete',
    'common.edit':     'Edit',
    'common.view':     'View',
    'common.search':   'Search',
  },
}

// ─── Context ──────────────────────────────────────────────────────

const AppContext = createContext<AppContextType>({
  theme: 'dark', lang: 'th',
  toggleTheme: () => {}, toggleLang: () => {},
  t: (k) => k, colors: darkColors,
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [lang,  setLang]  = useState<Lang>('th')

  useEffect(() => {
    const savedTheme = ((localStorage.getItem('nexasos_theme') || localStorage.getItem('autosoft_theme')) as Theme) || 'dark'
    const savedLang  = ((localStorage.getItem('nexasos_lang') || localStorage.getItem('autosoft_lang')) as Lang) || 'th'
    setTheme(savedTheme)
    setLang(savedLang)
  }, [])

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light-mode' : ''
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('nexasos_theme', next)
  }

  const toggleLang = () => {
    const next = lang === 'th' ? 'en' : 'th'
    setLang(next)
    localStorage.setItem('nexasos_lang', next)
  }

  const t = (key: string) => translations[lang][key] ?? translations['th'][key] ?? key

  const colors = theme === 'dark' ? darkColors : lightColors

  return (
    <AppContext.Provider value={{ theme, lang, toggleTheme, toggleLang, t, colors }}>
      <div
        className="app-root"
        style={{
          position: 'relative',
          zIndex: 0,
          isolation: 'isolate',
          background: colors.bg,
          color: colors.text,
          minHeight: '100vh',
        }}
      >
        <DataProvider>
          {children}
        </DataProvider>
      </div>
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
