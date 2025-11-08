package handlers

import (
	"errors"
	"strconv"

	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ClientHandler struct {
	service *services.ClientService
}

func NewClientHandler(service *services.ClientService) *ClientHandler {
	return &ClientHandler{service: service}
}

func (h *ClientHandler) GetClients(c *gin.Context) {
	limit := parseIntQuery(c, "limit")
	offset := parseIntQuery(c, "offset")
	sortBy := c.Query("sort")
	order := c.Query("order")
	nameLike := c.Query("name")
	clients, err := h.service.GetClientsPagedWithFilters(limit, offset, sortBy, order, nameLike)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	total, _ := h.service.CountClients(nameLike)
	c.JSON(200, gin.H{"items": clients, "total": total})
}

// helper moved to helpers.go

func (h *ClientHandler) GetClient(c *gin.Context) {
	id := c.Param("id")
	clientID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid client ID"})
		return
	}
	client, err := h.service.GetClientByID(c.Request.Context(), clientID)
	if err != nil {
		c.JSON(404, gin.H{"error": "Client not found"})
		return
	}
	c.JSON(200, client)
}

func (h *ClientHandler) CreateClient(c *gin.Context) {
	var input models.Client
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if input.Name == "" {
		c.JSON(400, gin.H{"error": "name is required"})
		return
	}
	if err := h.service.CreateClient(&input); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(201, input)
}

func (h *ClientHandler) UpdateClient(c *gin.Context) {
	id := c.Param("id")
	clientID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid client ID"})
		return
	}
	var updates models.Client
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	client, err := h.service.UpdateClient(clientID, &updates)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(404, gin.H{"error": "Client not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, client)
}

func (h *ClientHandler) DeleteClient(c *gin.Context) {
	id := c.Param("id")
	clientID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid client ID"})
		return
	}
	if err := h.service.DeleteClient(clientID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(404, gin.H{"error": "Client not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.Status(204)
}
