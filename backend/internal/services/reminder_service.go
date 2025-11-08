package services

import (
	"context"
	"fmt"
	"time"

	"freelance-monitor-system/internal/models"
	"gorm.io/gorm"
)

// ReminderService handles emailing reminders for offers nearing end of validity.
type ReminderService struct {
	db     *gorm.DB
	mailer *Mailer
}

func NewReminderService(db *gorm.DB) *ReminderService {
	return &ReminderService{db: db, mailer: NewMailer()}
}

// SendOfferExpiryReminders sends reminder emails for offers whose ValidUntil
// is within the provided window (e.g., 7 days) and not yet accepted.
// It ensures we don't spam by checking LastReminderAt within the same day.
func (s *ReminderService) SendOfferExpiryReminders(ctx context.Context, within time.Duration) (int, error) {
	if within <= 0 {
		within = 7 * 24 * time.Hour
	}
	now := time.Now()
	cutoff := now.Add(within)
	var offers []models.Offer
	// Only draft/sent offers; skip accepted/rejected
	if err := s.db.WithContext(ctx).
		Where("valid_until IS NOT NULL AND valid_until <= ? AND (status = ? OR status = ?)", cutoff, "draft", "sent").
		Find(&offers).Error; err != nil {
		return 0, err
	}
	if len(offers) == 0 {
		return 0, nil
	}
	// Load client emails in one query per client to keep simple; could prefetch map
	sent := 0
	for _, of := range offers {
		// Avoid re-sending within the same day
		if of.LastReminderAt != nil && sameDay(*of.LastReminderAt, now) {
			continue
		}
		var client models.Client
		if err := s.db.WithContext(ctx).First(&client, of.ClientID).Error; err != nil {
			continue
		}
		if client.Email == "" && of.IssuerEmail == "" {
			continue
		}
		daysLeft := int(of.ValidUntil.Sub(now).Hours() / 24)
		if daysLeft < 0 {
			daysLeft = 0
		}
		to := client.Email
		if to == "" {
			to = of.IssuerEmail
		}
		subject := fmt.Sprintf("Reminder: Penawaran '%s' mendekati masa akhir", nonEmpty(of.Subject, of.OfferTitle))
		body := fmt.Sprintf("Halo,\n\nPenawaran dengan nomor %s untuk klien ID %d akan berakhir pada %s (sisa %d hari).\nMohon tindak lanjuti sebelum masa berlaku habis.\n\nTerima kasih.\n",
			of.OfferNumber, of.ClientID, of.ValidUntil.Format("2006-01-02"), daysLeft)
		if err := s.mailer.SendGenericEmail(to, subject, body); err != nil {
			continue
		}
		// Mark reminder sent time
		_ = s.db.WithContext(ctx).Model(&models.Offer{}).Where("id = ?", of.ID).Update("last_reminder_at", now).Error
		sent++
	}
	return sent, nil
}

func sameDay(a, b time.Time) bool {
	ay, am, ad := a.Date()
	by, bm, bd := b.Date()
	return ay == by && am == bm && ad == bd
}

func nonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

