package handlers

import (
	"net/http"
	"strconv"
	"time"

	"freelance-monitor-system/internal/database"
	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/monitoring"
	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
)

type ServiceCheckHandler struct{}

func NewServiceCheckHandler() *ServiceCheckHandler { return &ServiceCheckHandler{} }

// CheckNow performs an immediate health check for the service, persists the result, and returns it.
func (h *ServiceCheckHandler) CheckNow(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid service id"})
		return
	}

	var svc models.Service
	if err := database.DB.First(&svc, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}
	url := svc.URL
	if url == "" && svc.Domain != "" {
		url = "https://" + svc.Domain
	}
	if url == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "service has no url or domain"})
		return
	}

	checker := monitoring.NewHTTPChecker(5 * time.Second)
	info := monitoring.ServiceInfo{ID: svc.ID, URL: url, ServiceType: svc.ServiceType}
	res := checker.Check(c.Request.Context(), info)

	// persist
	logSvc := services.NewUptimeLogService(database.DB)
	_ = logSvc.SaveResult(c.Request.Context(), res)
	if !res.OK {
		alertSvc := services.NewAlertService(database.DB)
		_ = alertSvc.CreateUptimeAlert(c.Request.Context(), res)
	}
	c.JSON(http.StatusOK, gin.H{
		"service_id":  res.ServiceID,
		"ok":          res.OK,
		"status_code": res.StatusCode,
		"latency_ms":  int(res.Latency.Milliseconds()),
		"error":       res.Error,
		"checked_at":  res.CheckedAt,
	})
}
