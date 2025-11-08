"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
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
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"

interface UptimeLog { id: number; status: string; response_time: number; checked_at: string; status_code?: number }
interface Alert { id: number; title: string; message: string; created_at: string; is_resolved: boolean }

export default function ServiceDetailsPage() {
  const params = useParams()
  const id = Number(params?.id)
  const [logs, setLogs] = useState<UptimeLog[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [svc, setSvc] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const sres = await apiFetch(`/api/services/${id}`)
      setSvc(await sres.json())
      const lres = await apiFetch(`/api/services/${id}/logs?limit=100`)
      const lbody = await lres.json()
      setLogs(Array.isArray(lbody) ? lbody : Array.isArray(lbody?.items) ? lbody.items : [])
      const ares = await apiFetch(`/api/services/${id}/alerts`)
      const abody = await ares.json()
      setAlerts(Array.isArray(abody) ? abody : Array.isArray(abody?.items) ? abody.items : [])
    })()
  }, [id])

  const uptime = useMemo(() => logs.length ? Math.round(100 * logs.filter(l => l.status === 'up').length / logs.length) : 0, [logs])
  const avgResp = useMemo(() => logs.length ? Math.round(logs.map(l => l.response_time||0).reduce((a,b)=>a+b,0)/logs.length) : 0, [logs])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Service Details</h1>
            {svc && <p className="text-muted-foreground">{svc.domain} ({svc.service_type})</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4"><div className="text-sm text-muted-foreground">Uptime</div><div className="text-2xl font-bold">{uptime}%</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Avg Response</div><div className="text-2xl font-bold">{avgResp}ms</div></Card>
            <Card className="p-4"><div className="text-sm text-muted-foreground">Alerts</div><div className="text-2xl font-bold">{alerts.filter(a=>!a.is_resolved).length}</div></Card>
          </div>
          <div>
            <Button onClick={async () => {
              await apiFetch(`/api/services/${id}/check`, { method: 'POST' })
              // refresh logs/alerts
              const lres = await apiFetch(`/api/services/${id}/logs?limit=100`)
              const lbody = await lres.json()
              setLogs(Array.isArray(lbody) ? lbody : Array.isArray(lbody?.items) ? lbody.items : [])
              const ares = await apiFetch(`/api/services/${id}/alerts`)
              const abody = await ares.json()
              setAlerts(Array.isArray(abody) ? abody : Array.isArray(abody?.items) ? abody.items : [])
            }}>Run Check Now</Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Uptime Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={logs.slice().reverse().map(l => ({
                  date: new Date(l.checked_at).toLocaleTimeString(),
                  up: l.status === 'up' ? 100 : 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="up" stroke="#16a34a" name="Uptime %" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Latency</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={logs.slice().reverse().map(l => ({
                  date: new Date(l.checked_at).toLocaleTimeString(),
                  latency: l.response_time || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="latency" fill="#2563eb" name="Latency (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Checks</h2>
            <div className="space-y-2">
              {logs.map(l => (
                <div key={l.id} className="flex items-center justify-between text-sm border-b py-2">
                  <div>{new Date(l.checked_at).toLocaleString()}</div>
                  <div>{l.status.toUpperCase()}</div>
                  <div>{l.status_code || '-'}</div>
                  <div>{l.response_time || 0}ms</div>
                </div>
              ))}
              {logs.length === 0 && <p className="text-muted-foreground">No logs available</p>}
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Alerts</h2>
            <div className="space-y-2">
              {alerts.map(a => (
                <div key={a.id} className="flex items-center justify-between text-sm border-b py-2">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={a.is_resolved ? 'text-green-600' : 'text-red-600'}>{a.is_resolved ? 'Resolved' : 'Open'}</div>
                    {!a.is_resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await apiFetch(`/api/alerts/${a.id}/resolve`, { method: 'POST' })
                          // refresh alerts
                          const ares = await apiFetch(`/api/services/${id}/alerts`)
                          const abody = await ares.json()
                          setAlerts(Array.isArray(abody) ? abody : Array.isArray(abody?.items) ? abody.items : [])
                        }}
                      >Resolve</Button>
                    )}
                  </div>
                </div>
              ))}
              {alerts.length === 0 && <p className="text-muted-foreground">No alerts</p>}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
