"use client"

import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiFetchJson } from "@/lib/api"

type Service = {
  id: number
  domain: string
  service_type: string
  status: string
  client_id: number
  url?: string
}

export default function ServicesPage() {
  const [items, setItems] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [current, setCurrent] = useState<Service | null>(null)
  const [form, setForm] = useState<{ client_id: number | null; domain: string; service_type: string; status: string; url: string }>({ client_id: null, domain: "", service_type: "website", status: "active", url: "" })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await apiFetchJson<any>(`/api/services?limit=100&order=desc&sort=id&domain=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.items) ? res.data.items : []
        setItems(data)
      } else {
        setItems([])
      }
      setLoading(false)
    }
    load()
  }, [query])

  useEffect(() => {
    const loadClients = async () => {
      const res = await apiFetchJson<any>(`/api/clients?limit=100&order=desc&sort=id`)
      if (res.ok) {
        const arr = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.items) ? res.data.items : []
        setClients(arr.map((c: any) => ({ id: Number(c.id), name: String(c.name || `Client ${c.id}`) })))
      }
    }
    loadClients()
  }, [])

  const openCreate = () => {
    setIsEditing(false)
    setCurrent(null)
    setForm({ client_id: clients[0]?.id || null, domain: "", service_type: "website", status: "active", url: "" })
    setModalOpen(true)
  }

  const openEdit = (s: Service) => {
    setIsEditing(true)
    setCurrent(s)
    setForm({ client_id: s.client_id, domain: s.domain, service_type: s.service_type, status: s.status, url: s.url || "" })
    setModalOpen(true)
  }

  const submitForm = async () => {
    if (!form.client_id || !form.domain || !form.service_type) return
    if (isEditing && current) {
      // update
      const res = await apiFetchJson(`/api/services/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: form.client_id, domain: form.domain, service_type: form.service_type, status: form.status, url: form.url }),
      })
      if (res.ok) {
        setModalOpen(false)
        // reload list
        const reload = await apiFetchJson<any>(`/api/services?limit=100&order=desc&sort=id&domain=${encodeURIComponent(query)}`)
        const data = Array.isArray(reload.data) ? reload.data : Array.isArray(reload.data?.items) ? reload.data.items : []
        setItems(data)
      }
    } else {
      // create
      const res = await apiFetchJson(`/api/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: form.client_id, domain: form.domain, service_type: form.service_type, status: form.status, url: form.url }),
      })
      if (res.ok) {
        setModalOpen(false)
        const reload = await apiFetchJson<any>(`/api/services?limit=100&order=desc&sort=id&domain=${encodeURIComponent(query)}`)
        const data = Array.isArray(reload.data) ? reload.data : Array.isArray(reload.data?.items) ? reload.data.items : []
        setItems(data)
      }
    }
  }

  const deleteService = async (s: Service) => {
    if (!confirm(`Delete service ${s.domain}?`)) return
    const res = await apiFetchJson(`/api/services/${s.id}`, { method: "DELETE" })
    if (res.ok) {
      const reload = await apiFetchJson<any>(`/api/services?limit=100&order=desc&sort=id&domain=${encodeURIComponent(query)}`)
      const data = Array.isArray(reload.data) ? reload.data : Array.isArray(reload.data?.items) ? reload.data.items : []
      setItems(data)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl font-bold">Services</h1>
              <p className="text-muted-foreground">Browse and filter your monitored services.</p>
            </div>
            <div className="w-80 space-y-2">
              <Label htmlFor="q">Search by domain</Label>
              <Input id="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="example.com" />
            </div>
            <div className="space-y-2">
              <Label className="invisible">&nbsp;</Label>
              <Button onClick={openCreate}>Add Service</Button>
            </div>
          </div>

          <Card className="p-6">
            {loading ? (
              <p className="text-muted-foreground">Loading services...</p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground">No services found.</p>
            ) : (
              <div className="grid gap-3">
                {items.map((s) => (
                  <div key={s.id} className="flex items-center justify-between border-b last:border-0 py-3">
                    <div>
                      <div className="font-medium">{s.domain}</div>
                      <div className="text-xs text-muted-foreground">{s.service_type} · status: {s.status}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Client ID: {s.client_id}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteService(s)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{isEditing ? "Edit Service" : "Add Service"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <select
                    id="client"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={form.client_id ?? ""}
                    onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })}
                  >
                    <option value="" disabled>Select client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input id="domain" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Service Type</Label>
                  <select
                    id="type"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={form.service_type}
                    onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                  >
                    <option value="website">Website</option>
                    <option value="domain">Domain</option>
                    <option value="ssl">SSL</option>
                    <option value="email">Email</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="down">Down</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="url">URL (optional)</Label>
                  <Input id="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.com" />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={submitForm} className="flex-1">{isEditing ? "Save" : "Create"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  )
}
