package models

import "time"

type HeartbeatJob struct {
	ID                      int        `json:"id" gorm:"primaryKey"`
	ServiceID               int        `json:"service_id" gorm:"not null"`
	Name                    string     `json:"name" gorm:"not null"`
	ExpectedIntervalSeconds int        `json:"expected_interval_seconds" gorm:"not null"`
	GraceSeconds            int        `json:"grace_seconds" gorm:"default:60"`
	Token                   string     `json:"token" gorm:"size:64"`
	LastHeartbeatAt         *time.Time `json:"last_heartbeat_at"`
	IsPaused                bool       `json:"is_paused" gorm:"default:false"`
	CreatedAt               time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt               time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

func (HeartbeatJob) TableName() string { return "heartbeat_jobs" }
