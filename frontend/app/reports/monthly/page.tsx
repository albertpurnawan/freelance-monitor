"use client"

import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MonthlyReportList } from "@/components/reports/monthly-report-list"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { apiFetchJson, apiPostJson } from "@/lib/api"

type ServiceOption = {
  id: number
  domain: string
}

type MonthlyReport = {
  id: number
  report_month: string
  avg_uptime_percent: number
  alerts_opened: number
}

export default function MonthlyReportsPage() {
  const [services, setServices] = useState<ServiceOption[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null)
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [loadingReports, setLoadingReports] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activities, setActivities] = useState<string>("")
  const [maintenanceHours, setMaintenanceHours] = useState<string>("")
  const [summary, setSummary] = useState<string>("")
  const [activityItemsLines, setActivityItemsLines] = useState<string>("")

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await apiFetchJson<any>(`/api/services?limit=100&order=desc&sort=id`)
        if (response.ok) {
          const items = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.items)
              ? response.data.items
              : []
          const normalized: ServiceOption[] = items.map((item: any) => ({
            id: Number(item.id),
            domain: item.domain ?? "Unnamed Service",
          }))
          setServices(normalized)
          if (normalized.length > 0) {
            setSelectedServiceId((prev) => prev ?? normalized[0].id)
          }
        } else {
          setStatusMessage(response.errorText || "Unable to load services.")
        }
      } catch (error) {
        console.error("Failed to load services:", error)
        setStatusMessage("Failed to load services.")
      }
    }
    loadServices()
  }, [])

  useEffect(() => {
    if (!selectedServiceId) {
      setReports([])
      return
    }
    const loadReports = async () => {
      setLoadingReports(true)
      setStatusMessage(null)
      try {
        const response = await apiFetchJson<MonthlyReport[]>(`/api/services/${selectedServiceId}/reports/monthly`)
        if (response.ok && Array.isArray(response.data)) {
          setReports(response.data)
        } else {
          setReports([])
          setStatusMessage(response.errorText || "No reports available for this service yet.")
        }
      } catch (error) {
        console.error("Failed to load monthly reports:", error)
        setReports([])
        setStatusMessage("Unable to load monthly reports right now.")
      }
      setLoadingReports(false)
    }
    loadReports()
  }, [selectedServiceId])

  const handleGenerateReport = async () => {
    if (!selectedServiceId) {
      setFormError("Please select a service first.")
      return
    }
    if (!month) {
      setFormError("Please choose a month.")
      return
    }
    setFormError(null)
    setStatusMessage(null)
    setIsGenerating(true)
    try {
      const response = await apiPostJson<{ id?: number }>(
        "/api/reports/monthly",
        {
          service_id: selectedServiceId,
          month,
          summary: summary.trim() || undefined,
          activities: activities
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
          activity_items: activityItemsLines
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => {
              const [datePart, ...descParts] = line.split("|")
              const date = (datePart || "-").trim()
              const description = descParts.join("|").trim()
              return { date, description }
            }),
          maintenance_hours: maintenanceHours ? Number(maintenanceHours) : undefined,
        },
      )
      setIsGenerating(false)
      if (response.ok) {
        if (response.data?.id) {
          setStatusMessage("Monthly report generated successfully.")
          const reportsResponse = await apiFetchJson<MonthlyReport[]>(`/api/services/${selectedServiceId}/reports/monthly`)
          if (reportsResponse.ok && Array.isArray(reportsResponse.data)) {
            setReports(reportsResponse.data)
          }
        } else {
          setStatusMessage("Request completed.")
        }
      } else {
        setFormError(response.errorText || "Failed to generate monthly report.")
      }
    } catch (error) {
      console.error("Failed to generate monthly report:", error)
      setIsGenerating(false)
      setFormError("Unable to generate monthly report right now.")
    }
  }

  const serviceOptions = useMemo(
    () =>
      services.map((service) => (
        <option key={service.id} value={service.id}>
          {service.domain}
        </option>
      )),
    [services],
  )

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Monthly Reports</h1>
            <p className="text-muted-foreground">Generate and review service performance by month.</p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="service-select">Service</Label>
                <select
                  id="service-select"
                  value={selectedServiceId ?? ""}
                  onChange={(event) => {
                    const value = event.target.value
                    setSelectedServiceId(value ? Number(value) : null)
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="" disabled>
                    Select a service
                  </option>
                  {serviceOptions}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="month-input">Month</Label>
                <Input
                  id="month-input"
                  type="month"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleGenerateReport}
                  disabled={!selectedServiceId || !month || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? "Generating..." : "Generate Report"}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="activities-input">Maintenance Activities (one per line)</Label>
                <textarea
                  id="activities-input"
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground h-28"
                  placeholder="e.g. Server maintenance: 2 hours\nSecurity patches applied"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance-hours-input">Maintenance Hours</Label>
                <Input
                  id="maintenance-hours-input"
                  type="number"
                  step="0.1"
                  min="0"
                  value={maintenanceHours}
                  onChange={(e) => setMaintenanceHours(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="summary-input">Summary (paragraph)</Label>
                <textarea
                  id="summary-input"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground h-28"
                  placeholder="Ringkasan performa layanan selama bulan ini"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-items-input">Activity Items (one per line as YYYY-MM-DD | Description)</Label>
                <textarea
                  id="activity-items-input"
                  value={activityItemsLines}
                  onChange={(e) => setActivityItemsLines(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground h-28"
                  placeholder={"2025-06-03 | Server maintenance\n2025-06-12 | Security patches"}
                />
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            {statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
          </Card>

          <Card className="p-6">
            {loadingReports ? (
              <p className="text-muted-foreground">Loading reports...</p>
            ) : (
              <MonthlyReportList reports={reports} />
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}
