/* eslint-disable @next/next/no-img-element */
"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Sidebar } from "@/components/sidebar"
import { RequireAuth } from "@/components/auth/require-auth"
import { ArrowLeft, Download } from "lucide-react"
import { apiFetch } from "@/lib/api"

type BackendOffer = {
  id: number
  offer_number: string
  client_id: number
  date: string
  subject: string
  items: string
  total_price: number
  notes?: string
  status: string
  currency?: string
  issuer_name?: string
  issuer_company?: string
  issuer_address?: string
  issuer_city?: string
  issuer_phone?: string
  issuer_email?: string
  valid_until?: string | null
  offer_title?: string
  proposal_summary?: string
  proposal_details?: string
  payment_terms?: string
  closing_text?: string
  client_attention?: string
  signature_title?: string
  signature_company?: string
  signature_city?: string
}

type BackendClient = {
  id: number
  name: string
  address?: string
  email?: string
  phone?: string
  contact_person?: string
}

type TableColumn = { key: string; title: string; align?: "left" | "center" | "right" }
type OfferTable = { columns: TableColumn[]; rows: Array<Record<string, string>> }
type OfferTotal = { label: string; value: string; align?: "left" | "center" | "right" }

type TemplateData = {
  companyName: string
  companyAddress: string
  companyContact: string
  letterNumber: string
  date: string
  subject: string
  clientName: string
  clientAttention: string
  clientAddress: string
  paragraph1: string
  paragraph2: string
  offerTitle: string
  offerTable: OfferTable
  offerTotal?: OfferTotal | string
  offerValidity: string
  note: string
  paymentTerms: string
  closing: string
  signCityDate: string
  signName: string
  signPosition: string
  signCompany: string
}

const EXPORT_FILE_NAME = "Penawaran-PT-Emico-Mitra-Samudera.pdf"
const BACKGROUND_URL = "/offer-template/template.png"

