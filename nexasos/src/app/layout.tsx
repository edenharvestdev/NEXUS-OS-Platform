import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/theme'
import { DataProvider } from '@/lib/data'
import PWARegister from '@/components/PWARegister'

export const metadata: Metadata = {
  title: 'NEXUS OS — Enterprise Intelligence Platform',
  description: 'Data First → AI Later · ระบบปฏิบัติการองค์กรยุค AI สำหรับคลินิกและ SME',
  applicationName: 'NEXUS OS',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/icons/icon.svg'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NEXUS OS',
    startupImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f3ef' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f12' },
  ],
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
            <PWARegister />
          </DataProvider>
        </AppProvider>
      </body>
    </html>
  )
}
