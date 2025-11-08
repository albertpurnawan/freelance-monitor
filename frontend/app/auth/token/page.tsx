"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { DevOnly, DevBanner } from "@/components/dev-only"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function AuthTokenPage() {
  const [token, setToken] = useState("")
  const [stored, setStored] = useState<string | null>(null)

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
    setStored(t)
  }, [])

  const saveToken = () => {
    if (token.trim().length === 0) return
    localStorage.setItem("auth_token", token.trim())
    setStored(token.trim())
    setToken("")
    alert("Auth token saved. Protected API calls will include it.")
  }

  const clearToken = () => {
    localStorage.removeItem("auth_token")
    setStored(null)
    alert("Auth token cleared.")
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <DevBanner />
        <DevOnly>
        <div className="p-8 max-w-2xl">
          <h1 className="text-3xl font-bold mb-2">Authentication</h1>
          <p className="text-muted-foreground mb-6">
            Paste a valid JWT to authenticate requests to protected backend endpoints.
          </p>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jwt">JWT Bearer Token</Label>
              <Input
                id="jwt"
                type="text"
                placeholder="eyJhbGciOi..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveToken} className="flex-1">Save Token</Button>
              <Button onClick={clearToken} variant="outline" className="flex-1 bg-transparent">Clear Token</Button>
            </div>
          </Card>

          <Card className="p-6 mt-6">
            <h2 className="text-xl font-semibold mb-2">Current Status</h2>
            {stored ? (
              <p className="text-sm break-all">
                Token present: {stored.substring(0, 24)}... (length {stored.length})
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No token saved</p>
            )}
          </Card>
        </div>
        </DevOnly>
      </main>
    </div>
  )
}
