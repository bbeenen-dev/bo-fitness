import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BO Fitness',
  description: 'Persoonlijke workout tracker & voortgang',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  )
}