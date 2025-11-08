package services

import (
	"context"
	"freelance-monitor-system/internal/models"
	"gorm.io/gorm"
	"strings"
)

type ServiceService struct {
    db *gorm.DB
}

func NewServiceService(db *gorm.DB) *ServiceService {
	return &ServiceService{db: db}
}

func (s *ServiceService) ListServices() ([]models.Service, error) {
    var services []models.Service
    if err := s.db.Order("id DESC").Find(&services).Error; err != nil {
        return nil, err
    }
    return services, nil
}

func (s *ServiceService) ListServicesPaged(limit, offset int) ([]models.Service, error) {
    var services []models.Service
    q := s.db.Model(&models.Service{}).Order("id DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&services).Error; err != nil {
		return nil, err
	}
	return services, nil
}

func (s *ServiceService) CountServices(status string) (int64, error) {
    var total int64
    q := s.db.Model(&models.Service{})
    if status != "" {
        q = q.Where("status = ?", status)
    }
    if err := q.Count(&total).Error; err != nil {
        return 0, err
    }
    return total, nil
}

func (s *ServiceService) ListServicesWithFilters(limit, offset int, sortBy, order, status, domainLike string, clientID int) ([]models.Service, error) {
    var out []models.Service
    q := s.db.Model(&models.Service{})
    // user scoping is applied in handler layer
	if status != "" {
		q = q.Where("status = ?", status)
	}
	if domainLike != "" {
		q = q.Where("LOWER(domain) LIKE ?", "%"+strings.ToLower(domainLike)+"%")
	}
	if clientID > 0 {
		q = q.Where("client_id = ?", clientID)
	}
	if sortBy == "id" || sortBy == "domain" || sortBy == "created_at" || sortBy == "status" {
		if order != "desc" {
			order = "asc"
		}
		q = q.Order(sortBy + " " + order)
	} else {
		q = q.Order("id DESC")
	}
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&out).Error; err != nil {
		return nil, err
	}
	return out, nil
}

// User-scoped operations
func (s *ServiceService) CountServicesForUser(status string, userID int) (int64, error) {
    var total int64
    q := s.db.Model(&models.Service{})
    if userID > 0 { q = q.Where("user_id = ?", userID) } else { q = q.Where("user_id = 0") }
    if status != "" { q = q.Where("status = ?", status) }
    if err := q.Count(&total).Error; err != nil { return 0, err }
    return total, nil
}

func (s *ServiceService) ListServicesWithFiltersForUser(limit, offset int, sortBy, order, status, domainLike string, clientID, userID int) ([]models.Service, error) {
    var out []models.Service
    q := s.db.Model(&models.Service{})
    if userID > 0 { q = q.Where("user_id = ?", userID) } else { q = q.Where("user_id = 0") }
    if status != "" { q = q.Where("status = ?", status) }
    if domainLike != "" { q = q.Where("LOWER(domain) LIKE ?", "%"+strings.ToLower(domainLike)+"%") }
    if clientID > 0 { q = q.Where("client_id = ?", clientID) }
    if sortBy == "id" || sortBy == "domain" || sortBy == "created_at" || sortBy == "status" {
        if order != "desc" { order = "asc" }
        q = q.Order(sortBy + " " + order)
    } else {
        q = q.Order("id DESC")
    }
    if limit > 0 { q = q.Limit(limit) }
    if offset > 0 { q = q.Offset(offset) }
    if err := q.Find(&out).Error; err != nil { return nil, err }
    return out, nil
}

func (s *ServiceService) GetServiceByIDForUser(ctx context.Context, id int, userID int) (*models.Service, error) {
    var svc models.Service
    q := s.db.WithContext(ctx).Model(&models.Service{})
    if userID > 0 { q = q.Where("user_id = ?", userID) } else { q = q.Where("user_id = 0") }
    if err := q.First(&svc, id).Error; err != nil { return nil, err }
    return &svc, nil
}

func (s *ServiceService) UpdateServiceForUser(id int, updates *models.Service, userID int) (*models.Service, error) {
    var svc models.Service
    q := s.db.Model(&models.Service{})
    if userID > 0 { q = q.Where("user_id = ?", userID) } else { q = q.Where("user_id = 0") }
    if err := q.First(&svc, id).Error; err != nil { return nil, err }
    // apply updates
    if updates.Domain != "" { svc.Domain = updates.Domain }
    if updates.URL != "" { svc.URL = updates.URL }
    if updates.ServiceType != "" { svc.ServiceType = updates.ServiceType }
    if updates.Status != "" { svc.Status = updates.Status }
    if !updates.LastCheck.IsZero() { svc.LastCheck = updates.LastCheck }
    if !updates.SSLExpiry.IsZero() { svc.SSLExpiry = updates.SSLExpiry }
    if !updates.DomainExpiry.IsZero() { svc.DomainExpiry = updates.DomainExpiry }
    if err := s.db.Save(&svc).Error; err != nil { return nil, err }
    return &svc, nil
}

func (s *ServiceService) DeleteServiceForUser(id int, userID int) error {
    q := s.db.Model(&models.Service{})
    if userID > 0 { q = q.Where("user_id = ?", userID) } else { q = q.Where("user_id = 0") }
    res := q.Delete(&models.Service{}, id)
    if res.Error != nil { return res.Error }
    if res.RowsAffected == 0 { return gorm.ErrRecordNotFound }
    return nil
}

func (s *ServiceService) GetServiceByID(ctx context.Context, id int) (*models.Service, error) {
    var svc models.Service
    if err := s.db.WithContext(ctx).First(&svc, id).Error; err != nil {
        return nil, err
    }
    return &svc, nil
}

func (s *ServiceService) CreateService(svc *models.Service) error { return s.db.Create(svc).Error }

func (s *ServiceService) UpdateService(id int, updates *models.Service) (*models.Service, error) {
	var svc models.Service
	if err := s.db.First(&svc, id).Error; err != nil {
		return nil, err
	}
	if updates.Domain != "" {
		svc.Domain = updates.Domain
	}
	if updates.URL != "" {
		svc.URL = updates.URL
	}
	if updates.ServiceType != "" {
		svc.ServiceType = updates.ServiceType
	}
	if updates.Status != "" {
		svc.Status = updates.Status
	}
	if !updates.LastCheck.IsZero() {
		svc.LastCheck = updates.LastCheck
	}
	if !updates.SSLExpiry.IsZero() {
		svc.SSLExpiry = updates.SSLExpiry
	}
	if !updates.DomainExpiry.IsZero() {
		svc.DomainExpiry = updates.DomainExpiry
	}
	if err := s.db.Save(&svc).Error; err != nil {
		return nil, err
	}
	return &svc, nil
}

func (s *ServiceService) DeleteService(id int) error {
	res := s.db.Delete(&models.Service{}, id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
