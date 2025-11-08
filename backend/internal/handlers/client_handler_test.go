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

func TestClientHandlersCRUD(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite open: %v", err)
	}
	if err := db.AutoMigrate(&models.Client{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := services.NewClientService(db)

	h := NewClientHandler(svc)
	r := gin.Default()
	r.POST("/api/clients", h.CreateClient)
	r.GET("/api/clients", h.GetClients)
	r.GET("/api/clients/:id", h.GetClient)
	r.PUT("/api/clients/:id", h.UpdateClient)
	r.DELETE("/api/clients/:id", h.DeleteClient)

	// Create
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/clients", strings.NewReader(`{"name":"Acme"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 201 {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	// List
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/clients", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// Get by ID
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/clients/1", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// Update
	w = httptest.NewRecorder()
	req = httptest.NewRequest("PUT", "/api/clients/1", strings.NewReader(`{"name":"Acme Updated"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	// Delete
	w = httptest.NewRecorder()
	req = httptest.NewRequest("DELETE", "/api/clients/1", nil)
	r.ServeHTTP(w, req)
	if w.Code != 204 {
		t.Fatalf("expected 204, got %d", w.Code)
	}

	// Not found after delete
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/clients/1", nil)
	r.ServeHTTP(w, req)
	if w.Code != 404 {
		t.Fatalf("expected 404 after delete, got %d", w.Code)
	}

	// Update not found
	w = httptest.NewRecorder()
	req = httptest.NewRequest("PUT", "/api/clients/999", strings.NewReader(`{"name":"X"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 404 {
		t.Fatalf("expected 404 for update not found, got %d", w.Code)
	}

	// Error cases: invalid ID
	w = httptest.NewRecorder()
	req = httptest.NewRequest("GET", "/api/clients/abc", nil)
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for invalid id, got %d", w.Code)
	}

	// Invalid JSON
	w = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/clients", strings.NewReader(`{`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for invalid json, got %d", w.Code)
	}

	// Missing name
	w = httptest.NewRecorder()
	req = httptest.NewRequest("POST", "/api/clients", strings.NewReader(`{"email":"a@b.com"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for missing name, got %d", w.Code)
	}

	// Update invalid id
	w = httptest.NewRecorder()
	req = httptest.NewRequest("PUT", "/api/clients/abc", strings.NewReader(`{"name":"X"}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for invalid id, got %d", w.Code)
	}

	// Delete invalid id
	w = httptest.NewRecorder()
	req = httptest.NewRequest("DELETE", "/api/clients/abc", nil)
	r.ServeHTTP(w, req)
	if w.Code != 400 {
		t.Fatalf("expected 400 for invalid id, got %d", w.Code)
	}
}
