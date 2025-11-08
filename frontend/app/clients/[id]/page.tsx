"use client"

import { Sidebar } from "@/components/sidebar"
import { ServiceList } from "@/components/services/service-list"
import { useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Client {
  id: number
  name: string
  email?: string
  phone?: string
  company?: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await apiFetch(`/api/clients/${clientId}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = await res.json()
        setClient(data)
      } catch (error) {
        console.error("Failed to fetch client:", error)
        setClient(null)
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [clientId])

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </main>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p>Client not found</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Link href="/clients">
            <Button variant="outline" size="sm" className="gap-2 mb-6 bg-transparent">
              <ArrowLeft className="w-4 h-4" />
              Back to Clients
            </Button>
          </Link>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <Link href={`/clients/${clientId}/edit`}>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">Edit</Button>
            </Link>
          </div>
          <ServiceList clientId={clientId} clientName={client.name} />
        </div>
      </main>
    </div>
  )
}
