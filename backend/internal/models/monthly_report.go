package models

import (
	"time"
)

// MonthlyReport aggregates daily reports into a monthly summary
type MonthlyReport struct {
    ID                int       `json:"id" gorm:"primaryKey"`
    ReportMonth       time.Time `json:"report_month" gorm:"index;type:date"`
    ServiceID         int       `json:"service_id" gorm:"index;not null"`
    UserID            int       `json:"user_id" gorm:"index"`
    AvgUptimePercent  float64   `json:"avg_uptime_percent"`
    AvgResponseMs     int       `json:"avg_response_ms"`
    TotalDowntime     int       `json:"total_downtime"`
    AlertsOpened      int       `json:"alerts_opened"`
    AlertsResolved    int       `json:"alerts_resolved"`
    MaintenanceHours  float64   `json:"maintenance_hours"`
    CreatedAt         time.Time `json:"created_at" gorm:"autoCreateTime"`
    Activities        string    `json:"activities" gorm:"type:text"` // JSON array of maintenance activities
    Summary           string    `json:"summary" gorm:"type:text"`
}

func (MonthlyReport) TableName() string { return "monthly_reports" }
