import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'NEXUS OS',
    short_name: 'NEXUS',
    description: 'Data First → AI Later · ระบบปฏิบัติการองค์กรยุค AI สำหรับคลินิกและ SME',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: '#0f0f12',
    theme_color: '#0f0f12',
    lang: 'th',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'บันทึกงาน',
        short_name: 'ส่งงาน',
        url: '/dashboard/worklog',
        icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      {
        name: 'ถาม AI',
        short_name: 'AI',
        url: '/dashboard/my-ai',
        icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      {
        name: 'หน้าหลัก',
        short_name: 'หน้าหลัก',
        url: '/',
        icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    ],
    screenshots: [],
  }
}
