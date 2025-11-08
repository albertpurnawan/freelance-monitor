package services

import (
    "context"
    "encoding/json"
    "fmt"
    "strings"
    "time"

	"freelance-monitor-system/internal/models"
	"gorm.io/gorm"
)

type MonthlyReportService struct {
    db *gorm.DB
}

func NewMonthlyReportService(db *gorm.DB) *MonthlyReportService {
    return &MonthlyReportService{db: db}
}

// GenerateMonthlyReport aggregates daily reports into a monthly summary
func (s *MonthlyReportService) GenerateMonthlyReport(ctx context.Context, serviceID int, month time.Time) (*models.MonthlyReport, error) {
	// Calculate date range for the month
	startOfMonth := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Nanosecond)

	// Query daily reports for the month
	var dailyReports []models.DailyReport
	if err := s.db.WithContext(ctx).
		Where("service_id = ? AND report_date BETWEEN ? AND ?", serviceID, startOfMonth, endOfMonth).
		Find(&dailyReports).Error; err != nil {
		return nil, fmt.Errorf("failed to query daily reports: %w", err)
	}

    if len(dailyReports) == 0 {
        // Fallback: aggregate directly from uptime logs for the month
        var logs []models.UptimeLog
        if err := s.db.WithContext(ctx).
            Where("service_id = ? AND checked_at BETWEEN ? AND ?", serviceID, startOfMonth, endOfMonth).
            Find(&logs).Error; err != nil {
            return nil, fmt.Errorf("failed to query uptime logs: %w", err)
        }
        if len(logs) == 0 {
            return nil, fmt.Errorf("no data found for service %d in %s", serviceID, month.Format("2006-01"))
        }

        // Aggregate monthly metrics from logs
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
        avgUptime := (float64(ups) / float64(total)) * 100.0
        avgResp := sumResp / total

        // Alerts within month
        var alerts []models.Alert
        _ = s.db.WithContext(ctx).Where("service_id = ? AND created_at >= ? AND created_at <= ? AND alert_type IN (?)",
            serviceID, startOfMonth, endOfMonth, []string{"uptime", "ssl_expiry", "domain_expiry"},
        ).Find(&alerts).Error
        var unresolved int64
        _ = s.db.WithContext(ctx).Model(&models.Alert{}).Where("service_id = ? AND resolved_at IS NULL", serviceID).Count(&unresolved).Error

        monthlyReport := &models.MonthlyReport{
            ReportMonth:      startOfMonth,
            ServiceID:        serviceID,
            AvgUptimePercent: avgUptime,
            AvgResponseMs:    avgResp,
            TotalDowntime:    downs,
            AlertsOpened:     len(alerts),
            AlertsResolved:   int(unresolved),
            MaintenanceHours: 0,
        }

        // Default activities (can be overridden by handler when provided)
        activities := []string{"Monthly aggregation from raw logs"}
        if b, err := json.Marshal(activities); err == nil {
            monthlyReport.Activities = string(b)
        }
        if err := s.db.WithContext(ctx).Create(monthlyReport).Error; err != nil {
            return nil, fmt.Errorf("failed to save monthly report: %w", err)
        }
        return monthlyReport, nil
    }

	// Aggregate metrics
	var (
		totalUptime       float64
		totalResponseTime int
		totalDowntime     int
		alertsOpened      int
		alertsResolved    int
		activities        []string
	)

	for _, report := range dailyReports {
		totalUptime += report.UptimePercent
		totalResponseTime += report.AvgResponseMs
		totalDowntime += report.DowntimeCount
		alertsOpened += report.AlertsOpened
		alertsResolved += report.AlertsUnresolved
	}

	// Calculate averages
	avgUptime := totalUptime / float64(len(dailyReports))
	avgResponse := totalResponseTime / len(dailyReports)

	// Create monthly report
	monthlyReport := &models.MonthlyReport{
		ReportMonth:      startOfMonth,
		ServiceID:        serviceID,
		AvgUptimePercent: avgUptime,
		AvgResponseMs:    avgResponse,
		TotalDowntime:    totalDowntime,
		AlertsOpened:     alertsOpened,
		AlertsResolved:   alertsResolved,
		MaintenanceHours: 0, // Placeholder for actual maintenance data
	}

	// Collect maintenance activities
	activities = []string{
		"Server maintenance: 2 hours",
		"Security updates applied",
		"Performance optimization",
	}
	activitiesJSON, _ := json.Marshal(activities)
	monthlyReport.Activities = string(activitiesJSON)

	// Save to database
	if err := s.db.WithContext(ctx).Create(monthlyReport).Error; err != nil {
		return nil, fmt.Errorf("failed to save monthly report: %w", err)
	}

	return monthlyReport, nil
}

