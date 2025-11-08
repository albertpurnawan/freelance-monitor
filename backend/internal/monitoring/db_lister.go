package monitoring

import (
	"context"
	"time"

	"freelance-monitor-system/internal/models"
	"gorm.io/gorm"
)

// DBLister lists active services from the database.
type DBLister struct {
	db *gorm.DB
}

func NewDBLister(db *gorm.DB) *DBLister { return &DBLister{db: db} }

func (l *DBLister) ListActiveServices(ctx context.Context) ([]ServiceInfo, error) {
	var svcs []models.Service
	if err := l.db.WithContext(ctx).Where("status = ?", "active").Find(&svcs).Error; err != nil {
		return nil, err
	}
	out := make([]ServiceInfo, 0, len(svcs))
	for _, s := range svcs {
		url := s.URL
		if url == "" && s.Domain != "" {
			url = "https://" + s.Domain
		}
		sslExp := (*time.Time)(nil)
		if !s.SSLExpiry.IsZero() {
			t := s.SSLExpiry
			sslExp = &t
		}
		domExp := (*time.Time)(nil)
		if !s.DomainExpiry.IsZero() {
			t := s.DomainExpiry
			domExp = &t
		}
		out = append(out, ServiceInfo{ID: s.ID, URL: url, ServiceType: s.ServiceType, SSLExpiry: sslExp, DomainExpiry: domExp})
	}
	return out, nil
}
