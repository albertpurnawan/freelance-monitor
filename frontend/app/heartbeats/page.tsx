"use client"

import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiFetch, apiFetchJson } from "@/lib/api"
import { useSearchParams, useRouter } from "next/navigation"

type HB = { id: number; service_id: number; name: string; expected_interval_seconds: number; grace_seconds: number; token?: string; last_heartbeat_at?: string; is_paused: boolean }

export default function HeartbeatsPage() {
  const params = useSearchParams()
  const router = useRouter()
  const [serviceId, setServiceId] = useState<string>("")
  const [items, setItems] = useState<HB[]>([])
  const [creating, setCreating] = useState<Partial<HB>>({ expected_interval_seconds: 300, grace_seconds: 60 })
  const [services, setServices] = useState<Array<{ id: number; label: string }>>([])

  // Load services for dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/api/services?limit=200&order=asc&sort=domain`)
        const body = await res.json()
        const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : []
        const mapped = items.map((s: any) => ({ id: Number(s.id), label: s.domain ? `${s.domain} (${s.service_type})` : `#${s.id} (${s.service_type})` }))
        setServices(mapped)
        // Determine initial selected service: query param -> localStorage -> first
        const q = params?.get('service_id')
        const ls = typeof window !== 'undefined' ? localStorage.getItem('hb_service_id') : null
        const init = q || ls || (mapped[0] ? String(mapped[0].id) : "")
        if (init) setServiceId(init)
      } catch (e) {
        // ignore
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    if (!serviceId) { setItems([]); return }
    const res = await apiFetchJson(`/api/heartbeats?service_id=${serviceId}&limit=100`)
    if (res.ok) {
      const items = Array.isArray((res.data as any)?.items) ? (res.data as any).items : []
      setItems(items)
    }
  }
  useEffect(() => {
    if (!serviceId) return
    // persist selection and reflect in URL for reload
    if (typeof window !== 'undefined') localStorage.setItem('hb_service_id', serviceId)
    const sp = new URLSearchParams(Array.from((params || new URLSearchParams()).entries()))
    sp.set('service_id', serviceId)
    router.replace(`/heartbeats?${sp.toString()}`)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId])

  async function create() {
    const resp = await apiFetch(`/api/heartbeats`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        service_id: Number(serviceId), name: creating.name || 'job', expected_interval_seconds: Number(creating.expected_interval_seconds || 300), grace_seconds: Number(creating.grace_seconds || 60), is_paused: false
      })
    })
    if (resp.ok) { setCreating({ expected_interval_seconds: 300, grace_seconds: 60 }); await load() }
  }

  async function rotate(id: number) { await apiFetch(`/api/heartbeats/${id}/rotate-token`, { method: 'POST' }); await load() }
  async function ping(id: number) { await apiFetch(`/api/heartbeats/${id}/ping`, { method: 'POST' }); await load() }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Heartbeats</h1>
            <p className="text-muted-foreground">Register cron/worker heartbeats and get ping URLs.</p>
          </div>

          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm">Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="">Select service</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm">Name</label>
                <Input value={creating.name || ''} onChange={(e) => setCreating({ ...creating, name: e.target.value })} placeholder="nightly-cron" />
              </div>
              <div>
                <label className="text-sm">Expected (sec)</label>
                <Input type="number" value={creating.expected_interval_seconds || 300} onChange={(e) => setCreating({ ...creating, expected_interval_seconds: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm">Grace (sec)</label>
                <Input type="number" value={creating.grace_seconds || 60} onChange={(e) => setCreating({ ...creating, grace_seconds: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Button onClick={create} disabled={!serviceId}>Create</Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="space-y-3">
              {items.map(hb => (
                <div key={hb.id} className="p-3 border rounded-md bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{hb.name} (#{hb.id})</div>
                      <div className="text-sm text-muted-foreground">Expected {hb.expected_interval_seconds}s + {hb.grace_seconds}s grace</div>
                      <div className="text-xs text-muted-foreground">Last: {hb.last_heartbeat_at ? new Date(hb.last_heartbeat_at).toLocaleString() : 'never'}</div>
                      <div className="text-xs mt-1">
                        Ping URL: <code>/api/heartbeats/ping/{hb.token || '...'}</code>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => ping(hb.id)}>Ping</Button>
                      <Button variant="outline" onClick={() => rotate(hb.id)}>Rotate Token</Button>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-muted-foreground">No heartbeats for this service</div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
