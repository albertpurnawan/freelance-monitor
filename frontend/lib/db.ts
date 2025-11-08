// Database client and query functions
// This file will be used to interact with your PostgreSQL database

import { neon } from "@neondatabase/serverless"
import type { Client, Service, Offer, MonitoringAlert } from "./types"

const sql = neon(process.env.NEON_DATABASE_URL || "")

function transformRow(row: any): any {
  if (!row) return row
  const transformed: any = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    transformed[camelKey] = value
  }
  return transformed
}

function transformRows(rows: any[]): any[] {
  return rows.map(transformRow)
}

export async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        company VARCHAR(255),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        domain VARCHAR(255),
        cost DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        renewal_date TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        offer_number VARCHAR(50) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        total_amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        valid_until TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS offer_services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS monitoring_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        is_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_services_client_id ON services(client_id);
      CREATE INDEX IF NOT EXISTS idx_offers_client_id ON offers(client_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_service_id ON monitoring_alerts(service_id);
    `
    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Database initialization error:", error)
    throw error
  }
}

// Client queries
export async function getClients() {
  const result = await sql`SELECT * FROM clients ORDER BY created_at DESC`
  return transformRows(result)
}

export async function getClientById(id: string) {
  const result = await sql`SELECT * FROM clients WHERE id = ${id}`
  return transformRow(result[0])
}

export async function createClient(client: Omit<Client, "id" | "createdAt" | "updatedAt">) {
  const result = await sql`
    INSERT INTO clients (name, email, phone, company, address, city, country)
    VALUES (${client.name}, ${client.email}, ${client.phone}, ${client.company}, ${client.address}, ${client.city}, ${client.country})
    RETURNING *
  `
  return transformRow(result[0])
}

// Service queries
export async function getServicesByClientId(clientId: string) {
  const result = await sql`SELECT * FROM services WHERE client_id = ${clientId} ORDER BY renewal_date ASC`
  return transformRows(result)
}

export async function createService(service: Omit<Service, "id" | "createdAt" | "updatedAt">) {
  const result = await sql`
    INSERT INTO services (client_id, name, type, domain, cost, currency, renewal_date, status, notes)
    VALUES (${service.clientId}, ${service.name}, ${service.type}, ${service.domain}, ${service.cost}, ${service.currency}, ${service.renewalDate}, ${service.status}, ${service.notes})
    RETURNING *
  `
  return transformRow(result[0])
}

// Offer queries
export async function getOffersByClientId(clientId: string) {
  const result = await sql`SELECT * FROM offers WHERE client_id = ${clientId} ORDER BY created_at DESC`
  return transformRows(result)
}

export async function createOffer(offer: Omit<Offer, "id" | "createdAt" | "updatedAt">) {
  const result = await sql`
    INSERT INTO offers (client_id, offer_number, title, description, total_amount, currency, valid_until, status)
    VALUES (${offer.clientId}, ${offer.offerNumber}, ${offer.title}, ${offer.description}, ${offer.totalAmount}, ${offer.currency}, ${offer.validUntil}, ${offer.status})
    RETURNING *
  `
  return transformRow(result[0])
}

// Monitoring alerts
export async function getAlerts() {
  const result = await sql`SELECT * FROM monitoring_alerts WHERE is_resolved = FALSE ORDER BY created_at DESC`
  return transformRows(result)
}

export async function createAlert(alert: Omit<MonitoringAlert, "id" | "createdAt">) {
  const result = await sql`
    INSERT INTO monitoring_alerts (service_id, type, severity, message, is_resolved)
    VALUES (${alert.serviceId}, ${alert.type}, ${alert.severity}, ${alert.message}, ${alert.isResolved})
    RETURNING *
  `
  return transformRow(result[0])
}
