package models

import "time"

// DailyReport stores per-service monitoring summary for a given date.
type DailyReport struct {
	ID               int       `json:"id" gorm:"primaryKey"`
	ReportDate       time.Time `json:"report_date" gorm:"index;type:date"`
	ServiceID        int       `json:"service_id" gorm:"index;not null"`
	UptimePercent    float64   `json:"uptime_percent"`
	AvgResponseMs    int       `json:"avg_response_ms"`
	DowntimeCount    int       `json:"downtime_count"`
	AlertsOpened     int       `json:"alerts_opened"`
	AlertsUnresolved int       `json:"alerts_unresolved"`
	CreatedAt        time.Time `json:"created_at" gorm:"autoCreateTime"`
}

func (DailyReport) TableName() string { return "daily_reports" }
