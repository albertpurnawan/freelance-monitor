package middleware

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware enables CORS for the API, configurable via env var CORS_ALLOW_ORIGINS.
// Set CORS_ALLOW_ORIGINS to a comma-separated list of allowed origins or "*" to allow all.
func CORSMiddleware() gin.HandlerFunc {
	allowed := os.Getenv("CORS_ALLOW_ORIGINS")
	if strings.TrimSpace(allowed) == "" {
		allowed = "*"
	}
	allowedList := splitCSV(allowed)
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		// Determine if the origin is allowed
		allowOrigin := ""
		if allowed == "*" {
			// Reflect the request origin if present to support credentials across origins in controlled environments
			if origin != "" {
				allowOrigin = origin
			} else {
				allowOrigin = "*"
			}
		} else if origin != "" && contains(allowedList, origin) {
			allowOrigin = origin
		}
		if allowOrigin != "" {
			c.Header("Access-Control-Allow-Origin", allowOrigin)
		}
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Disposition")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.Status(204)
			c.Abort()
			return
		}
		c.Next()
	}
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	var out []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func contains(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}
