package services

import (
	"context"
	"errors"
	"time"

	"freelance-monitor-system/internal/models"
	"gorm.io/gorm"
)

type SLOService struct{ db *gorm.DB }

func NewSLOService(db *gorm.DB) *SLOService { return &SLOService{db: db} }

func (s *SLOService) ListByService(ctx context.Context, serviceID int) ([]models.SLOTarget, error) {
	var items []models.SLOTarget
	if err := s.db.WithContext(ctx).Where("service_id = ?", serviceID).Order("id DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *SLOService) Create(ctx context.Context, t *models.SLOTarget) error {
	return s.db.WithContext(ctx).Create(t).Error
}

func (s *SLOService) Update(ctx context.Context, id int, u *models.SLOTarget) (*models.SLOTarget, error) {
	var cur models.SLOTarget
	if err := s.db.WithContext(ctx).First(&cur, id).Error; err != nil {
		return nil, err
	}
	if u.Objective != "" {
		cur.Objective = u.Objective
	}
	if u.Target > 0 {
		cur.Target = u.Target
	}
	if u.WindowDays > 0 {
		cur.WindowDays = u.WindowDays
	}
	cur.IsPaused = u.IsPaused
	if err := s.db.WithContext(ctx).Save(&cur).Error; err != nil {
		return nil, err
	}
	return &cur, nil
}

func (s *SLOService) Delete(ctx context.Context, id int) error {
	return s.db.WithContext(ctx).Delete(&models.SLOTarget{}, id).Error
}

// EvaluateAvailability checks uptime in the window and returns achieved %.
func (s *SLOService) EvaluateAvailability(ctx context.Context, serviceID, windowDays int) (float64, error) {
	if windowDays <= 0 {
		return 0, errors.New("invalid window")
	}
	since := time.Now().Add(-time.Duration(windowDays) * 24 * time.Hour)
	var total int64
	if err := s.db.WithContext(ctx).Model(&models.UptimeLog{}).Where("service_id = ? AND checked_at >= ?", serviceID, since).Count(&total).Error; err != nil {
		return 0, err
	}
	if total == 0 {
		return 0, nil
	}
	var up int64
	if err := s.db.WithContext(ctx).Model(&models.UptimeLog{}).Where("service_id = ? AND checked_at >= ? AND status = ?", serviceID, since, "up").Count(&up).Error; err != nil {
		return 0, err
	}
	return (float64(up) / float64(total)) * 100.0, nil
}