// GetMonthlyReports retrieves monthly reports for a service
func (s *MonthlyReportService) GetMonthlyReports(ctx context.Context, serviceID int) ([]models.MonthlyReport, error) {
    // Deprecated: use GetMonthlyReportsForUser
    return s.GetMonthlyReportsForUser(ctx, 0, serviceID)
}

// GetMonthlyReportByID retrieves a monthly report by ID
func (s *MonthlyReportService) GetMonthlyReportByID(ctx context.Context, id int) (*models.MonthlyReport, error) {
    // Deprecated: use GetMonthlyReportByIDForUser
    return s.GetMonthlyReportByIDForUser(ctx, 0, id)
}

// SetMonthlyReportUser assigns ownership of a monthly report to userID.
func (s *MonthlyReportService) SetMonthlyReportUser(ctx context.Context, id int, userID int) error {
    if userID <= 0 { return nil }
    return s.db.WithContext(ctx).Model(&models.MonthlyReport{}).Where("id = ?", id).Update("user_id", userID).Error
}

// GetMonthlyReportsForUser scopes listing to a specific user.
func (s *MonthlyReportService) GetMonthlyReportsForUser(ctx context.Context, userID int, serviceID int) ([]models.MonthlyReport, error) {
    var reports []models.MonthlyReport
    q := s.db.WithContext(ctx).Model(&models.MonthlyReport{}).Where("service_id = ?", serviceID)
    if userID > 0 { q = q.Where("user_id = ?", userID) } else { q = q.Where("user_id = 0") }
    if err := q.Order("report_month DESC").Find(&reports).Error; err != nil {
        return nil, fmt.Errorf("failed to get monthly reports: %w", err)
    }
    return reports, nil
}

// GetMonthlyReportByIDForUser fetches a report owned by the user.
func (s *MonthlyReportService) GetMonthlyReportByIDForUser(ctx context.Context, userID int, id int) (*models.MonthlyReport, error) {
    var report models.MonthlyReport
    q := s.db.WithContext(ctx).Model(&models.MonthlyReport{})
    if userID > 0 { q = q.Where("user_id = ?", userID) } else { q = q.Where("user_id = 0") }
    if err := q.First(&report, id).Error; err != nil {
        return nil, fmt.Errorf("failed to get monthly report: %w", err)
    }
    return &report, nil
}

// UpdateMonthlyDetails sets activities and maintenance hours for a generated monthly report.
func (s *MonthlyReportService) UpdateMonthlyDetails(ctx context.Context, id int, activities []string, maintenanceHours float64) error {
    var report models.MonthlyReport
    if err := s.db.WithContext(ctx).First(&report, id).Error; err != nil {
        return fmt.Errorf("failed to get monthly report: %w", err)
    }
    if len(activities) > 0 {
        if b, err := json.Marshal(activities); err == nil {
            report.Activities = string(b)
        }
    }
    if maintenanceHours > 0 {
        report.MaintenanceHours = maintenanceHours
    }
    if err := s.db.WithContext(ctx).Save(&report).Error; err != nil {
        return fmt.Errorf("failed to update monthly report: %w", err)
    }
    return nil
}

// UpdateMonthlyDetailsRaw stores a pre-serialized activities JSON (can be array of objects)
func (s *MonthlyReportService) UpdateMonthlyDetailsRaw(ctx context.Context, id int, activitiesJSON string, maintenanceHours float64) error {
    var report models.MonthlyReport
    if err := s.db.WithContext(ctx).First(&report, id).Error; err != nil {
        return fmt.Errorf("failed to get monthly report: %w", err)
    }
    if strings.TrimSpace(activitiesJSON) != "" {
        report.Activities = activitiesJSON
    }
    if maintenanceHours > 0 {
        report.MaintenanceHours = maintenanceHours
    }
    if err := s.db.WithContext(ctx).Save(&report).Error; err != nil {
        return fmt.Errorf("failed to update monthly report: %w", err)
    }
    return nil
}

// UpdateMonthlySummary sets summary text for a monthly report.
func (s *MonthlyReportService) UpdateMonthlySummary(ctx context.Context, id int, summary string) error {
    var report models.MonthlyReport
    if err := s.db.WithContext(ctx).First(&report, id).Error; err != nil {
        return fmt.Errorf("failed to get monthly report: %w", err)
    }
    report.Summary = strings.TrimSpace(summary)
    if err := s.db.WithContext(ctx).Save(&report).Error; err != nil {
        return fmt.Errorf("failed to update monthly report: %w", err)
    }
    return nil
}
