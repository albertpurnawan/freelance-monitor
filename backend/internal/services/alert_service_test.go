package services

import (
	"context"
	"testing"
	"time"

	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/monitoring"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestAlertServiceCreateAndResolve(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	if err := db.AutoMigrate(&models.Alert{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewAlertService(db)

	r := monitoring.Result{ServiceID: 1, OK: false, Error: "timeout", CheckedAt: time.Now()}
	if err := svc.CreateUptimeAlert(context.Background(), r); err != nil {
		t.Fatalf("create alert: %v", err)
	}
	alerts, err := svc.ListByService(context.Background(), 1)
	if err != nil || len(alerts) != 1 {
		t.Fatalf("list alerts failed: %v len=%d", err, len(alerts))
	}
	now := time.Now()
	if err := svc.MarkResolved(context.Background(), alerts[0].ID, &now); err != nil {
		t.Fatalf("resolve alert: %v", err)
	}
	alerts, err = svc.ListByService(context.Background(), 1)
	if err != nil || len(alerts) != 1 || !alerts[0].IsResolved {
		t.Fatalf("expected resolved alert, got %+v", alerts[0])
	}
}
