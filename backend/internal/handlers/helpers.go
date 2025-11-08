package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

func parseIntQuery(c *gin.Context, key string) int {
	if v := c.Query(key); v != "" {
		if n, e := strconv.Atoi(v); e == nil {
			return n
		}
	}
	return 0
}
