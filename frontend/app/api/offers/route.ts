import { type NextRequest, NextResponse } from "next/server"
import { getOffersByClientId, createOffer } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId")
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 })
    }
    const offers = await getOffersByClientId(clientId)
    if (!offers || !Array.isArray(offers)) {
      return NextResponse.json([], { status: 200 })
    }
    return NextResponse.json(offers)
  } catch (error) {
    console.error("[v0] Failed to fetch offers:", error)
    return NextResponse.json({ error: "Failed to fetch offers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const offer = await createOffer(body)
    return NextResponse.json(offer, { status: 201 })
  } catch (error) {
    console.error("[v0] Failed to create offer:", error)
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 })
  }
}