const PREVIEW_CSS = `
.offer-template-preview {
  display: flex;
  justify-content: center;
}
.offer-template-preview__canvas {
  transform: scale(0.45);
  transform-origin: top left;
  background: #f2f4f8;
  padding: 32px;
  border-radius: 18px;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.08);
}
@media (min-width: 1024px) {
  .offer-template-preview__canvas {
    transform: scale(0.6);
  }
}
.offer-template-preview__canvas .page {
  position: relative;
  width: 1000px;
  aspect-ratio: 4419 / 6250;
  background-image: url('${BACKGROUND_URL}');
  background-size: cover;
  background-position: center;
  box-shadow: 0 20px 50px rgba(28, 54, 94, 0.25);
  border-radius: 18px;
  overflow: hidden;
}
.offer-template-preview__canvas .overlay {
  position: absolute;
  inset: 0;
  padding: clamp(40px, 7vw, 120px) clamp(32px, 6vw, 140px) clamp(48px, 9vw, 140px);
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.offer-template-preview__canvas .small {
  font-size: 13px;
  line-height: 1.7;
}
.offer-template-preview__canvas .letter-header {
  display: flex;
  justify-content: space-between;
  gap: 40px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(0, 68, 140, 0.2);
}
.offer-template-preview__canvas .company-details {
  max-width: 50%;
}
.offer-template-preview__canvas .company-name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.6px;
  margin: 0 0 6px;
  text-transform: uppercase;
}
.offer-template-preview__canvas .company-details p {
  margin: 4px 0;
}
.offer-template-preview__canvas .letter-meta {
  min-width: 240px;
  font-size: 14px;
}
.offer-template-preview__canvas .letter-meta p {
  display: flex;
  justify-content: space-between;
  margin: 6px 0;
  gap: 14px;
}
.offer-template-preview__canvas .letter-meta .label {
  font-weight: 600;
  color: #00448c;
}
.offer-template-preview__canvas .client-section {
  margin-top: 8px;
}
.offer-template-preview__canvas .client-name {
  font-weight: 600;
  font-size: 16px;
  margin: 6px 0;
}
.offer-template-preview__canvas .letter-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.offer-template-preview__canvas .offer-details h2 {
  font-size: 18px;
  margin: 0 0 12px;
  color: #00448c;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.offer-template-preview__canvas .table-wrapper {
  overflow-x: auto;
  border-radius: 12px;
}
.offer-template-preview__canvas .offer-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0, 68, 140, 0.08);
}
.offer-template-preview__canvas .offer-table th {
  background: linear-gradient(135deg, rgba(0, 68, 140, 0.95), rgba(0, 124, 190, 0.85));
  color: #fff;
  text-align: left;
  padding: 14px 18px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  word-break: break-word;
}
.offer-template-preview__canvas .offer-table td {
  padding: 14px 18px;
  font-size: 13px;
  vertical-align: top;
  border-bottom: 1px solid rgba(0, 68, 140, 0.18);
  word-break: break-word;
}
.offer-template-preview__canvas .offer-table [data-align="center"] {
  text-align: center;
}
.offer-template-preview__canvas .offer-table [data-align="right"] {
  text-align: right;
  white-space: nowrap;
}
.offer-template-preview__canvas .offer-table tbody tr:nth-child(even) {
  background: rgba(0, 68, 140, 0.03);
}
.offer-template-preview__canvas .offer-table tfoot td {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.5px;
  border: none;
  background: rgba(0, 68, 140, 0.05);
}
.offer-template-preview__canvas .offer-table tfoot .label {
  text-transform: uppercase;
  color: #003366;
}
.offer-template-preview__canvas .note {
  margin-top: 12px;
  font-style: italic;
  color: #334a68;
}
.offer-template-preview__canvas .notes h3 {
  margin: 0 0 6px;
  font-size: 16px;
  color: #003366;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.offer-template-preview__canvas .notes p {
  margin: 6px 0;
}
.offer-template-preview__canvas .closing {
  margin-top: 8px;
}
.offer-template-preview__canvas .signature-block {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: auto;
}
.offer-template-preview__canvas .signature-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.offer-template-preview__canvas .signature-area {
  max-width: 300px;
}
.offer-template-preview__canvas .signature-line {
  width: 100%;
  height: 2px;
  background: rgba(0, 68, 140, 0.4);
  margin: 40px 0 12px;
}
.offer-template-preview__canvas .signature-name {
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.4px;
  margin: 0;
}
`

const getTemplateCSS = (backgroundUrl: string) => `
body {
  font-family: "Poppins", sans-serif;
  background: #f2f4f8;
  margin: 0;
  color: #1d2433;
}
.page {
  position: relative;
  width: 1000px;
  aspect-ratio: 4419 / 6250;
  margin: 0 auto;
  background-image: url('${backgroundUrl}');
  background-size: cover;
  background-position: center;
  box-shadow: 0 20px 50px rgba(28, 54, 94, 0.25);
  border-radius: 18px;
  overflow: hidden;
}
.overlay {
  position: absolute;
  inset: 0;
  padding: clamp(40px, 7vw, 120px) clamp(32px, 6vw, 140px) clamp(48px, 9vw, 140px);
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.small {
  font-size: 13px;
  line-height: 1.7;
}
.letter-header {
  display: flex;
  justify-content: space-between;
  gap: 40px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(0, 68, 140, 0.2);
}
.company-details {
  max-width: 50%;
}
.company-name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.6px;
  margin: 0 0 6px;
  text-transform: uppercase;
}
.company-details p {
  margin: 4px 0;
}
.letter-meta {
  min-width: 240px;
  font-size: 14px;
}
.letter-meta p {
  display: flex;
  justify-content: space-between;
  margin: 6px 0;
  gap: 14px;
}
.letter-meta .label {
  font-weight: 600;
  color: #00448c;
}
.client-section {
  margin-top: 8px;
}
.client-name {
  font-weight: 600;
  font-size: 16px;
  margin: 6px 0;
}
.letter-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.offer-details h2 {
  font-size: 18px;
  margin: 0 0 12px;
  color: #00448c;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.table-wrapper {
  overflow-x: auto;
  border-radius: 12px;
}
.offer-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0, 68, 140, 0.08);
}
.offer-table th {
  background: linear-gradient(135deg, rgba(0, 68, 140, 0.95), rgba(0, 124, 190, 0.85));
  color: #fff;
  text-align: left;
  padding: 14px 18px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  word-break: break-word;
}
.offer-table td {
  padding: 14px 18px;
  font-size: 13px;
  vertical-align: top;
  border-bottom: 1px solid rgba(0, 68, 140, 0.18);
  word-break: break-word;
}
.offer-table [data-align="center"] {
  text-align: center;
}
.offer-table [data-align="right"] {
  text-align: right;
  white-space: nowrap;
}
.offer-table tbody tr:nth-child(even) {
  background: rgba(0, 68, 140, 0.03);
}
.offer-table tfoot td {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.5px;
  border: none;
  background: rgba(0, 68, 140, 0.05);
}
.offer-table tfoot .label {
  text-transform: uppercase;
  color: #003366;
}
.note {
  margin-top: 12px;
  font-style: italic;
  color: #334a68;
}
.notes h3 {
  margin: 0 0 6px;
  font-size: 16px;
  color: #003366;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}
.notes p {
  margin: 6px 0;
}
.closing {
  margin-top: 8px;
}
.signature-block {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: auto;
}
.signature-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.signature-area {
  max-width: 300px;
}
.signature-line {
  width: 100%;
  height: 2px;
  background: rgba(0, 68, 140, 0.4);
  margin: 40px 0 12px;
}
.signature-name {
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.4px;
  margin: 0;
}
`

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const toHtmlText = (value: string) => escapeHtml(value).replace(/\n/g, "<br />")

