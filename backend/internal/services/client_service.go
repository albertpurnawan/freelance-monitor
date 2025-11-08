package services

import (
	"context"
	"freelance-monitor-system/internal/models"
	"gorm.io/gorm"
	"strings"
)

// ClientService encapsulates client-related business logic.
type ClientService struct {
	db *gorm.DB
}

func NewClientService(db *gorm.DB) *ClientService {
	return &ClientService{db: db}
}

func (s *ClientService) GetAllClients() ([]models.Client, error) {
	var clients []models.Client
	if err := s.db.Find(&clients).Error; err != nil {
		return nil, err
	}
	return clients, nil
}

func (s *ClientService) GetClientsPaged(limit, offset int) ([]models.Client, error) {
	var clients []models.Client
	q := s.db.Model(&models.Client{})
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&clients).Error; err != nil {
		return nil, err
	}
	return clients, nil
}

func (s *ClientService) CountClients(nameLike string) (int64, error) {
	var total int64
	q := s.db.Model(&models.Client{})
	if nameLike != "" {
		q = q.Where("LOWER(name) LIKE ?", "%"+strings.ToLower(nameLike)+"%")
	}
	if err := q.Count(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

func (s *ClientService) GetClientsPagedWithFilters(limit, offset int, sortBy, order, nameLike string) ([]models.Client, error) {
	var clients []models.Client
	q := s.db.Model(&models.Client{})
	if nameLike != "" {
		q = q.Where("LOWER(name) LIKE ?", "%"+strings.ToLower(nameLike)+"%")
	}
	if sortBy == "name" || sortBy == "created_at" || sortBy == "id" {
		if order != "desc" {
			order = "asc"
		}
		q = q.Order(sortBy + " " + order)
	}
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	if err := q.Find(&clients).Error; err != nil {
		return nil, err
	}
	return clients, nil
}

func (s *ClientService) GetClientByID(ctx context.Context, id int) (*models.Client, error) {
	var client models.Client
	if err := s.db.WithContext(ctx).First(&client, id).Error; err != nil {
		return nil, err
	}
	return &client, nil
}

func (s *ClientService) CreateClient(client *models.Client) error {
	return s.db.Create(client).Error
}

func (s *ClientService) UpdateClient(id int, updates *models.Client) (*models.Client, error) {
	var client models.Client
	if err := s.db.First(&client, id).Error; err != nil {
		return nil, err
	}
	client.Name = updates.Name
	client.ContactPerson = updates.ContactPerson
	client.Email = updates.Email
	client.Phone = updates.Phone
	client.Address = updates.Address
	if err := s.db.Save(&client).Error; err != nil {
		return nil, err
	}
	return &client, nil
}

func (s *ClientService) DeleteClient(id int) error {
	res := s.db.Delete(&models.Client{}, id)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
