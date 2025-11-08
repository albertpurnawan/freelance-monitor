import { type NextRequest, NextResponse } from "next/server"
import { checkDomainExpiry, checkSSLExpiry, checkUptime, checkRenewalReminder } from "@/lib/monitoring"
import { createAlert } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { services } = body

    const alerts = []

    for (const service of services) {
      // Check domain expiry
      if (service.type === "domain") {
        const domainAlert = await checkDomainExpiry(service.domain, new Date(service.renewalDate))
        if (domainAlert) {
          alerts.push(domainAlert)
          await createAlert({
            serviceId: service.id,
            type: domainAlert.type,
            severity: domainAlert.severity,
            message: domainAlert.message,
            isResolved: false,
          })
        }
      }

      // Check SSL expiry
      if (service.type === "ssl") {
        const sslAlert = await checkSSLExpiry(service.domain, new Date(service.renewalDate))
        if (sslAlert) {
          alerts.push(sslAlert)
          await createAlert({
            serviceId: service.id,
            type: sslAlert.type,
            severity: sslAlert.severity,
            message: sslAlert.message,
            isResolved: false,
          })
        }
      }

      // Check uptime
      if (service.domain) {
        const uptimeAlert = await checkUptime(service.domain)
        if (uptimeAlert) {
          alerts.push(uptimeAlert)
          await createAlert({
            serviceId: service.id,
            type: uptimeAlert.type,
            severity: uptimeAlert.severity,
            message: uptimeAlert.message,
            isResolved: false,
          })
        }
      }

      // Check renewal reminder
      const reminderAlert = await checkRenewalReminder(service.domain || service.name, new Date(service.renewalDate))
      if (reminderAlert) {
        alerts.push(reminderAlert)
        await createAlert({
          serviceId: service.id,
          type: reminderAlert.type,
          severity: reminderAlert.severity,
          message: reminderAlert.message,
          isResolved: false,
        })
      }
    }

    return NextResponse.json({ alerts, count: alerts.length })
  } catch (error) {
    console.error("Monitoring check error:", error)
    return NextResponse.json({ error: "Failed to check services" }, { status: 500 })
  }
}
