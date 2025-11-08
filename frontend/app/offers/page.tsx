"use client"

import { Sidebar } from "@/components/sidebar"
import { RequireAuth } from "@/components/auth/require-auth"
import { OfferList } from "@/components/offers/offer-list"

export default function OffersPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <RequireAuth>
          <div className="p-8">
            <OfferList />
          </div>
        </RequireAuth>
      </main>
    </div>
  )
}
