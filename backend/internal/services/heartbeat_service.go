package services

import (
	"context"
	"strconv"
	"time"

	"freelance-monitor-system/internal/models"
	"gorm.io/gorm"
)

type HeartbeatService struct{ db *gorm.DB }

func NewHeartbeatService(db *gorm.DB) *HeartbeatService { return &HeartbeatService{db: db} }

func (s *HeartbeatService) ListByServicePaged(ctx context.Context, serviceID, limit, offset int) ([]models.HeartbeatJob, error) {
	var items []models.HeartbeatJob
	q := s.db.WithContext(ctx).Where("service_id = ?", serviceID).Order("id DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *HeartbeatService) CountByService(ctx context.Context, serviceID int) (int64, error) {
	var total int64
	err := s.db.WithContext(ctx).Model(&models.HeartbeatJob{}).Where("service_id = ?", serviceID).Count(&total).Error
	return total, err
}

func (s *HeartbeatService) Create(ctx context.Context, hb *models.HeartbeatJob) error {
	if hb.Token == "" {
		hb.Token = generateToken()
	}
	return s.db.WithContext(ctx).Create(hb).Error
}

func (s *HeartbeatService) Update(ctx context.Context, id int, updates *models.HeartbeatJob) (*models.HeartbeatJob, error) {
	var cur models.HeartbeatJob
	if err := s.db.WithContext(ctx).First(&cur, id).Error; err != nil {
		return nil, err
	}
	// Only allow safe fields to be updated
	cur.Name = updates.Name
	if updates.ExpectedIntervalSeconds > 0 {
		cur.ExpectedIntervalSeconds = updates.ExpectedIntervalSeconds
	}
	if updates.GraceSeconds > 0 {
		cur.GraceSeconds = updates.GraceSeconds
	}
	cur.IsPaused = updates.IsPaused
	if updates.LastHeartbeatAt != nil {
		cur.LastHeartbeatAt = updates.LastHeartbeatAt
	}
	if err := s.db.WithContext(ctx).Save(&cur).Error; err != nil {
		return nil, err
	}
	return &cur, nil
}

func (s *HeartbeatService) Delete(ctx context.Context, id int) error {
	return s.db.WithContext(ctx).Delete(&models.HeartbeatJob{}, id).Error
}

func (s *HeartbeatService) Ping(ctx context.Context, id int) error {
	now := time.Now()
	// update last heartbeat
	if err := s.db.WithContext(ctx).Model(&models.HeartbeatJob{}).Where("id = ?", id).Update("last_heartbeat_at", now).Error; err != nil {
		return err
	}
	// Optional: resolve outstanding heartbeat alerts for this service
	var hb models.HeartbeatJob
	if err := s.db.WithContext(ctx).First(&hb, id).Error; err == nil {
		_ = NewAlertService(s.db).ResolveActiveByServiceAndType(ctx, hb.ServiceID, "heartbeat_missed")
	}
	return nil
}

func (s *HeartbeatService) PingByToken(ctx context.Context, token string) error {
	var hb models.HeartbeatJob
	if err := s.db.WithContext(ctx).Where("token = ?", token).First(&hb).Error; err != nil {
		return err
	}
	now := time.Now()
	if err := s.db.WithContext(ctx).Model(&models.HeartbeatJob{}).Where("id = ?", hb.ID).Update("last_heartbeat_at", now).Error; err != nil {
		return err
	}
	_ = NewAlertService(s.db).ResolveActiveByServiceAndType(ctx, hb.ServiceID, "heartbeat_missed")
	return nil
}

func (s *HeartbeatService) RotateToken(ctx context.Context, id int) (string, error) {
	tok := generateToken()
	if err := s.db.WithContext(ctx).Model(&models.HeartbeatJob{}).Where("id = ?", id).Update("token", tok).Error; err != nil {
		return "", err
	}
	return tok, nil
}

func generateToken() string { return strconv.FormatInt(time.Now().UnixNano(), 36) }
