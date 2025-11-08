package services

import (
	"context"
	"time"

	"freelance-monitor-system/internal/models"
	"gorm.io/gorm"
)

type ReportService struct{ db *gorm.DB }

func NewReportService(db *gorm.DB) *ReportService { return &ReportService{db: db} }

// GenerateDailyReport computes a daily summary for each service.
// It aggregates uptime logs for the provided date.
func (s *ReportService) GenerateDailyReport(ctx context.Context, date time.Time) error {
	// Normalize to date (strip time)
	d := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.Local)

	// List services
	var services []models.Service
	if err := s.db.WithContext(ctx).Find(&services).Error; err != nil {
		return err
	}

	for _, svc := range services {
		// Fetch logs for date
		var logs []models.UptimeLog
		start := d
		end := d.Add(24 * time.Hour)
		if err := s.db.WithContext(ctx).Where("service_id = ? AND checked_at >= ? AND checked_at < ?", svc.ID, start, end).Find(&logs).Error; err != nil {
			return err
		}
		total := len(logs)
		ups := 0
		sumResp := 0
		downs := 0
		for _, l := range logs {
			if l.Status == "up" {
				ups++
			} else {
				downs++
			}
			sumResp += l.ResponseTime
		}
		uptime := 0.0
		avg := 0
		if total > 0 {
			uptime = (float64(ups) / float64(total)) * 100.0
			avg = sumResp / total
		}
		// Alerts for date
		var alerts []models.Alert
		_ = s.db.WithContext(ctx).Where("service_id = ? AND created_at >= ? AND created_at < ? AND alert_type IN (?)",
			svc.ID, start, end, []string{"uptime", "ssl_expiry", "domain_expiry"},
		).Find(&alerts).Error
		// Count unresolved alerts for service
		var unresolved int64
		_ = s.db.WithContext(ctx).Model(&models.Alert{}).Where("service_id = ? AND resolved_at IS NULL", svc.ID).Count(&unresolved).Error
		rep := models.DailyReport{
			ReportDate:       d,
			ServiceID:        svc.ID,
			UptimePercent:    uptime,
			AvgResponseMs:    avg,
			DowntimeCount:    downs,
			AlertsOpened:     len(alerts), // coarse count
			AlertsUnresolved: int(unresolved),
			CreatedAt:        time.Now(),
		}
		// Upsert (replace existing for date+service)
		var existing models.DailyReport
		err := s.db.WithContext(ctx).Where("report_date = ? AND service_id = ?", d, svc.ID).First(&existing).Error
		if err == nil {
			s.db.WithContext(ctx).Model(&existing).Updates(rep)
		} else {
			_ = s.db.WithContext(ctx).Create(&rep).Error
		}
	}
	return nil
}
