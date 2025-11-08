package handlers

import (
	"net/http"
	"time"

	"freelance-monitor-system/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"strconv"
)

type ReportReadHandler struct{ db *gorm.DB }

func NewReportReadHandler(db *gorm.DB) *ReportReadHandler { return &ReportReadHandler{db: db} }

// ListDaily returns daily reports for a date or range, optionally filtered by service_id.
// Query: date=YYYY-MM-DD or from=YYYY-MM-DD&to=YYYY-MM-DD; service_id optional.
func (h *ReportReadHandler) ListDaily(c *gin.Context) {
	serviceID := 0
	if v := c.Query("service_id"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			serviceID = n
		}
	}
	dateStr := c.Query("date")
	fromStr := c.Query("from")
	toStr := c.Query("to")
	var from, to time.Time
	if dateStr != "" {
		d, err := time.Parse("2006-01-02", dateStr)
		if err == nil {
			from = time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, time.Local)
			to = from.Add(24 * time.Hour)
		}
	} else if fromStr != "" && toStr != "" {
		f, err1 := time.Parse("2006-01-02", fromStr)
		t, err2 := time.Parse("2006-01-02", toStr)
		if err1 == nil && err2 == nil {
			from = time.Date(f.Year(), f.Month(), f.Day(), 0, 0, 0, 0, time.Local)
			to = time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.Local).Add(24 * time.Hour)
		}
	}
	q := h.db.Model(&models.DailyReport{})
	if !from.IsZero() && !to.IsZero() {
		q = q.Where("report_date >= ? AND report_date < ?", from, to)
	}
	if serviceID > 0 {
		q = q.Where("service_id = ?", serviceID)
	}
	var rows []models.DailyReport
	if err := q.Order("report_date ASC, service_id ASC").Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": rows, "total": len(rows)})
}
