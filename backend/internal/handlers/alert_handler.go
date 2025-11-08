package handlers

import (
	"strconv"
	"time"

	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
)

type AlertHandler struct{ svc *services.AlertService }

func NewAlertHandler(s *services.AlertService) *AlertHandler { return &AlertHandler{svc: s} }

func (h *AlertHandler) ListAlerts(c *gin.Context) {
	// Support both /services/:id/alerts and global /alerts
	serviceIDStr := c.Param("id")
	limit := 0
	offset := 0
	if v := c.Query("limit"); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			limit = n
		}
	}
	if v := c.Query("offset"); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			offset = n
		}
	}
	ctx := c.Request.Context()
	if serviceIDStr != "" {
		id, err := strconv.Atoi(serviceIDStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid service ID"})
			return
		}
		unresolved := c.Query("unresolved") == "true"
		if unresolved {
			alerts, err := h.svc.ListByServiceUnresolvedPaged(ctx, id, limit, offset)
			if err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			total, _ := h.svc.CountByServiceUnresolved(ctx, id)
			c.JSON(200, gin.H{"items": alerts, "total": total})
		} else {
			alerts, err := h.svc.ListByServicePaged(ctx, id, limit, offset)
			if err != nil {
				c.JSON(500, gin.H{"error": err.Error()})
				return
			}
			total, _ := h.svc.CountByService(ctx, id)
			c.JSON(200, gin.H{"items": alerts, "total": total})
		}
		return
	}
	// Global unresolved alerts
	alerts, err := h.svc.ListUnresolvedPaged(ctx, limit, offset)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	total, _ := h.svc.CountUnresolved(ctx)
	c.JSON(200, gin.H{"items": alerts, "total": total})
}

func (h *AlertHandler) ResolveAlert(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid alert ID"})
		return
	}
	// Mark as resolved
	now := time.Now()
	if err := h.svc.MarkResolved(c.Request.Context(), id, &now); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.Status(200)
}
