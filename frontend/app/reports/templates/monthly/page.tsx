"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { apiFetchJson, apiPostJson } from "@/lib/api"
import MonthlyReportPdfJs, { ActivityItem } from "@/components/reports/MonthlyReportPdfJs"

export default function MonthlyTemplateEditorPage() {
  const [name, setName] = useState("default-monthly")
  const [content, setContent] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [available, setAvailable] = useState<{ id: number; name: string; kind: string }[]>([])

  // Live preview inputs
  const [month, setMonth] = useState("Juni")
  const [year, setYear] = useState("2025")
  const [summary, setSummary] = useState("Ringkasan performa layanan selama bulan ini.")
  const [activitiesText, setActivitiesText] = useState("2025-06-03 | Server maintenance\n2025-06-12 | Security patches")

  useEffect(() => {
    const load = async () => {
      const res = await apiFetchJson<{ id: number; name: string; content: string }>("/api/templates?kind=monthly")
      if (res.ok && res.data) {
        setName(res.data.name || "default-monthly")
        setContent(res.data.content || "")
      }
      const list = await apiFetchJson<Array<{ id: number; name: string; kind: string }>>("/api/templates/list?kind=monthly&includePublic=true")
      if (list.ok && Array.isArray(list.data)) {
        setAvailable(list.data)
      }
    }
    load()
  }, [])

  const save = async () => {
    const res = await apiPostJson("/api/templates", { name, kind: "monthly", content })
    if (res.ok) {
      setStatusMessage("Template saved")
    } else {
      setStatusMessage(res.errorText || "Failed to save template")
    }
  }

  const activities: ActivityItem[] = activitiesText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [datePart, ...descParts] = line.split("|")
      return { date: (datePart || "-").trim(), description: descParts.join("|").trim() }
    })

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Monthly Template Editor</h1>
            <p className="text-muted-foreground">Edit HTML content stored as template and preview PDF client-side.</p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-select">Select Existing</Label>
              <select
                id="tpl-select"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                onChange={async (e) => {
                  const id = Number(e.target.value)
                  if (!id) return
                  const r = await apiFetchJson<{ id: number; name: string; content: string }>(`/api/templates/${id}`)
                  if (r.ok && r.data) {
                    setName(r.data.name || name)
                    setContent(r.data.content || "")
                  }
                }}
              >
                <option value="">Select template…</option>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} {t.kind === 'monthly' ? '' : `(${t.kind})`}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tpl-name">Template Name</Label>
                <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-kind">Kind</Label>
                <Input id="tpl-kind" value="monthly" disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-content">Template HTML/JSON (stored for reference)</Label>
              <textarea
                id="tpl-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground h-40"
                placeholder="Paste HTML or JSON config used in client rendering"
              />
            </div>
            <Button onClick={save}>Save Template</Button>
            {statusMessage && <p className="text-sm text-muted-foreground">{statusMessage}</p>}
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Live Preview Inputs</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="preview-month">Month</Label>
                <Input id="preview-month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preview-year">Year</Label>
                <Input id="preview-year" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="preview-summary">Summary</Label>
                <textarea id="preview-summary" value={summary} onChange={(e) => setSummary(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground h-24" />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="preview-activities">Activities (YYYY-MM-DD | Description per line)</Label>
                <textarea id="preview-activities" value={activitiesText} onChange={(e) => setActivitiesText(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground h-32" />
              </div>
            </div>
            <MonthlyReportPdfJs month={month} year={year} summary={summary} activities={activities} />
          </Card>
        </div>
      </main>
    </div>
  )
}
