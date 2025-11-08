package handlers

import (
	"net/http"
	"time"

	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
)

type ReportHandler struct{ svc *services.ReportService }

func NewReportHandler(s *services.ReportService) *ReportHandler { return &ReportHandler{svc: s} }

// GenerateDaily triggers generation for a specific date (YYYY-MM-DD), defaults to today.
func (h *ReportHandler) GenerateDaily(c *gin.Context) {
	dateStr := c.Query("date")
	d := time.Now()
	if dateStr != "" {
		t, err := time.Parse("2006-01-02", dateStr)
		if err == nil {
			d = t
		}
	}
	if err := h.svc.GenerateDailyReport(c.Request.Context(), d); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
