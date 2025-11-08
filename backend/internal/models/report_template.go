package models

import "time"

// ReportTemplate stores editable HTML (or JSON config) for client-side PDF rendering presets.
type ReportTemplate struct {
    ID        int       `json:"id" gorm:"primaryKey"`
    Name      string    `json:"name" gorm:"uniqueIndex;not null"`
    Kind      string    `json:"kind" gorm:"index;not null"` // e.g., "monthly"
    Content   string    `json:"content" gorm:"type:text"`
    UserID    int       `json:"user_id" gorm:"index"`
    CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
    UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

func (ReportTemplate) TableName() string { return "report_templates" }
