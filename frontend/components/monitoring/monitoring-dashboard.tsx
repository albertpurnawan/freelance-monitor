"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react"

interface MonitoringData {
  date: string
  uptime: number
  responseTime: number
  alerts: number
}
interface UptimeLog { id: number; status: string; response_time: number; checked_at: string }

type ServiceItem = { id: number; domain: string; service_type: string; status?: string }

export function MonitoringDashboard() {
  const [data, setData] = useState<MonitoringData[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)
  const [serviceAlertCounts, setServiceAlertCounts] = useState<Record<number, number>>({})
  const [lastChecks, setLastChecks] = useState<Record<number, { code?: number; latency?: number }>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([])
  const [newSvc, setNewSvc] = useState<{ client_id: string; domain: string; service_type: string }>({ client_id: "", domain: "", service_type: "website" })
  const [editOpen, setEditOpen] = useState(false)
  const [editSvcId, setEditSvcId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{ domain: string; url: string; service_type: string; status: string; ssl_expiry: string; domain_expiry: string }>({ domain: "", url: "", service_type: "website", status: "active", ssl_expiry: "", domain_expiry: "" })

  useEffect(() => {
    fetchServices()
    fetchClients()
  }, [])

  useEffect(() => {
    if (selectedServiceId) fetchLogs(selectedServiceId)
  }, [selectedServiceId])

  async function fetchServices() {
    try {
      const res = await apiFetch(`/api/services?limit=100&order=desc&sort=id`)
      const body = await res.json()
      const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : []
      const mapped: ServiceItem[] = items.map((s: any) => ({ id: Number(s.id), domain: s.domain, service_type: s.service_type, status: s.status }))
      setServices(mapped)
      setSelectedServiceId(mapped.length ? mapped[0].id : null)
      // fetch alert counts in parallel
      const counts: Record<number, number> = {}
      const latest: Record<number, { code?: number; latency?: number }> = {}
      await Promise.all(
        mapped.map(async (s) => {
          try {
            const r = await apiFetch(`/api/services/${s.id}/alerts?unresolved=true&limit=1`)
            const b = await r.json()
            const total = typeof b?.total === 'number' ? b.total : (Array.isArray(b) ? b.length : 0)
            counts[s.id] = total
          } catch (e) {
            counts[s.id] = 0
          }
          try {
            const lr = await apiFetch(`/api/services/${s.id}/logs?limit=1`)
            const lb = await lr.json()
            const item = Array.isArray(lb) ? lb[0] : (Array.isArray(lb?.items) ? lb.items[0] : null)
            if (item) {
              latest[s.id] = { code: item.status_code || (item.status === 'up' ? 200 : undefined), latency: item.response_time }
            }
          } catch {}
        })
      )
      setServiceAlertCounts(counts)
      setLastChecks(latest)
    } catch (e) {
      console.error("Failed to fetch services:", e)
    }
  }

  async function fetchClients() {
    try {
      const res = await apiFetch(`/api/clients?limit=200&order=asc&sort=name`)
      const body = await res.json()
      const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : []
      const mapped = items.map((c: any) => ({ id: Number(c.id), name: c.name as string }))
      setClients(mapped)
    } catch (e) {
      console.error('Failed to fetch clients', e)
    }
  }

  async function addService() {
    try {
      const cid = Number(newSvc.client_id)
      if (!cid || !newSvc.domain || !newSvc.service_type) return
      const resp = await apiFetch(`/api/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: cid, domain: newSvc.domain, service_type: newSvc.service_type, status: 'active' })
      })
      if (resp.ok) {
        setShowAdd(false)
        setNewSvc({ client_id: "", domain: "", service_type: "website" })
        await fetchServices()
      }
    } catch (e) {
      console.error('Add service failed', e)
    }
  }

  async function openEdit(id: number) {
    try {
      setEditSvcId(id)
      const res = await apiFetch(`/api/services/${id}`)
      const s = await res.json()
      setEditForm({
        domain: s?.domain || "",
        url: s?.url || "",
        service_type: s?.service_type || "website",
        status: s?.status || "active",
        ssl_expiry: s?.ssl_expiry ? String(s.ssl_expiry).slice(0, 10) : "",
        domain_expiry: s?.domain_expiry ? String(s.domain_expiry).slice(0, 10) : "",
      })
      setEditOpen(true)
    } catch (e) {
      console.error('Fetch service details failed', e)
    }
  }

  async function saveEdit() {
    if (!editSvcId) return
    try {
      const body: any = {
        domain: editForm.domain,
        url: editForm.url,
        service_type: editForm.service_type,
        status: editForm.status,
      }
      if (editForm.ssl_expiry) body.ssl_expiry = new Date(editForm.ssl_expiry + 'T00:00:00Z').toISOString()
      if (editForm.domain_expiry) body.domain_expiry = new Date(editForm.domain_expiry + 'T00:00:00Z').toISOString()
      const resp = await apiFetch(`/api/services/${editSvcId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (resp.ok) {
        setEditOpen(false)
        await fetchServices()
      }
    } catch (e) {
      console.error('Save service edit failed', e)
    }
  }

  async function fetchLogs(serviceId: number) {
    try {
      const res = await apiFetch(`/api/services/${serviceId}/logs?limit=30`)
      const body = await res.json()
      const items: UptimeLog[] = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : []
      const sampleData: MonitoringData[] = items
        .reverse()
        .map((l) => ({
          date: new Date(l.checked_at).toLocaleDateString("id-ID"),
          uptime: l.status === "up" ? 100 : 0,
          responseTime: l.response_time || 0,
          alerts: l.status === "down" ? 1 : 0,
        }))
      setData(sampleData)
    } catch (e) {
      console.error("Failed to fetch logs:", e)
    }
  }

  const avgUptime = data.length ? (data.filter((d) => d.uptime === 100).length / data.length) * 100 : 0
  const avgResp = data.length ? Math.round(data.reduce((sum, d) => sum + d.responseTime, 0) / data.length) : 0
  const activeAlerts = data.reduce((sum, d) => sum + (d.alerts || 0), 0)
  const stats = [
    { label: "Average Uptime", value: `${avgUptime.toFixed(1)}%`, icon: CheckCircle, color: "text-green-600" },
    { label: "Avg Response Time", value: `${avgResp}ms`, icon: TrendingUp, color: "text-blue-600" },
    { label: "Active Alerts", value: String(activeAlerts), icon: AlertCircle, color: "text-red-600" },
    { label: "Monitoring Status", value: data.length ? "Active" : "No Data", icon: Clock, color: "text-green-600" },
  ]

  const [dailyReports, setDailyReports] = useState<Array<{ report_date: string; service_id: number; uptime_percent: number; avg_response_ms: number }>>([])
  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiFetch(`/api/reports/daily?from=${new Date(Date.now()-7*24*3600*1000).toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}`)
        const body = await res.json()
        const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : []
        setDailyReports(items)
      } catch {}
    })()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Monitoring Dashboard</h1>
        <p className="text-muted-foreground">Real-time service monitoring and analytics</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Monitoring {services.length} service(s)</div>
        <Button onClick={() => setShowAdd(true)}>Add Service</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </div>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="p-6">
        <div className="space-y-2">
          <label htmlFor="service" className="text-sm font-medium">Select Service</label>
          <select
            id="service"
            value={selectedServiceId ?? ''}
            onChange={(e) => setSelectedServiceId(Number(e.target.value))}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.domain} ({s.service_type})
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Uptime Trend (30 days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[98, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="uptime" stroke="#3d4c9c" name="Uptime %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Response Time (30 days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="responseTime" fill="#3d4c9c" name="Response Time (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Daily Summary (Last 7 days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyReports.map(r => ({ date: r.report_date.slice(0,10), uptime: r.uptime_percent, response: r.avg_response_ms }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="uptime" stroke="#16a34a" name="Uptime %" />
            <Line type="monotone" dataKey="response" stroke="#2563eb" name="Avg Response (ms)" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Service Status</h2>
        <div className="space-y-3">
          {services.map((s) => {
            const raw = (s.status || '').toLowerCase()
            const isUp = raw === 'active' || raw === 'up' || raw === 'online'
            const isDown = raw === 'down'
            const dotClass = isUp ? 'bg-green-600' : isDown ? 'bg-red-600' : 'bg-yellow-600'
            const textClass = isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-yellow-600'
            const label = isUp ? 'Online' : isDown ? 'Down' : (s.status ? s.status : 'Unknown')
            return (
              <div key={`${s.id}-${s.domain}`} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${dotClass}`} />
                  <div>
                    <p className="font-medium">{s.domain}</p>
                    <p className="text-sm text-muted-foreground">Type: {s.service_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-semibold ${textClass}`}>{label}</span>
                  <span className={`text-xs font-medium ${serviceAlertCounts[s.id] ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {serviceAlertCounts[s.id] || 0} alerts
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lastChecks[s.id]?.code ?? '-'} | {lastChecks[s.id]?.latency ? `${lastChecks[s.id]!.latency}ms` : '--'}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => openEdit(s.id)}>Edit</Button>
                  <a href={`/services/${s.id}`} className="text-xs underline">Details</a>
                </div>
              </div>
            )
          })}
          {services.length === 0 && (
            <p className="text-muted-foreground">No services found</p>
          )}
        </div>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Service</DialogTitle>
            <DialogDescription>Pick a client and enter the service details to monitor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <select
                value={newSvc.client_id}
                onChange={(e) => setNewSvc({ ...newSvc, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="">Select a client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input value={newSvc.domain} onChange={(e) => setNewSvc({ ...newSvc, domain: e.target.value })} placeholder="example.com" />
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <select
                value={newSvc.service_type}
                onChange={(e) => setNewSvc({ ...newSvc, service_type: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="website">Website</option>
                <option value="domain">Domain</option>
                <option value="ssl">SSL</option>
                <option value="email">Email</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
              <Button onClick={addService} className="flex-1">Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update service configuration and monitoring details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Domain</Label>
              <Input value={editForm.domain} onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Service URL (optional)</Label>
              <Input value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} placeholder="https://example.com/health" />
            </div>
            <div className="space-y-2">
              <Label>Service Type</Label>
              <select value={editForm.service_type} onChange={(e) => setEditForm({ ...editForm, service_type: e.target.value })} className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground">
                <option value="website">Website</option>
                <option value="domain">Domain</option>
                <option value="ssl">SSL</option>
                <option value="email">Email</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="down">Down</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SSL Expiry</Label>
                <DatePicker value={editForm.ssl_expiry} onChange={(v) => setEditForm({ ...editForm, ssl_expiry: v })} />
              </div>
              <div className="space-y-2">
                <Label>Domain Expiry</Label>
                <DatePicker value={editForm.domain_expiry} onChange={(v) => setEditForm({ ...editForm, domain_expiry: v })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={saveEdit} className="flex-1">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
