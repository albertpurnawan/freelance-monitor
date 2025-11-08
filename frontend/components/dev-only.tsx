"use client"

import { ReactNode } from "react"
import { Card } from "@/components/ui/card"

const enabled = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true"

export function DevOnly({ children }: { children: ReactNode }) {
  if (!enabled) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Dev-only feature disabled</h2>
          <p className="text-sm text-muted-foreground">
            Set NEXT_PUBLIC_ENABLE_DEV_AUTH=true in .env.local to enable development auth pages.
          </p>
        </Card>
      </div>
    )
  }
  return <>{children}</>
}

export function DevBanner() {
  if (!enabled) return null
  return (
    <div className="w-full bg-yellow-100 text-yellow-900 text-sm px-4 py-2 border-b border-yellow-300">
      Development mode: temporary JWT tools are enabled. Do not use in production.
    </div>
  )
}

