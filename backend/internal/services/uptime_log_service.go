package services

import (
	"context"

	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/monitoring"
	"gorm.io/gorm"
)

type UptimeLogService struct {
	db *gorm.DB
}

func NewUptimeLogService(db *gorm.DB) *UptimeLogService { return &UptimeLogService{db: db} }

func (s *UptimeLogService) SaveResult(ctx context.Context, r monitoring.Result) error {
	log := models.UptimeLog{
		ServiceID:    r.ServiceID,
		Status:       map[bool]string{true: "up", false: "down"}[r.OK],
		ResponseTime: int(r.Latency.Milliseconds()),
		StatusCode:   r.StatusCode,
		ErrorMessage: r.Error,
		CheckedAt:    r.CheckedAt,
	}
	return s.db.WithContext(ctx).Create(&log).Error
}

func (s *UptimeLogService) ListByService(ctx context.Context, serviceID int) ([]models.UptimeLog, error) {
	var logs []models.UptimeLog
	err := s.db.WithContext(ctx).Where("service_id = ?", serviceID).Order("checked_at DESC").Find(&logs).Error
	return logs, err
}

func (s *UptimeLogService) ListByServicePaged(ctx context.Context, serviceID, limit, offset int) ([]models.UptimeLog, error) {
	var logs []models.UptimeLog
	q := s.db.WithContext(ctx).Where("service_id = ?", serviceID).Order("checked_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	err := q.Find(&logs).Error
	return logs, err
}
func (s *UptimeLogService) CountByService(ctx context.Context, serviceID int) (int64, error) {
	var total int64
	err := s.db.WithContext(ctx).Model(&models.UptimeLog{}).Where("service_id = ?", serviceID).Count(&total).Error
	return total, err
}
