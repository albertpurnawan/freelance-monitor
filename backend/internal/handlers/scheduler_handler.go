package handlers

import (
	"freelance-monitor-system/internal/scheduler"
	"github.com/gin-gonic/gin"
	"net/http"
)

type SchedulerHandler struct{}

func NewSchedulerHandler() *SchedulerHandler { return &SchedulerHandler{} }

// List returns registered tasks and their status.
func (h *SchedulerHandler) List(c *gin.Context) {
	s := scheduler.GetDefault()
	if s == nil {
		c.JSON(http.StatusOK, gin.H{"items": []interface{}{}, "total": 0})
		return
	}
	items := s.ListTasks()
	c.JSON(http.StatusOK, gin.H{"items": items, "total": len(items)})
}

// Run executes a named task immediately.
func (h *SchedulerHandler) Run(c *gin.Context) {
	name := c.Param("name")
	s := scheduler.GetDefault()
	if s == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "scheduler not ready"})
		return
	}
	if err := s.RunTask(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"ok": false, "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
