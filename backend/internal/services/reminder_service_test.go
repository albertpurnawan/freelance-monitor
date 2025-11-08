package services

import (
    "context"
    "testing"
    "time"

    "freelance-monitor-system/internal/models"
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
)

func TestSendOfferExpiryReminders(t *testing.T) {
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
    if err != nil {
        t.Fatalf("sqlite open: %v", err)
    }
    if err := db.AutoMigrate(&models.Client{}, &models.Offer{}); err != nil {
        t.Fatalf("migrate: %v", err)
    }

    // Seed client and offer within 3 days
    c := &models.Client{Name: "Acme", Email: "client@example.com"}
    if err := db.Create(c).Error; err != nil {
        t.Fatalf("create client: %v", err)
    }
    vu := time.Now().Add(72 * time.Hour)
    of := &models.Offer{ClientID: c.ID, Subject: "Test Offer", Items: "[]", TotalPrice: 100, Status: "sent", ValidUntil: &vu}
    if err := db.Create(of).Error; err != nil {
        t.Fatalf("create offer: %v", err)
    }

    rs := NewReminderService(db)
    sent, err := rs.SendOfferExpiryReminders(context.Background(), 7*24*time.Hour)
    if err != nil {
        t.Fatalf("send reminders: %v", err)
    }
    if sent != 1 {
        t.Fatalf("expected 1 reminder sent, got %d", sent)
    }
    var got models.Offer
    if err := db.First(&got, of.ID).Error; err != nil {
        t.Fatalf("reload offer: %v", err)
    }
    if got.LastReminderAt == nil {
        t.Fatalf("expected LastReminderAt set")
    }

    // Calling again same day should not resend
    sent2, err := rs.SendOfferExpiryReminders(context.Background(), 7*24*time.Hour)
    if err != nil {
        t.Fatalf("send reminders again: %v", err)
    }
    if sent2 != 0 {
        t.Fatalf("expected 0 reminders second run, got %d", sent2)
    }
}

