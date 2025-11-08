package monitoring

import (
	"context"
	"time"
)

// ServiceInfo carries minimal data required for monitoring.
type ServiceInfo struct {
	ID           int
	URL          string
	ServiceType  string
	SSLExpiry    *time.Time
	DomainExpiry *time.Time
}

// ServiceLister returns list of services to monitor.
type ServiceLister interface {
	ListActiveServices(ctx context.Context) ([]ServiceInfo, error)
}

// Checker performs a health check for a given service.
type Checker interface {
	Check(ctx context.Context, svc ServiceInfo) Result
}

// RunOnce lists services and checks each once, concurrently.
func RunOnce(ctx context.Context, lister ServiceLister, checker Checker) ([]Result, error) {
	svcs, err := lister.ListActiveServices(ctx)
	if err != nil {
		return nil, err
	}
	results := make([]Result, 0, len(svcs))
	resCh := make(chan Result, len(svcs))
	for _, s := range svcs {
		s := s
		go func() { resCh <- checker.Check(ctx, s) }()
	}
	for i := 0; i < len(svcs); i++ {
		results = append(results, <-resCh)
	}
	close(resCh)
	return results, nil
}

// Start begins periodic checks, sending results to out channel until context cancellation.
func Start(ctx context.Context, interval time.Duration, lister ServiceLister, checker Checker, out chan<- Result) error {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	// initial run
	results, err := RunOnce(ctx, lister, checker)
	if err != nil {
		return err
	}
	for _, r := range results {
		select {
		case out <- r:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			results, err := RunOnce(ctx, lister, checker)
			if err != nil {
				return err
			}
			for _, r := range results {
				select {
				case out <- r:
				case <-ctx.Done():
					return ctx.Err()
				}
			}
		}
	}
}
