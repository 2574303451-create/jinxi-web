import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import SecurityProvider from '../components/security/security-provider'
import BaiduAnalytics from '../components/analytics/baidu-analytics'

export const metadata: Metadata = {
  title: '弹弹堂-今夕公会官网',
  description: 'Created with v0',
  generator: '弹弹堂-今夕公会官网',
  charset: 'utf-8',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" crossOrigin="anonymous" />
        <style>{`
          /* 确保 RemixIcon 正确加载 - 更强制的样式 */
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
          
          /* 确保字体能够正确下载 */
          @font-face {
            font-family: "remixicon";
            src: url('https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.woff2') format('woff2'),
                 url('https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.woff') format('woff');
            font-display: swap;
          }
        `}</style>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700;900&family=ZCOOL+KuaiLe&family=Ma+Shan+Zheng&display=swap"
          rel="stylesheet"
        />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <SecurityProvider>
          <BaiduAnalytics />
          {children}
        </SecurityProvider>
      </body>
    </html>
  )
}
