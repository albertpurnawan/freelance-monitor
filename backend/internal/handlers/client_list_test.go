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

func TestClientListPaginationFiltering(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Client{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	// Seed
	names := []string{"Acme", "Beta", "Gamma", "Acme Corp"}
	for _, n := range names {
		_ = db.Create(&models.Client{Name: n}).Error
	}

	svc := services.NewClientService(db)
	h := NewClientHandler(svc)
	r := gin.Default()
	r.GET("/api/clients", h.GetClients)

	// Filter by name contains 'Acme' and limit=1
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/clients?name=Acme&limit=1&sort=name&order=asc", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	// Basic shape check
	if got := w.Body.String(); got == "" || !containsAll(got, []string{"items", "total"}) {
		t.Fatalf("expected items and total in response: %s", got)
	}
}

func containsAll(s string, toks []string) bool {
	for _, t := range toks {
		if !strings.Contains(s, t) {
			return false
		}
	}
	return true
}
