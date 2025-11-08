"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiPostJson } from "@/lib/api"
import { setAuthToken } from "@/lib/auth"
import { getCookie } from "@/lib/cookies"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  

  const submit = async () => {
    setLoading(true)
    setError(null)
    type LoginResponse = { token?: string; expires_at?: number; csrf_token?: string; error?: string }
    const res = await apiPostJson<LoginResponse>("/api/auth/login", { email, password })
    setLoading(false)
    if (!res.ok) {
      setError(res.data?.error || res.errorText || "Login failed")
      return
    }
    const token = res.data?.token
    const exp = res.data?.expires_at
    // When using cookie mode (AUTH_COOKIE=true), token may be stored in HttpOnly cookie; keep localStorage fallback for header mode.
    if (token) {
      setAuthToken(token, exp)
    }
    // Best-effort: if cookie present, proceed
    const cookieToken = getCookie("auth_token")
    if (cookieToken || token) {
      router.push("/profile")
    }
  }

  return (
    <div className="">
      <h1 className="text-3xl font-bold mb-4">Login</h1>
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
            <Button disabled={loading} onClick={submit} className="w-full">{loading ? "Logging in..." : "Login"}</Button>
            <div className="flex justify-between text-sm">
              <Link href="/auth/register" className="underline">Create account</Link>
              <Link href="/auth/reset" className="underline">Forgot password?</Link>
            </div>
      </Card>
    </div>
  )
}
