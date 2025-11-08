// Script to send notifications for active alerts
// Run this periodically (e.g., every hour) to notify about new alerts

import { neon } from "@neondatabase/serverless"
import {
  sendEmailNotification,
  sendTelegramNotification,
  formatAlertMessage,
  formatAlertEmailHTML,
} from "@/lib/notifications"

const sql = neon(process.env.DATABASE_URL || "")

async function sendNotifications() {
  try {
    console.log("[Notifications] Starting notification dispatch...")

    // Get unnotified alerts
    const alerts = await sql`
      SELECT a.*, s.client_id, c.email
      FROM monitoring_alerts a
      JOIN services s ON a.service_id = s.id
      JOIN clients c ON s.client_id = c.id
      WHERE a.is_resolved = FALSE
      AND a.created_at > NOW() - INTERVAL '1 hour'
      LIMIT 10
    `

    for (const alert of alerts) {
      // Send email notification
      if (alert.email) {
        const htmlContent = formatAlertEmailHTML({
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          timestamp: alert.created_at,
        })

        await sendEmailNotification(alert.email, `Alert: ${alert.type}`, alert.message, htmlContent)
      }

      // Send Telegram notification
      const message = formatAlertMessage({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
      })

      await sendTelegramNotification(message)
    }

    console.log(`[Notifications] Sent ${alerts.length} notifications`)
  } catch (error) {
    console.error("[Notifications] Error:", error)
  }
}

// Run the notification dispatch
sendNotifications()
