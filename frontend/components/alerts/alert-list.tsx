"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from "lucide-react"

interface Alert {
  id: number
  alert_type: string
  level: string
  title: string
  message: string
  is_resolved: boolean
  created_at: string
}

export function AlertList() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<Array<{ id: number; domain: string }>>([])
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)

  useEffect(() => {
    fetchServices()
    // Refresh alerts every 5 minutes
    const interval = setInterval(() => {
      if (selectedServiceId) fetchAlerts(selectedServiceId)
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [selectedServiceId])

  async function fetchServices() {
    try {
      const res = await apiFetch(`/api/services?limit=100&order=desc&sort=id`)
      const body = await res.json()
      const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : []
      const mapped = items.map((s: any) => ({ id: Number(s.id), domain: s.domain }))
      setServices(mapped)
      const first = mapped.length ? mapped[0].id : null
      setSelectedServiceId(first)
      if (first) fetchAlerts(first)
    } catch (e) {
      console.error("Failed to fetch services:", e)
      setLoading(false)
    }
  }

  async function fetchAlerts(serviceId: number) {
    try {
      const response = await apiFetch(`/api/services/${serviceId}/alerts`)
      const data = await response.json()
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
      setAlerts(items)
    } catch (error) {
      console.error("Failed to fetch alerts:", error)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case "medium":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case "low":
        return <Info className="w-5 h-5 text-blue-600" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 border-red-200"
      case "medium":
        return "bg-yellow-50 border-yellow-200"
      case "low":
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      domain_expiry: "Domain Expiry",
      ssl_expiry: "SSL Expiry",
      uptime_down: "Uptime Alert",
      renewal_reminder: "Renewal Reminder",
    }
    return labels[type] || type
  }

  if (loading) {
    return <div className="text-center py-8">Loading alerts...</div>
  }

  const activeAlerts = alerts.filter((a) => !a.is_resolved)
  const resolvedAlerts = alerts.filter((a) => a.is_resolved)

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="space-y-2">
          <label htmlFor="service" className="text-sm font-medium">Select Service</label>
          <select
            id="service"
            value={selectedServiceId ?? ''}
            onChange={(e) => setSelectedServiceId(Number(e.target.value))}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.domain}</option>
            ))}
          </select>
        </div>
      </Card>
      <div>
        <h1 className="text-3xl font-bold mb-2">Alerts</h1>
        <p className="text-muted-foreground">Monitor and manage service alerts</p>
      </div>

      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Active Alerts ({activeAlerts.length})</h2>
          {activeAlerts.map((alert) => {
            const severity = (alert.level ?? "").toLowerCase()
            return (
              <Card key={alert.id} className={`p-4 border-l-4 ${getSeverityColor(severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(severity)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{getTypeLabel(alert.alert_type)}</p>
                        <span className="text-xs px-2 py-1 bg-background rounded">{alert.level.toUpperCase()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(alert.created_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={async () => {
                      try {
                        const res = await apiFetch(`/api/alerts/${alert.id}/resolve`, { method: "POST" })
                        if (res.ok) {
                          setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_resolved: true } : a)))
                        }
                      } catch (e) {
                        console.error("Failed to resolve alert:", e)
                      }
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {activeAlerts.length === 0 && resolvedAlerts.length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <p className="text-muted-foreground">All systems operational</p>
        </Card>
      )}

      {resolvedAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Resolved Alerts ({resolvedAlerts.length})</h2>
          <div className="space-y-2">
            {resolvedAlerts.slice(0, 5).map((alert) => (
              <Card key={alert.id} className="p-3 opacity-60">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm">{alert.message}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
