package models

import "time"

type UptimeLog struct {
	ID           int       `json:"id" gorm:"primaryKey"`
	ServiceID    int       `json:"service_id" gorm:"index;not null"`
	Status       string    `json:"status" gorm:"not null"` // up, down
	ResponseTime int       `json:"response_time"`          // ms
	StatusCode   int       `json:"status_code"`
	ErrorMessage string    `json:"error_message"`
	CheckedAt    time.Time `json:"checked_at"`
}

func (UptimeLog) TableName() string { return "uptime_logs" }
