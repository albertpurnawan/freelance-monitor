'use client'

import type { FormEvent } from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"

interface ServiceItem {
  id: string
  name: string
  description: string
  duration: string
  quantity: number
  unitPrice: number
}

interface OfferClient {
  id: string
  name: string
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}

interface OfferFormInitial {
  title?: string
  offerTitle?: string
  proposalSummary?: string
  proposalDetails?: string
  note?: string
  paymentTerms?: string
  closingText?: string
  validUntil?: string
  currency?: string
  issuerName?: string
  issuerCompany?: string
  issuerAddress?: string
  issuerCity?: string
  issuerPhone?: string
  issuerEmail?: string
  signatureTitle?: string
  signatureCompany?: string
  signatureCity?: string
  clientAttention?: string
  services?: Array<Partial<ServiceItem>>
}

export interface OfferFormValues {
  clientId: string
  clientAttention: string
  title: string
  offerTitle: string
  proposalSummary: string
  proposalDetails: string
  note: string
  paymentTerms: string
  closingText: string
  validUntil: string
  currency: string
  issuerName: string
  issuerCompany: string
  issuerAddress: string
  issuerCity: string
  issuerPhone: string
  issuerEmail: string
  signatureTitle: string
  signatureCompany: string
  signatureCity: string
  services: Array<{
    name: string
    description: string
    duration: string
    quantity: number
    unitPrice: number
    total: number
  }>
  totalAmount: number
}

interface OfferFormProps {
  client: OfferClient
  onSubmit: (data: OfferFormValues) => void
  isLoading?: boolean
  initial?: OfferFormInitial
  submitLabel?: string
}

const defaultService = (): ServiceItem => ({
  id: Date.now().toString(),
  name: "",
  description: "",
  duration: "",
  quantity: 1,
  unitPrice: 0,
})

