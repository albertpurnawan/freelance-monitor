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

func TestOfferListPaginationFiltering(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Offer{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	// Seed
	_ = db.Create(&models.Offer{ClientID: 1, Subject: "Website", Items: "[]", TotalPrice: 10}).Error
	_ = db.Create(&models.Offer{ClientID: 2, Subject: "Mobile App", Items: "[]", TotalPrice: 20}).Error

	svc := services.NewOfferService(db)
	h := NewOfferHandler(svc)
	r := gin.Default()
	r.GET("/api/offers", h.ListOffers)

	// Filter by subject and limit=1
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/offers?subject=Web&limit=1&sort=id&order=desc", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	if got := w.Body.String(); !strings.Contains(got, "items") || !strings.Contains(got, "total") {
		t.Fatalf("expected items and total in response: %s", got)
	}
}
