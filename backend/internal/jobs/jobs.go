package jobs

import (
    "context"
    "os"
    "strconv"
    "time"

    "freelance-monitor-system/internal/models"
    "freelance-monitor-system/internal/monitoring"
    "freelance-monitor-system/internal/services"
    "gorm.io/gorm"
)

// JobRunner wraps dependencies for background jobs.
type JobRunner struct {
    DB       *gorm.DB
    LogSvc   *services.UptimeLogService
    AlertSvc *services.AlertService
}

func NewJobRunner(db *gorm.DB) *JobRunner {
    return &JobRunner{
        DB:       db,
        LogSvc:   services.NewUptimeLogService(db),
        AlertSvc: services.NewAlertService(db),
    }
}

// RunMonitoring executes one monitoring sweep and records results.
func (jr *JobRunner) RunMonitoring(ctx context.Context) error {
	lister := monitoring.NewDBLister(jr.DB)
	checker := monitoring.NewHTTPChecker(5 * time.Second)
	results, err := monitoring.RunOnce(ctx, lister, checker)
	if err != nil {
		return err
	}
	for _, r := range results {
		_ = jr.LogSvc.SaveResult(ctx, r)
		if !r.OK {
			_ = jr.AlertSvc.CreateUptimeAlert(ctx, r)
		}
	}
	return nil
}

// RefreshExpiries updates SSL and domain expiry from sources.
func (jr *JobRunner) RefreshExpiries(ctx context.Context) error {
	var svcs []models.Service
	if err := jr.DB.WithContext(ctx).Find(&svcs).Error; err != nil {
		return err
	}
	for _, s := range svcs {
		if s.Domain == "" {
			continue
		}
		if exp, err := monitoring.FetchTLSExpiry(s.Domain, 5*time.Second); err == nil && exp != nil {
			_ = jr.DB.WithContext(ctx).Model(&models.Service{}).Where("id = ?", s.ID).Update("ssl_expiry", *exp).Error
		}
		if dexp, derr := monitoring.FetchDomainExpiry(s.Domain, 8*time.Second); derr == nil && dexp != nil {
			_ = jr.DB.WithContext(ctx).Model(&models.Service{}).Where("id = ?", s.ID).Update("domain_expiry", *dexp).Error
		}
	}
	return nil
}

// GenerateDailyReport triggers daily aggregation using ReportService.
func (jr *JobRunner) GenerateDailyReport(ctx context.Context) error {
	rs := services.NewReportService(jr.DB)
	return rs.GenerateDailyReport(ctx, time.Now())
}

// CheckHeartbeats looks for missed heartbeats and raises alerts.
func (jr *JobRunner) CheckHeartbeats(ctx context.Context) error {
	var hbs []models.HeartbeatJob
	if err := jr.DB.WithContext(ctx).Find(&hbs).Error; err != nil {
		return err
	}
	now := time.Now()
	for _, hb := range hbs {
		if hb.IsPaused {
			continue
		}
		window := time.Duration(hb.ExpectedIntervalSeconds+hb.GraceSeconds) * time.Second
		if hb.LastHeartbeatAt == nil {
			continue
		}
		if now.After(hb.LastHeartbeatAt.Add(window)) {
			exists, _ := jr.AlertSvc.ExistsActiveAlert(ctx, hb.ServiceID, "heartbeat_missed")
			if !exists {
				_ = jr.AlertSvc.CreateExpiryAlert(ctx, hb.ServiceID, "heartbeat_missed", "Heartbeat Missed", "Job '"+hb.Name+"' has not reported in time", "warning")
			}
		}
	}
	return nil
}

// RunBackups triggers DB backups for all services tagged accordingly.
func (jr *JobRunner) RunBackups(ctx context.Context) error {
	// For MVP, run backup for all services. Later add a flag/column.
	var svcs []models.Service
	if err := jr.DB.WithContext(ctx).Find(&svcs).Error; err != nil {
		return err
	}
	bs := services.NewBackupService(jr.DB)
	for _, s := range svcs {
		_ = bs.RunDatabaseBackup(ctx, s.ID)
	}
    return nil
}

// SendOfferReminders triggers reminder emails for offers nearing validity end.
func (jr *JobRunner) SendOfferReminders(ctx context.Context) error {
    rs := services.NewReminderService(jr.DB)
    // default within 7 days; read from env if set
    days := 7
    if s := os.Getenv("REMINDER_OFFER_WITHIN_DAYS"); s != "" {
        if n, err := strconv.Atoi(s); err == nil && n > 0 {
            days = n
        }
    }
    _, _ = rs.SendOfferExpiryReminders(ctx, time.Duration(days)*24*time.Hour)
    return nil
}
