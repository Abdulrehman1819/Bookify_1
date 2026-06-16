import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { TopLoader } from '@/components/ui/TopLoader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bookify — Book appointments online',
  description: 'Find and book appointments with saloons, clinics, gyms and more.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <TopLoader />
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}
