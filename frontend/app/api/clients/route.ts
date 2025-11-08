import { type NextRequest, NextResponse } from "next/server"
import { getClients, createClient } from "@/lib/db"

export async function GET() {
  try {
    const clients = await getClients()
    if (!clients || !Array.isArray(clients)) {
      return NextResponse.json([], { status: 200 })
    }
    return NextResponse.json(clients)
  } catch (error) {
    console.error("[v0] Failed to fetch clients:", error)
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await createClient(body)
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error("[v0] Failed to create client:", error)
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
  }
}
