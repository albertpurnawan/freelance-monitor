"use client"

import { useState, useEffect } from "react"
import { apiFetchJson, apiPostJson } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { OfferForm, OfferFormValues } from "@/components/offers/offer-form"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Client {
  id: string
  name: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}

export default function NewOfferPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    try {
      const { ok, data } = await apiFetchJson("/api/clients")
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
      setClients(
        items.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          contactPerson: c.contact_person ?? null,
          email: c.email ?? null,
          phone: c.phone ?? null,
          address: c.address ?? null,
        }))
      )
    } catch (error) {
      console.error("Failed to fetch clients:", error)
    }
  }

  async function handleSubmit(formData: OfferFormValues) {
    if (!selectedClient) return
    setLoading(true)
    try {
      const payload = {
        client_id: Number(selectedClient.id),
        subject: formData.title,
        offer_title: formData.offerTitle,
        items: JSON.stringify(formData.services || []),
        total_price: formData.totalAmount,
        notes: formData.note || "",
        proposal_summary: formData.proposalSummary || "",
        proposal_details: formData.proposalDetails || "",
        payment_terms: formData.paymentTerms || "",
        closing_text: formData.closingText || "",
        currency: formData.currency || "IDR",
        valid_until: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
        issuer_name: formData.issuerName,
        issuer_company: formData.issuerCompany,
        issuer_address: formData.issuerAddress,
        issuer_city: formData.issuerCity,
        issuer_phone: formData.issuerPhone,
        issuer_email: formData.issuerEmail,
        signature_title: formData.signatureTitle,
        signature_company: formData.signatureCompany || formData.issuerCompany,
        signature_city: formData.signatureCity || formData.issuerCity,
        client_attention: formData.clientAttention,
        status: "draft",
      }
      const { ok } = await apiPostJson("/api/offers", payload)

      if (ok) {
        router.push("/offers")
      }
    } catch (error) {
      console.error("Failed to create offer:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Link href="/offers">
            <Button variant="outline" size="sm" className="gap-2 mb-6 bg-transparent">
              <ArrowLeft className="w-4 h-4" />
              Back to Offers
            </Button>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Offer</h1>
            <p className="text-muted-foreground">Generate a professional service offer for your client</p>
          </div>

          {!selectedClient ? (
            <Card className="p-8">
              <h2 className="text-xl font-semibold mb-4">Select a Client</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="p-4 border border-border rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <p className="font-semibold">{client.name}</p>
                    <p className="text-sm text-muted-foreground">Click to select</p>
                  </button>
                ))}
              </div>
              {clients.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No clients found</p>
                  <Link href="/clients">
                    <Button>Add a client first</Button>
                  </Link>
                </div>
              )}
            </Card>
          ) : (
            <div>
              <Button variant="outline" size="sm" onClick={() => setSelectedClient(null)} className="mb-6">
                Change Client
              </Button>
              <OfferForm client={selectedClient} onSubmit={handleSubmit} isLoading={loading} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
