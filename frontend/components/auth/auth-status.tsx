"use client"

import { useAuthTokenWatcher } from "@/lib/auth"
import { useEffect, useState } from "react"

export function AuthStatus() {
  useAuthTokenWatcher()
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    const onExpired = () => { setExpired(true) }
    window.addEventListener("auth:expired", onExpired as any)
    return () => window.removeEventListener("auth:expired", onExpired as any)
  }, [])
  if (!expired) return null
  return <div className="p-2 text-sm bg-yellow-100 text-yellow-900">Session expired. Please login again.</div>
}

