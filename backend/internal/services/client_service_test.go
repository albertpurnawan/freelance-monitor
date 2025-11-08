package services

import (
	"context"
	"testing"

	"freelance-monitor-system/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestClientServiceCRUD(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Client{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}

	svc := NewClientService(db)

	// Create
	c := &models.Client{Name: "Acme"}
	if err := svc.CreateClient(c); err != nil {
		t.Fatalf("create client failed: %v", err)
	}
	if c.ID == 0 {
		t.Fatalf("expected ID to be set")
	}

	// GetAll
	all, err := svc.GetAllClients()
	if err != nil || len(all) != 1 {
		t.Fatalf("expected 1 client, got %d, err=%v", len(all), err)
	}

	// GetByID
	got, err := svc.GetClientByID(context.Background(), c.ID)
	if err != nil || got == nil || got.Name != "Acme" {
		t.Fatalf("get by id failed: %v", err)
	}

	// Update
	upd := &models.Client{Name: "Acme Co"}
	updated, err := svc.UpdateClient(c.ID, upd)
	if err != nil || updated.Name != "Acme Co" {
		t.Fatalf("update failed: %v", err)
	}

	// Delete
	if err := svc.DeleteClient(c.ID); err != nil {
		t.Fatalf("delete failed: %v", err)
	}
	all, _ = svc.GetAllClients()
	if len(all) != 0 {
		t.Fatalf("expected 0 clients, got %d", len(all))
	}
}
