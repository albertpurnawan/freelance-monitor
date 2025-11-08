package handlers

import (
	"net/http"
	"strconv"
	"time"

	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
)

type HeartbeatHandler struct{ svc *services.HeartbeatService }

func NewHeartbeatHandler(s *services.HeartbeatService) *HeartbeatHandler {
	return &HeartbeatHandler{svc: s}
}

func (h *HeartbeatHandler) List(c *gin.Context) {
	sid := parseIntQuery(c, "service_id")
	limit := parseIntQuery(c, "limit")
	offset := parseIntQuery(c, "offset")
	items, err := h.svc.ListByServicePaged(c, sid, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	total, _ := h.svc.CountByService(c, sid)
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total})
}

func (h *HeartbeatHandler) Create(c *gin.Context) {
	var body models.HeartbeatJob
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.ServiceID == 0 || body.ExpectedIntervalSeconds <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "service_id and expected_interval_seconds required"})
		return
	}
	if err := h.svc.Create(c, &body); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, body)
}

func (h *HeartbeatHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var body models.HeartbeatJob
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	item, err := h.svc.Update(c, id, &body)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *HeartbeatHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.svc.Delete(c, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// Ping updates last heartbeat timestamp. Accepts either path id or JSON with id.
func (h *HeartbeatHandler) Ping(c *gin.Context) {
	idStr := c.Param("id")
	if idStr == "" {
		var body struct {
			ID int `json:"id"`
		}
		if err := c.ShouldBindJSON(&body); err == nil && body.ID > 0 {
			idStr = strconv.Itoa(body.ID)
		}
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	// allow optional timestamp override
	var body struct {
		At *time.Time `json:"at"`
	}
	_ = c.ShouldBindJSON(&body)
	if body.At != nil {
		_, _ = h.svc.Update(c, id, &models.HeartbeatJob{LastHeartbeatAt: body.At})
	} else {
		if err := h.svc.Ping(c, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// Ping via token for external agents (no auth required).
func (h *HeartbeatHandler) PingByToken(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing token"})
		return
	}
	if err := h.svc.PingByToken(c, token); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// Rotate token returns a new token for a heartbeat job.
func (h *HeartbeatHandler) RotateToken(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	tok, err := h.svc.RotateToken(c, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tok})
}
