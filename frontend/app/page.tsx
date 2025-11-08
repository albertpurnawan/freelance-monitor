"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { BarChart3, Users, FileText, AlertCircle } from "lucide-react"
import { apiFetchJson } from "@/lib/api"

export default function Dashboard() {
  const [clientsTotal, setClientsTotal] = useState<number>(0)
  const [servicesTotal, setServicesTotal] = useState<number>(0)
  const [pendingOffersTotal, setPendingOffersTotal] = useState<number>(0)
  const [activeAlertsTotal, setActiveAlertsTotal] = useState<number>(0)
  const [recentClients, setRecentClients] = useState<any[]>([])
  const [recentServices, setRecentServices] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const [clientsRes, servicesRes, offersRes, alertsRes] = await Promise.all([
        apiFetchJson("/api/clients?limit=5&order=desc&sort=id"),
        apiFetchJson("/api/services?limit=5&order=desc&sort=id"),
        apiFetchJson("/api/offers?status=draft&limit=1"),
        apiFetchJson("/api/alerts?limit=1"),
      ])
      // Clients
      if (clientsRes.ok) {
        const items = Array.isArray(clientsRes.data) ? clientsRes.data : Array.isArray((clientsRes.data as any)?.items) ? (clientsRes.data as any).items : []
        const total = (clientsRes.data as any)?.total
        setClientsTotal(typeof total === 'number' ? total : items.length)
        setRecentClients(items)
      }
      // Services
      if (servicesRes.ok) {
        const items = Array.isArray(servicesRes.data) ? servicesRes.data : Array.isArray((servicesRes.data as any)?.items) ? (servicesRes.data as any).items : []
        const total = (servicesRes.data as any)?.total
        setServicesTotal(typeof total === 'number' ? total : items.length)
        setRecentServices(items)
      }
      // Offers (pending/draft)
      if (offersRes.ok) {
        const total = (offersRes.data as any)?.total
        setPendingOffersTotal(typeof total === 'number' ? total : 0)
      }
      // Alerts
      if (alertsRes.ok) {
        const total = (alertsRes.data as any)?.total
        setActiveAlertsTotal(typeof total === 'number' ? total : 0)
      }
    } catch (e) {
      console.error("Failed to fetch dashboard stats:", e)
    }
  }

  const stats = [
    { label: "Total Clients", value: String(clientsTotal), icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Active Services", value: String(servicesTotal), icon: BarChart3, color: "bg-green-100 text-green-600" },
    { label: "Pending Offers", value: String(pendingOffersTotal), icon: FileText, color: "bg-purple-100 text-purple-600" },
    { label: "Active Alerts", value: String(activeAlertsTotal), icon: AlertCircle, color: "bg-red-100 text-red-600" },
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <Card key={stat.label} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Clients</h2>
              <div className="space-y-3">
                {recentClients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-muted-foreground">{c.email}</p>
                    </div>
                    <span className="text-sm font-medium text-primary">ID: {c.id}</span>
                  </div>
                ))}
                {recentClients.length === 0 && (
                  <p className="text-muted-foreground">No clients</p>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Services</h2>
              <div className="space-y-3">
                {recentServices.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="font-medium">{s.domain}</p>
                      <p className="text-sm text-muted-foreground">{s.service_type}</p>
                    </div>
                    <span className="text-sm font-medium text-accent">{s.status}</span>
                  </div>
                ))}
                {recentServices.length === 0 && (
                  <p className="text-muted-foreground">No services</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
