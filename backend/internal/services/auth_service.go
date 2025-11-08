package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"freelance-monitor-system/internal/models"
)

type AuthService struct {
	db *gorm.DB
}

func NewAuthService(db *gorm.DB) *AuthService { return &AuthService{db: db} }

func (s *AuthService) hashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (s *AuthService) checkPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

func (s *AuthService) Register(ctx context.Context, email, password string) (*models.User, error) {
	if email == "" || password == "" {
		return nil, errors.New("email and password required")
	}
	// unique email
	var existing models.User
	if err := s.db.WithContext(ctx).Where("email = ?", email).First(&existing).Error; err == nil {
		return nil, errors.New("email already registered")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}
	hash, err := s.hashPassword(password)
	if err != nil {
		return nil, err
	}
	u := models.User{Email: email, PasswordHash: hash, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	if err := s.db.WithContext(ctx).Create(&u).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (string, time.Time, error) {
	var u models.User
	if err := s.db.WithContext(ctx).Where("email = ?", email).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", time.Time{}, errors.New("invalid credentials")
		}
		return "", time.Time{}, err
	}
	if !s.checkPassword(u.PasswordHash, password) {
		return "", time.Time{}, errors.New("invalid credentials")
	}
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", time.Time{}, errors.New("JWT_SECRET not set")
	}
    ttlStr := os.Getenv("JWT_TTL_SECONDS")
    // Default to 1 day (86400 seconds)
    ttl := 86400
    if ttlStr != "" {
        if v, err := time.ParseDuration(ttlStr + "s"); err == nil {
            ttl = int(v.Seconds())
        }
    }
	now := time.Now()
	exp := now.Add(time.Duration(ttl) * time.Second)
	claims := jwt.MapClaims{
		"sub":   u.ID,
		"email": u.Email,
		"iat":   now.Unix(),
		"exp":   exp.Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	sgn, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", time.Time{}, err
	}
	return sgn, exp, nil
}

func (s *AuthService) RequestPasswordReset(ctx context.Context, email string, ttlMinutes int) (*models.PasswordReset, error) {
	var u models.User
	if err := s.db.WithContext(ctx).Where("email = ?", email).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Do not reveal existence; create a fake delay
			time.Sleep(200 * time.Millisecond)
			return nil, nil
		}
		return nil, err
	}
	// generate token
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return nil, err
	}
	token := hex.EncodeToString(buf)
	pr := models.PasswordReset{
		UserID:    u.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(time.Duration(ttlMinutes) * time.Minute),
		CreatedAt: time.Now(),
	}
	if err := s.db.WithContext(ctx).Create(&pr).Error; err != nil {
		return nil, err
	}
	return &pr, nil
}

func (s *AuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	if token == "" || newPassword == "" {
		return errors.New("token and new_password required")
	}
	var pr models.PasswordReset
	if err := s.db.WithContext(ctx).Where("token = ? AND used_at IS NULL", token).First(&pr).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("invalid token")
		}
		return err
	}
	if time.Now().After(pr.ExpiresAt) {
		return errors.New("token expired")
	}
	var u models.User
	if err := s.db.WithContext(ctx).First(&u, pr.UserID).Error; err != nil {
		return err
	}
	hash, err := s.hashPassword(newPassword)
	if err != nil {
		return err
	}
	if err := s.db.WithContext(ctx).Model(&u).Update("password_hash", hash).Error; err != nil {
		return err
	}
	now := time.Now()
	if err := s.db.WithContext(ctx).Model(&pr).Update("used_at", &now).Error; err != nil {
		return err
	}
	return nil
}

// GetUserByID returns the user by ID.
func (s *AuthService) GetUserByID(ctx context.Context, id int) (*models.User, error) {
	var u models.User
	if err := s.db.WithContext(ctx).First(&u, id).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

// GenerateCSRFToken returns a random token suitable for CSRF header/cookie pairing.
func GenerateCSRFToken() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}

// UpdateEmail updates the user's email if unique.
func (s *AuthService) UpdateEmail(ctx context.Context, id int, email string) (*models.User, error) {
	if email == "" {
		return nil, errors.New("email required")
	}
	// Ensure uniqueness
	var count int64
	if err := s.db.WithContext(ctx).Model(&models.User{}).Where("email = ? AND id <> ?", email, id).Count(&count).Error; err != nil {
		return nil, err
	}
	if count > 0 {
		return nil, errors.New("email already in use")
	}
	var u models.User
	if err := s.db.WithContext(ctx).First(&u, id).Error; err != nil {
		return nil, err
	}
	u.Email = email
	u.UpdatedAt = time.Now()
	if err := s.db.WithContext(ctx).Save(&u).Error; err != nil {
		return nil, err
	}
	return &u, nil
}

// UpdateAvatarURL sets the avatar URL for the user.
func (s *AuthService) UpdateAvatarURL(ctx context.Context, id int, url string) (*models.User, error) {
	var u models.User
	if err := s.db.WithContext(ctx).First(&u, id).Error; err != nil {
		return nil, err
	}
	u.AvatarURL = url
	u.UpdatedAt = time.Now()
	if err := s.db.WithContext(ctx).Save(&u).Error; err != nil {
		return nil, err
	}
	return &u, nil
}
