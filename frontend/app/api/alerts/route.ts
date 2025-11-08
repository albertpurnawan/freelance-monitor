import { type NextRequest, NextResponse } from "next/server"
import { getAlerts, createAlert } from "@/lib/db"

export async function GET() {
  try {
    const alerts = await getAlerts()
    if (!alerts || !Array.isArray(alerts)) {
      return NextResponse.json([], { status: 200 })
    }
    return NextResponse.json(alerts)
  } catch (error) {
    console.error("[v0] Failed to fetch alerts:", error)
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const alert = await createAlert(body)
    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error("[v0] Failed to create alert:", error)
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 })
  }
}
