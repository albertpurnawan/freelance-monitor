"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { BarChart3, Users, FileText, Bell, Settings, Home, LogIn, UserPlus, KeyRound, CalendarDays, Server } from "lucide-react"
import { cn } from "@/lib/utils"
import { getTokenExpiry } from "@/lib/auth"
const devAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true"

export function Sidebar() {
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const check = () => {
      const cookieToken = typeof document !== 'undefined' ? document.cookie.includes('auth_token=') : false
      const lsToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      const exp = getTokenExpiry()
      const now = Math.floor(Date.now() / 1000)
      const valid = (cookieToken || !!lsToken) && (!exp || now < exp)
      setAuthed(valid)
    }
    check()
    const onExpired = () => setAuthed(false)
    window.addEventListener("auth:expired", onExpired as any)
    return () => window.removeEventListener("auth:expired", onExpired as any)
  }, [])

  const links = authed
    ? [
        { href: "/", label: "Dashboard", icon: Home },
        { href: "/clients", label: "Clients", icon: Users },
        { href: "/services", label: "Services", icon: Server },
        { href: "/offers", label: "Offers", icon: FileText },
        { href: "/reports/monthly", label: "Monthly Reports", icon: CalendarDays },
        { href: "/reports/templates/monthly", label: "Monthly Template", icon: FileText },
        { href: "/monitoring", label: "Monitoring", icon: BarChart3 },
        { href: "/automation", label: "Automation", icon: Settings },
        { href: "/heartbeats", label: "Heartbeats", icon: Settings },
        { href: "/alerts", label: "Alerts", icon: Bell },
        { href: "/settings", label: "Settings", icon: Settings },
      ]
    : [
        { href: "/auth/login", label: "Login", icon: LogIn },
        { href: "/auth/register", label: "Register", icon: UserPlus },
        { href: "/auth/reset", label: "Reset Password", icon: KeyRound },
        ...(devAuthEnabled
          ? [
              { href: "/auth/token", label: "Auth Token", icon: Settings },
              { href: "/auth/dev-login", label: "Dev Login", icon: Settings },
            ]
          : []),
      ]

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-primary">FreelanceMonitor</h1>
        <p className="text-sm text-sidebar-foreground/60">Manage your services</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-sidebar-foreground/60">
          {authed ? (
            <p>Signed in</p>
          ) : (
            <p>Guest</p>
          )}
        </div>
      </div>
    </aside>
  )
}
