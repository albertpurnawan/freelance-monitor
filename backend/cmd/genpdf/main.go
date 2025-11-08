package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/services"
)

func main() {
	// Ensure template path is set explicitly
	tpl := filepath.Clean(filepath.Join("..", "PENAWARAN PT EMICO MITRA SAMUDERA_25-09-2025.pdf"))
	os.Setenv("PDF_TEMPLATE_PATH", tpl)

	// Sample offer data for visual verification
	offer := models.Offer{
		ID:          999,
		OfferNumber: "999/MSI-25/09/2025",
		ClientID:    1,
		Date:        time.Now(),
		Subject:     "Penawaran Layanan Pemeliharaan",
		TotalPrice:  7000000,
		Notes:       "Harga sudah termasuk PPN. Masa berlaku penawaran 30 hari.",
	}
	items := []map[string]any{
		{"description": "Jasa Pemeliharaan Sistem", "qty": 3, "unit_price": 1000000, "total": 3000000},
		{"description": "Penggantian Komponen", "qty": 2, "unit_price": 1500000, "total": 3000000},
		{"description": "Biaya Transportasi", "qty": 1, "unit_price": 1000000, "total": 1000000},
	}
	b, _ := json.Marshal(items)
	offer.Items = string(b)

	pdfSvc := services.NewPDFService()
	url, err := pdfSvc.GenerateOfferPDFForOffer(&offer)
	if err != nil {
		log.Fatalf("failed to generate pdf: %v", err)
	}
	fmt.Printf("Generated PDF URL: %s\n", url)
	fmt.Printf("Absolute path: %s\n", filepath.Join("static", "pdfs", fmt.Sprintf("offer_%d.pdf", offer.ID)))
}
