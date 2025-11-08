"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { DevOnly, DevBanner } from "@/components/dev-only"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signHS256 } from "@/lib/jwt"

export default function DevLoginPage() {
  const [secret, setSecret] = useState("")
  const [subject, setSubject] = useState("")
  const [expiresIn, setExpiresIn] = useState(3600)
  const [issued, setIssued] = useState<string | null>(null)

  useEffect(() => {
    const s = typeof window !== "undefined" ? localStorage.getItem("dev_jwt_secret") : null
    if (s) setSecret(s)
  }, [])

  const generate = async () => {
    if (!secret) {
      alert("Enter JWT secret (must match backend JWT_SECRET)")
      return
    }
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: subject || "dev-user",
      iat: now,
      exp: now + Number(expiresIn || 3600),
    }
    const token = await signHS256(payload, secret)
    localStorage.setItem("auth_token", token)
    localStorage.setItem("dev_jwt_secret", secret)
    setIssued(token)
    alert("Token generated and saved.")
  }

  const clear = () => {
    localStorage.removeItem("auth_token")
    setIssued(null)
    alert("Token cleared.")
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <DevBanner />
        <DevOnly>
        <div className="p-8 max-w-2xl">
          <h1 className="text-3xl font-bold mb-2">Dev Login (JWT)</h1>
          <p className="text-muted-foreground mb-6">
            Generate a test JWT signed with HS256. For local development only — do not use in production.
          </p>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="secret">JWT Secret</Label>
              <Input id="secret" type="password" placeholder="match backend JWT_SECRET" value={secret} onChange={e => setSecret(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub">Subject (sub)</Label>
              <Input id="sub" value={subject} onChange={e => setSubject(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp">Expires In (seconds)</Label>
              <Input id="exp" type="number" value={expiresIn} onChange={e => setExpiresIn(Number(e.target.value))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={generate} className="flex-1">Generate & Save Token</Button>
              <Button onClick={clear} variant="outline" className="flex-1 bg-transparent">Clear Token</Button>
            </div>
          </Card>

          {issued && (
            <Card className="p-6 mt-6">
              <h2 className="text-xl font-semibold mb-2">Issued Token</h2>
              <p className="text-sm break-all">{issued}</p>
            </Card>
          )}
        </div>
        </DevOnly>
      </main>
    </div>
  )}
