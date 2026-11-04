import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import '../styles/star-night.css'

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

const REMIX_ICON_FIX_CSS = `
/* Ensure RemixIcon is rendered consistently in all browsers */
i[class^="ri-"], i[class*=" ri-"],
span[class^="ri-"], span[class*=" ri-"],
[class^="ri-"], [class*=" ri-"] {
  font-family: 'remixicon' !important;
  font-style: normal !important;
  font-weight: normal !important;
  font-variant: normal !important;
  text-transform: none !important;
  line-height: 1 !important;
  speak: none !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
  display: inline-block !important;
  vertical-align: middle !important;
}

@font-face {
  font-family: "remixicon";
  src: url('https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.woff2') format('woff2'),
       url('https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.woff') format('woff');
  font-display: swap;
}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const rootFontCss = `
html {
  font-family: ${GeistSans.style.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
  `

  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" crossOrigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: REMIX_ICON_FIX_CSS }} />
        <style dangerouslySetInnerHTML={{ __html: rootFontCss }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
      </body>
    </html>
  )
}

