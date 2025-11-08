package services

import (
    "bytes"
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "strings"
    "time"

    "freelance-monitor-system/internal/models"
)

// PDFService provides minimal offer PDF generation.
// For now, it writes a simple placeholder file summarizing the offer.
type PDFService struct{}

func NewPDFService() *PDFService { return &PDFService{} }

// GenerateOfferPDF generates a PDF for the given offer and returns a public URL.
func (s *PDFService) GenerateOfferPDF(offer *models.Offer, client *models.Client) (string, error) {
	outDir := filepath.Join("static", "pdfs")
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return "", err
	}
	filename := fmt.Sprintf("offer_%d.pdf", offer.ID)
	outPath := filepath.Join(outDir, filename)
	pdfBytes, err := buildStyledOfferPDF(offer, client)
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(outPath, pdfBytes, 0o644); err != nil {
		return "", err
	}
	return "/static/pdfs/" + filename, nil
}

// GenerateOfferPDFForOffer is a convenience used by the CLI helper to build a PDF when only an offer is available.
func (s *PDFService) GenerateOfferPDFForOffer(offer *models.Offer) (string, error) {
	return s.GenerateOfferPDF(offer, nil)
}

// Backend monthly PDF generation removed; using client-side React PDF.

// buildStyledOfferPDF creates a valid PDF (A4) approximating the reference layout.
func buildStyledOfferPDF(offer *models.Offer, client *models.Client) ([]byte, error) {
	if offer == nil {
		return nil, fmt.Errorf("offer is required")
	}

	var items []offerItem
	rawItems := strings.TrimSpace(offer.Items)
	if rawItems != "" {
		_ = json.Unmarshal([]byte(rawItems), &items)
	}

	lines := make([]string, 0, 32)
	lines = append(lines, "Monitoring Solusi Indonesia")
	lines = append(lines, "Penawaran Layanan")
	lines = append(lines, "")

	if strings.TrimSpace(offer.OfferNumber) != "" {
		lines = append(lines, fmt.Sprintf("Nomor Penawaran: %s", offer.OfferNumber))
	}

	offerDate := offer.Date
	if offerDate.IsZero() {
		offerDate = time.Now()
	}
	lines = append(lines, fmt.Sprintf("Tanggal: %s", offerDate.Format("02 January 2006")))

	if client != nil {
		name := strings.TrimSpace(client.Name)
		if name == "" {
			name = "Client"
		}
		if strings.TrimSpace(client.ContactPerson) != "" {
			name = fmt.Sprintf("%s (Attn: %s)", name, client.ContactPerson)
		}
		lines = append(lines, "Kepada: "+name)
		if addr := compressWhitespace(client.Address); addr != "" {
			lines = append(lines, "Alamat: "+addr)
		}
		if strings.TrimSpace(client.Email) != "" {
			lines = append(lines, "Email: "+strings.TrimSpace(client.Email))
		}
		if strings.TrimSpace(client.Phone) != "" {
			lines = append(lines, "Telepon: "+strings.TrimSpace(client.Phone))
		}
	} else {
		lines = append(lines, fmt.Sprintf("Client ID: %d", offer.ClientID))
	}

	if subject := strings.TrimSpace(offer.Subject); subject != "" {
		lines = append(lines, "")
		lines = append(lines, subject)
	}

	if offer.ProposalSummary != "" {
		lines = append(lines, "")
		lines = append(lines, splitAndTrim(offer.ProposalSummary)...)
	}

	if len(items) > 0 {
		lines = append(lines, "")
		lines = append(lines, "Rincian Layanan:")
		for idx, item := range items {
			desc := strings.TrimSpace(item.Description)
			if desc == "" {
				desc = "Item"
			}
			lines = append(lines, fmt.Sprintf("%d. %s (Qty: %s, Harga: %s, Total: %s)",
				idx+1,
				desc,
				formatQuantity(item.Qty),
				formatCurrency(item.UnitPrice),
				formatCurrency(item.Total),
			))
		}
	}

	if offer.TotalPrice > 0 {
		lines = append(lines, "")
		lines = append(lines, "Total Penawaran: "+formatCurrency(offer.TotalPrice))
	}

	if offer.PaymentTerms != "" {
		lines = append(lines, "")
		lines = append(lines, "Syarat Pembayaran:")
		lines = append(lines, splitAndTrim(offer.PaymentTerms)...)
	}

	if offer.Notes != "" {
		lines = append(lines, "")
		lines = append(lines, "Catatan:")
		lines = append(lines, splitAndTrim(offer.Notes)...)
	}

	lines = append(lines, "")
	lines = append(lines, "Terima kasih atas kepercayaannya.")
	if strings.TrimSpace(offer.IssuerName) != "" {
		lines = append(lines, fmt.Sprintf("Hormat kami, %s", strings.TrimSpace(offer.IssuerName)))
		if strings.TrimSpace(offer.IssuerCompany) != "" {
			lines = append(lines, strings.TrimSpace(offer.IssuerCompany))
		}
	}

	return renderSimplePDF(lines)
}

