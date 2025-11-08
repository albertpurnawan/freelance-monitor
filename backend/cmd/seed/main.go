package main

import (
	"log"
	"os"
	"time"

	"freelance-monitor-system/internal/database"
	"freelance-monitor-system/internal/models"
)

func main() {
	if err := database.InitDB(); err != nil {
		log.Fatalf("init db: %v", err)
	}
	if err := database.AutoMigrate(&models.Client{}, &models.Service{}, &models.Offer{}, &models.UptimeLog{}, &models.Alert{}); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// Seed sample clients
	clients := []models.Client{
		{Name: "PT. Example Indonesia", ContactPerson: "Budi", Email: "budi@example.com", Phone: "+628123456789", Address: "Jl. Sudirman No. 123, Jakarta"},
		{Name: "CV. Digital Solution", ContactPerson: "Sari", Email: "sari@digitalsolution.com", Phone: "+628987654321", Address: "Jl. Thamrin No. 45, Jakarta"},
	}
	for _, c := range clients {
		database.DB.Where(models.Client{Name: c.Name}).FirstOrCreate(&c)
	}

	// Seed sample services
	var first models.Client
	if err := database.DB.First(&first).Error; err == nil {
		svc := models.Service{ClientID: first.ID, Domain: "example.com", ServiceType: "website", Status: "active"}
		database.DB.Where(models.Service{ClientID: svc.ClientID, Domain: svc.Domain}).FirstOrCreate(&svc)
	}

	// Seed a sample offer
	if first.ID != 0 {
		off := models.Offer{ClientID: first.ID, Subject: "Website Redesign", Items: "[]", TotalPrice: 10000000, Date: time.Now()}
		database.DB.Create(&off)
	}

	log.Println("Seed completed")
	_ = os.Stderr.Sync()
}
