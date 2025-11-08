package services

import (
	"context"
	"errors"
	"testing"

	"freelance-monitor-system/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestServiceServiceCRUD(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	if err := db.AutoMigrate(&models.Service{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewServiceService(db)
	s := &models.Service{ClientID: 1, Domain: "example.com", ServiceType: "website"}
	if err := svc.CreateService(s); err != nil {
		t.Fatalf("create: %v", err)
	}
	if s.ID == 0 {
		t.Fatalf("expected id")
	}
	got, err := svc.GetServiceByID(context.Background(), s.ID)
	if err != nil || got == nil {
		t.Fatalf("get: %v", err)
	}
	list, err := svc.ListServices()
	if err != nil || len(list) != 1 {
		t.Fatalf("list: %v len=%d", err, len(list))
	}
}

// failingDB wraps gorm.DB to force errors; for now, simulate by closing underlying sqlite connection is non-trivial.
// Instead, we check that passing zero ID yields gorm error.
func TestServiceServiceGetInvalidID(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	if err := db.AutoMigrate(&models.Service{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewServiceService(db)
	_, err = svc.GetServiceByID(context.Background(), 999)
	if err == nil {
		t.Fatalf("expected error for missing id")
	}
	// Ensure it's a gorm error type
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("expected ErrRecordNotFound, got %v", err)
	}
}

func TestServiceServiceUpdateDelete(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	if err := db.AutoMigrate(&models.Service{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewServiceService(db)
	s := &models.Service{ClientID: 1, Domain: "example.com", ServiceType: "website"}
	if err := svc.CreateService(s); err != nil {
		t.Fatalf("create: %v", err)
	}
	upd := &models.Service{Status: "down"}
	updated, err := svc.UpdateService(s.ID, upd)
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.Status != "down" {
		t.Fatalf("status not updated: %q", updated.Status)
	}
	if err := svc.DeleteService(s.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := svc.GetServiceByID(context.Background(), s.ID); err == nil {
		t.Fatalf("expected not found after delete")
	}
}

func TestServiceServiceUpdateNonExistent(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	if err := db.AutoMigrate(&models.Service{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewServiceService(db)
	if _, err := svc.UpdateService(999, &models.Service{Status: "up"}); err == nil {
		t.Fatalf("expected error updating non-existent")
	}
}
