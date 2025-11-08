package models

import "time"

// SLOTarget defines a service-level objective for a service.
type SLOTarget struct {
	ID         int       `json:"id" gorm:"primaryKey"`
	ServiceID  int       `json:"service_id" gorm:"not null"`
	Objective  string    `json:"objective" gorm:"not null"` // availability|latency
	Target     float64   `json:"target" gorm:"not null"`    // e.g., 99.9 (availability%) or 300 (ms)
	WindowDays int       `json:"window_days" gorm:"default:30"`
	IsPaused   bool      `json:"is_paused" gorm:"default:false"`
	CreatedAt  time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt  time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (SLOTarget) TableName() string { return "slo_targets" }
