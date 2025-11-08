package services

import (
	"context"
	"time"

	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/monitoring"
	"gorm.io/gorm"
)

type AlertService struct{ db *gorm.DB }

func NewAlertService(db *gorm.DB) *AlertService { return &AlertService{db: db} }

// CreateUptimeAlert creates an alert for a down service.
func (s *AlertService) CreateUptimeAlert(ctx context.Context, r monitoring.Result) error {
	alert := models.Alert{
		ServiceID:  r.ServiceID,
		AlertType:  "uptime",
		Level:      "critical",
		Title:      "Service down",
		Message:    r.Error,
		SentVia:    "",
		IsResolved: false,
		CreatedAt:  time.Now(),
	}
	return s.db.WithContext(ctx).Create(&alert).Error
}

// ListByService lists alerts for a given service.
func (s *AlertService) ListByService(ctx context.Context, serviceID int) ([]models.Alert, error) {
	var alerts []models.Alert
	err := s.db.WithContext(ctx).Where("service_id = ?", serviceID).Order("created_at DESC").Find(&alerts).Error
	return alerts, err
}

func (s *AlertService) CountByService(ctx context.Context, serviceID int) (int64, error) {
	var total int64
	err := s.db.WithContext(ctx).Model(&models.Alert{}).Where("service_id = ?", serviceID).Count(&total).Error
	return total, err
}

// Service-specific unresolved alerts
func (s *AlertService) ListByServiceUnresolvedPaged(ctx context.Context, serviceID, limit, offset int) ([]models.Alert, error) {
	var alerts []models.Alert
	q := s.db.WithContext(ctx).Where("service_id = ? AND is_resolved = ?", serviceID, false).Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&alerts).Error; err != nil {
		return nil, err
	}
	return alerts, nil
}

func (s *AlertService) CountByServiceUnresolved(ctx context.Context, serviceID int) (int64, error) {
	var total int64
	err := s.db.WithContext(ctx).Model(&models.Alert{}).Where("service_id = ? AND is_resolved = ?", serviceID, false).Count(&total).Error
	return total, err
}

// Global unresolved alerts
func (s *AlertService) ListUnresolvedPaged(ctx context.Context, limit, offset int) ([]models.Alert, error) {
	var alerts []models.Alert
	q := s.db.WithContext(ctx).Where("is_resolved = ?", false).Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&alerts).Error; err != nil {
		return nil, err
	}
	return alerts, nil
}

func (s *AlertService) CountUnresolved(ctx context.Context) (int64, error) {
	var total int64
	err := s.db.WithContext(ctx).Model(&models.Alert{}).Where("is_resolved = ?", false).Count(&total).Error
	return total, err
}

func (s *AlertService) ListByServicePaged(ctx context.Context, serviceID, limit, offset int) ([]models.Alert, error) {
	var alerts []models.Alert
	q := s.db.WithContext(ctx).Where("service_id = ?", serviceID).Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&alerts).Error; err != nil {
		return nil, err
	}
	return alerts, nil
}

func (s *AlertService) MarkResolved(ctx context.Context, alertID int, resolvedAt *time.Time) error {
	return s.db.WithContext(ctx).Model(&models.Alert{}).Where("id = ?", alertID).Updates(map[string]interface{}{
		"is_resolved": true,
		"resolved_at": resolvedAt,
	}).Error
}

// ResolveActiveByServiceAndType marks all active alerts of a given type resolved for a service.
func (s *AlertService) ResolveActiveByServiceAndType(ctx context.Context, serviceID int, alertType string) error {
	now := time.Now()
	return s.db.WithContext(ctx).
		Model(&models.Alert{}).
		Where("service_id = ? AND alert_type = ? AND is_resolved = ?", serviceID, alertType, false).
		Updates(map[string]any{"is_resolved": true, "resolved_at": &now}).Error
}

// ExistsActiveAlert checks if an unresolved alert of a given type exists for a service.
func (s *AlertService) ExistsActiveAlert(ctx context.Context, serviceID int, alertType string) (bool, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Model(&models.Alert{}).
		Where("service_id = ? AND alert_type = ? AND is_resolved = ?", serviceID, alertType, false).
		Count(&count).Error
	return count > 0, err
}

// CreateExpiryAlert creates an alert for SSL/domain expiry with provided metadata.
func (s *AlertService) CreateExpiryAlert(ctx context.Context, serviceID int, alertType, title, message, level string) error {
	alert := models.Alert{
		ServiceID:  serviceID,
		AlertType:  alertType,
		Level:      level,
		Title:      title,
		Message:    message,
		SentVia:    "",
		IsResolved: false,
		CreatedAt:  time.Now(),
	}
	return s.db.WithContext(ctx).Create(&alert).Error
}
