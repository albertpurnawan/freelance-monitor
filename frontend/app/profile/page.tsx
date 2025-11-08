"use client"

import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiFetchJson } from "@/lib/api"
import { clearAuthToken } from "@/lib/auth"
import { getCookie } from "@/lib/cookies"
import Link from "next/link"

type MeResponse = { id: number; email: string; avatar_url?: string; created_at?: string; updated_at?: string }

export default function ProfilePage() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      const res = await apiFetchJson<MeResponse>("/api/me")
      setLoading(false)
      if (!mounted) return
      if (!res.ok) {
        setError(res.data && (res.data as any).error ? (res.data as any).error : res.errorText || "Unauthorized")
        setMe(null)
        return
      }
      setMe(res.data || null)
    })()
    return () => { mounted = false }
  }, [])

  const initial = useMemo(() => (me?.email || "").charAt(0).toUpperCase() || "U", [me])

  const logout = async () => {
    try {
      const csrf = getCookie('csrf_token')
      if (csrf) {
        await fetch((process.env.NEXT_PUBLIC_BACKEND_URL || '') + '/api/auth/logout', {
          method: 'POST',
          headers: { 'X-CSRF-Token': csrf },
          credentials: 'include',
        })
      }
    } catch {}
    clearAuthToken()
    window.location.href = '/auth/login'
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-xl">
          <h1 className="text-3xl font-bold mb-6">Profile</h1>
          <Card className="p-6 space-y-6">
            {loading && <p>Loading...</p>}
            {!loading && error && (
              <div className="space-y-2">
                <p className="text-red-600">{error}</p>
                <p className="text-sm">You may need to <Link className="underline" href="/auth/login">login</Link>.</p>
              </div>
            )}
            {!loading && me && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {me.avatar_url ? (
                    <img src={me.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full border object-cover" />
                  ) : (
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary text-foreground/80 border text-xl font-semibold">
                      {initial}
                    </div>
                  )}
                  <div>
                    <div className="text-lg font-medium">{me.email}</div>
                    <div className="text-sm text-muted-foreground">User ID: {me.id}</div>
                    {me.created_at && (
                      <div className="text-xs text-muted-foreground">Joined: {new Date(me.created_at).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
                <div className="pt-2">
                  <Button variant="outline" onClick={logout}>Logout</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
