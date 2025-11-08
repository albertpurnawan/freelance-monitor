// This script should be run periodically (e.g., every hour) to check all services
// You can use Vercel Cron or a third-party service like EasyCron

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function runMonitoringCheck() {
  try {
    console.log("[Monitoring] Starting service checks...")

    // Get all services
    const services = await sql`SELECT * FROM services`

    // Check each service
    for (const service of services) {
      const alerts = []

      // Check domain expiry
      if (service.type === "domain" || service.type === "hosting") {
        const today = new Date()
        const renewalDate = new Date(service.renewal_date)
        const daysLeft = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysLeft <= 30 && daysLeft > 0) {
          alerts.push({
            type: "domain_expiry",
            severity: daysLeft <= 7 ? "high" : "medium",
            message: `${service.name} will expire in ${daysLeft} days`,
          })
        } else if (daysLeft <= 0) {
          alerts.push({
            type: "domain_expiry",
            severity: "high",
            message: `${service.name} has expired`,
          })
        }
      }

      // Create alerts in database
      for (const alert of alerts) {
        await sql`
          INSERT INTO monitoring_alerts (service_id, type, severity, message, is_resolved)
          VALUES (${service.id}, ${alert.type}, ${alert.severity}, ${alert.message}, false)
          ON CONFLICT DO NOTHING
        `
      }
    }

    console.log("[Monitoring] Service checks completed")
  } catch (error) {
    console.error("[Monitoring] Error:", error)
  }
}

// Run the monitoring check
runMonitoringCheck()
