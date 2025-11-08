"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Download, Trash2, CheckCircle, Upload } from "lucide-react"
import Link from "next/link"
import { apiFetch } from "@/lib/api"

interface BackendOffer {
  id: number
  offer_number: string
  client_id: number
  date: string
  subject: string
  total_price: number
  status: string
  pdf_url?: string
  signed_doc_url?: string
  approved_at?: string | null
}

export function OfferList() {
  const [offers, setOffers] = useState<BackendOffer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOffers()
  }, [])

  async function fetchOffers() {
    try {
      const res = await apiFetch(`/api/offers?limit=50&order=desc&sort=id`)
      const data = await res.json()
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
      setOffers(items)
    } catch (error) {
      console.error("Failed to fetch offers:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await apiFetch(`/api/offers/${id}`, { method: "DELETE" })
      if (res.ok) {
        setOffers((prev) => prev.filter((o) => o.id !== id))
      }
    } catch (e) {
      console.error("Failed to delete offer:", e)
    }
  }

  function openPDF(url?: string) {
    if (!url) return
    let base = process.env.NEXT_PUBLIC_BACKEND_URL || ""
    if (!base && typeof window !== 'undefined') {
      base = 'http://localhost:8080'
    }
    // Normalize base to origin (strip trailing /api if present)
    if (base.endsWith('/api')) {
      base = base.slice(0, -4)
    }
    let href = url.startsWith("http") ? url : `${base}${url}`
    const sep = href.includes('?') ? '&' : '?'
    href = `${href}${sep}t=${Date.now()}`
    window.open(href, "_blank")
  }

  function openPDFById(id: number) {
    if (typeof window === "undefined") return
    window.open(`/offers/${id}/pdf-preview?auto=open`, "_blank", "noopener,noreferrer")
  }

  async function approveOffer(id: number) {
    try {
      const res = await apiFetch(`/api/offers/${id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status: data.status } : o)))
      }
    } catch (e) {
      console.error('Failed to approve offer:', e)
    }
  }

  async function uploadSigned(id: number, file: File) {
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await apiFetch(`/api/offers/${id}/upload-signed`, { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok) {
        const signedUrl = data?.signed_doc_url as string | undefined
        setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'accepted', signed_doc_url: signedUrl || o.signed_doc_url } : o)))
      }
    } catch (e) {
      console.error('Failed to upload signed doc:', e)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading offers...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Offers</h1>
          <p className="text-muted-foreground">Manage your service offers</p>
        </div>
        <Link href="/offers/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Offer
          </Button>
        </Link>
      </div>

      {offers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No offers yet</p>
          <Link href="/offers/new">
            <Button>Create your first offer</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <Card key={offer.id} className="p-4">
              <div className="flex items-center justify-between">
                <Link href={`/offers/${offer.id}`} className="flex-1 hover:underline">
                  <div>
                    <h3 className="font-semibold">{offer.subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      {offer.offer_number} • {new Date(offer.date).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">Rp {Number(offer.total_price || 0).toLocaleString("id-ID")}</p>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(offer.status)}`}>{offer.status}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => openPDFById(offer.id)}>
                      <Download className="w-4 h-4" />
                      Open PDF
                    </Button>
                    {offer.signed_doc_url && (
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => openPDF(offer.signed_doc_url)}>
                        <Download className="w-4 h-4" />
                        Signed
                      </Button>
                    )}
                    <label className="inline-flex items-center gap-2 cursor-pointer text-sm px-3 py-1 border rounded bg-transparent">
                      <Upload className="w-4 h-4" />
                      <span>Upload Signed</span>
                      <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadSigned(offer.id, e.target.files![0])} />
                    </label>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => approveOffer(offer.id)} disabled={offer.status === 'accepted'}>
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => handleDelete(offer.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
