package handlers

import (
	"net/http"

	"freelance-monitor-system/internal/integrations"
	"github.com/gin-gonic/gin"
)

type DNSHandler struct{}

func NewDNSHandler() *DNSHandler { return &DNSHandler{} }

func (h *DNSHandler) PlanCloudflare(c *gin.Context) {
	var req struct {
		Changes []integrations.DNSChange `json:"changes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cli := integrations.NewCloudflareClient()
	plan, _ := cli.PlanChanges(req.Changes)
	c.JSON(http.StatusOK, gin.H{"items": plan, "total": len(plan)})
}
