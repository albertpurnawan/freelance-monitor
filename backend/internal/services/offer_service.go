package services

import (
	"time"

	"freelance-monitor-system/internal/models"
	"gorm.io/gorm"
	"strings"
)

type OfferService struct {
	db *gorm.DB
}

func NewOfferService(db *gorm.DB) *OfferService {
	return &OfferService{db: db}
}

func (s *OfferService) ListOffers() ([]models.Offer, error) {
	var offers []models.Offer
	if err := s.db.Order("id DESC").Find(&offers).Error; err != nil {
		return nil, err
	}
	return offers, nil
}

func (s *OfferService) ListOffersPaged(limit, offset int) ([]models.Offer, error) {
	var offers []models.Offer
	q := s.db.Model(&models.Offer{}).Order("id DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&offers).Error; err != nil {
		return nil, err
	}
	return offers, nil
}

func (s *OfferService) CountOffers(subjectLike, status string) (int64, error) {
	var total int64
	q := s.db.Model(&models.Offer{})
	if subjectLike != "" {
		q = q.Where("LOWER(subject) LIKE ?", "%"+strings.ToLower(subjectLike)+"%")
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if err := q.Count(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

func (s *OfferService) ListOffersWithFilters(limit, offset int, sortBy, order, subjectLike, status string, clientID int) ([]models.Offer, error) {
	var offers []models.Offer
	q := s.db.Model(&models.Offer{})
	if subjectLike != "" {
		q = q.Where("LOWER(subject) LIKE ?", "%"+strings.ToLower(subjectLike)+"%")
	}
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if clientID > 0 {
		q = q.Where("client_id = ?", clientID)
	}
	if sortBy == "date" || sortBy == "id" || sortBy == "total_price" {
		if order != "desc" {
			order = "asc"
		}
		q = q.Order(sortBy + " " + order)
	} else {
		q = q.Order("id DESC")
	}
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&offers).Error; err != nil {
		return nil, err
	}
	return offers, nil
}

func (s *OfferService) GetOfferByID(id int) (*models.Offer, error) {
	var offer models.Offer
	if err := s.db.First(&offer, id).Error; err != nil {
		return nil, err
	}
	return &offer, nil
}

func (s *OfferService) CreateOffer(offer *models.Offer) error {
	if offer.AutoRenew {
		if offer.RenewEveryDays <= 0 {
			offer.RenewEveryDays = 30
		}
		if offer.NextRenewal.IsZero() {
			base := offer.Date
			if base.IsZero() {
				base = time.Now()
			}
			offer.NextRenewal = base.Add(time.Duration(offer.RenewEveryDays) * 24 * time.Hour)
		}
	}
	return s.db.Create(offer).Error
}

func (s *OfferService) UpdateOffer(id int, updates *models.Offer) (*models.Offer, error) {
	var offer models.Offer
	if err := s.db.First(&offer, id).Error; err != nil {
		return nil, err
	}
	// Apply updates
	if updates.Subject != "" {
		offer.Subject = updates.Subject
	}
	if updates.Items != "" {
		offer.Items = updates.Items
	}
	if updates.TotalPrice != 0 {
		offer.TotalPrice = updates.TotalPrice
	}
	if updates.Notes != "" {
		offer.Notes = updates.Notes
	}
	if updates.Status != "" {
		offer.Status = updates.Status
	}
	// Additional fields
	if updates.Currency != "" {
		offer.Currency = updates.Currency
	}
	if updates.ValidUntil != nil {
		offer.ValidUntil = updates.ValidUntil
	}
	if updates.IssuerName != "" {
		offer.IssuerName = updates.IssuerName
	}
	if updates.IssuerCompany != "" {
		offer.IssuerCompany = updates.IssuerCompany
	}
	if updates.IssuerAddress != "" {
		offer.IssuerAddress = updates.IssuerAddress
	}
	if updates.IssuerCity != "" {
		offer.IssuerCity = updates.IssuerCity
	}
	if updates.IssuerPhone != "" {
		offer.IssuerPhone = updates.IssuerPhone
	}
	if updates.IssuerEmail != "" {
		offer.IssuerEmail = updates.IssuerEmail
	}
	if updates.ClientAttention != "" {
		offer.ClientAttention = updates.ClientAttention
	}
	if updates.OfferTitle != "" {
		offer.OfferTitle = updates.OfferTitle
	}
	if updates.ProposalSummary != "" {
		offer.ProposalSummary = updates.ProposalSummary
	}
	if updates.ProposalDetails != "" {
		offer.ProposalDetails = updates.ProposalDetails
	}
	if updates.PaymentTerms != "" {
		offer.PaymentTerms = updates.PaymentTerms
	}
	if updates.ClosingText != "" {
		offer.ClosingText = updates.ClosingText
	}
	if updates.SignatureTitle != "" {
		offer.SignatureTitle = updates.SignatureTitle
	}
	if updates.SignatureCompany != "" {
		offer.SignatureCompany = updates.SignatureCompany
	}
	if updates.SignatureCity != "" {
		offer.SignatureCity = updates.SignatureCity
	}
	if updates.AutoRenew { // enabling or keeping enabled
		offer.AutoRenew = true
		if updates.RenewEveryDays > 0 {
			offer.RenewEveryDays = updates.RenewEveryDays
		} else if offer.RenewEveryDays <= 0 {
			offer.RenewEveryDays = 30
		}
		if offer.NextRenewal.IsZero() {
			base := offer.Date
			if base.IsZero() {
				base = time.Now()
			}
			offer.NextRenewal = base.Add(time.Duration(offer.RenewEveryDays) * 24 * time.Hour)
		}
	}
	if !updates.AutoRenew && updates.RenewEveryDays == 0 { // explicit disable when provided
		if updates.AutoRenew == false {
			offer.AutoRenew = false
		}
	}
	if !updates.Date.IsZero() {
		offer.Date = updates.Date
	}
	if updates.PDFURL != "" {
		offer.PDFURL = updates.PDFURL
	}
	if updates.SignedDocURL != "" {
		offer.SignedDocURL = updates.SignedDocURL
	}
	if err := s.db.Save(&offer).Error; err != nil {
		return nil, err
	}
	return &offer, nil
}

func (s *OfferService) DeleteOffer(id int) error {
	res := s.db.Delete(&models.Offer{}, id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// ApproveOffer sets status to 'accepted' and stamps ApprovedAt.
func (s *OfferService) ApproveOffer(id int, approvedAt time.Time) (*models.Offer, error) {
	var offer models.Offer
	if err := s.db.First(&offer, id).Error; err != nil {
		return nil, err
	}
	offer.Status = "accepted"
	offer.ApprovedAt = &approvedAt
	if err := s.db.Save(&offer).Error; err != nil {
		return nil, err
	}
	return &offer, nil
}

// SetSignedDocAndApprove saves a signed document URL and marks the offer accepted.
func (s *OfferService) SetSignedDocAndApprove(id int, signedURL string, approvedAt time.Time) (*models.Offer, error) {
	var offer models.Offer
	if err := s.db.First(&offer, id).Error; err != nil {
		return nil, err
	}
	offer.SignedDocURL = signedURL
	offer.Status = "accepted"
	offer.ApprovedAt = &approvedAt
	if err := s.db.Save(&offer).Error; err != nil {
		return nil, err
	}
	return &offer, nil
}

// RenewDueOffers finds offers with auto_renew=true and next_renewal <= now,
// creates a new offer cloned from each, and advances next_renewal.
func (s *OfferService) RenewDueOffers(now time.Time) (int, error) {
	var due []models.Offer
	if err := s.db.Where("auto_renew = ? AND next_renewal <= ?", true, now).Find(&due).Error; err != nil {
		return 0, err
	}
	created := 0
	for _, of := range due {
		newOffer := models.Offer{
			ClientID:   of.ClientID,
			Subject:    of.Subject,
			Items:      of.Items,
			TotalPrice: of.TotalPrice,
			Notes:      of.Notes,
			Status:     of.Status,
			// Let hook assign OfferNumber and Date
		}
		if err := s.db.Create(&newOffer).Error; err != nil {
			continue
		}
		days := of.RenewEveryDays
		if days <= 0 {
			days = 30
		}
		next := of.NextRenewal.Add(time.Duration(days) * 24 * time.Hour)
		_ = s.db.Model(&models.Offer{}).Where("id = ?", of.ID).Update("next_renewal", next).Error
		created++
	}
	return created, nil
}

// ToggleAutoRenew enables/disables auto-renewal and sets cycle days.
func (s *OfferService) ToggleAutoRenew(id int, enable bool, days int) (*models.Offer, error) {
	var offer models.Offer
	if err := s.db.First(&offer, id).Error; err != nil {
		return nil, err
	}
	offer.AutoRenew = enable
	if enable {
		if days <= 0 {
			days = 30
		}
		offer.RenewEveryDays = days
		if offer.NextRenewal.IsZero() {
			base := offer.Date
			if base.IsZero() {
				base = time.Now()
			}
			offer.NextRenewal = base.Add(time.Duration(days) * 24 * time.Hour)
		}
	}
	if err := s.db.Save(&offer).Error; err != nil {
		return nil, err
	}
	return &offer, nil
}
