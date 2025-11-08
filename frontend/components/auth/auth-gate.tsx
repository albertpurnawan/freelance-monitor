"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getTokenExpiry, clearAuthToken } from "@/lib/auth"

const devBypass = process.env.NEXT_PUBLIC_DEV_ALLOW_UNAUTH === "true"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    const isAuthRoute = pathname?.startsWith("/auth")
    if (devBypass || isAuthRoute) { setOk(true); return }
    // Prefer cookie presence if backend set AUTH_COOKIE=true
    const cookieToken = typeof document !== 'undefined' ? document.cookie.includes('auth_token=') : false
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    const exp = getTokenExpiry()
    const now = Math.floor(Date.now() / 1000)
    if ((!token && !cookieToken) || (exp && now >= exp)) {
      clearAuthToken()
      setOk(false)
      router.replace("/auth/login")
      return
    }
    setOk(true)
  }, [pathname, router])

  if (ok === null) return <div className="p-2 text-xs text-muted-foreground">Loading…</div>
  if (!ok) return null
  return <>{children}</>
}
