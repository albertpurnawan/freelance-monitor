package handlers

import (
    "errors"
    "strconv"

    "freelance-monitor-system/internal/models"
    "freelance-monitor-system/internal/services"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

type ServiceHandler struct {
	service *services.ServiceService
}

func NewServiceHandler(s *services.ServiceService) *ServiceHandler {
	return &ServiceHandler{service: s}
}

func (h *ServiceHandler) ListServices(c *gin.Context) {
	limit := parseIntQuery(c, "limit")
	offset := parseIntQuery(c, "offset")
	sortBy := c.Query("sort")
	order := c.Query("order")
	status := c.Query("status")
	domainLike := c.Query("domain")
	clientID := parseIntQuery(c, "client_id")
    userID := 0
    if v, ok := c.Get("user_id"); ok { userID = v.(int) }
    services, err := h.service.ListServicesWithFiltersForUser(limit, offset, sortBy, order, status, domainLike, clientID, userID)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    total, _ := h.service.CountServicesForUser(status, userID)
    c.JSON(200, gin.H{"items": services, "total": total})
}

// helper moved to helpers.go

func (h *ServiceHandler) GetService(c *gin.Context) {
	id := c.Param("id")
	svcID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid service ID"})
		return
	}
    userID := 0
    if v, ok := c.Get("user_id"); ok { userID = v.(int) }
    svc, err := h.service.GetServiceByIDForUser(c.Request.Context(), svcID, userID)
    if err != nil {
        c.JSON(404, gin.H{"error": "Service not found"})
        return
    }
    c.JSON(200, svc)
}

func (h *ServiceHandler) CreateService(c *gin.Context) {
	var input models.Service
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if input.ClientID == 0 || input.Domain == "" || input.ServiceType == "" {
		c.JSON(400, gin.H{"error": "client_id, domain and service_type are required"})
		return
	}
    // attach user_id if available
    if v, ok := c.Get("user_id"); ok { input.UserID = v.(int) }
    if err := h.service.CreateService(&input); err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.JSON(201, input)
}

func (h *ServiceHandler) UpdateService(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid service ID"})
		return
	}
	var updates models.Service
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
    // enforce ownership by user
    if v, ok := c.Get("user_id"); ok { updates.UserID = v.(int) }
    userID := updates.UserID
    svc, err := h.service.UpdateServiceForUser(id, &updates, userID)
    if err != nil {
        c.JSON(404, gin.H{"error": "Service not found"})
        return
    }
    c.JSON(200, svc)
}

func (h *ServiceHandler) DeleteService(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid service ID"})
		return
	}
    userID := 0
    if v, ok := c.Get("user_id"); ok { userID = v.(int) }
    if err := h.service.DeleteServiceForUser(id, userID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(404, gin.H{"error": "Service not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.Status(204)
}
