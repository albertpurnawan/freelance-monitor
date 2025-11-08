"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { OfferForm, OfferFormValues } from "@/components/offers/offer-form"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { apiFetch, apiFetchJson } from "@/lib/api"

interface ClientInfo {
  id: string
  name: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}

export default function EditOfferPage() {
  const params = useParams()
  const router = useRouter()
  const offerId = Number(params.id)
  const [client, setClient] = useState<ClientInfo | null>(null)
  const [initial, setInitial] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!offerId) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await apiFetch(`/api/offers/${offerId}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const off = await res.json()

        let clientInfo: ClientInfo = { id: String(off.client_id), name: `Client #${off.client_id}` }
        try {
          const clientRes = await apiFetchJson(`/api/clients/${off.client_id}`)
          if (clientRes.ok && clientRes.data) {
            const c = clientRes.data as any
            clientInfo = {
              id: String(c.id),
              name: c.name,
              contactPerson: c.contact_person ?? null,
              email: c.email ?? null,
              phone: c.phone ?? null,
              address: c.address ?? null,
            }
          }
        } catch {
          // ignore client fetch errors; fallback to minimal info
        }
        setClient(clientInfo)

        let servicesRaw: any[] = []
        try {
          const parsed = JSON.parse(off.items || "[]")
          if (Array.isArray(parsed)) {
            servicesRaw = parsed
          }
        } catch {
          servicesRaw = []
        }

        const services = servicesRaw.map((service, index) => {
          const quantityValue = Number(service.quantity ?? service.qty ?? 1)
          const unitPriceValue = Number(service.unitPrice ?? service.unit_price ?? service.price ?? 0)
          return {
            id: String(index + 1),
            name: service.name || "",
            description: service.description || "",
            duration: service.duration || "",
            quantity: Number.isFinite(quantityValue) ? quantityValue : 0,
            unitPrice: Number.isFinite(unitPriceValue) ? unitPriceValue : 0,
          }
        })

        const validUntil =
          off.valid_until && !Number.isNaN(Date.parse(off.valid_until))
            ? new Date(off.valid_until).toISOString().slice(0, 10)
            : ""

        setInitial({
          title: off.subject || "",
          offerTitle: off.offer_title || "",
          proposalSummary: off.proposal_summary || "",
          proposalDetails: off.proposal_details || "",
          note: off.notes || "",
          paymentTerms: off.payment_terms || "",
          closingText: off.closing_text || "",
          validUntil,
          currency: off.currency || "IDR",
          issuerName: off.issuer_name || "",
          issuerCompany: off.issuer_company || "",
          issuerAddress: off.issuer_address || "",
          issuerCity: off.issuer_city || "",
          issuerPhone: off.issuer_phone || "",
          issuerEmail: off.issuer_email || "",
          signatureTitle: off.signature_title || "",
          signatureCompany: off.signature_company || off.issuer_company || "",
          signatureCity: off.signature_city || off.issuer_city || "",
          clientAttention: off.client_attention || "",
          services,
        })
      } catch (error) {
        console.error("Failed to load offer", error)
        setClient(null)
        setInitial(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [offerId])

  async function handleSubmit(formData: OfferFormValues) {
    const payload = {
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
    }
    const res = await apiFetch(`/api/offers/${offerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (res.ok) router.push(`/offers/${offerId}`)
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background"><Sidebar /><main className="flex-1 flex items-center justify-center">Loading...</main></div>
    )
  }

  if (!initial || !client) {
    return (
      <div className="flex h-screen bg-background"><Sidebar /><main className="flex-1 flex items-center justify-center">Offer not found</main></div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Card className="p-8">
            <h1 className="text-3xl font-bold mb-2">Edit Offer</h1>
            <p className="text-muted-foreground">Update details and regenerate if needed.</p>
          </Card>
          <div className="mt-6">
            <OfferForm
              client={client}
              onSubmit={handleSubmit}
              isLoading={false}
              initial={initial || undefined}
              submitLabel="Save Changes"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
