package handlers

import (
	"strconv"

	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
)

type LogHandler struct{ svc *services.UptimeLogService }

func NewLogHandler(s *services.UptimeLogService) *LogHandler { return &LogHandler{svc: s} }

func (h *LogHandler) ListLogs(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid service ID"})
		return
	}
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
	logs, err := h.svc.ListByServicePaged(c.Request.Context(), id, limit, offset)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	total, _ := h.svc.CountByService(c.Request.Context(), id)
	c.JSON(200, gin.H{"items": logs, "total": total})
}
