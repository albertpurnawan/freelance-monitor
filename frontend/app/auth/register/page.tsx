"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiPostJson } from "@/lib/api"
import { showToast } from "@/lib/toast"
 

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async () => {
    setLoading(true); setError(null)
    const res = await apiPostJson("/api/auth/register", { email, password })
    setLoading(false)
    if (!res.ok) { setError((res.data as any)?.error || res.errorText || "Register failed"); return }
    // Show a toast, then redirect to login
    showToast('Registered successfully. Please login.')
    setTimeout(() => { window.location.href = '/auth/login' }, 400)
  }

  return (
    <div className="">
      <h1 className="text-3xl font-bold mb-4">Register</h1>
      <Card className="p-6 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        <Button disabled={loading} onClick={submit} className="w-full">{loading ? "Registering..." : "Register"}</Button>
      </Card>
    </div>
  )
}
