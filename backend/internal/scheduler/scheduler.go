package scheduler

import (
	"context"
	"sync"
	"time"
)

// TaskInfo describes a scheduled task for introspection.
type TaskInfo struct {
	Name      string    `json:"name"`
	Interval  int64     `json:"interval_seconds"`
	Enabled   bool      `json:"enabled"`
	LastRunAt time.Time `json:"last_run_at"`
}

// Scheduler manages named tasks and runs them at fixed intervals.
type Scheduler struct {
	ctx     context.Context
	cancel  context.CancelFunc
	mu      sync.RWMutex
	runners map[string]func(context.Context) error
	tasks   map[string]*taskState
}

type taskState struct {
	name     string
	interval time.Duration
	enabled  bool
	lastRun  time.Time
	stopCh   chan struct{}
}

// NewScheduler constructs a scheduler bound to the given context.
func NewScheduler(parent context.Context) *Scheduler {
	ctx, cancel := context.WithCancel(parent)
	return &Scheduler{
		ctx:     ctx,
		cancel:  cancel,
		runners: make(map[string]func(context.Context) error),
		tasks:   make(map[string]*taskState),
	}
}

// Close stops all tasks.
func (s *Scheduler) Close() { s.cancel() }

// Register adds a new periodic task. If enabled, it starts the loop.
func (s *Scheduler) Register(name string, interval time.Duration, enabled bool, runner func(context.Context) error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.runners[name] = runner
	ts := &taskState{name: name, interval: interval, enabled: enabled, stopCh: make(chan struct{})}
	s.tasks[name] = ts
	if enabled {
		go s.runLoop(ts)
	}
}

// SetEnabled toggles a task on/off.
func (s *Scheduler) SetEnabled(name string, enabled bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ts, ok := s.tasks[name]
	if !ok {
		return
	}
	if ts.enabled == enabled {
		return
	}
	ts.enabled = enabled
	if enabled {
		ts.stopCh = make(chan struct{})
		go s.runLoop(ts)
	} else {
		close(ts.stopCh)
	}
}

// RunTask executes a task immediately, outside its interval loop.
func (s *Scheduler) RunTask(name string) error {
	s.mu.RLock()
	r := s.runners[name]
	s.mu.RUnlock()
	if r == nil {
		return nil
	}
	err := r(s.ctx)
	if err == nil {
		s.mu.Lock()
		if ts, ok := s.tasks[name]; ok {
			ts.lastRun = time.Now()
		}
		s.mu.Unlock()
	}
	return err
}

// ListTasks returns current tasks for display.
func (s *Scheduler) ListTasks() []TaskInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	items := make([]TaskInfo, 0, len(s.tasks))
	for _, ts := range s.tasks {
		items = append(items, TaskInfo{
			Name:      ts.name,
			Interval:  int64(ts.interval / time.Second),
			Enabled:   ts.enabled,
			LastRunAt: ts.lastRun,
		})
	}
	return items
}

func (s *Scheduler) runLoop(ts *taskState) {
	// First tick happens immediately
	tick := time.NewTicker(ts.interval)
	defer tick.Stop()
	// Initial run
	s.mu.RLock()
	r := s.runners[ts.name]
	s.mu.RUnlock()
	if r != nil {
		if err := r(s.ctx); err == nil {
			s.mu.Lock()
			ts.lastRun = time.Now()
			s.mu.Unlock()
		}
	}
	for {
		select {
		case <-s.ctx.Done():
			return
		case <-ts.stopCh:
			return
		case <-tick.C:
			s.mu.RLock()
			r := s.runners[ts.name]
			s.mu.RUnlock()
			if r != nil {
				if err := r(s.ctx); err == nil {
					s.mu.Lock()
					ts.lastRun = time.Now()
					s.mu.Unlock()
				}
			}
		}
	}
}

// Default scheduler singleton for easy wiring.
var defaultSched *Scheduler

// SetDefault assigns the global scheduler instance.
func SetDefault(s *Scheduler) { defaultSched = s }

// GetDefault returns the global scheduler instance.
func GetDefault() *Scheduler { return defaultSched }
