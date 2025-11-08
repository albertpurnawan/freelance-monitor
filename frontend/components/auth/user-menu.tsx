"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetchJson } from "@/lib/api"

type Me = { email?: string }

export function UserMenu() {
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const res = await apiFetchJson<Me>("/api/me")
      if (!mounted) return
      if (res.ok) setMe(res.data || {})
      else setMe(null)
    })()
    return () => { mounted = false }
  }, [])

  const initial = (me?.email || "").charAt(0).toUpperCase() || "U"
  const isAuthed = !!me
  const href = isAuthed ? "/profile" : "/auth/login"

  return (
    <Link href={href} className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-foreground/80 border hover:opacity-90 transition">
      <span className="text-sm font-medium select-none">{initial}</span>
    </Link>
  )
}
