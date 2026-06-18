import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/theme'
import { DataProvider } from '@/lib/data'

export const metadata: Metadata = {
  title: 'NEXUS OS — Enterprise Intelligence Platform',
  description: 'Data First → AI Later · ระบบปฏิบัติการองค์กรยุค AI สำหรับคลินิกและ SME',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <AppProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AppProvider>
      </body>
    </html>
  )
}
