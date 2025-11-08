package main

import (
	"context"
	"log"
	"os"
	"time"

	"freelance-monitor-system/internal/database"
	"freelance-monitor-system/internal/handlers"
	"freelance-monitor-system/internal/jobs"
	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/monitoring"
	"freelance-monitor-system/internal/scheduler"
	"freelance-monitor-system/internal/server"
	"freelance-monitor-system/internal/services"
	"gorm.io/gorm"
)

// BuildAppWithDB constructs the Gin engine and returns it with port.
// If db is nil, it initializes using the configured Postgres settings.
// allow test stubbing of database.InitDB and AutoMigrate
var initDBFunc = database.InitDB
var autoMigrateFunc = database.AutoMigrate

func BuildAppWithDB(db *gorm.DB) (*serverEngineWrapper, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	if db == nil {
		if err := initDBFunc(); err != nil {
			return nil, err
		}
	} else {
		database.DB = db
	}

    if err := autoMigrateFunc(&models.Client{}, &models.Service{}, &models.Offer{}, &models.UptimeLog{}, &models.Alert{}, &models.User{}, &models.PasswordReset{}, &models.MonthlyReport{}, &models.DailyReport{}, &models.HeartbeatJob{}, &models.SLOTarget{}, &models.ReportTemplate{}); err != nil {
        return nil, err
    }

	clientService := services.NewClientService(database.DB)
	offerService := services.NewOfferService(database.DB)
	svcService := services.NewServiceService(database.DB)
    monthlyReportService := services.NewMonthlyReportService(database.DB)

	clientHandler := handlers.NewClientHandler(clientService)
	offerHandler := handlers.NewOfferHandler(offerService)
	serviceHandler := handlers.NewServiceHandler(svcService)
    monthlyReportHandler := handlers.NewMonthlyReportHandler(monthlyReportService, clientService, svcService)
    r := server.NewServer(clientHandler, offerHandler, serviceHandler, monthlyReportHandler)

	// Initialize scheduler and register periodic jobs
	go func() {
		ctx := context.Background()
		s := scheduler.NewScheduler(ctx)
		scheduler.SetDefault(s)
		jr := jobs.NewJobRunner(database.DB)

		// Regular monitoring sweep every 30s
		s.Register("monitoring_sweep", 30*time.Second, true, jr.RunMonitoring)

		// Expiry refresh daily
		s.Register("refresh_expiries", 24*time.Hour, true, jr.RefreshExpiries)

		// Daily aggregation shortly after midnight
		s.Register("daily_report", 24*time.Hour, true, func(c context.Context) error {
			// align to local midnight before first run
			now := time.Now()
			next := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 1, 0, 0, now.Location())
			time.Sleep(time.Until(next))
			return jr.GenerateDailyReport(c)
		})

		// Background expiry warning evaluation every hour
		s.Register("expiry_warnings", time.Hour, true, func(c context.Context) error {
			lister := monitoring.NewDBLister(database.DB)
			alertSvc := services.NewAlertService(database.DB)
			svcInfos, _ := lister.ListActiveServices(c)
			for _, si := range svcInfos {
				if si.SSLExpiry != nil && time.Until(*si.SSLExpiry) <= 30*24*time.Hour {
					exists, _ := alertSvc.ExistsActiveAlert(c, si.ID, "ssl_expiry")
					if !exists {
						_ = alertSvc.CreateExpiryAlert(c, si.ID, "ssl_expiry", "SSL Certificate Expiring Soon", "SSL expires on "+si.SSLExpiry.Format("2006-01-02"), "warning")
					}
				}
				if si.DomainExpiry != nil && time.Until(*si.DomainExpiry) <= 30*24*time.Hour {
					exists, _ := alertSvc.ExistsActiveAlert(c, si.ID, "domain_expiry")
					if !exists {
						_ = alertSvc.CreateExpiryAlert(c, si.ID, "domain_expiry", "Domain Expiring Soon", "Domain expires on "+si.DomainExpiry.Format("2006-01-02"), "warning")
					}
				}
			}
			return nil
		})

		// Nightly backups
		s.Register("backups", 24*time.Hour, true, jr.RunBackups)

		// Offer expiry reminders daily at 09:00 local time
		s.Register("offer_reminders", 24*time.Hour, true, func(c context.Context) error {
			// align first run to 09:00 today or tomorrow if past
			now := time.Now()
			first := time.Date(now.Year(), now.Month(), now.Day(), 9, 0, 0, 0, now.Location())
			if now.After(first) {
				first = first.Add(24 * time.Hour)
			}
			time.Sleep(time.Until(first))
			return jr.SendOfferReminders(c)
		})

		// Missed heartbeat detection every 2 minutes
		s.Register("heartbeat_check", 2*time.Minute, true, jr.CheckHeartbeats)
	}()

	return &serverEngineWrapper{engine: r, port: port}, nil
}

type serverEngineWrapper struct {
	engine interface{ Run(...string) error }
	port   string
}

// results can be consumed later to persist logs or trigger notifications

func main() {
	app, err := BuildAppWithDB(nil)
	if err != nil {
		log.Fatalf("app build failed: %v", err)
	}
	log.Printf("Starting server on :%s", app.port)
	if err := app.engine.Run(":" + app.port); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}
