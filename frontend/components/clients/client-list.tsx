"use client"

import { useState, useEffect } from "react"
import { apiFetch, apiFetchJson } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Mail, Phone, MapPin, Edit2, Trash2 } from "lucide-react"
import { ClientDialog } from "./client-dialog"

interface Client {
  id: string
  name: string
  email: string
  phone: string
  company: string
  city: string
  country: string
}

export function ClientList() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    try {
      const { ok, data, status, errorText } = await apiFetchJson("/api/clients", {}, { retries: 2, backoffMs: 250 })
      if (ok) {
        const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
        setClients(items)
      } else {
        if (status >= 500) {
          console.warn("Backend returned non-JSON error:", errorText?.slice(0, 200))
        }
        setClients([])
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error)
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  async function handleAddClient(clientData: any) {
    try {
      const payload = {
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address,
      }
      const { ok } = await apiFetchJson("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })
      if (ok) {
        await fetchClients()
        setShowDialog(false)
      }
    } catch (error) {
      console.error("Failed to add client:", error)
    }
  }

  async function handleDeleteClient(id: string) {
    const sure = typeof window !== 'undefined' ? window.confirm("Delete this client? This cannot be undone.") : true
    if (!sure) return
    try {
      const res = await apiFetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setClients((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (e) {
      console.error('Failed to delete client:', e)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading clients...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage your client relationships</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      <ClientDialog open={showDialog} onOpenChange={setShowDialog} onSubmit={handleAddClient} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Card key={client.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{client.name}</h3>
                <p className="text-sm text-muted-foreground">{client.company}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${client.email}`} className="hover:text-primary">
                    {client.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{client.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {client.city}, {client.country}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <a href={`/clients/${client.id}/edit`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                </a>
                <Button variant="outline" size="sm" className="flex-1 gap-2 bg-transparent" onClick={() => handleDeleteClient(client.id)}>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {clients.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No clients yet</p>
          <Button onClick={() => setShowDialog(true)}>Add your first client</Button>
        </Card>
      )}
    </div>
  )
}