func buildStyledMonthlyReportPDF(report *models.MonthlyReport, client *models.Client, service *models.Service) ([]byte, error) {
	if report == nil {
		return nil, fmt.Errorf("monthly report is required")
	}

    lines := make([]string, 0, 28)
    // Title header matching requested format
    period := report.ReportMonth
    if period.IsZero() {
        period = time.Now()
    }
    lines = append(lines, fmt.Sprintf("Monthly Report - %s %d", monthNameID(period), period.Year()))
    lines = append(lines, "")
    // Company line (optional branding)
    lines = append(lines, "Monitoring Solusi Indonesia")
    lines = append(lines, "")

	if client != nil {
		lines = append(lines, "Client: "+strings.TrimSpace(client.Name))
	}
	if service != nil {
		lines = append(lines, fmt.Sprintf("Layanan: %s (%s)", service.Domain, service.ServiceType))
	} else {
		lines = append(lines, fmt.Sprintf("Service ID: %d", report.ServiceID))
	}

    lines = append(lines, "Ringkasan Performa:")
    // A concise paragraph summary approximating the React PDF 'summary' field
    summary := fmt.Sprintf("Selama bulan %s %d, layanan %s menunjukkan rata-rata uptime %.2f%% dengan waktu respon rata-rata %d ms. Total downtime tercatat %d menit dengan %d alert dibuka dan %d terselesaikan. Waktu maintenance %.2f jam.",
        monthNameID(period), period.Year(),
        func() string { if service != nil { return service.Domain } ; return fmt.Sprintf("ID %d", report.ServiceID) }(),
        report.AvgUptimePercent, report.AvgResponseMs, report.TotalDowntime, report.AlertsOpened, report.AlertsResolved, report.MaintenanceHours,
    )
    if strings.TrimSpace(report.Summary) != "" {
        lines = append(lines, strings.TrimSpace(report.Summary))
    } else {
        lines = append(lines, summary)
    }

    if acts := strings.TrimSpace(report.Activities); acts != "" {
        // Activities may be array of strings or array of {date, description}
        lines = append(lines, "")
        lines = append(lines, "Aktivitas:")
        type actObj struct{ Date, Description string }
        var objItems []actObj
        if err := json.Unmarshal([]byte(acts), &objItems); err == nil && len(objItems) > 0 {
            for _, a := range objItems {
                date := strings.TrimSpace(a.Date)
                desc := strings.TrimSpace(a.Description)
                if date == "" && desc == "" { continue }
                if date == "" { date = "-" }
                lines = append(lines, fmt.Sprintf("%s - %s", date, desc))
            }
        } else {
            var strItems []string
            if err := json.Unmarshal([]byte(acts), &strItems); err == nil && len(strItems) > 0 {
                for idx, s := range strItems {
                    s = strings.TrimSpace(s)
                    if s == "" { continue }
                    lines = append(lines, fmt.Sprintf("%d. %s", idx+1, s))
                }
            }
        }
    }

    return renderSimplePDF(lines)
}

// monthNameID returns the Indonesian month name for the given time.
func monthNameID(t time.Time) string {
    switch t.Month() {
    case time.January:
        return "Januari"
    case time.February:
        return "Februari"
    case time.March:
        return "Maret"
    case time.April:
        return "April"
    case time.May:
        return "Mei"
    case time.June:
        return "Juni"
    case time.July:
        return "Juli"
    case time.August:
        return "Agustus"
    case time.September:
        return "September"
    case time.October:
        return "Oktober"
    case time.November:
        return "November"
    case time.December:
        return "Desember"
    default:
        return t.Format("January")
    }
}

