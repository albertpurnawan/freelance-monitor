package database

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

// openGorm allows tests to stub gorm.Open.
var openGorm = func(dialector gorm.Dialector, opts ...gorm.Option) (*gorm.DB, error) {
	return gorm.Open(dialector, opts...)
}

func InitDB() error {
	var err error

	driver := os.Getenv("DB_DRIVER")
	if driver == "sqlite" {
		DB, err = openGorm(sqlite.Open(":memory:"))
		if err != nil {
			return err
		}
		log.Println("SQLite in-memory database initialized")
		return nil
	}

	sslmode := os.Getenv("DB_SSLMODE")
	if sslmode == "" {
		sslmode = "disable"
	}
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		sslmode,
	)

	if driver == "postgres_test" {
		// Exercise postgres path in tests without making a network connection
		DB, err = openGorm(sqlite.Open(":memory:"))
		if err != nil {
			return err
		}
		log.Println("Postgres test mode: using sqlite in-memory")
		return nil
	}

	DB, err = openGorm(postgres.Open(dsn))
	if err != nil {
		return err
	}

	log.Println("Postgres database connected successfully")
	return nil
}

// AutoMigrate runs schema migrations for provided models.
func AutoMigrate(models ...interface{}) error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}
	return DB.AutoMigrate(models...)
}
