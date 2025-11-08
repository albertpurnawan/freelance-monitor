// Email and Telegram notification service

export interface NotificationConfig {
  emailProvider?: "smtp" | "sendgrid"
  telegramBotToken?: string
  telegramChatId?: string
}

export async function sendEmailNotification(
  to: string,
  subject: string,
  message: string,
  htmlContent?: string,
): Promise<boolean> {
  try {
    // Using Resend or similar email service
    // For now, we'll use a generic email API approach
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "noreply@freelancemonitor.com",
        to,
        subject,
        html: htmlContent || `<p>${message}</p>`,
      }),
    })

    return response.ok
  } catch (error) {
    console.error("Email notification error:", error)
    return false
  }
}

export async function sendTelegramNotification(message: string): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_CHAT_ID

    if (!botToken || !chatId) {
      console.warn("Telegram credentials not configured")
      return false
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    })

    return response.ok
  } catch (error) {
    console.error("Telegram notification error:", error)
    return false
  }
}

export function formatAlertMessage(alert: {
  type: string
  severity: string
  message: string
  serviceName?: string
}): string {
  const severityEmoji = {
    high: "🔴",
    medium: "🟡",
    low: "🔵",
  }

  const emoji = severityEmoji[alert.severity as keyof typeof severityEmoji] || "ℹ️"

  return `${emoji} <b>${alert.type.toUpperCase()}</b>\n${alert.message}`
}

export function formatAlertEmailHTML(alert: {
  type: string
  severity: string
  message: string
  serviceName?: string
  timestamp?: Date
}): string {
  const severityColor = {
    high: "#dc2626",
    medium: "#f59e0b",
    low: "#3b82f6",
  }

  const color = severityColor[alert.severity as keyof typeof severityColor] || "#6b7280"

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${alert.type.toUpperCase()}</h2>
        <p style="margin: 5px 0 0 0; font-size: 12px;">Severity: ${alert.severity.toUpperCase()}</p>
      </div>
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 15px 0; color: #374151;">${alert.message}</p>
        ${alert.timestamp ? `<p style="margin: 0; font-size: 12px; color: #9ca3af;">${new Date(alert.timestamp).toLocaleString("id-ID")}</p>` : ""}
      </div>
    </div>
  `
}
