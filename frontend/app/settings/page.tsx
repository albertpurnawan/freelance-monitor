"use client"

import { Sidebar } from "@/components/sidebar"
import { RequireAuth } from "@/components/auth/require-auth"
import { NotificationSettings } from "@/components/settings/notification-settings"

export default function SettingsPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <RequireAuth>
          <div className="p-8">
            <NotificationSettings />
          </div>
        </RequireAuth>
      </main>
    </div>
  )
}
