package handlers

import (
	"net/http/httptest"
	"strings"
	"testing"

	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestServiceListPaginationFiltering(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Service{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	// Seed
	_ = db.Create(&models.Service{ClientID: 1, Domain: "example.com", ServiceType: "website", Status: "active"}).Error
	_ = db.Create(&models.Service{ClientID: 2, Domain: "mail.com", ServiceType: "email", Status: "down"}).Error

	svc := services.NewServiceService(db)
	h := NewServiceHandler(svc)
	r := gin.Default()
	r.GET("/api/services", h.ListServices)

	// Filter by status and limit=1
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/services?status=active&limit=1&sort=id&order=desc", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if got := w.Body.String(); !strings.Contains(got, "items") || !strings.Contains(got, "total") {
		t.Fatalf("expected items and total in response: %s", got)
	}
}
