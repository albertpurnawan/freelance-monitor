package handlers

import (
	"context"
	"net/http"
	"os"
	"time"

	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct{ svc *services.AuthService }

func NewAuthHandler(s *services.AuthService) *AuthHandler { return &AuthHandler{svc: s} }

type registerInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var in registerInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Email == "" || in.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email and password required"})
		return
	}
	u, err := h.svc.Register(c.Request.Context(), in.Email, in.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"id": u.ID, "email": u.Email})
}

type loginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var in loginInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Email == "" || in.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email and password required"})
		return
	}
	token, exp, err := h.svc.Login(c.Request.Context(), in.Email, in.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	// Optional cookie for SSR use
	if os.Getenv("AUTH_COOKIE") == "true" {
		// Set HttpOnly auth token cookie
		c.SetCookie("auth_token", token, int(time.Until(exp).Seconds()), "/", "", false, true)
		// Set CSRF token cookie (readable by JS) and include in response body for convenience
		csrf := services.GenerateCSRFToken()
		c.SetCookie("csrf_token", csrf, int(time.Until(exp).Seconds()), "/", "", false, false)
		c.JSON(http.StatusOK, gin.H{"token": token, "expires_at": exp.Unix(), "csrf_token": csrf})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token, "expires_at": exp.Unix()})
}

type resetRequestInput struct {
	Email string `json:"email"`
}

func (h *AuthHandler) RequestReset(c *gin.Context) {
	var in resetRequestInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email required"})
		return
	}
	ttl := 30 // minutes
	pr, err := h.svc.RequestPasswordReset(c.Request.Context(), in.Email, ttl)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	// If user not found, return success anyway (no info leak)
	if pr == nil {
		c.JSON(http.StatusOK, gin.H{"ok": true})
		return
	}
	// Send email if SMTP configured
	resetBase := os.Getenv("RESET_LINK_BASE")
	if resetBase == "" {
		resetBase = "http://localhost:3000/auth/reset?token="
	}
	link := resetBase + pr.Token
	_ = services.NewMailer().SendResetEmail(in.Email, link)
	// In dev, optionally expose token in response
	if os.Getenv("DEV_EXPOSE_RESET_TOKEN") == "true" {
		c.JSON(http.StatusOK, gin.H{"ok": true, "token": pr.Token, "expires_at": pr.ExpiresAt.Unix()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

type resetInput struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var in resetInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Token == "" || in.NewPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token and new_password required"})
		return
	}
	if err := h.svc.ResetPassword(context.Background(), in.Token, in.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// Logout clears auth and CSRF cookies; requires matching X-CSRF-Token header.
func (h *AuthHandler) Logout(c *gin.Context) {
	// Only meaningful when using cookie auth
	if os.Getenv("AUTH_COOKIE") != "true" {
		c.JSON(http.StatusOK, gin.H{"ok": true})
		return
	}
	header := c.GetHeader("X-CSRF-Token")
	csrfCookie, err := c.Cookie("csrf_token")
	if err != nil || header == "" || header != csrfCookie {
		c.JSON(http.StatusForbidden, gin.H{"error": "invalid csrf token"})
		return
	}
	// Expire cookies
	c.SetCookie("auth_token", "", -1, "/", "", false, true)
	c.SetCookie("csrf_token", "", -1, "/", "", false, false)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// Me returns the current authenticated user's profile.
func (h *AuthHandler) Me(c *gin.Context) {
	uid, ok := c.Get("user_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	id, ok := uid.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	u, err := h.svc.GetUserByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": u.ID, "email": u.Email, "created_at": u.CreatedAt, "updated_at": u.UpdatedAt})
}

type updateEmailInput struct {
	Email string `json:"email"`
}

// UpdateEmail updates the authenticated user's email.
func (h *AuthHandler) UpdateEmail(c *gin.Context) {
	uid, ok := c.Get("user_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	id, ok := uid.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var in updateEmailInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email required"})
		return
	}
	u, err := h.svc.UpdateEmail(c.Request.Context(), id, in.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": u.ID, "email": u.Email, "avatar_url": u.AvatarURL})
}

type updateAvatarInput struct {
	AvatarURL string `json:"avatar_url"`
}

// UpdateAvatar updates the authenticated user's avatar URL.
func (h *AuthHandler) UpdateAvatar(c *gin.Context) {
	uid, ok := c.Get("user_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	id, ok := uid.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var in updateAvatarInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}
	u, err := h.svc.UpdateAvatarURL(c.Request.Context(), id, in.AvatarURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": u.ID, "email": u.Email, "avatar_url": u.AvatarURL})
}