export function OfferForm({ client, onSubmit, isLoading, initial, submitLabel }: OfferFormProps) {
   const [title, setTitle] = useState(initial?.title || "")
   const [offerTitle, setOfferTitle] = useState(initial?.offerTitle || "Rincian Produk & Jasa")
   const [proposalSummary, setProposalSummary] = useState(initial?.proposalSummary || "")
   const [proposalDetails, setProposalDetails] = useState(initial?.proposalDetails || "")
   const [note, setNote] = useState(initial?.note || "")
   const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms || "")
   const [closingText, setClosingText] = useState(initial?.closingText || "")
   const [validUntil, setValidUntil] = useState(initial?.validUntil || "")
   const [currency, setCurrency] = useState(initial?.currency || "IDR")
   const [issuerName, setIssuerName] = useState(initial?.issuerName || "")
   const [issuerCompany, setIssuerCompany] = useState(initial?.issuerCompany || "")
   const [issuerAddress, setIssuerAddress] = useState(initial?.issuerAddress || "")
   const [issuerCity, setIssuerCity] = useState(initial?.issuerCity || "")
   const [issuerPhone, setIssuerPhone] = useState(initial?.issuerPhone || "")
   const [issuerEmail, setIssuerEmail] = useState(initial?.issuerEmail || "")
   const [signatureTitle, setSignatureTitle] = useState(initial?.signatureTitle || "")
   const [signatureCompany, setSignatureCompany] = useState(
     initial?.signatureCompany || initial?.issuerCompany || ""
   )
   const [signatureCity, setSignatureCity] = useState(initial?.signatureCity || initial?.issuerCity || "")
   const [clientAttention, setClientAttention] = useState(
     initial?.clientAttention || client.contactPerson || ""
   )
   const [services, setServices] = useState<ServiceItem[]>(() => {
     if (initial?.services && initial.services.length > 0) {
       return initial.services.map((service, index) => ({
         id: String(service.id || Date.now() + index),
         name: service.name || "",
         description: service.description || "",
         duration: service.duration || "",
         quantity: Number.isFinite(service.quantity as number) ? Number(service.quantity) : 1,
         unitPrice: Number.isFinite(service.unitPrice as number)
           ? Number(service.unitPrice)
           : Number.isFinite(service["unit_price" as keyof typeof service] as number)
             ? Number(service["unit_price" as keyof typeof service])
             : 0,
       }))
     }
     return [defaultService()]
   })

   useEffect(() => {
     if (!initial) return
     setTitle(initial.title || "")
     setOfferTitle(initial.offerTitle || "Rincian Produk & Jasa")
     setProposalSummary(initial.proposalSummary || "")
     setProposalDetails(initial.proposalDetails || "")
     setNote(initial.note || "")
     setPaymentTerms(initial.paymentTerms || "")
     setClosingText(initial.closingText || "")
     setValidUntil(initial.validUntil || "")
     setCurrency(initial.currency || "IDR")
     setIssuerName(initial.issuerName || "")
     setIssuerCompany(initial.issuerCompany || "")
     setIssuerAddress(initial.issuerAddress || "")
     setIssuerCity(initial.issuerCity || "")
     setIssuerPhone(initial.issuerPhone || "")
     setIssuerEmail(initial.issuerEmail || "")
     setSignatureTitle(initial.signatureTitle || "")
     setSignatureCompany(initial.signatureCompany || initial.issuerCompany || "")
     setSignatureCity(initial.signatureCity || initial.issuerCity || "")
     setClientAttention(initial.clientAttention || client.contactPerson || "")
     setServices(
       initial.services && initial.services.length
         ? initial.services.map((service, index) => ({
             id: String(service.id || Date.now() + index),
             name: service.name || "",
             description: service.description || "",
             duration: service.duration || "",
             quantity: Number.isFinite(service.quantity as number) ? Number(service.quantity) : 1,
             unitPrice: Number.isFinite(service.unitPrice as number)
               ? Number(service.unitPrice)
               : Number.isFinite(service["unit_price" as keyof typeof service] as number)
                 ? Number(service["unit_price" as keyof typeof service])
                 : 0,
           }))
         : [defaultService()]
     )
   }, [
     initial?.title,
     initial?.offerTitle,
     initial?.proposalSummary,
     initial?.proposalDetails,
     initial?.note,
     initial?.paymentTerms,
     initial?.closingText,
     initial?.validUntil,
     initial?.currency,
     initial?.issuerName,
     initial?.issuerCompany,
     initial?.issuerAddress,
     initial?.issuerCity,
     initial?.issuerPhone,
     initial?.issuerEmail,
     initial?.signatureTitle,
     initial?.signatureCompany,
     initial?.signatureCity,
     initial?.clientAttention,
     JSON.stringify(initial?.services || []),
     client.contactPerson,
   ])

   useEffect(() => {
     if (initial?.clientAttention) {
       return
     }
     setClientAttention((prev) => prev || client.contactPerson || "")
   }, [client.contactPerson, initial?.clientAttention])

   const totalAmount = useMemo(
     () =>
       services.reduce((sum, service) => {
         const qty = Number.isFinite(service.quantity) ? service.quantity : 0
         const price = Number.isFinite(service.unitPrice) ? service.unitPrice : 0
         return sum + qty * price
       }, 0),
     [services]
   )

   const addService = () => {
     setServices((prev) => [...prev, defaultService()])
   }

   const removeService = (id: string) => {
     setServices((prev) => prev.filter((service) => service.id !== id))
   }

   const updateService = (id: string, field: keyof ServiceItem, value: string | number) => {
     setServices((prev) =>
       prev.map((service) =>
         service.id === id
           ? {
               ...service,
               [field]:
                 field === "quantity" || field === "unitPrice"
                   ? typeof value === "number"
                     ? value
                     : value === ""
                       ? 0
                       : Number(value)
                   : value,
             }
           : service
       )
     )
   }

   const handleSubmit = (event: FormEvent) => {
     event.preventDefault()
     const normalizedServices = services.map((service) => {
       const quantity = Number.isFinite(service.quantity) ? service.quantity : 0
       const unitPrice = Number.isFinite(service.unitPrice) ? service.unitPrice : 0
       return {
         name: service.name,
         description: service.description,
         duration: service.duration,
         quantity,
         unitPrice,
         total: quantity * unitPrice,
       }
     })

     onSubmit({
       clientId: client.id,
       clientAttention,
       title,
       offerTitle: offerTitle || "Rincian Produk & Jasa",
       proposalSummary,
       proposalDetails,
       note,
       paymentTerms,
       closingText,
       validUntil,
       currency,
       issuerName,
       issuerCompany,
       issuerAddress,
       issuerCity,
       issuerPhone,
       issuerEmail,
       signatureTitle,
       signatureCompany,
       signatureCity,
       services: normalizedServices,
       totalAmount,
     })
   }

   const formatIDRCurrency = (value: number) =>
     `Rp ${Number(value || 0).toLocaleString("id-ID", { minimumFractionDigits: 0 })}`

   return (
     <form onSubmit={handleSubmit} className="space-y-6">
       <Card className="p-6 bg-secondary/30">
         <h2 className="text-xl font-semibold mb-2">Client Information</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
           <div>
             <p className="text-muted-foreground">Nama Klien</p>
             <p className="font-medium">{client.name}</p>
           </div>
           <div>
             <p className="text-muted-foreground">Kontak</p>
             <p className="font-medium">
               {client.contactPerson || client.email || client.phone ? (
                 <>
                   {client.contactPerson ? `Up. ${client.contactPerson}` : ""}
                   {client.email ? `${client.contactPerson ? " • " : ""}${client.email}` : ""}
                   {client.phone ? `${client.contactPerson || client.email ? " • " : ""}${client.phone}` : ""}
                 </>
               ) : (
                 "-"
               )}
             </p>
           </div>
           <div className="md:col-span-2">
             <p className="text-muted-foreground">Alamat</p>
             <p className="font-medium">{client.address || "-"}</p>
           </div>
         </div>
       </Card>

       <Card className="p-6">
         <h2 className="text-xl font-semibold mb-4">Offer Details</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2">
             <Label htmlFor="title">Offer Subject</Label>
             <Input
               id="title"
               placeholder="e.g., Penawaran Hosting & Domain"
               value={title}
               onChange={(event) => setTitle(event.target.value)}
               required
             />
           </div>
           <div className="space-y-2">
             <Label htmlFor="offerTitle">Table Heading</Label>
             <Input
               id="offerTitle"
               placeholder="e.g., Rincian Produk & Jasa"
               value={offerTitle}
               onChange={(event) => setOfferTitle(event.target.value)}
             />
           </div>
           <div className="space-y-2">
             <Label htmlFor="clientAttention">Client Attention</Label>
             <Input
               id="clientAttention"
               placeholder="e.g., Up. Ibu Christine"
               value={clientAttention}
               onChange={(event) => setClientAttention(event.target.value)}
             />
           </div>
           <div className="space-y-2">
             <Label htmlFor="validUntil">Valid Until</Label>
             <DatePicker value={validUntil} onChange={setValidUntil} />
           </div>
           <div className="space-y-2">
             <Label htmlFor="currency">Currency</Label>
             <Input
               id="currency"
               value={currency}
               onChange={(event) => setCurrency(event.target.value)}
             />
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
           <div className="space-y-2">
             <Label htmlFor="proposalSummary">Opening Paragraph</Label>
             <textarea
               id="proposalSummary"
               placeholder="Describe the main intent of the proposal..."
               value={proposalSummary}
               onChange={(event) => setProposalSummary(event.target.value)}
               className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
               rows={4}
             />
           </div>
           <div className="space-y-2">
             <Label htmlFor="proposalDetails">Supporting Details</Label>
             <textarea
               id="proposalDetails"
               placeholder="Highlight key services, onboarding plans, or commitments..."
               value={proposalDetails}
               onChange={(event) => setProposalDetails(event.target.value)}
               className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
               rows={4}
             />
           </div>
         </div>
       </Card>

       <Card className="p-6">
         <h2 className="text-xl font-semibold mb-4">Issuer & Signature Information</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="space-y-2">
             <Label>Issuer Name</Label>
             <Input value={issuerName} onChange={(event) => setIssuerName(event.target.value)} />
           </div>
           <div className="space-y-2">
             <Label>Issuer Company</Label>
             <Input value={issuerCompany} onChange={(event) => setIssuerCompany(event.target.value)} />
           </div>
           <div className="space-y-2">
             <Label>Issuer Address</Label>
             <Input value={issuerAddress} onChange={(event) => setIssuerAddress(event.target.value)} />
           </div>
           <div className="space-y-2">
             <Label>Issuer City</Label>
             <Input value={issuerCity} onChange={(event) => setIssuerCity(event.target.value)} />
           </div>
           <div className="space-y-2">
             <Label>Issuer Phone</Label>
             <Input value={issuerPhone} onChange={(event) => setIssuerPhone(event.target.value)} />
           </div>
           <div className="space-y-2">
             <Label>Issuer Email</Label>
             <Input value={issuerEmail} onChange={(event) => setIssuerEmail(event.target.value)} />
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
           <div className="space-y-2">
             <Label>Signature Title</Label>
             <Input
               placeholder="e.g., IT Solution Consultant"
               value={signatureTitle}
               onChange={(event) => setSignatureTitle(event.target.value)}
             />
           </div>
           <div className="space-y-2">
             <Label>Signature Company</Label>
             <Input
               value={signatureCompany}
               onChange={(event) => setSignatureCompany(event.target.value)}
             />
           </div>
           <div className="space-y-2">
             <Label>Signature City</Label>
             <Input
               placeholder="e.g., Jakarta"
               value={signatureCity}
               onChange={(event) => setSignatureCity(event.target.value)}
             />
           </div>
         </div>
       </Card>

       <Card className="p-6">
         <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-semibold">Services</h2>
           <Button type="button" onClick={addService} variant="outline" size="sm" className="gap-2 bg-transparent">
             <Plus className="w-4 h-4" />
             Add Service
           </Button>
         </div>

         <div className="space-y-4">
           {services.map((service) => (
             <div key={service.id} className="p-4 border border-border rounded-lg space-y-3">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div className="md:col-span-2 space-y-2">
                   <Label>Service Name</Label>
                   <Input
                     placeholder="e.g., Hosting emico.co.id"
                     value={service.name}
                     onChange={(event) => updateService(service.id, "name", event.target.value)}
                     required
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Duration</Label>
                   <Input
                     placeholder="e.g., 1 Tahun"
                     value={service.duration}
                     onChange={(event) => updateService(service.id, "duration", event.target.value)}
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <Label>Description</Label>
                 <Input
                   placeholder="Service description"
                   value={service.description}
                   onChange={(event) => updateService(service.id, "description", event.target.value)}
                 />
               </div>

               <div className="grid grid-cols-3 gap-3">
                 <div className="space-y-2">
                   <Label>Quantity</Label>
                   <Input
                     type="number"
                     min="0"
                     value={service.quantity}
                     onChange={(event) =>
                       updateService(
                         service.id,
                         "quantity",
                         event.target.value === "" ? 0 : Number.parseInt(event.target.value, 10) || 0
                       )
                     }
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Unit Price (Rp)</Label>
                   <Input
                     type="number"
                     min="0"
                     value={service.unitPrice}
                     onChange={(event) =>
                       updateService(
                         service.id,
                         "unitPrice",
                         event.target.value === "" ? 0 : Number.parseFloat(event.target.value) || 0
                       )
                     }
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Total</Label>
                   <div className="px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground">
                     {formatIDRCurrency(service.quantity * service.unitPrice)}
                   </div>
                 </div>
               </div>

               <Button
                 type="button"
                 onClick={() => removeService(service.id)}
                 variant="destructive"
                 size="sm"
                 className="gap-2"
               >
                 <Trash2 className="w-4 h-4" />
                 Remove
               </Button>
             </div>
           ))}
         </div>
       </Card>

       <Card className="p-6">
         <h2 className="text-xl font-semibold mb-4">Notes & Terms</h2>
         <div className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="note">Additional Notes</Label>
             <textarea
               id="note"
               placeholder="Clarify scope exclusions, maintenance terms, or other notes..."
               value={note}
               onChange={(event) => setNote(event.target.value)}
               className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
               rows={3}
             />
           </div>
           <div className="space-y-2">
             <Label htmlFor="paymentTerms">Payment Terms</Label>
             <textarea
               id="paymentTerms"
               placeholder="e.g., 50% down payment after approval, 50% after go-live"
               value={paymentTerms}
               onChange={(event) => setPaymentTerms(event.target.value)}
               className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
               rows={3}
             />
           </div>
           <div className="space-y-2">
             <Label htmlFor="closingText">Closing Message</Label>
             <textarea
               id="closingText"
               placeholder="Express gratitude and provide contact for follow-up..."
               value={closingText}
               onChange={(event) => setClosingText(event.target.value)}
               className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
               rows={3}
             />
           </div>
         </div>
       </Card>

       <Card className="p-6 bg-secondary/50">
         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
           <div>
             <p className="text-sm text-muted-foreground">Total Amount</p>
             <p className="text-3xl font-bold">{formatIDRCurrency(totalAmount)}</p>
           </div>
           <div className="text-right">
             <p className="text-sm text-muted-foreground">Client</p>
             <p className="text-lg font-semibold">{client.name}</p>
           </div>
         </div>
       </Card>

       <div className="flex gap-2">
         <Button type="submit" disabled={isLoading} className="flex-1">
           {isLoading ? (submitLabel ? submitLabel : "Saving...") : submitLabel ? submitLabel : "Create Offer"}
         </Button>
       </div>
     </form>
   )
 }
