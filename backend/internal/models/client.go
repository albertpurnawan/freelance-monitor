package models

import (
	"time"
)

type Client struct {
	ID            int       `json:"id" gorm:"primaryKey"`
	Name          string    `json:"name" gorm:"not null"`
	ContactPerson string    `json:"contact_person"`
	Email         string    `json:"email"`
	Phone         string    `json:"phone"`
	Address       string    `json:"address"`
	CreatedAt     time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (Client) TableName() string {
	return "clients"
}
