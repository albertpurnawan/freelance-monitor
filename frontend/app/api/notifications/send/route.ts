import { type NextRequest, NextResponse } from "next/server"
import {
  sendEmailNotification,
  sendTelegramNotification,
  formatAlertMessage,
  formatAlertEmailHTML,
} from "@/lib/notifications"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, alert, recipient } = body

    let success = false

    if (type === "email" && recipient) {
      const htmlContent = formatAlertEmailHTML(alert)
      success = await sendEmailNotification(recipient, `Alert: ${alert.type}`, alert.message, htmlContent)
    } else if (type === "telegram") {
      const message = formatAlertMessage(alert)
      success = await sendTelegramNotification(message)
    }

    return NextResponse.json({ success, type })
  } catch (error) {
    console.error("Notification send error:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
