"use client"

import { Sidebar } from "@/components/sidebar"
import { RequireAuth } from "@/components/auth/require-auth"
import { ClientList } from "@/components/clients/client-list"

export default function ClientsPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <RequireAuth>
          <div className="p-8">
            <ClientList />
          </div>
        </RequireAuth>
      </main>
    </div>
  )
}
