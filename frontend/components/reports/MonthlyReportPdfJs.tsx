"use client"

import React, { useEffect, useMemo, useState } from "react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

export interface ActivityItem {
  date: string
  description: string
}

export interface MonthlyReportPdfProps {
  month: string
  year: string
  summary: string
  activities: ActivityItem[]
}

// Generates a PDF using jsPDF and renders a preview + download link
const MonthlyReportPdfJs: React.FC<MonthlyReportPdfProps> = ({ month, year, summary, activities }) => {
  const [blobUrl, setBlobUrl] = useState<string>("")

  const fileName = useMemo(() => `Monthly Report - ${month} ${year}.pdf`, [month, year])

  useEffect(() => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" })
      doc.setFont("helvetica", "normal")

      // Title
      doc.setFontSize(18)
      doc.text(`Monthly Report - ${month} ${year}`, 40, 50)

      // Summary
      doc.setFontSize(14)
      doc.text("Summary", 40, 90)
      doc.setFontSize(12)
      const wrapped = doc.splitTextToSize(summary || "", 515)
      doc.text(wrapped, 40, 110)

      // Activities section
      doc.setFontSize(14)
      doc.text("Activities", 40, 160)
      doc.setFontSize(12)
      autoTable(doc, {
        startY: 175,
        head: [["Tanggal", "Deskripsi"]],
        body: (activities || []).map((a) => [a.date || "-", a.description || ""]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [242, 242, 242], textColor: 0 },
      })

      const blob = doc.output("blob")
      const url = URL.createObjectURL(blob)
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch (e) {
      console.error("Failed to generate PDF", e)
      setBlobUrl("")
    }

    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return ""
      })
    }
  }, [month, year, summary, activities])

  return (
    <div className="space-y-3">
      {blobUrl ? (
        <>
          <iframe
            src={blobUrl}
            style={{ width: "100%", height: "70vh", border: "1px solid var(--border)" }}
            title="Monthly Report Preview"
          />
          <a href={blobUrl} download={fileName} className="underline text-primary">Download PDF</a>
        </>
      ) : (
        <div className="flex h-64 items-center justify-center">
          <p>Generating preview...</p>
        </div>
      )}
    </div>
  )
}

export default MonthlyReportPdfJs
