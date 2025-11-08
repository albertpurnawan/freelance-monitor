import { type NextRequest, NextResponse } from "next/server"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

type OfferItem = {
  name?: string
  quantity?: number
  unitPrice?: number
  total?: number
}

type OfferPayload = {
  offerNumber?: string
  services?: OfferItem[]
  totalAmount?: number
  validUntil?: string | null
}

type ClientPayload = {
  name?: string
  company?: string
  address?: string
  city?: string
  country?: string
  email?: string
  phone?: string
}

const textOrFallback = (value: unknown, fallback = "—"): string => {
  if (typeof value === "string" && value.trim()) return value
  if (typeof value === "number" && !Number.isNaN(value)) return value.toString()
  return fallback
}

const numericOrZero = (value: unknown): number => {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 0
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const offer = (body?.offer ?? {}) as OfferPayload
    const client = (body?.client ?? {}) as ClientPayload

    // Create PDF document
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 20

    // Header
    doc.setFontSize(24)
    doc.setTextColor(53, 76, 156) // Primary color
    doc.text("PENAWARAN HARGA", pageWidth / 2, yPosition, { align: "center" })

    yPosition += 15

    // Offer number and date
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.text(`Nomor: ${textOrFallback(offer.offerNumber, "—")}`, 20, yPosition)
    doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, pageWidth - 60, yPosition)

    yPosition += 15

    // From section
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("DARI:", 20, yPosition)
    yPosition += 7

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text("Jonathan Albert", 20, yPosition)
    yPosition += 5
    doc.text("IT Solution", 20, yPosition)
    yPosition += 5
    doc.text("PT Emico Mitra Samudera", 20, yPosition)
    yPosition += 5
    doc.text("Jl. Kramat Raya No. 27, 2nd Floor", 20, yPosition)
    yPosition += 5
    doc.text("Jakarta 10450, Indonesia", 20, yPosition)
    yPosition += 5
    doc.text("Telp: (62-21) 398 32108", 20, yPosition)
    yPosition += 5
    doc.text("Email: EMS@emico.co.id", 20, yPosition)

    yPosition += 12

    // To section
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text("KEPADA:", 20, yPosition)
    yPosition += 7

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(textOrFallback(client.name, "Kepada Yth."), 20, yPosition)
    yPosition += 5
    doc.text(textOrFallback(client.company), 20, yPosition)
    yPosition += 5
    doc.text(textOrFallback(client.address), 20, yPosition)
    yPosition += 5
    doc.text(`${textOrFallback(client.city, "—")}, ${textOrFallback(client.country, "—")}`, 20, yPosition)
    yPosition += 5
    doc.text(`Email: ${textOrFallback(client.email)}`, 20, yPosition)
    yPosition += 5
    doc.text(`Telp: ${textOrFallback(client.phone)}`, 20, yPosition)

    yPosition += 12

    // Services table
    const tableData = (offer.services ?? []).map((service: OfferItem) => {
      const quantity = numericOrZero(service?.quantity ?? 0)
      const unitPrice = numericOrZero(service?.unitPrice ?? 0)
      const total = numericOrZero(service?.total ?? quantity * unitPrice)
      return [
        textOrFallback(service?.name),
        quantity.toString(),
        `Rp ${unitPrice.toLocaleString("id-ID")}`,
        `Rp ${total.toLocaleString("id-ID")}`,
      ]
    })
    ;(doc as any).autoTable({
      head: [["Layanan", "Qty", "Harga Satuan", "Total"]],
      body: tableData,
      startY: yPosition,
      margin: { left: 20, right: 20 },
      headStyles: {
        fillColor: [53, 76, 156],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      bodyStyles: {
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 10

    // Total
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    const offerTotal = numericOrZero(offer.totalAmount)
    doc.text(`Total: Rp ${offerTotal.toLocaleString("id-ID")}`, pageWidth - 60, yPosition)

    yPosition += 15

    // Notes
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text("Catatan:", 20, yPosition)
    yPosition += 5
    doc.setFontSize(9)
    const validUntil = offer.validUntil ? new Date(offer.validUntil) : null
    const validUntilText = validUntil && !Number.isNaN(validUntil.valueOf())
      ? validUntil.toLocaleDateString("id-ID")
      : "Tanggal belum ditentukan"
    doc.text("Penawaran ini berlaku hingga: " + validUntilText, 20, yPosition)

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text("Terima kasih atas kepercayaan Anda", pageWidth / 2, pageHeight - 10, { align: "center" })

    // Generate PDF
    const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer
    const pdfBytes = new Uint8Array(arrayBuffer)

    const offerNumberForFile = textOrFallback(offer.offerNumber, "penawaran")

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="penawaran-${offerNumberForFile}.pdf"`,
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
