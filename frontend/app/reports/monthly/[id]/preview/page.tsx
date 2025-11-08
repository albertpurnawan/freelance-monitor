"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar } from "@/components/sidebar"
import { apiFetchJson } from "@/lib/api"
import MonthlyReportPdfJs, { ActivityItem } from "@/components/reports/MonthlyReportPdfJs"

type ApiMonthlyReport = {
  id: number
  report_month: string
  service_id: number
  avg_uptime_percent: number
  avg_response_ms: number
  total_downtime: number
  alerts_opened: number
  alerts_resolved: number
  maintenance_hours: number
  activities?: any
  summary?: string
}

export default function MonthlyReportPreview() {
  const params = useParams()
  const reportId = useMemo(() => {
    const raw = params?.id
    if (!raw) return ""
    return Array.isArray(raw) ? raw[0] : raw
  }, [params])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [month, setMonth] = useState("")
  const [year, setYear] = useState("")
  const [summary, setSummary] = useState("")
  const [activities, setActivities] = useState<ActivityItem[]>([])

  useEffect(() => {
    const load = async () => {
      if (!reportId) {
        setError("Invalid report ID")
        setIsLoading(false)
        return
      }
      try {
        setIsLoading(true)
        const res = await apiFetchJson<ApiMonthlyReport>(`/api/reports/monthly/${reportId}`)
        if (!res.ok || !res.data) {
          setError("Failed to load report data")
          setIsLoading(false)
          return
        }
        const data = res.data
        // Parse month/year from report_month (YYYY-MM-DD or YYYY-MM)
        const d = new Date(data.report_month)
        const monthIdx = d.getMonth() + 1
        const monthName = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][monthIdx - 1] || ""
        setMonth(monthName)
        setYear(String(d.getFullYear()))
        setSummary((data.summary || "").trim())
        // Activities can be array<string> or array<{date, description}>
        let acts: ActivityItem[] = []
        try {
          if (data.activities) {
            if (Array.isArray(data.activities)) {
              if (data.activities.length > 0 && typeof data.activities[0] === "string") {
                acts = (data.activities as string[]).map((s) => ({ date: "-", description: String(s) }))
              } else {
                acts = (data.activities as any[]).map((a) => ({ date: String(a.date || "-"), description: String(a.description || "") }))
              }
            } else if (typeof data.activities === "string") {
              try {
                const parsed = JSON.parse(data.activities)
                if (Array.isArray(parsed)) {
                  if (parsed.length > 0 && typeof parsed[0] === "string") {
                    acts = parsed.map((s: string) => ({ date: "-", description: s }))
                  } else {
                    acts = parsed.map((a: any) => ({ date: String(a.date || "-"), description: String(a.description || "") }))
                  }
                }
              } catch {}
            }
          }
        } catch {}
        setActivities(acts)
      } catch (e) {
        console.error(e)
        setError("Failed to load report")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [reportId])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Report Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <p>Loading report...</p>
                </div>
              ) : error ? (
                <div className="flex h-64 items-center justify-center">
                  <p>{error}</p>
                </div>
              ) : (
                <MonthlyReportPdfJs month={month} year={year} summary={summary} activities={activities} />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
