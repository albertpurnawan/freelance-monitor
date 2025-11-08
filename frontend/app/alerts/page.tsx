"use client"

import { Sidebar } from "@/components/sidebar"
import { RequireAuth } from "@/components/auth/require-auth"
import { AlertList } from "@/components/alerts/alert-list"

export default function AlertsPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <RequireAuth>
          <div className="p-8">
            <AlertList />
          </div>
        </RequireAuth>
      </main>
    </div>
  )
}
