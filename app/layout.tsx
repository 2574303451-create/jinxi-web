import type { Metadata, Viewport } from 'next'
import { SiteDocument } from '../components/site-document'

import './globals.css'
import '../styles/guild-theme.css'
import '../styles/community-components.css'

export const metadata: Metadata = {
  title: '今夕公会 · 今晚开黑，星光作陪',
  description: '弹弹堂今夕公会。认识并肩作战的伙伴，交流攻略，记录属于我们的高光时刻。',
  generator: 'Jinxi Guild Web',
  robots: 'noindex, nofollow, noarchive, nosnippet, noimageindex',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteDocument>{children}</SiteDocument>
}
