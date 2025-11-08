package services

import (
	"context"
	"os"
	"testing"
	"time"

	"freelance-monitor-system/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.PasswordReset{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func TestAuthService_RegisterAndLogin(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret")
	os.Setenv("JWT_TTL_SECONDS", "3600")
	db := newTestDB(t)
	svc := NewAuthService(db)

	// Register user
	u, err := svc.Register(context.Background(), "user@example.com", "password123")
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if u.ID == 0 {
		t.Fatalf("expected user ID assigned")
	}

	// Duplicate register should fail
	if _, err := svc.Register(context.Background(), "user@example.com", "other"); err == nil {
		t.Fatalf("expected duplicate email error")
	}

	// Login success
	token, exp, err := svc.Login(context.Background(), "user@example.com", "password123")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if token == "" {
		t.Fatalf("expected token")
	}
	if time.Until(exp) <= 0 {
		t.Fatalf("expected future expiration")
	}

	// Login failure: wrong password
	if _, _, err := svc.Login(context.Background(), "user@example.com", "wrong"); err == nil {
		t.Fatalf("expected invalid credentials error")
	}
}

func TestAuthService_ResetFlow(t *testing.T) {
	os.Setenv("JWT_SECRET", "test-secret")
	db := newTestDB(t)
	svc := NewAuthService(db)

	// Seed a user
	if _, err := svc.Register(context.Background(), "reset@example.com", "oldpass"); err != nil {
		t.Fatalf("register: %v", err)
	}

	// Request reset
	pr, err := svc.RequestPasswordReset(context.Background(), "reset@example.com", 5)
	if err != nil {
		t.Fatalf("request reset: %v", err)
	}
	if pr == nil || pr.Token == "" {
		t.Fatalf("expected reset record and token")
	}

	// Use token to reset
	if err := svc.ResetPassword(context.Background(), pr.Token, "newpass"); err != nil {
		t.Fatalf("reset password: %v", err)
	}

	// Old password should fail, new password succeeds
	if _, _, err := svc.Login(context.Background(), "reset@example.com", "oldpass"); err == nil {
		t.Fatalf("expected old password to fail after reset")
	}
	if _, _, err := svc.Login(context.Background(), "reset@example.com", "newpass"); err != nil {
		t.Fatalf("login with new password failed: %v", err)
	}
}

func TestAuthService_ResetTokenExpiry(t *testing.T) {
	db := newTestDB(t)
	svc := NewAuthService(db)
	if _, err := svc.Register(context.Background(), "exp@example.com", "pw"); err != nil {
		t.Fatalf("register: %v", err)
	}
	pr, err := svc.RequestPasswordReset(context.Background(), "exp@example.com", 0)
	if err != nil {
		t.Fatalf("request reset: %v", err)
	}
	// Manually expire
	db.Model(pr).Update("expires_at", time.Now().Add(-1*time.Minute))
	if err := svc.ResetPassword(context.Background(), pr.Token, "np"); err == nil {
		t.Fatalf("expected token expired error")
	}
}
