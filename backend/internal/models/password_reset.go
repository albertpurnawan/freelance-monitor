package models

import "time"

// PasswordReset stores a reset token for a user with expiry.
type PasswordReset struct {
	ID        int        `json:"id" gorm:"primaryKey"`
	UserID    int        `json:"user_id" gorm:"index;not null"`
	Token     string     `json:"token" gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time  `json:"expires_at" gorm:"index;not null"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time  `json:"created_at"`
}

func (PasswordReset) TableName() string { return "password_resets" }
