"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ServiceFormProps {
  clientId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => void
}

export function ServiceForm({ clientId, open, onOpenChange, onSubmit }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "hosting",
    domain: "",
    cost: "",
    renewalDate: "",
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      clientId,
      cost: Number.parseFloat(formData.cost),
      currency: "IDR",
      status: "active",
    })
    setFormData({
      name: "",
      type: "hosting",
      domain: "",
      cost: "",
      renewalDate: "",
      notes: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
          <DialogDescription>Add a new service for this client</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              placeholder="e.g., Hosting emico.co.id"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Service Type</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            >
              <option value="hosting">Hosting</option>
              <option value="domain">Domain</option>
              <option value="ssl">SSL Certificate</option>
              <option value="email">Email</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="emico.co.id"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Annual Cost (Rp)</Label>
            <Input
              id="cost"
              type="number"
              placeholder="586128"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="renewalDate">Renewal Date</Label>
            <DatePicker value={formData.renewalDate} onChange={(v) => setFormData({ ...formData, renewalDate: v })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              placeholder="Additional notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Service
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
