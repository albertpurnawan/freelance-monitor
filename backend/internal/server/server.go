package server

import (
	_ "embed"
	"io"
	"log"
	"net/http"
	"os"

	"freelance-monitor-system/internal/database"
	"freelance-monitor-system/internal/docs"
	"freelance-monitor-system/internal/handlers"
	"freelance-monitor-system/internal/server/middleware"
	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
)

// NewServer constructs the Gin engine and registers routes.
// Handlers are provided via parameters to allow dependency injection.
func NewServer(clientHandler *handlers.ClientHandler, offerHandler *handlers.OfferHandler, serviceHandler *handlers.ServiceHandler, monthlyHandler *handlers.MonthlyReportHandler) *gin.Engine {
	// Configure logging to file + stdout
	logFile := os.Getenv("LOG_FILE")
	if logFile == "" {
		logFile = "/app/backend.log"
		if _, err := os.Stat("/app"); os.IsNotExist(err) {
			logFile = "backend.log"
		}
	}
	f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err == nil {
		gin.DisableConsoleColor()
		mw := io.MultiWriter(os.Stdout, f)
		gin.DefaultWriter = mw
		gin.DefaultErrorWriter = mw
		log.SetOutput(mw)
	}

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.RateLimitFromEnv())
	r.Static("/static", "static")

	// Health check endpoint
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// OpenAPI doc route
	r.GET("/api/docs", func(c *gin.Context) {
		c.Header("Content-Type", "application/yaml")
		c.String(200, string(docs.OpenAPI))
	})

	// Swagger UI route (serves embedded HTML)
	r.GET("/api/docs/ui", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		c.String(http.StatusOK, string(docs.SwaggerUI))
	})

	// Serve static PDFs (already mounted above)

	// Client routes
	api := r.Group("/api")
	{
		// Dev-only token issuance (consider guarding behind env flag)
		api.POST("/auth/token", handlers.DevTokenHandler)

		// Auth routes
		authSvc := services.NewAuthService(database.DB)
		authHandler := handlers.NewAuthHandler(authSvc)
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)
		api.POST("/auth/reset/request", authHandler.RequestReset)
		api.POST("/auth/reset/confirm", authHandler.ResetPassword)
		api.POST("/auth/logout", authHandler.Logout)
		api.GET("/me", middleware.AuthMiddleware(), authHandler.Me)
		api.PUT("/me/email", middleware.AuthMiddleware(), authHandler.UpdateEmail)
		api.PUT("/me/avatar", middleware.AuthMiddleware(), authHandler.UpdateAvatar)
		api.GET("/clients", clientHandler.GetClients)
		api.GET("/clients/:id", clientHandler.GetClient)
		useAuth := os.Getenv("DEV_ALLOW_UNAUTH") != "true"
		if useAuth {
			api.POST("/clients", middleware.AuthMiddleware(), clientHandler.CreateClient)
			api.PUT("/clients/:id", middleware.AuthMiddleware(), clientHandler.UpdateClient)
			api.DELETE("/clients/:id", middleware.AuthMiddleware(), clientHandler.DeleteClient)
		} else {
			api.POST("/clients", clientHandler.CreateClient)
			api.PUT("/clients/:id", clientHandler.UpdateClient)
			api.DELETE("/clients/:id", clientHandler.DeleteClient)
		}

		// Offer routes
		api.GET("/offers", offerHandler.ListOffers)
		api.GET("/offers/:id", offerHandler.GetOffer)
		api.GET("/offers/:id/pdf", offerHandler.ViewPDF)
		if useAuth {
			api.POST("/offers", middleware.AuthMiddleware(), offerHandler.CreateOffer)
			api.PUT("/offers/:id", middleware.AuthMiddleware(), offerHandler.UpdateOffer)
			api.DELETE("/offers/:id", middleware.AuthMiddleware(), offerHandler.DeleteOffer)
			api.POST("/offers/:id/generate-pdf", middleware.AuthMiddleware(), offerHandler.GeneratePDF)
			api.POST("/offers/:id/approve", middleware.AuthMiddleware(), offerHandler.Approve)
			api.POST("/offers/:id/upload-signed", middleware.AuthMiddleware(), offerHandler.UploadSigned)
		} else {
			api.POST("/offers", offerHandler.CreateOffer)
			api.PUT("/offers/:id", offerHandler.UpdateOffer)
			api.DELETE("/offers/:id", offerHandler.DeleteOffer)
			api.POST("/offers/:id/generate-pdf", offerHandler.GeneratePDF)
			api.POST("/offers/:id/approve", offerHandler.Approve)
			api.POST("/offers/:id/upload-signed", offerHandler.UploadSigned)
		}

		// Service routes
		api.GET("/services", serviceHandler.ListServices)
		api.GET("/services/:id", serviceHandler.GetService)
		if useAuth {
            api.POST("/services", middleware.AuthMiddleware(), serviceHandler.CreateService)
            api.PUT("/services/:id", middleware.AuthMiddleware(), serviceHandler.UpdateService)
            api.DELETE("/services/:id", middleware.AuthMiddleware(), serviceHandler.DeleteService)
            api.POST("/services/:id/check", middleware.AuthMiddleware(), handlers.NewServiceCheckHandler().CheckNow)
		} else {
            api.POST("/services", serviceHandler.CreateService)
            api.PUT("/services/:id", serviceHandler.UpdateService)
            api.DELETE("/services/:id", serviceHandler.DeleteService)
            api.POST("/services/:id/check", handlers.NewServiceCheckHandler().CheckNow)
		}

		// Logs
		// Log handler is lightweight; construct it here using service to avoid expanding signature
		// In a larger app, consider injecting it like others.
		logSvc := services.NewUptimeLogService(database.DB)
		logHandler := handlers.NewLogHandler(logSvc)
		api.GET("/services/:id/logs", logHandler.ListLogs)

		// Frontend error logging endpoint
		errLogHandler := handlers.NewErrorLogHandler()
		api.POST("/logs/error", errLogHandler.Capture)

		// Alerts
		alertSvc := services.NewAlertService(database.DB)
		alertHandler := handlers.NewAlertHandler(alertSvc)
		api.GET("/services/:id/alerts", alertHandler.ListAlerts)
		api.GET("/alerts", alertHandler.ListAlerts)
		if useAuth {
			api.POST("/alerts/:id/resolve", middleware.AuthMiddleware(), alertHandler.ResolveAlert)
		} else {
			api.POST("/alerts/:id/resolve", alertHandler.ResolveAlert)
		}

		// Reports
		reportSvc := services.NewReportService(database.DB)
		reportHandler := handlers.NewReportHandler(reportSvc)
		if useAuth {
			api.POST("/reports/daily", middleware.AuthMiddleware(), reportHandler.GenerateDaily)
		} else {
			api.POST("/reports/daily", reportHandler.GenerateDaily)
		}
		reportReadHandler := handlers.NewReportReadHandler(database.DB)
		api.GET("/reports/daily", reportReadHandler.ListDaily)
        if useAuth {
            api.POST("/reports/monthly", middleware.AuthMiddleware(), monthlyHandler.GenerateMonthlyReportFromBody)
            api.GET("/services/:id/reports/monthly", middleware.AuthMiddleware(), monthlyHandler.ListMonthlyReports)
            api.GET("/reports/monthly/:id", middleware.AuthMiddleware(), monthlyHandler.GetMonthlyReport)
        } else {
            api.POST("/reports/monthly", monthlyHandler.GenerateMonthlyReportFromBody)
            api.GET("/services/:id/reports/monthly", monthlyHandler.ListMonthlyReports)
            api.GET("/reports/monthly/:id", monthlyHandler.GetMonthlyReport)
        }
        // Removed backend monthly PDF generation; client-side PDF rendering used
		if useAuth {
			api.POST("/services/:id/reports/monthly", middleware.AuthMiddleware(), monthlyHandler.GenerateMonthlyReport)
		} else {
			api.POST("/services/:id/reports/monthly", monthlyHandler.GenerateMonthlyReport)
		}

		// Scheduler (automation) endpoints
		schedHandler := handlers.NewSchedulerHandler()
		api.GET("/automation/tasks", schedHandler.List)
		api.POST("/automation/tasks/:name/run", schedHandler.Run)

		// Heartbeats endpoints
		hbHandler := handlers.NewHeartbeatHandler(services.NewHeartbeatService(database.DB))
		api.GET("/heartbeats", hbHandler.List)
		if useAuth {
			api.POST("/heartbeats", middleware.AuthMiddleware(), hbHandler.Create)
			api.PUT("/heartbeats/:id", middleware.AuthMiddleware(), hbHandler.Update)
			api.DELETE("/heartbeats/:id", middleware.AuthMiddleware(), hbHandler.Delete)
			api.POST("/heartbeats/:id/ping", hbHandler.Ping) // allow pings unauth for agents
			api.POST("/heartbeats/:id/rotate-token", middleware.AuthMiddleware(), hbHandler.RotateToken)
		} else {
			api.POST("/heartbeats", hbHandler.Create)
			api.PUT("/heartbeats/:id", hbHandler.Update)
			api.DELETE("/heartbeats/:id", hbHandler.Delete)
			api.POST("/heartbeats/:id/ping", hbHandler.Ping)
			api.POST("/heartbeats/:id/rotate-token", hbHandler.RotateToken)
		}
		// token-based ping (public)
		api.POST("/heartbeats/ping/:token", hbHandler.PingByToken)

        // SLO endpoints
        sloHandler := handlers.NewSLOHandler(services.NewSLOService(database.DB))
		api.GET("/slos", sloHandler.List)
		if useAuth {
			api.POST("/slos", middleware.AuthMiddleware(), sloHandler.Create)
			api.PUT("/slos/:id", middleware.AuthMiddleware(), sloHandler.Update)
			api.DELETE("/slos/:id", middleware.AuthMiddleware(), sloHandler.Delete)
		} else {
			api.POST("/slos", sloHandler.Create)
			api.PUT("/slos/:id", sloHandler.Update)
			api.DELETE("/slos/:id", sloHandler.Delete)
		}

        // DNS (Cloudflare) dry-run plan endpoint
        dnsHandler := handlers.NewDNSHandler()
        api.POST("/dns/cloudflare/plan", dnsHandler.PlanCloudflare)

        // Report templates (client-side HTML/JSON templates)
        tplHandler := handlers.NewTemplateHandler(database.DB)
        if useAuth {
            api.GET("/templates", middleware.AuthMiddleware(), tplHandler.Get)      // query by kind (default monthly)
            api.GET("/templates/list", middleware.AuthMiddleware(), tplHandler.List)
            api.GET("/templates/:id", middleware.AuthMiddleware(), tplHandler.Get)  // get by id
            api.POST("/templates", middleware.AuthMiddleware(), tplHandler.Upsert)
            api.DELETE("/templates/:id", middleware.AuthMiddleware(), tplHandler.Delete)
        } else {
            api.GET("/templates", tplHandler.Get)
            api.GET("/templates/list", tplHandler.List)
            api.GET("/templates/:id", tplHandler.Get)
            api.POST("/templates", tplHandler.Upsert)
            api.DELETE("/templates/:id", tplHandler.Delete)
        }
    }

	return r
}

// swagger UI is embedded in docs package
