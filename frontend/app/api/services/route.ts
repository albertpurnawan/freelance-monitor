import { type NextRequest, NextResponse } from "next/server"
import { getServicesByClientId, createService } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId")
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 })
    }
    const services = await getServicesByClientId(clientId)
    if (!services || !Array.isArray(services)) {
      return NextResponse.json([], { status: 200 })
    }
    return NextResponse.json(services)
  } catch (error) {
    console.error("[v0] Failed to fetch services:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const service = await createService(body)
    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    console.error("[v0] Failed to create service:", error)
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 })
  }
}
