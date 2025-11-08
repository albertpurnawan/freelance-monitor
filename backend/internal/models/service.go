package models

import (
	"time"
)

type Service struct {
    ID           int       `json:"id" gorm:"primaryKey"`
    UserID       int       `json:"user_id" gorm:"index"`
    ClientID     int       `json:"client_id" gorm:"not null"`
    Domain       string    `json:"domain" gorm:"not null"`
    URL          string    `json:"url"`
    ServiceType  string    `json:"service_type" gorm:"not null"`
	Status       string    `json:"status" gorm:"default:'active'"`
	LastCheck    time.Time `json:"last_check"`
	SSLExpiry    time.Time `json:"ssl_expiry"`
	DomainExpiry time.Time `json:"domain_expiry"`
	CreatedAt    time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Service) TableName() string {
	return "services"
}
