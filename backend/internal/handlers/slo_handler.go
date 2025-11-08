package handlers

import (
	"net/http"
	"strconv"

	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
)

type SLOHandler struct{ svc *services.SLOService }

func NewSLOHandler(s *services.SLOService) *SLOHandler { return &SLOHandler{svc: s} }

func (h *SLOHandler) List(c *gin.Context) {
	sid := parseIntQuery(c, "service_id")
	items, err := h.svc.ListByService(c, sid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": len(items)})
}

func (h *SLOHandler) Create(c *gin.Context) {
	var body models.SLOTarget
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if body.ServiceID == 0 || body.Objective == "" || body.Target <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "service_id, objective, target required"})
		return
	}
	if err := h.svc.Create(c, &body); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, body)
}

func (h *SLOHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var body models.SLOTarget
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

func (h *SLOHandler) Delete(c *gin.Context) {
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