const formatCurrency = (currency: string, value: number) => {
  if (!Number.isFinite(value)) return "-"
  if (!currency || currency.toUpperCase() === "IDR") {
    return `Rp ${Number(value || 0).toLocaleString("id-ID", { minimumFractionDigits: 0 })}`
  }
  return `${currency.toUpperCase()} ${value.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
  })}`
}

const defaultTable: OfferTable = {
  columns: [
    { key: "service", title: "Produk / Jasa" },
    { key: "description", title: "Deskripsi" },
    { key: "duration", title: "Durasi", align: "center" },
    { key: "pricing", title: "Qty x Harga", align: "center" },
    { key: "total", title: "Subtotal (IDR)", align: "right" },
  ],
  rows: [
    {
      service: "Registrasi Domain emico.co.id",
      description:
        "Perpanjangan domain .co.id termasuk pengaturan DNS dan monitoring ketidakaktifan.",
      duration: "1 Tahun",
      pricing: "1 x Rp 245.000",
      total: "Rp 245.000",
    },
    {
      service: "Hosting Premium",
      description: "Paket hosting 10 GB SSD, SSL gratis, backup harian, dan uptime SLA 99.9%.",
      duration: "1 Tahun",
      pricing: "1 x Rp 310.000",
      total: "Rp 310.000",
    },
    {
      service: "Dukungan Teknis",
      description: "Pendampingan onboarding, migrasi data, dan support teknis prioritas.",
      duration: "Termasuk",
      pricing: "Termasuk",
      total: "Rp 31.128",
    },
  ],
}

