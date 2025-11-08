"use client"

import { Sidebar } from "@/components/sidebar"
import { RequireAuth } from "@/components/auth/require-auth"
import { MonitoringDashboard } from "@/components/monitoring/monitoring-dashboard"

export default function MonitoringPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <RequireAuth>
          <div className="p-8">
            <MonitoringDashboard />
          </div>
        </RequireAuth>
      </main>
    </div>
  )
}
