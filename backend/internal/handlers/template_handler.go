package handlers

import (
    "net/http"
    "strconv"
    "strings"

    "freelance-monitor-system/internal/models"
    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
)

type TemplateHandler struct{ db *gorm.DB }

func NewTemplateHandler(db *gorm.DB) *TemplateHandler { return &TemplateHandler{db: db} }

// Get fetches template by kind (e.g., monthly) or id.
func (h *TemplateHandler) Get(c *gin.Context) {
    idStr := c.Param("id")
    var t models.ReportTemplate
    if idStr != "" {
        id, _ := strconv.Atoi(idStr)
        if err := h.db.First(&t, id).Error; err != nil {
            c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
            return
        }
        c.JSON(http.StatusOK, t)
        return
    }
    kind := strings.TrimSpace(c.Query("kind"))
    if kind == "" { kind = "monthly" }
    uidAny, hasUID := c.Get("user_id")
    if !hasUID {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
        return
    }
    uid := uidAny.(int)
    if err := h.db.Where("kind = ? AND user_id = ?", kind, uid).Order("id DESC").First(&t).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
        return
    }
    c.JSON(http.StatusOK, t)
}

// List returns all templates for the current user (and optionally public defaults).
func (h *TemplateHandler) List(c *gin.Context) {
    kind := strings.TrimSpace(c.Query("kind"))
    if kind == "" { kind = "monthly" }
    var out []models.ReportTemplate
    v, ok := c.Get("user_id")
    if !ok {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
        return
    }
    uid := v.(int)
    if err := h.db.Model(&models.ReportTemplate{}).
        Where("kind = ? AND user_id = ?", kind, uid).
        Order("updated_at DESC, id DESC").
        Find(&out).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, out)
}

// Upsert creates or updates template by name (unique) for a kind.
type upsertReq struct {
    Name    string `json:"name"`
    Kind    string `json:"kind"`
    Content string `json:"content"`
}

func (h *TemplateHandler) Upsert(c *gin.Context) {
    var req upsertReq
    if err := c.ShouldBindJSON(&req); err != nil || strings.TrimSpace(req.Name) == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
        return
    }
    kind := strings.TrimSpace(req.Kind)
    if kind == "" {
        kind = "monthly"
    }
    uid := 0
    if v, ok := c.Get("user_id"); ok {
        uid = v.(int)
    }
    var t models.ReportTemplate
    if err := h.db.Where("name = ? AND kind = ? AND user_id = ?", req.Name, kind, uid).First(&t).Error; err != nil {
        // Create
        t = models.ReportTemplate{Name: req.Name, Kind: kind, Content: req.Content, UserID: uid}
        if err := h.db.Create(&t).Error; err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
            return
        }
        c.JSON(http.StatusOK, t)
        return
    }
    // Update
    t.Content = req.Content
    if err := h.db.Save(&t).Error; err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusOK, t)
}

// Delete removes a template owned by the current user.
func (h *TemplateHandler) Delete(c *gin.Context) {
    idStr := c.Param("id")
    id, _ := strconv.Atoi(idStr)
    uid := 0
    if v, ok := c.Get("user_id"); ok { uid = v.(int) }
    q := h.db.Where("id = ?", id)
    if uid > 0 { q = q.Where("user_id = ?", uid) } else { q = q.Where("user_id = 0") }
    res := q.Delete(&models.ReportTemplate{})
    if res.Error != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": res.Error.Error()})
        return
    }
    if res.RowsAffected == 0 { c.JSON(http.StatusNotFound, gin.H{"error": "not found"}); return }
    c.Status(http.StatusNoContent)
}
