package monitoring

import (
	"context"
	"testing"
	"time"
)

type fakeLister struct{ svcs []ServiceInfo }

func (f fakeLister) ListActiveServices(ctx context.Context) ([]ServiceInfo, error) {
	return f.svcs, nil
}

type fakeChecker struct{ ok bool }

func (f fakeChecker) Check(ctx context.Context, svc ServiceInfo) Result {
	return Result{ServiceID: svc.ID, OK: f.ok, StatusCode: 200, Latency: time.Millisecond, CheckedAt: time.Now()}
}

func TestRunOnce(t *testing.T) {
	l := fakeLister{svcs: []ServiceInfo{{ID: 1}, {ID: 2}}}
	c := fakeChecker{ok: true}
	ctx := context.Background()
	results, err := RunOnce(ctx, l, c)
	if err != nil {
		t.Fatalf("RunOnce err: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
}

func TestStart(t *testing.T) {
	l := fakeLister{svcs: []ServiceInfo{{ID: 1}}}
	c := fakeChecker{ok: true}
	ctx, cancel := context.WithCancel(context.Background())
	out := make(chan Result, 10)
	// cancel after first tick
	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()
	err := Start(ctx, 10*time.Millisecond, l, c, out)
	if err != context.Canceled && err != nil {
		t.Fatalf("expected cancel or nil, got %v", err)
	}
}