const defaultTemplateData: TemplateData = {
  companyName: "PT Emico Mitra Samudera",
  companyAddress: "Jl. Kramat Raya No. 27, 2nd Floor Unit# E – F, Jakarta 10450, Indonesia",
  companyContact: "Telp: (62-21) 398 32108 • Email: EMS@emico.co.id",
  letterNumber: "038/MSI-25/09/2025",
  date: "25 SEPTEMBER 2025",
  subject: "Penawaran Harga Domain &amp; Hosting",
  clientName: "PT Emico Mitra Samudera",
  clientAttention: "Up. Ibu Christine",
  clientAddress: "Jl. Kramat Raya No. 27, 2nd Floor Unit# E – F, Jakarta 10450, Indonesia",
  paragraph1:
    "Dengan hormat,<br /><br />Sehubungan dengan kebutuhan layanan digital perusahaan, bersama ini kami sampaikan proposal penawaran terbaik untuk pengelolaan domain, hosting, dan dukungan teknis terpadu yang siap mendukung operasional PT Emico Mitra Samudera.",
  paragraph2:
    "Penawaran berikut telah kami susun agar memudahkan proses implementasi, termasuk dukungan onboarding dan pemeliharaan berkala.",
  offerTitle: "Rincian Produk &amp; Jasa",
  offerTable: defaultTable,
  offerTotal: { label: "Total Investasi", value: "Rp 586.128", align: "right" },
  offerValidity: "Penawaran berlaku hingga 30 September 2025 dan dapat diperbarui sesuai kebutuhan.",
  note: "Rincian biaya di atas belum termasuk permintaan kustomisasi tambahan dan integrasi sistem pihak ketiga. Kami siap menyesuaikan paket layanan sesuai kebutuhan spesifik perusahaan Anda.",
  paymentTerms: "Ketentuan pembayaran: 50% di muka setelah persetujuan penawaran, 50% setelah layanan aktif sepenuhnya.",
  closing:
    "Terima kasih atas kesempatan dan kepercayaan yang diberikan kepada kami. Apabila Bapak/Ibu memerlukan informasi tambahan, mohon tidak ragu menghubungi kami melalui WhatsApp di +62 851-5684-5984 atau email support@emico.co.id.",
  signCityDate: "Jakarta, 25 September 2025",
  signName: "Jonathan Albert",
  signPosition: "IT Solution Consultant",
  signCompany: "PT Emico Mitra Samudera",
}

