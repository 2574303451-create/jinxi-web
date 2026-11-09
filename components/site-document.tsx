import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

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

export function SiteDocument({
  children,
  externalAssets = true,
}: Readonly<{
  children: React.ReactNode
  externalAssets?: boolean
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
        {externalAssets && <><link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet" crossOrigin="anonymous" precedence="icons" />
        <style href="jinxi-remix-icon-fix" precedence="icons">{REMIX_ICON_FIX_CSS}</style></>}
        <style href="jinxi-root-fonts" precedence="icons">{rootFontCss}</style>
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
      </body>
    </html>
  )
}

