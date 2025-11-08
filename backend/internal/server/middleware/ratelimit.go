package middleware

import (
	"net"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type limiterEntry struct {
	count      int
	windowFrom time.Time
}

type rateLimiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	store  map[string]*limiterEntry
}

// RateLimitFromEnv creates a limiter using env vars RATE_LIMIT_REQUESTS and RATE_LIMIT_WINDOW_SECS.
// Defaults: 100 req per 60 seconds.
func RateLimitFromEnv() gin.HandlerFunc {
	limit := 100
	if v := os.Getenv("RATE_LIMIT_REQUESTS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	window := 60 * time.Second
	if v := os.Getenv("RATE_LIMIT_WINDOW_SECS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			window = time.Duration(n) * time.Second
		}
	}
	return RateLimit(limit, window)
}

// RateLimit returns a middleware that limits requests per client IP.
func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	rl := &rateLimiter{limit: limit, window: window, store: make(map[string]*limiterEntry)}
	return func(c *gin.Context) {
		ip := clientIP(c.Request)
		now := time.Now()
		rl.mu.Lock()
		entry, ok := rl.store[ip]
		if !ok || now.Sub(entry.windowFrom) > rl.window {
			entry = &limiterEntry{count: 0, windowFrom: now}
			rl.store[ip] = entry
		}
		entry.count++
		used := entry.count
		resetIn := rl.window - now.Sub(entry.windowFrom)
		rl.mu.Unlock()

		// Set basic rate limit headers
		if resetIn < 0 {
			resetIn = 0
		}
		remaining := limit - used
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(int64(resetIn/time.Second), 10))

		if used > rl.limit {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		c.Next()
	}
}

func clientIP(r *http.Request) string {
	// Honor X-Forwarded-For if present (take first IP)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		host := xff
		if idx := len(xff); idx > 0 {
			// take first comma-separated value
			for i := 0; i < len(xff); i++ {
				if xff[i] == ',' {
					host = xff[:i]
					break
				}
			}
		}
		return host
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
