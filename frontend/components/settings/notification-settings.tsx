"use client"

import { useState } from "react"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Mail, Send } from "lucide-react"

export function NotificationSettings() {
  const [emailConfig, setEmailConfig] = useState({
    enabled: false,
    email: "",
  })

  const [telegramConfig, setTelegramConfig] = useState({
    enabled: false,
    botToken: "",
    chatId: "",
  })

  const [testMessage, setTestMessage] = useState("")

  const handleSaveEmail = async () => {
    try {
      // Save email configuration
      localStorage.setItem("emailConfig", JSON.stringify(emailConfig))
      alert("Email configuration saved")
    } catch (error) {
      console.error("Failed to save email config:", error)
    }
  }

  const handleSaveTelegram = async () => {
    try {
      // Save telegram configuration
      localStorage.setItem("telegramConfig", JSON.stringify(telegramConfig))
      alert("Telegram configuration saved")
    } catch (error) {
      console.error("Failed to save telegram config:", error)
    }
  }

  const handleTestEmail = async () => {
    try {
      const response = await apiFetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          recipient: emailConfig.email,
          alert: {
            type: "test_notification",
            severity: "low",
            message: testMessage || "This is a test notification from FreelanceMonitor",
          },
        }),
      })

      if (response.ok) {
        alert("Test email sent successfully")
      } else {
        alert("Failed to send test email")
      }
    } catch (error) {
      console.error("Failed to send test email:", error)
    }
  }

  const handleTestTelegram = async () => {
    try {
      const response = await apiFetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "telegram",
          alert: {
            type: "test_notification",
            severity: "low",
            message: testMessage || "This is a test notification from FreelanceMonitor",
          },
        }),
      })

      if (response.ok) {
        alert("Test Telegram message sent successfully")
      } else {
        alert("Failed to send test Telegram message")
      }
    } catch (error) {
      console.error("Failed to send test Telegram message:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-muted-foreground">Configure how you receive alerts</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Email Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="emailEnabled"
              checked={emailConfig.enabled}
              onChange={(e) => setEmailConfig({ ...emailConfig, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="emailEnabled">Enable email notifications</Label>
          </div>

          {emailConfig.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={emailConfig.email}
                  onChange={(e) => setEmailConfig({ ...emailConfig, email: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveEmail} className="flex-1">
                  Save Email Config
                </Button>
                <Button onClick={handleTestEmail} variant="outline" className="flex-1 bg-transparent">
                  Send Test Email
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Send className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Telegram Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="telegramEnabled"
              checked={telegramConfig.enabled}
              onChange={(e) => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <Label htmlFor="telegramEnabled">Enable Telegram notifications</Label>
          </div>

          {telegramConfig.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="botToken">Bot Token</Label>
                <Input
                  id="botToken"
                  type="password"
                  placeholder="Your Telegram bot token"
                  value={telegramConfig.botToken}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chatId">Chat ID</Label>
                <Input
                  id="chatId"
                  placeholder="Your Telegram chat ID"
                  value={telegramConfig.chatId}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveTelegram} className="flex-1">
                  Save Telegram Config
                </Button>
                <Button onClick={handleTestTelegram} variant="outline" className="flex-1 bg-transparent">
                  Send Test Message
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-secondary/50">
        <h3 className="font-semibold mb-3">Test Notification Message</h3>
        <textarea
          placeholder="Enter a custom test message (optional)"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
          rows={3}
        />
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How to setup Telegram</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Create a bot with BotFather on Telegram (@BotFather)</li>
          <li>Copy the bot token and paste it above</li>
          <li>Start a conversation with your bot</li>
          <li>Get your chat ID by sending /start to @userinfobot</li>
          <li>Paste your chat ID above and save</li>
        </ol>
      </Card>
    </div>
  )
}
