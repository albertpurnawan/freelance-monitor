package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	jwt "github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware validates Bearer JWT using HS256 and JWT_SECRET.
func AuthMiddleware() gin.HandlerFunc {
	secret := os.Getenv("JWT_SECRET")
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		var tokenStr string
		if strings.HasPrefix(auth, "Bearer ") {
			tokenStr = strings.TrimPrefix(auth, "Bearer ")
		} else {
			if cookieToken, err := c.Cookie("auth_token"); err == nil && cookieToken != "" {
				tokenStr = cookieToken
			}
		}
		if tokenStr == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrTokenUnverifiable
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		// Optional: token timeout is handled via exp claim; no server session
		// Extract claims and place into context for handlers to use
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if sub, okSub := claims["sub"]; okSub {
				// JWT numeric values may unmarshal as float64
				switch v := sub.(type) {
				case float64:
					c.Set("user_id", int(v))
				case int:
					c.Set("user_id", v)
				case int32:
					c.Set("user_id", int(v))
				case int64:
					c.Set("user_id", int(v))
				}
			}
			if email, okEmail := claims["email"].(string); okEmail {
				c.Set("user_email", email)
			}
		}
		c.Next()
	}
}
