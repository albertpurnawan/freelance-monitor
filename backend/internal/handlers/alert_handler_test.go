package handlers

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestAlertHandlersListAndResolve(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Alert{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := services.NewAlertService(db)
	h := NewAlertHandler(svc)
	r := gin.Default()
	r.GET("/api/services/:id/alerts", h.ListAlerts)
	r.POST("/api/alerts/:id/resolve", h.ResolveAlert)

	// Seed alert
	now := time.Now()
	if err := db.Create(&models.Alert{ServiceID: 1, AlertType: "uptime", Level: "critical", Title: "down", CreatedAt: now}).Error; err != nil {
		t.Fatalf("seed: %v", err)
	}

	// List
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/services/1/alerts", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// Resolve
	w = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/alerts/1/resolve", strings.NewReader(""))
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}
