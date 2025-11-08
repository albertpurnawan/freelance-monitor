package models

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

type Offer struct {
	ID           int        `json:"id" gorm:"primaryKey"`
	OfferNumber  string     `json:"offer_number" gorm:"unique;not null"`
	ClientID     int        `json:"client_id" gorm:"not null"`
	Date         time.Time  `json:"date" gorm:"not null"`
	Subject      string     `json:"subject" gorm:"not null"`
	Items        string     `json:"items" gorm:"type:jsonb;not null"`
	TotalPrice   float64    `json:"total_price" gorm:"not null"`
	Notes        string     `json:"notes"`
	Status       string     `json:"status" gorm:"default:'draft'"`
	PDFURL       string     `json:"pdf_url"`
	SignedDocURL string     `json:"signed_doc_url"`
	ApprovedAt   *time.Time `json:"approved_at"`
	// Additional fields for detailed PDF and form
	Currency         string     `json:"currency" gorm:"default:'IDR'"`
	ValidUntil       *time.Time `json:"valid_until"`
	IssuerName       string     `json:"issuer_name"`
	IssuerCompany    string     `json:"issuer_company"`
	IssuerAddress    string     `json:"issuer_address"`
	IssuerCity       string     `json:"issuer_city"`
	IssuerPhone      string     `json:"issuer_phone"`
	IssuerEmail      string     `json:"issuer_email"`
	ClientAttention  string     `json:"client_attention"`
	OfferTitle       string     `json:"offer_title"`
	ProposalSummary  string     `json:"proposal_summary"`
	ProposalDetails  string     `json:"proposal_details"`
	PaymentTerms     string     `json:"payment_terms"`
	ClosingText      string     `json:"closing_text"`
	SignatureTitle   string     `json:"signature_title"`
	SignatureCity    string     `json:"signature_city"`
	SignatureCompany string     `json:"signature_company"`
	// Auto-renewal fields
	AutoRenew      bool      `json:"auto_renew" gorm:"default:false"`
	RenewEveryDays int       `json:"renew_every_days" gorm:"default:30"`
	NextRenewal    time.Time `json:"next_renewal"`
	// Reminders
	LastReminderAt *time.Time `json:"last_reminder_at"`
	CreatedAt      time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (Offer) TableName() string {
	return "offers"
}

// BeforeCreate generates an offer number if not provided.
func (o *Offer) BeforeCreate(tx *gorm.DB) (err error) {
	if o.OfferNumber != "" {
		// Ensure date default even when offer number is provided externally
		if o.Date.IsZero() {
			o.Date = time.Now()
		}
		return nil
	}
	var offers []Offer
	if err := tx.Model(&Offer{}).Select("offer_number").Find(&offers).Error; err != nil {
		return err
	}
	maxSeq := 0
	for _, of := range offers {
		parts := strings.SplitN(of.OfferNumber, "/", 2)
		if len(parts) > 0 {
			if n, err := strconv.Atoi(parts[0]); err == nil {
				if n > maxSeq {
					maxSeq = n
				}
			}
		}
	}
	seq := maxSeq + 1
	now := time.Now()
	if o.Date.IsZero() {
		o.Date = now
	}
	o.OfferNumber = fmt.Sprintf("%03d/MSI-%02d/%02d/%04d", seq, now.Day(), int(now.Month()), now.Year())
	return nil
}
