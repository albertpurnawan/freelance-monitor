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

func TestServiceHandlersCreateList(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	if err := db.AutoMigrate(&models.Service{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := services.NewServiceService(db)
	h := NewServiceHandler(svc)
	r := gin.Default()
	r.POST("/api/services", h.CreateService)
	r.GET("/api/services", h.ListServices)
	r.GET("/api/services/:id", h.GetService)
	r.PUT("/api/services/:id", h.UpdateService)
	r.DELETE("/api/services/:id", h.DeleteService)

	// Create
	w := httptest.NewRecorder()
	body := `{"client_id":1,"domain":"example.com","service_type":"website"}`
	req := httptest.NewRequest("POST", "/api/services", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 201 {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	// List
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/services", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// Get existing
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/services/1", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// Error cases
	// Invalid JSON
	w = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/services", strings.NewReader(`{`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for invalid json, got %d", w.Code)
	}
	// Missing required fields
	w = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/services", strings.NewReader(`{"client_id":0}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for missing fields, got %d", w.Code)
	}

	// Not found
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/services/999", nil)
	r.ServeHTTP(w, req)
	if w.Code != 404 {
		t.Fatalf("expected 404 for not found, got %d", w.Code)
	}

	// Update
	w = httptest.NewRecorder()
	req = httptest.NewRequest("PUT", "/api/services/1", strings.NewReader(`{"status":"down"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200 on update, got %d", w.Code)
	}

	// Invalid ID on update
	w = httptest.NewRecorder()
	req = httptest.NewRequest("PUT", "/api/services/abc", strings.NewReader(`{"status":"up"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for invalid id, got %d", w.Code)
	}

	// Invalid JSON on update
	w = httptest.NewRecorder()
	req = httptest.NewRequest("PUT", "/api/services/1", strings.NewReader(`{`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for invalid json, got %d", w.Code)
	}

	// Delete
	w = httptest.NewRecorder()
	req = httptest.NewRequest("DELETE", "/api/services/1", nil)
	r.ServeHTTP(w, req)
	if w.Code != 204 {
		t.Fatalf("expected 204 on delete, got %d", w.Code)
	}

	// Delete not found
	w = httptest.NewRecorder()
	req = httptest.NewRequest("DELETE", "/api/services/999", nil)
	r.ServeHTTP(w, req)
	if w.Code != 404 {
		t.Fatalf("expected 404 on delete not found, got %d", w.Code)
	}
}
