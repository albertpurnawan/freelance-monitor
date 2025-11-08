"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getTokenExpiry, clearAuthToken } from "@/lib/auth"

const devBypass = process.env.NEXT_PUBLIC_DEV_ALLOW_UNAUTH === "true"

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => {
      if (devBypass) { setOk(true); return }
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      const exp = getTokenExpiry()
      const now = Math.floor(Date.now() / 1000)
      if (!token || (exp && now >= exp)) {
        clearAuthToken()
        setOk(false)
        router.replace("/auth/login")
        return
      }
      setOk(true)
    }
    check()
    const onExpired = () => {
      if (devBypass) return
      setOk(false)
      router.replace("/auth/login")
    }
    window.addEventListener("auth:expired", onExpired as any)
    return () => window.removeEventListener("auth:expired", onExpired as any)
  }, [router])

  if (ok === null) return <div className="p-8 text-sm text-muted-foreground">Checking authentication…</div>
  if (!ok) return null
  return <>{children}</>
}