const parseItems = (offer: BackendOffer): any[] => {
  try {
    const parsed = JSON.parse(offer.items || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function buildTemplateData(offer: BackendOffer | null, client: BackendClient | null): TemplateData {
  if (!offer) {
    return defaultTemplateData
  }

  const currency = offer.currency || "IDR"
  const formatter = (value: number) => formatCurrency(currency, value)

  const items = parseItems(offer)
  const columns: TableColumn[] = [
    { key: "service", title: "Produk / Jasa" },
    { key: "description", title: "Deskripsi" },
    { key: "duration", title: "Durasi", align: "center" },
    { key: "pricing", title: "Qty x Harga", align: "center" },
    { key: "total", title: "Subtotal (IDR)", align: "right" },
  ]

  const rows = items.map((item) => {
    const name = escapeHtml(
      item.name || item.title || item.description || "Layanan"
    )
    const description = escapeHtml(item.description || item.detail || "-")
    const duration = escapeHtml(item.duration || item.timeframe || "-")
    const quantity = Number(item.quantity ?? item.qty ?? 0)
    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0)
    const total = Number(item.total ?? quantity * unitPrice)

    let pricing = "-"
    if (Number.isFinite(quantity) && Number.isFinite(unitPrice) && quantity > 0) {
      pricing = `${escapeHtml(quantity.toString())} x ${escapeHtml(formatter(unitPrice).replace(/^Rp\s?/, "Rp "))}`
    }
    return {
      service: name,
      description,
      duration,
      pricing,
      total: escapeHtml(formatter(total)),
    }
  })

  if (rows.length === 0) {
    rows.push({
      service: "Belum ada layanan",
      description: "Tambahkan layanan pada form untuk ditampilkan di tabel penawaran.",
      duration: "-",
      pricing: "-",
      total: "-",
    })
  }

  const totalValue = escapeHtml(formatter(offer.total_price || 0))

  const offerDate = offer.date ? new Date(offer.date) : new Date()
  const formattedDate = offerDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  const uppercaseDate = escapeHtml(formattedDate.toUpperCase())

  const validUntilText =
    offer.valid_until && !Number.isNaN(Date.parse(offer.valid_until))
      ? `Penawaran berlaku hingga ${new Date(offer.valid_until).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}.`
      : ""

  const companyName = escapeHtml(offer.issuer_company || defaultTemplateData.companyName)
  const companyAddress = escapeHtml(
    [offer.issuer_address, offer.issuer_city].filter(Boolean).join(", ") ||
      defaultTemplateData.companyAddress
  )
  const contactParts = [
    offer.issuer_phone ? `Telp: ${offer.issuer_phone}` : null,
    offer.issuer_email ? `Email: ${offer.issuer_email}` : null,
  ].filter(Boolean)
  const companyContact = escapeHtml(
    contactParts.length ? contactParts.join(" • ") : defaultTemplateData.companyContact
  )

  const clientName = escapeHtml(client?.name || defaultTemplateData.clientName)
  const clientAttention = escapeHtml(
    offer.client_attention || (client?.contact_person ? `Up. ${client.contact_person}` : defaultTemplateData.clientAttention)
  )
  const clientAddress = escapeHtml(client?.address || defaultTemplateData.clientAddress)

  const summary = offer.proposal_summary
    ? toHtmlText(offer.proposal_summary)
    : defaultTemplateData.paragraph1
  const details = offer.proposal_details
    ? toHtmlText(offer.proposal_details)
    : defaultTemplateData.paragraph2

  const note = offer.notes ? toHtmlText(offer.notes) : defaultTemplateData.note
  const paymentTerms = offer.payment_terms
    ? toHtmlText(offer.payment_terms)
    : defaultTemplateData.paymentTerms
  const closing = offer.closing_text
    ? toHtmlText(offer.closing_text)
    : defaultTemplateData.closing

  const signCity = escapeHtml(
    offer.signature_city ||
      offer.issuer_city ||
      (client?.address ? client.address.split(",")[0] : "") ||
      "Jakarta"
  )
  const signCityDate = `${signCity}, ${escapeHtml(formattedDate)}`

  return {
    companyName,
    companyAddress,
    companyContact,
    letterNumber: escapeHtml(offer.offer_number || defaultTemplateData.letterNumber),
    date: uppercaseDate,
    subject: escapeHtml(offer.subject || defaultTemplateData.subject),
    clientName,
    clientAttention,
    clientAddress,
    paragraph1: summary,
    paragraph2: details,
    offerTitle: escapeHtml(offer.offer_title || defaultTemplateData.offerTitle),
    offerTable: { columns, rows },
    offerTotal: { label: "Total Investasi", value: totalValue, align: "right" },
    offerValidity: validUntilText ? escapeHtml(validUntilText) : defaultTemplateData.offerValidity,
    note,
    paymentTerms,
    closing,
    signCityDate,
    signName: escapeHtml(offer.issuer_name || defaultTemplateData.signName),
    signPosition: escapeHtml(offer.signature_title || defaultTemplateData.signPosition),
    signCompany: escapeHtml(
      offer.signature_company || offer.issuer_company || defaultTemplateData.signCompany
    ),
  }
}

const renderTableHTML = (table: OfferTable, total?: OfferTotal | string) => {
  const header = table.columns
    .map(
      (column) => `<th${column.align ? ` data-align="${column.align}"` : ""}>${escapeHtml(column.title)}</th>`
    )
    .join("")
  const body = table.rows
    .map(
      (row) =>
        `<tr>${table.columns
          .map(
            (column) =>
              `<td${column.align ? ` data-align="${column.align}"` : ""}>${row[column.key] ?? ""}</td>`
          )
          .join("")}</tr>`
    )
    .join("")

  let footer = ""
  if (total) {
    let footerData: OfferTotal
    if (typeof total === "string") {
      footerData = { label: "Total", value: escapeHtml(total), align: "right" }
    } else {
      footerData = {
        label: escapeHtml(total.label),
        value: escapeHtml(total.value),
        align: total.align,
      }
    }
    const labelSpan = Math.max(1, table.columns.length - 1)
    footer = `<tfoot><tr><td class="label" colspan="${labelSpan}">${footerData.label}</td><td${
      footerData.align ? ` data-align="${footerData.align}"` : ""
    }>${footerData.value}</td></tr></tfoot>`
  }

  return `<table class="offer-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody>${footer}</table>`
}

const renderTemplateHTML = (data: TemplateData) => `
<style>${getTemplateCSS(BACKGROUND_URL)}</style>
<div class="page">
  <div class="overlay">
    <header class="letter-header">
      <div class="company-details">
        <p class="company-name">${data.companyName}</p>
        <p class="small">${data.companyAddress}</p>
        <p class="small">${data.companyContact}</p>
      </div>
      <div class="letter-meta">
        <p><span class="label">Nomor</span><span>${data.letterNumber}</span></p>
        <p><span class="label">Tanggal</span><span>${data.date}</span></p>
        <p><span class="label">Perihal</span><span>${data.subject}</span></p>
      </div>
    </header>

    <section class="client-section">
      <p class="small">Kepada Yth.</p>
      <p class="client-name">${data.clientName}</p>
      ${data.clientAttention ? `<p class="small">${data.clientAttention}</p>` : ""}
      <p class="small">${data.clientAddress}</p>
    </section>

    <section class="letter-body">
      <p class="small">${data.paragraph1}</p>
      <p class="small">${data.paragraph2}</p>
    </section>

    <section class="offer-details">
      <h2>${data.offerTitle}</h2>
      <div class="table-wrapper">
        ${renderTableHTML(data.offerTable, data.offerTotal)}
      </div>
      <p class="small note">${data.offerValidity}</p>
    </section>

    <section class="notes">
      <h3>Catatan Tambahan</h3>
      <p>${data.note}</p>
      <p class="small">${data.paymentTerms}</p>
    </section>

    <section class="closing">
      <p>${data.closing}</p>
    </section>

    <section class="signature-block">
      <div class="signature-meta">
        <p class="small">${data.signCityDate}</p>
        <p class="small">Hormat kami,</p>
      </div>
      <div class="signature-area">
        <div class="signature-line"></div>
        <p class="signature-name">${data.signName}</p>
        <p class="small">${data.signPosition}</p>
        <p class="small">${data.signCompany}</p>
      </div>
    </section>
  </div>
</div>
`

function OfferTemplate({ data }: { data: TemplateData }) {
  return (
    <div className="offer-template-preview">
      <div className="offer-template-preview__canvas">
        <div className="page">
          <div className="overlay">
            <header className="letter-header">
              <div className="company-details">
                <p className="company-name" dangerouslySetInnerHTML={{ __html: data.companyName }} />
                <p className="small" dangerouslySetInnerHTML={{ __html: data.companyAddress }} />
                <p className="small" dangerouslySetInnerHTML={{ __html: data.companyContact }} />
              </div>
              <div className="letter-meta">
                <p>
                  <span className="label">Nomor</span>
                  <span dangerouslySetInnerHTML={{ __html: data.letterNumber }} />
                </p>
                <p>
                  <span className="label">Tanggal</span>
                  <span dangerouslySetInnerHTML={{ __html: data.date }} />
                </p>
                <p>
                  <span className="label">Perihal</span>
                  <span dangerouslySetInnerHTML={{ __html: data.subject }} />
                </p>
              </div>
            </header>

            <section className="client-section">
              <p className="small">Kepada Yth.</p>
              <p className="client-name" dangerouslySetInnerHTML={{ __html: data.clientName }} />
              {data.clientAttention && (
                <p className="small" dangerouslySetInnerHTML={{ __html: data.clientAttention }} />
              )}
              <p className="small" dangerouslySetInnerHTML={{ __html: data.clientAddress }} />
            </section>

            <section className="letter-body">
              <p className="small" dangerouslySetInnerHTML={{ __html: data.paragraph1 }} />
              <p className="small" dangerouslySetInnerHTML={{ __html: data.paragraph2 }} />
            </section>

            <section className="offer-details">
              <h2 dangerouslySetInnerHTML={{ __html: data.offerTitle }} />
              <div className="table-wrapper">
                <table className="offer-table">
                  <thead>
                    <tr>
                      {data.offerTable.columns.map((column) => (
                        <th key={column.key} data-align={column.align}>
                          {column.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.offerTable.rows.map((row, index) => (
                      <tr key={`row-${index}`}>
                        {data.offerTable.columns.map((column) => (
                          <td key={column.key} data-align={column.align}>
                            <span dangerouslySetInnerHTML={{ __html: row[column.key] ?? "" }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {data.offerTotal && (
                    <tfoot>
                      <tr>
                        <td className="label" colSpan={Math.max(1, data.offerTable.columns.length - 1)}>
                          {typeof data.offerTotal === "string"
                            ? "Total"
                            : data.offerTotal.label}
                        </td>
                        <td
                          data-align={
                            typeof data.offerTotal === "string"
                              ? "right"
                              : data.offerTotal.align || "right"
                          }
                        >
                          <span
                            dangerouslySetInnerHTML={{
                              __html:
                                typeof data.offerTotal === "string"
                                  ? data.offerTotal
                                  : data.offerTotal.value,
                            }}
                          />
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <p className="small note" dangerouslySetInnerHTML={{ __html: data.offerValidity }} />
            </section>

            <section className="notes">
              <h3>Catatan Tambahan</h3>
              <p dangerouslySetInnerHTML={{ __html: data.note }} />
              <p className="small" dangerouslySetInnerHTML={{ __html: data.paymentTerms }} />
            </section>

            <section className="closing">
              <p dangerouslySetInnerHTML={{ __html: data.closing }} />
            </section>

            <section className="signature-block">
              <div className="signature-meta">
                <p className="small" dangerouslySetInnerHTML={{ __html: data.signCityDate }} />
                <p className="small">Hormat kami,</p>
              </div>
              <div className="signature-area">
                <div className="signature-line" />
                <p className="signature-name" dangerouslySetInnerHTML={{ __html: data.signName }} />
                <p className="small" dangerouslySetInnerHTML={{ __html: data.signPosition }} />
                <p className="small" dangerouslySetInnerHTML={{ __html: data.signCompany }} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

const ensureHtml2Canvas = async () => {
  if (typeof window === "undefined") throw new Error("Window unavailable")
  if ((window as any).html2canvas) return (window as any).html2canvas
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Gagal memuat html2canvas"))
    document.body.appendChild(script)
  })
  if (!(window as any).html2canvas) throw new Error("html2canvas tidak tersedia")
  return (window as any).html2canvas
}

export default function OfferPdfPreviewPage() {
  const params = useParams()
  const search = useSearchParams()
  const offerId = Number(params.id)

  const [offer, setOffer] = useState<BackendOffer | null>(null)
  const [client, setClient] = useState<BackendClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [templateData, setTemplateData] = useState<TemplateData>(defaultTemplateData)
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(defaultTemplateData, null, 2))
  const [error, setError] = useState<string | null>(null)
  const autoOpenTriggeredRef = useRef(false)

  useEffect(() => {
    if (!offerId) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await apiFetch(`/api/offers/${offerId}`)
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = (await res.json()) as BackendOffer
        setOffer(data)

        let clientData: BackendClient | null = null
        if (data.client_id) {
          try {
            const clientRes = await apiFetch(`/api/clients/${data.client_id}`)
            if (clientRes.ok) {
              clientData = (await clientRes.json()) as BackendClient
            }
          } catch {
            clientData = null
          }
        }
        setClient(clientData)

        const computed = buildTemplateData(data, clientData)
        setTemplateData(computed)
        setJsonValue(JSON.stringify(computed, null, 2))
        setError(null)
      } catch (err) {
        console.error("Failed to fetch offer data", err)
        setOffer(null)
        setClient(null)
        setTemplateData(defaultTemplateData)
        setJsonValue(JSON.stringify(defaultTemplateData, null, 2))
        setError("Gagal memuat data penawaran.")
      } finally {
        setLoading(false)
      }
    })()
  }, [offerId])

  const applyJSON = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonValue) as Partial<TemplateData>
      const merged: TemplateData = {
        ...templateData,
        ...parsed,
        offerTable: parsed.offerTable
          ? {
              columns: parsed.offerTable.columns || templateData.offerTable.columns,
              rows: parsed.offerTable.rows || templateData.offerTable.rows,
            }
          : templateData.offerTable,
      }
      setTemplateData(merged)
      setJsonValue(JSON.stringify(merged, null, 2))
      setError(null)
    } catch (err: any) {
      setError(`❌ JSON tidak valid: ${err.message}`)
    }
  }, [jsonValue, templateData])

  const resetFromData = useCallback(() => {
    const computed = buildTemplateData(offer, client)
    setTemplateData(computed)
    setJsonValue(JSON.stringify(computed, null, 2))
    setError(null)
  }, [offer, client])

  const generatePdf = useCallback(
    async (mode: "open" | "download") => {
      if (typeof window === "undefined") return
      const { jsPDF } = await import("jspdf")
      await ensureHtml2Canvas()
      const wrapper = document.createElement("div")
      wrapper.style.position = "fixed"
      wrapper.style.left = "-10000px"
      wrapper.style.top = "0"
      wrapper.style.width = "1000px"
      wrapper.style.zIndex = "-1"
      wrapper.innerHTML = renderTemplateHTML(templateData)
      document.body.appendChild(wrapper)
      const pageElement = wrapper.querySelector(".page") as HTMLElement | null
      if (!pageElement) {
        document.body.removeChild(wrapper)
        throw new Error("Gagal menyiapkan template PDF")
      }
      const doc = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" })
      const pdfWidth = doc.internal.pageSize.getWidth()
      const margin = 36
      const renderWidth = pdfWidth - margin * 2
      const sourceWidth = pageElement.scrollWidth || 1000
      await new Promise<void>((resolve) => {
        doc.html(pageElement, {
          html2canvas: { scale: 2, useCORS: true },
          margin: [margin, margin, margin, margin],
          width: renderWidth,
          windowWidth: sourceWidth,
          callback: () => resolve(),
        })
      })
      document.body.removeChild(wrapper)
      if (mode === "download") {
        doc.save(EXPORT_FILE_NAME)
      } else {
        const blobUrl = doc.output("bloburl")
        window.open(blobUrl, "_blank", "noopener,noreferrer")
      }
    },
    [templateData]
  )

  const autoOpen = search.get("auto")
  useEffect(() => {
    if (loading) return
    if (autoOpen !== "open") return
    if (autoOpenTriggeredRef.current) return
    autoOpenTriggeredRef.current = true
    generatePdf("open").catch((err) => {
      console.error("Auto open pdf failed", err)
      setError("Gagal membuka PDF otomatis. Coba klik tombol Open PDF.")
    })
  }, [autoOpen, generatePdf, loading])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <RequireAuth>
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <Link href={`/offers/${offerId}`}>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </Button>
              </Link>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  onClick={() => generatePdf("open")}
                  disabled={loading}
                >
                  <Download className="w-4 h-4" /> Open PDF
                </Button>
                <Button onClick={() => generatePdf("download")} size="sm" className="gap-2" disabled={loading}>
                  <Download className="w-4 h-4" /> Export PDF
                </Button>
              </div>
            </div>

            {error && (
              <Card className="p-4 border-destructive/50 bg-destructive/10 text-destructive">{error}</Card>
            )}

            {loading ? (
              <Card className="p-6">
                <p>Memuat data penawaran...</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr,420px] gap-6">
                <Card className="p-4 overflow-auto">
                  <OfferTemplate data={templateData} />
                </Card>
                <Card className="p-4 space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">🧩 Edit Konten via JSON</h3>
                    <textarea
                      value={jsonValue}
                      onChange={(event) => setJsonValue(event.target.value)}
                      className="w-full h-64 border rounded-md p-2 font-mono text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={applyJSON}>
                      Terapkan Perubahan
                    </Button>
                    <Button variant="secondary" onClick={resetFromData}>
                      Reset dari Data Penawaran
                    </Button>
                    <Button variant="outline" onClick={() => generatePdf("open")}>
                      Open PDF
                    </Button>
                    <Button onClick={() => generatePdf("download")}>Export PDF</Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </RequireAuth>
      </main>
      <style jsx global>{PREVIEW_CSS}</style>
    </div>
  )
}
