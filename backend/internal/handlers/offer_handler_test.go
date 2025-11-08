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

func TestOfferHandlersCreateList(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	if err := db.AutoMigrate(&models.Offer{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := services.NewOfferService(db)
	h := NewOfferHandler(svc)
	r := gin.Default()
	r.POST("/api/offers", h.CreateOffer)
	r.GET("/api/offers", h.ListOffers)
	r.GET("/api/offers/:id", h.GetOffer)
	r.PUT("/api/offers/:id", h.UpdateOffer)
	r.DELETE("/api/offers/:id", h.DeleteOffer)

	// Create
	w := httptest.NewRecorder()
	body := `{"client_id":1,"subject":"Test","items":"[]","total_price":100}`
	req := httptest.NewRequest("POST", "/api/offers", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 201 {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	// Ensure pdf_url set
	if !strings.Contains(w.Body.String(), "pdf_url") {
		t.Fatalf("expected pdf_url in response")
	}

	// List
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/offers", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// Get existing
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/offers/1", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// Error cases
	// Invalid JSON
	w = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/offers", strings.NewReader(`{`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for invalid json, got %d", w.Code)
	}
	// Missing required fields
	w = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/offers", strings.NewReader(`{"total_price":0}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for missing fields, got %d", w.Code)
	}

	// Not found
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/offers/999", nil)
	r.ServeHTTP(w, req)
	if w.Code != 404 {
		t.Fatalf("expected 404 for not found, got %d", w.Code)
	}

	// Update
	w = httptest.NewRecorder()
	req = httptest.NewRequest("PUT", "/api/offers/1", strings.NewReader(`{"subject":"Updated","total_price":200}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200 on update, got %d", w.Code)
	}

	// Delete
	w = httptest.NewRecorder()
	req = httptest.NewRequest("DELETE", "/api/offers/1", nil)
	r.ServeHTTP(w, req)
	if w.Code != 204 {
		t.Fatalf("expected 204 on delete, got %d", w.Code)
	}

	// Delete not found
	w = httptest.NewRecorder()
	req = httptest.NewRequest("DELETE", "/api/offers/999", nil)
	r.ServeHTTP(w, req)
	if w.Code != 404 {
		t.Fatalf("expected 404 on delete not found, got %d", w.Code)
	}

	// Invalid ID on update
	w = httptest.NewRecorder()
	req = httptest.NewRequest("PUT", "/api/offers/abc", strings.NewReader(`{"subject":"X"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for invalid id, got %d", w.Code)
	}

	// Invalid JSON on update
	w = httptest.NewRecorder()
	req = httptest.NewRequest("PUT", "/api/offers/1", strings.NewReader(`{`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for invalid json, got %d", w.Code)
	}
}
