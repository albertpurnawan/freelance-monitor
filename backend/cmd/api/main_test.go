package main

import (
	"errors"
	"testing"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestBuildAppWithDB(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("sqlite: %v", err)
	}
	app, err := BuildAppWithDB(db)
	if err != nil {
		t.Fatalf("BuildAppWithDB: %v", err)
	}
	if app == nil || app.port == "" {
		t.Fatalf("app or port not set")
	}
}

func TestBuildAppWithDBInitError(t *testing.T) {
	// stub initDBFunc to force error
	oldInit := initDBFunc
	initDBFunc = func() error { return errors.New("init fail") }
	t.Cleanup(func() { initDBFunc = oldInit })

	_, err := BuildAppWithDB(nil)
	if err == nil {
		t.Fatalf("expected init error")
	}
}

func TestBuildAppWithDBMigrateError(t *testing.T) {
	oldInit := initDBFunc
	initDBFunc = func() error { return nil }
	t.Cleanup(func() { initDBFunc = oldInit })

	oldMig := autoMigrateFunc
	autoMigrateFunc = func(...interface{}) error { return errors.New("migrate fail") }
	t.Cleanup(func() { autoMigrateFunc = oldMig })

	_, err := BuildAppWithDB(nil)
	if err == nil {
		t.Fatalf("expected migrate error")
	}
}
