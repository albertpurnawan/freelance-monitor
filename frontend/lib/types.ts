// Database and API types for the freelance monitoring system

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  city: string
  country: string
  createdAt: Date
  updatedAt: Date
}

export interface Service {
  id: string
  clientId: string
  name: string
  type: "hosting" | "domain" | "ssl" | "email" | "other"
  domain?: string
  cost: number
  currency: string
  renewalDate: Date
  status: "active" | "expiring" | "expired"
  notes: string
  createdAt: Date
  updatedAt: Date
}

export interface Offer {
  id: string
  clientId: string
  offerNumber: string
  title: string
  description: string
  services: OfferService[]
  totalAmount: number
  currency: string
  validUntil: Date
  status: "draft" | "sent" | "accepted" | "rejected"
  createdAt: Date
  updatedAt: Date
}

export interface OfferService {
  id: string
  offerId: string
  name: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface MonitoringAlert {
  id: string
  serviceId: string
  type: "domain_expiry" | "ssl_expiry" | "uptime_down" | "renewal_reminder"
  severity: "low" | "medium" | "high"
  message: string
  isResolved: boolean
  createdAt: Date
  resolvedAt?: Date
}

export interface DashboardMetrics {
  totalClients: number
  totalServices: number
  activeOffers: number
  expiringServices: number
  monthlyRevenue: number
  upcomingRenewals: Service[]
}
