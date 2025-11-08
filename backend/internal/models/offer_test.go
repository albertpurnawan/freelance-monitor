package models

import (
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestOfferBeforeCreateGeneratesSequentialNumber(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	if err := db.AutoMigrate(&Offer{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	o1 := &Offer{ClientID: 1, Subject: "A", Items: "[]", TotalPrice: 1}
	if err := db.Create(o1).Error; err != nil {
		t.Fatalf("create o1: %v", err)
	}
	if o1.OfferNumber == "" {
		t.Fatalf("o1 number empty")
	}

	o2 := &Offer{ClientID: 1, Subject: "B", Items: "[]", TotalPrice: 2}
	if err := db.Create(o2).Error; err != nil {
		t.Fatalf("create o2: %v", err)
	}
	if o2.OfferNumber == "" || o1.OfferNumber == o2.OfferNumber {
		t.Fatalf("expected incremented sequence, got %q and %q", o1.OfferNumber, o2.OfferNumber)
	}
}

func TestOfferBeforeCreateKeepsProvidedNumber(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	if err := db.AutoMigrate(&Offer{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	o := &Offer{ClientID: 1, Subject: "A", Items: "[]", TotalPrice: 1, OfferNumber: "123/MSI-01/01/2024"}
	if err := db.Create(o).Error; err != nil {
		t.Fatalf("create: %v", err)
	}
	if o.OfferNumber != "123/MSI-01/01/2024" {
		t.Fatalf("expected provided number preserved, got %q", o.OfferNumber)
	}
}
