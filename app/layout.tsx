import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ticket Scanner',
  description: 'Scan tickets and verify their validity',
  generator: 'Srikar Kopparapu',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Add the favicon */}
        <link rel="icon" href="/MassMirchi.png" type="image/png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
