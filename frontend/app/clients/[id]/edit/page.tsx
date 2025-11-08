"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Sidebar } from "@/components/sidebar"
import { RequireAuth } from "@/components/auth/require-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiFetch } from "@/lib/api"
import { ArrowLeft } from "lucide-react"

interface Client {
  id: number
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
}

export default function EditClientPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = Number(params.id)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [client, setClient] = useState<Client | null>(null)

  useEffect(() => {
    if (!clientId) return
    ;(async () => {
      try {
        const res = await apiFetch(`/api/clients/${clientId}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = await res.json()
        setClient(data)
      } catch (e) {
        console.error("Failed to load client:", e)
        setClient(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [clientId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!client) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/clients/${client.id}` ,{
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: client.name,
          contact_person: client.contact_person || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
        }),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      router.push(`/clients/${client.id}`)
    } catch (e) {
      console.error("Failed to save client:", e)
    } finally {
      setSaving(false)
    }
  }

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
        <RequireAuth>
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <Link href={`/clients/${client.id}`}>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Edit Client</h1>
            </div>

            <Card className="p-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input value={client.contact_person || ''} onChange={(e) => setClient({ ...client, contact_person: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={client.email || ''} onChange={(e) => setClient({ ...client, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={client.phone || ''} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={client.address || ''} onChange={(e) => setClient({ ...client, address: e.target.value })} />
                </div>

                <div className="flex gap-2 pt-4">
                  <Link href={`/clients/${client.id}`}>
                    <Button type="button" variant="outline">Cancel</Button>
                  </Link>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                </div>
              </form>
            </Card>
          </div>
        </RequireAuth>
      </main>
    </div>
  )
}

