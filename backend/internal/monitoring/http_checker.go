package monitoring

import (
	"context"
	"net/http"
	"time"
)

// HTTPChecker performs a simple GET to measure availability/latency.
type HTTPChecker struct {
	Client *http.Client
}

func NewHTTPChecker(timeout time.Duration) *HTTPChecker {
	return &HTTPChecker{Client: &http.Client{Timeout: timeout}}
}

func (h *HTTPChecker) Check(ctx context.Context, svc ServiceInfo) Result {
	start := time.Now()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, svc.URL, nil)
	resp, err := h.Client.Do(req)
	r := Result{ServiceID: svc.ID, CheckedAt: time.Now()}
	if err != nil {
		r.OK = false
		r.Error = err.Error()
		r.Latency = time.Since(start)
		return r
	}
	defer resp.Body.Close()
	r.StatusCode = resp.StatusCode
	// Consider 2xx successful; 3xx follow handled by client; keep non-2xx as not OK
	r.OK = resp.StatusCode >= 200 && resp.StatusCode < 300
	r.Latency = time.Since(start)
	return r
}
