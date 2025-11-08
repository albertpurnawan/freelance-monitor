"use client"

import { useEffect } from "react"

export function getTokenExpiry(): number | null {
  if (typeof window === "undefined") return null
  const exp = localStorage.getItem("auth_expires_at")
  if (!exp) return null
  const n = Number(exp)
  return Number.isFinite(n) ? n : null
}

export function setAuthToken(token: string, expiresAtUnix?: number) {
  if (typeof window === "undefined") return
  localStorage.setItem("auth_token", token)
  if (expiresAtUnix) localStorage.setItem("auth_expires_at", String(expiresAtUnix))
}

export function clearAuthToken() {
  if (typeof window === "undefined") return
  localStorage.removeItem("auth_token")
  localStorage.removeItem("auth_expires_at")
}

export function useAuthTokenWatcher() {
  useEffect(() => {
    const check = () => {
      const exp = getTokenExpiry()
      if (!exp) return
      const now = Math.floor(Date.now() / 1000)
      if (now >= exp) {
        clearAuthToken()
        // Optionally redirect to login
        try { window.dispatchEvent(new CustomEvent("auth:expired")) } catch {}
      }
    }
    const id = setInterval(check, 5000)
    return () => clearInterval(id)
  }, [])
}