// ensureUniquePDFName returns a filename like "<base>.pdf";
// if it exists, returns "<base> (1).pdf", "<base> (2).pdf", etc.
func ensureUniquePDFName(dir, base string) string {
    name := base + ".pdf"
    path := filepath.Join(dir, name)
    if _, err := os.Stat(path); err != nil {
        // not exists or other error -> return default
        return name
    }
    // iterate suffixes
    for i := 1; i < 1000; i++ {
        candidate := fmt.Sprintf("%s (%d).pdf", base, i)
        if _, err := os.Stat(filepath.Join(dir, candidate)); os.IsNotExist(err) {
            return candidate
        }
    }
    // fallback
    ts := time.Now().Unix()
    return fmt.Sprintf("%s (%d).pdf", base, ts)
}

type offerItem struct {
	Description string  `json:"description"`
	Qty         float64 `json:"qty"`
	UnitPrice   float64 `json:"unit_price"`
	Total       float64 `json:"total"`
}

func renderSimplePDF(lines []string) ([]byte, error) {
	if len(lines) == 0 {
		lines = []string{"Dokumen"}
	}

	var stream strings.Builder
	stream.WriteString("BT\n/F1 12 Tf\n72 812 Td\n14 TL\n")
	for idx, line := range lines {
		if idx > 0 {
			stream.WriteString("T*\n")
		}
		stream.WriteString(fmt.Sprintf("(%s) Tj\n", escapePDFString(line)))
	}
	stream.WriteString("ET\n")

	content := stream.String()

	var buf bytes.Buffer
	buf.WriteString("%PDF-1.4\n")

	offsets := []int{0}
	writeObj := func(format string, args ...any) {
		offsets = append(offsets, buf.Len())
		fmt.Fprintf(&buf, format, args...)
	}

	writeObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
	writeObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
	writeObj("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n")
	writeObj("4 0 obj\n<< /Length %d >>\nstream\n%sendstream\nendobj\n", len(content), content)
	writeObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

	startxref := buf.Len()
	buf.WriteString("xref\n")
	fmt.Fprintf(&buf, "0 %d\n", len(offsets))
	buf.WriteString("0000000000 65535 f \n")
	for _, off := range offsets[1:] {
		fmt.Fprintf(&buf, "%010d 00000 n \n", off)
	}
	buf.WriteString("trailer\n<< /Size ")
	fmt.Fprintf(&buf, "%d /Root 1 0 R >>\nstartxref\n%d\n%%EOF\n", len(offsets), startxref)

	return buf.Bytes(), nil
}

func escapePDFString(in string) string {
	replacer := strings.NewReplacer("\\", "\\\\", "(", "\\(", ")", "\\)")
	return replacer.Replace(in)
}

func formatQuantity(qty float64) string {
	if qty == 0 {
		return "0"
	}
	if float64(int(qty)) == qty {
		return fmt.Sprintf("%d", int(qty))
	}
	return fmt.Sprintf("%.2f", qty)
}

func formatCurrency(amount float64) string {
	if amount == 0 {
		return "Rp 0"
	}
	s := fmt.Sprintf("Rp %.2f", amount)
	parts := strings.SplitN(s, ".", 2)
	intPart := parts[0][3:] // remove "Rp "
	intPart = strings.ReplaceAll(intPart, ",", "")

	var grouped strings.Builder
	for i, r := range intPart {
		if i != 0 && (len(intPart)-i)%3 == 0 {
			grouped.WriteRune('.')
		}
		grouped.WriteRune(r)
	}

	decimal := ""
	if len(parts) == 2 {
		decimal = "," + strings.TrimRight(parts[1], "0")
		if decimal == "," {
			decimal = ""
		}
	}

	return "Rp " + grouped.String() + decimal
}

func splitAndTrim(text string) []string {
	chunks := strings.Split(text, "\n")
	lines := make([]string, 0, len(chunks))
	for _, chunk := range chunks {
		chunk = strings.TrimSpace(chunk)
		if chunk == "" {
			continue
		}
		lines = append(lines, chunk)
	}
	return lines
}

func compressWhitespace(text string) string {
	text = strings.TrimSpace(text)
	if text == "" {
		return ""
	}
	return strings.Join(strings.Fields(text), " ")
}
