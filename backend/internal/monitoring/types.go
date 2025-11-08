package monitoring

import (
	"context"
	"time"
)

// Result captures the outcome of a single check.
type Result struct {
	ServiceID  int
	OK         bool
	StatusCode int
	Latency    time.Duration
	Error      string
	CheckedAt  time.Time
}

// CheckFunc represents a monitoring check function.
type CheckFunc func(ctx context.Context) Result
