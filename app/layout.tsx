import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Reckoning — Incident Investigation',
  description: 'AI that turns hours of log grinding into a 4-minute root cause',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
