"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiFetchJson } from "@/lib/api"

type TaskItem = { name: string; interval_seconds: number; enabled: boolean; last_run_at?: string }

export default function AutomationPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    const res = await apiFetchJson("/api/automation/tasks")
    if (res.ok) {
      const items = Array.isArray((res.data as any)?.items) ? (res.data as any).items : []
      const normalized = items.map((t: any) => ({
        name: t.name as string,
        interval_seconds: Number(t.interval_seconds || t.interval || t.intervalSeconds || 0),
        enabled: Boolean(t.enabled),
        last_run_at: t.last_run_at ? String(t.last_run_at) : undefined,
      }))
      setTasks(normalized)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function run(name: string) {
    const res = await fetch(`/api/automation/tasks/${encodeURIComponent(name)}/run`, { method: 'POST' })
    if (res.ok) {
      await load()
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Automation</h1>
            <p className="text-muted-foreground">Scheduled jobs and one-click runbooks.</p>
          </div>
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((t) => (
                <div key={t.name} className="border rounded-lg p-4 bg-secondary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-sm text-muted-foreground">Every {t.interval_seconds}s</div>
                      {t.last_run_at && (
                        <div className="text-xs text-muted-foreground mt-1">Last run: {new Date(t.last_run_at).toLocaleString()}</div>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => run(t.name)} disabled={loading}>Run</Button>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-muted-foreground">No tasks</div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

