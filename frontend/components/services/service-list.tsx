"use client"

import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Calendar, DollarSign, AlertTriangle, CheckCircle } from "lucide-react"
import { ServiceForm } from "./service-form"

interface Service {
  id: string
  name: string
  type: string
  domain: string
  cost: number
  renewalDate: string
  status: string
  notes: string
}

interface ServiceListProps {
  clientId: string
  clientName: string
}

export function ServiceList({ clientId, clientName }: ServiceListProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [clientId])

  async function fetchServices() {
    try {
      const response = await apiFetch(`/api/services?client_id=${clientId}`)
      const data = await response.json()
      setServices(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [])
    } catch (error) {
      console.error("Failed to fetch services:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddService(serviceData: any) {
    try {
      const response = await apiFetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: Number(clientId),
          domain: serviceData.domain,
          service_type: serviceData.type,
          status: "active",
        }),
      })
      if (response.ok) {
        await fetchServices()
        setShowForm(false)
      }
    } catch (error) {
      console.error("Failed to add service:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === "active") return <CheckCircle className="w-5 h-5 text-green-600" />
    if (status === "expiring") return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    return <AlertTriangle className="w-5 h-5 text-red-600" />
  }

  const getDaysUntilRenewal = (renewalDate: string) => {
    const today = new Date()
    const renewal = new Date(renewalDate)
    const diff = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return <div className="text-center py-8">Loading services...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Services for {clientName}</h2>
          <p className="text-muted-foreground">Manage all services and renewals</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Service
        </Button>
      </div>

      <ServiceForm clientId={clientId} open={showForm} onOpenChange={setShowForm} onSubmit={handleAddService} />

      {services.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No services yet</p>
          <Button onClick={() => setShowForm(true)}>Add your first service</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((service) => {
            const daysLeft = getDaysUntilRenewal(service.renewalDate)
            const isExpiring = daysLeft <= 30 && daysLeft > 0
            const isExpired = daysLeft <= 0

            return (
              <Card key={service.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(isExpired ? "expired" : isExpiring ? "expiring" : "active")}
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        {service.domain && <p className="text-sm text-muted-foreground">{service.domain}</p>}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{service.type}</p>
                  </div>

                  <div className="text-right space-y-2">
                    <div className="flex items-center gap-2 justify-end">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">Rp {service.cost.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {isExpired ? (
                          <span className="text-red-600 font-semibold">Expired</span>
                        ) : (
                          <span className={isExpiring ? "text-yellow-600 font-semibold" : ""}>
                            {daysLeft} days left
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
