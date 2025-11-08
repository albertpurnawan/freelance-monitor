"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Sidebar } from "@/components/sidebar"
import { RequireAuth } from "@/components/auth/require-auth"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, CheckCircle, Upload, Trash2 } from "lucide-react"
import { apiFetch } from "@/lib/api"

interface BackendOffer {
  id: number
  offer_number: string
  client_id: number
  date: string
  subject: string
  items: string
  total_price: number
  notes?: string
  status: string
  pdf_url?: string
  signed_doc_url?: string
  approved_at?: string | null
}

export default function OfferDetailPage() {
  const params = useParams()
  const offerId = Number(params.id)
  const [offer, setOffer] = useState<BackendOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState<{ id: number; name: string; email?: string } | null>(null)

  useEffect(() => {
    if (!offerId) return
    fetchOffer()
  }, [offerId])

  async function fetchOffer() {
    try {
      const res = await apiFetch(`/api/offers/${offerId}`)
      if (!res.ok) throw new Error(`status ${res.status}`)
      const data = await res.json()
      setOffer(data)
      // fetch client info in parallel
      if (data?.client_id) {
        try {
          const cres = await apiFetch(`/api/clients/${data.client_id}`)
          if (cres.ok) {
            const c = await cres.json()
            setClient(c)
          }
        } catch {}
      }
    } catch (e) {
      console.error("Failed to fetch offer:", e)
      setOffer(null)
    } finally {
      setLoading(false)
    }
  }

  function openURL(url?: string) {
    if (!url) return
    let base = process.env.NEXT_PUBLIC_BACKEND_URL || ""
    if (!base && typeof window !== 'undefined') {
      base = 'http://localhost:8080'
    }
    if (base.endsWith('/api')) {
      base = base.slice(0, -4)
    }
    let href = url.startsWith("http") ? url : `${base}${url}`
    const sep = href.includes('?') ? '&' : '?'
    href = `${href}${sep}t=${Date.now()}`
    window.open(href, "_blank")
  }

  function openPDFInline() {
    if (!offer) return
    if (typeof window === "undefined") return
    window.open(`/offers/${offer.id}/pdf-preview?auto=open`, "_blank", "noopener,noreferrer")
  }

  async function approveOffer() {
    if (!offer) return
    try {
      const res = await apiFetch(`/api/offers/${offer.id}/approve`, { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setOffer({ ...offer, status: data.status, approved_at: data.approved_at })
      }
    } catch (e) {
      console.error("Failed to approve offer:", e)
    }
  }

  async function deleteOffer() {
    if (!offer) return
    const sure = typeof window !== 'undefined' ? window.confirm('Delete this offer? This cannot be undone.') : true
    if (!sure) return
    try {
      const res = await apiFetch(`/api/offers/${offer.id}`, { method: 'DELETE' })
      if (res.ok) {
        window.location.href = '/offers'
      }
    } catch (e) {
      console.error('Failed to delete offer:', e)
    }
  }

  async function uploadSigned(file: File) {
    if (!offer) return
    const form = new FormData()
    form.append("file", file)
    try {
      const res = await apiFetch(`/api/offers/${offer.id}/upload-signed`, { method: "POST", body: form })
      const data = await res.json()
      if (res.ok) {
        setOffer({ ...offer, status: "accepted", signed_doc_url: data?.signed_doc_url || offer.signed_doc_url, approved_at: data?.offer?.approved_at || offer.approved_at })
      }
    } catch (e) {
      console.error("Failed to upload signed doc:", e)
    }
  }

  const items = useMemo(() => {
    if (!offer?.items) return [] as Array<{ name?: string; quantity?: number; unit_price?: number; total?: number }>
    try {
      const parsed = JSON.parse(offer.items)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [offer?.items])

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p>Loading...</p>
        </main>
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p>Offer not found</p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <RequireAuth>
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <Link href="/offers">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <ArrowLeft className="w-4 h-4" /> Back to Offers
                </Button>
              </Link>
            </div>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold">{offer.subject}</h1>
                  <p className="text-sm text-muted-foreground">{offer.offer_number} • {new Date(offer.date).toLocaleDateString()}</p>
                  <p className="text-sm">Client: {client?.name || `#${offer.client_id}`}{client?.email ? ` • ${client.email}` : ''}</p>
                  <div className="text-sm">Status: <span className="font-medium">{offer.status}</span></div>
                  {offer.approved_at && (
                    <div className="text-sm text-green-700">Approved at: {new Date(offer.approved_at).toLocaleString()}</div>
                  )}
                  <div className="text-lg font-semibold mt-2">Total: Rp {Number(offer.total_price || 0).toLocaleString("id-ID")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/offers/${offer.id}/edit`}>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">Edit</Button>
                  </Link>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={openPDFInline}>
                    <Download className="w-4 h-4" /> Open PDF
                  </Button>
                  {offer.signed_doc_url && (
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={() => openURL(offer.signed_doc_url)}>
                      <Download className="w-4 h-4" /> Signed
                    </Button>
                  )}
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm px-3 py-1 border rounded bg-transparent">
                    <Upload className="w-4 h-4" />
                    <span>Upload Signed</span>
                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadSigned(e.target.files![0])} />
                  </label>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={approveOffer} disabled={offer.status === 'accepted'}>
                    <CheckCircle className="w-4 h-4" /> Approve
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={deleteOffer}>
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Items</h2>
              {items.length === 0 ? (
                <p className="text-muted-foreground">No items</p>
              ) : (
                <div className="divide-y">
                  {items.map((it, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{(it as any).name || `Item ${idx+1}`}</div>
                      </div>
                      <div className="text-sm text-right min-w-[200px]">
                        <div>Qty: {(it as any).quantity ?? '-'}</div>
                        <div>Unit: Rp {Number((it as any).unit_price || 0).toLocaleString("id-ID")}</div>
                        <div>Total: Rp {Number((it as any).total || 0).toLocaleString("id-ID")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </RequireAuth>
      </main>
    </div>
  )
}
