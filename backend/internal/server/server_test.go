package server

import (
	"net/http/httptest"
	"testing"

	"freelance-monitor-system/internal/handlers"
)

type dummyH struct{}

func (d *dummyH) GetClients(c interface{})   {}
func (d *dummyH) GetClient(c interface{})    {}
func (d *dummyH) CreateClient(c interface{}) {}
func (d *dummyH) UpdateClient(c interface{}) {}
func (d *dummyH) DeleteClient(c interface{}) {}

func TestNewServerRoutes(t *testing.T) {
	// Use real handler types instead of dummy to satisfy signature
	r := NewServer(&handlers.ClientHandler{}, &handlers.OfferHandler{}, &handlers.ServiceHandler{}, &handlers.MonthlyReportHandler{})
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/health", nil)
	r.ServeHTTP(w, req)
	if w.Code != 200 {
		t.Fatalf("health should return 200, got %d", w.Code)
	}
}
