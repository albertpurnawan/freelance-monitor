package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorLogHandler receives error logs from clients (frontend) and writes them to server log.
type ErrorLogHandler struct{}

func NewErrorLogHandler() *ErrorLogHandler { return &ErrorLogHandler{} }

type errorLogPayload struct {
	Message  string            `json:"message"`
	Stack    string            `json:"stack"`
	Metadata map[string]string `json:"metadata"`
}

func (h *ErrorLogHandler) Capture(c *gin.Context) {
	var p errorLogPayload
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}
	ua := c.Request.UserAgent()
	ip := c.ClientIP()
	log.Printf("frontend_error ip=%s ua=%q msg=%q stack=%q meta=%v", ip, ua, p.Message, p.Stack, p.Metadata)
	c.JSON(http.StatusOK, gin.H{"status": "logged"})
}
