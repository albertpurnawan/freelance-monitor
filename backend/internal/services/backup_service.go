package services

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type BackupService struct{ db *gorm.DB }

func NewBackupService(db *gorm.DB) *BackupService { return &BackupService{db: db} }

// Stub interface: in real code, plug provider adapters.
func (b *BackupService) RunDatabaseBackup(ctx context.Context, serviceID int) error {
	// Record backup run to logs table or alerts; for MVP, no-op
	_ = serviceID
	_ = ctx
	time.Sleep(100 * time.Millisecond)
	return nil
}
