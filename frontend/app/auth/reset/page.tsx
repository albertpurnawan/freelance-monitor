"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiPostJson } from "@/lib/api"

export default function ResetPage() {
  const [email, setEmail] = useState("")
  const [stage, setStage] = useState<"request" | "confirm">("request")
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const params = useSearchParams()

  useEffect(() => {
    const t = params?.get("token")
    if (t) {
      setToken(t)
      setStage("confirm")
    }
  }, [params])

  const requestReset = async () => {
    setError(null); setMsg(null)
    const res = await apiPostJson<any>("/api/auth/reset/request", { email })
    if (!res.ok) { setError((res.data as any)?.error || res.errorText || "Request failed"); return }
    setMsg("If the email exists, a reset link has been sent. In dev, token may be shown in response.")
    const t = (res.data as any)?.token
    if (t) setToken(t)
    setStage("confirm")
  }

  const confirm = async () => {
    setError(null); setMsg(null)
    const res = await apiPostJson<any>("/api/auth/reset/confirm", { token, new_password: newPassword })
    if (!res.ok) { setError((res.data as any)?.error || res.errorText || "Reset failed"); return }
    setMsg("Password updated. You can login now.")
  }

  return (
    <div className="">
      <h1 className="text-3xl font-bold mb-4">Reset Password</h1>
      <Card className="p-6 space-y-4">
            {msg && <p className="text-green-700">{msg}</p>}
            {error && <p className="text-red-600">{error}</p>}
            {stage === "request" ? (
              <>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <Button onClick={requestReset} className="w-full">Request reset</Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Token</Label>
                  <Input value={token} onChange={e => setToken(e.target.value)} placeholder="paste token" />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <Button onClick={confirm} className="w-full">Confirm</Button>
              </>
            )}
      </Card>
    </div>
  )
}
