package models

import "time"

type Alert struct {
	ID         int        `json:"id" gorm:"primaryKey"`
	ServiceID  int        `json:"service_id" gorm:"index"`
	AlertType  string     `json:"alert_type" gorm:"not null"` // uptime, ssl_expiry, domain_expiry
	Level      string     `json:"level" gorm:"not null"`      // info, warning, critical
	Title      string     `json:"title" gorm:"not null"`
	Message    string     `json:"message"`
	SentVia    string     `json:"sent_via"` // telegram, email, both
	IsResolved bool       `json:"is_resolved" gorm:"default:false"`
	CreatedAt  time.Time  `json:"created_at" gorm:"autoCreateTime"`
	ResolvedAt *time.Time `json:"resolved_at"`
}

func (Alert) TableName() string { return "alerts" }
