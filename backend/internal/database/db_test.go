package database

import (
	"fmt"
	"os"
	"testing"

	"gorm.io/gorm"
)

func TestInitDBSqlite(t *testing.T) {
	os.Setenv("DB_DRIVER", "sqlite")
	t.Cleanup(func() { os.Unsetenv("DB_DRIVER") })
	if err := InitDB(); err != nil {
		t.Fatalf("InitDB sqlite failed: %v", err)
	}
	if DB == nil {
		t.Fatalf("DB should not be nil")
	}
}

func TestAutoMigrateGuard(t *testing.T) {
	old := DB
	DB = nil
	t.Cleanup(func() { DB = old })
	if err := AutoMigrate(); err == nil {
		t.Fatalf("expected error when DB not initialized")
	}
}

func TestInitDBOpenError(t *testing.T) {
	os.Setenv("DB_DRIVER", "sqlite")
	t.Cleanup(func() { os.Unsetenv("DB_DRIVER") })

	// Stub openGorm to return error
	old := openGorm
	openGorm = func(d gorm.Dialector, opts ...gorm.Option) (*gorm.DB, error) {
		return nil, fmt.Errorf("forced open error")
	}
	t.Cleanup(func() { openGorm = old })

	if err := InitDB(); err == nil {
		t.Fatalf("expected error from InitDB when open fails")
	}
}

func TestInitDBPostgresTestMode(t *testing.T) {
	os.Setenv("DB_DRIVER", "postgres_test")
	t.Cleanup(func() { os.Unsetenv("DB_DRIVER") })
	if err := InitDB(); err != nil {
		t.Fatalf("InitDB postgres_test failed: %v", err)
	}
	if DB == nil {
		t.Fatalf("DB should not be nil")
	}
}
