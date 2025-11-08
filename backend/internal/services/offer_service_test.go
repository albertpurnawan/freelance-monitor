package services

import (
	"testing"

	"freelance-monitor-system/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestOfferServiceCreateGeneratesNumber(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Offer{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}

	svc := NewOfferService(db)
	offer := &models.Offer{ClientID: 1, Subject: "Website redesign"}
	if err := svc.CreateOffer(offer); err != nil {
		t.Fatalf("create offer failed: %v", err)
	}
	if offer.OfferNumber == "" {
		t.Fatalf("expected offer number to be generated")
	}
}

func TestOfferServiceUpdateDelete(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Offer{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewOfferService(db)

	offer := &models.Offer{ClientID: 1, Subject: "S1", Items: "[]", TotalPrice: 10}
	if err := svc.CreateOffer(offer); err != nil {
		t.Fatalf("create: %v", err)
	}
	upd := &models.Offer{Subject: "S2", TotalPrice: 20}
	updated, err := svc.UpdateOffer(offer.ID, upd)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Subject != "S2" || updated.TotalPrice != 20 {
		t.Fatalf("update not applied: %+v", updated)
	}
	if err := svc.DeleteOffer(offer.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := svc.GetOfferByID(offer.ID); err == nil {
		t.Fatalf("expected not found after delete")
	}
}

func TestOfferServiceUpdateNonExistent(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Offer{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewOfferService(db)
	if _, err := svc.UpdateOffer(999, &models.Offer{Subject: "X"}); err == nil {
		t.Fatalf("expected error updating non-existent offer")
	}
}
