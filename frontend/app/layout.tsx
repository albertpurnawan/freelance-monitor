import type { Metadata } from 'next'
import { AuthStatus } from "@/components/auth/auth-status"
import { AuthGate } from "@/components/auth/auth-gate"
import { UserMenu } from "@/components/auth/user-menu"
import { ToastContainer } from "@/components/ui/toast"
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import 'react-day-picker/dist/style.css'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <div className="fixed top-0 right-0 p-3 z-50">
          <UserMenu />
        </div>
        <AuthStatus />
        <AuthGate>
          {children}
        </AuthGate>
        <Analytics />
        <ToastContainer />
      </body>
    </html>
  )
}
