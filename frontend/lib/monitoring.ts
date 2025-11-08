// Monitoring engine for checking service health and expiry dates

export interface MonitoringResult {
  serviceId: string
  type: "domain_expiry" | "ssl_expiry" | "uptime_down" | "renewal_reminder"
  severity: "low" | "medium" | "high"
  message: string
  timestamp: Date
}

export async function checkDomainExpiry(domain: string, renewalDate: Date): Promise<MonitoringResult | null> {
  const today = new Date()
  const daysUntilExpiry = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry <= 0) {
    return {
      serviceId: domain,
      type: "domain_expiry",
      severity: "high",
      message: `Domain ${domain} has expired`,
      timestamp: new Date(),
    }
  }

  if (daysUntilExpiry <= 30) {
    return {
      serviceId: domain,
      type: "domain_expiry",
      severity: daysUntilExpiry <= 7 ? "high" : "medium",
      message: `Domain ${domain} will expire in ${daysUntilExpiry} days`,
      timestamp: new Date(),
    }
  }

  return null
}

export async function checkSSLExpiry(domain: string, renewalDate: Date): Promise<MonitoringResult | null> {
  const today = new Date()
  const daysUntilExpiry = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry <= 0) {
    return {
      serviceId: domain,
      type: "ssl_expiry",
      severity: "high",
      message: `SSL certificate for ${domain} has expired`,
      timestamp: new Date(),
    }
  }

  if (daysUntilExpiry <= 30) {
    return {
      serviceId: domain,
      type: "ssl_expiry",
      severity: daysUntilExpiry <= 7 ? "high" : "medium",
      message: `SSL certificate for ${domain} will expire in ${daysUntilExpiry} days`,
      timestamp: new Date(),
    }
  }

  return null
}

export async function checkUptime(domain: string): Promise<MonitoringResult | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(`https://${domain}`, { method: "HEAD", signal: controller.signal })
    clearTimeout(timeoutId)
    if (!response.ok) {
      return {
        serviceId: domain,
        type: "uptime_down",
        severity: "high",
        message: `${domain} is not responding (HTTP ${response.status})`,
        timestamp: new Date(),
      }
    }
  } catch (error) {
    clearTimeout(timeoutId)
    const reason = error instanceof DOMException && error.name === "AbortError" ? "timeout" : "unreachable"
    return {
      serviceId: domain,
      type: "uptime_down",
      severity: "high",
      message: `${domain} is down or ${reason}`,
      timestamp: new Date(),
    }
  }

  return null
}

export async function checkRenewalReminder(domain: string, renewalDate: Date): Promise<MonitoringResult | null> {
  const today = new Date()
  const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilRenewal === 7 || daysUntilRenewal === 14 || daysUntilRenewal === 30) {
    return {
      serviceId: domain,
      type: "renewal_reminder",
      severity: "low",
      message: `Reminder: ${domain} renewal is due in ${daysUntilRenewal} days`,
      timestamp: new Date(),
    }
  }

  return null
}
