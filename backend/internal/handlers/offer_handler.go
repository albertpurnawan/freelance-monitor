package handlers

import (
	"errors"
	"fmt"
	"freelance-monitor-system/internal/database"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"freelance-monitor-system/internal/models"
	"freelance-monitor-system/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type OfferHandler struct {
	service *services.OfferService
}

func NewOfferHandler(s *services.OfferService) *OfferHandler { return &OfferHandler{service: s} }

func (h *OfferHandler) ListOffers(c *gin.Context) {
	limit := parseIntQuery(c, "limit")
	offset := parseIntQuery(c, "offset")
	sortBy := c.Query("sort")
	order := c.Query("order")
	subjectLike := c.Query("subject")
	status := c.Query("status")
	clientID := parseIntQuery(c, "client_id")
	offers, err := h.service.ListOffersWithFilters(limit, offset, sortBy, order, subjectLike, status, clientID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	total, _ := h.service.CountOffers(subjectLike, status)
	c.JSON(200, gin.H{"items": offers, "total": total})
}

// parseIntQuery is defined in client_handler.go and reused by handlers in this package

func (h *OfferHandler) GetOffer(c *gin.Context) {
	id := c.Param("id")
	offerID, err := strconv.Atoi(id)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid offer ID"})
		return
	}
	offer, err := h.service.GetOfferByID(offerID)
	if err != nil {
		c.JSON(404, gin.H{"error": "Offer not found"})
		return
	}
	c.JSON(200, offer)
}

func (h *OfferHandler) CreateOffer(c *gin.Context) {
	var input models.Offer
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	// Ensure items is a JSON array string to satisfy jsonb column
	if input.Items == "" {
		input.Items = "[]"
	}
	if input.ClientID == 0 || input.Subject == "" {
		c.JSON(400, gin.H{"error": "client_id and subject are required"})
		return
	}
	if input.TotalPrice <= 0 {
		c.JSON(400, gin.H{"error": "total_price must be positive"})
		return
	}
	if err := h.service.CreateOffer(&input); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(201, input)
}

func (h *OfferHandler) UpdateOffer(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid offer ID"})
		return
	}
	var updates models.Offer
	if err := c.ShouldBind(&updates); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if updates.TotalPrice < 0 {
		c.JSON(400, gin.H{"error": "total_price must be non-negative"})
		return
	}
	offer, err := h.service.UpdateOffer(id, &updates)
	if err != nil {
		c.JSON(404, gin.H{"error": "Offer not found"})
		return
	}
	c.JSON(200, offer)
}

func (h *OfferHandler) DeleteOffer(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid offer ID"})
		return
	}
	if err := h.service.DeleteOffer(id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(404, gin.H{"error": "Offer not found"})
			return
		}
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.Status(204)
}

// GeneratePDF regenerates the offer's PDF and updates pdf_url.
func (h *OfferHandler) GeneratePDF(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid offer ID"})
		return
	}
	offer, err := h.service.GetOfferByID(id)
	if err != nil {
		c.JSON(404, gin.H{"error": "Offer not found"})
		return
	}
	pdfSvc := services.NewPDFService()
	// Enrich PDF with client details if available
	var client *models.Client
	clientSvc := services.NewClientService(database.DB)
	if cobj, e := clientSvc.GetClientByID(c.Request.Context(), offer.ClientID); e == nil {
		client = cobj
	}
	url, err := pdfSvc.GenerateOfferPDF(offer, client)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	// persist url on offer
	_, _ = h.service.UpdateOffer(id, &models.Offer{PDFURL: url})
	c.JSON(200, gin.H{"pdf_url": url})
}

// Approve marks the offer as accepted.
func (h *OfferHandler) Approve(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid offer ID"})
		return
	}
	now := time.Now()
	offer, err := h.service.ApproveOffer(id, now)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, offer)
}

// UploadSigned handles a multipart upload for a signed offer document, saves it, and marks offer accepted.
func (h *OfferHandler) UploadSigned(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid offer ID"})
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "file is required"})
		return
	}
	// save under static/uploads/signed_offers/
	dir := "static/uploads/signed_offers"
	if err := os.MkdirAll(dir, 0o755); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	filename := fmt.Sprintf("offer_%d_%d_%s", id, time.Now().Unix(), file.Filename)
	path := filepath.Join(dir, filename)
	if err := c.SaveUploadedFile(file, path); err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	publicURL := "/static/uploads/signed_offers/" + filename
	now := time.Now()
	offer, err := h.service.SetSignedDocAndApprove(id, publicURL, now)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"signed_doc_url": publicURL, "offer": offer})
}

// ViewPDF streams the offer PDF inline; generates if missing.
func (h *OfferHandler) ViewPDF(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid offer ID"})
		return
	}
	offer, err := h.service.GetOfferByID(id)
	if err != nil {
		c.JSON(404, gin.H{"error": "Offer not found"})
		return
	}
	dir := filepath.Join("static", "pdfs")
	filename := fmt.Sprintf("offer_%d.pdf", id)
	path := filepath.Join(dir, filename)

	needsRegen := false
	if _, err := os.Stat(path); os.IsNotExist(err) {
		needsRegen = true
	} else {
		f, err := os.Open(path)
		if err != nil {
			needsRegen = true
		} else {
			header := make([]byte, 4)
			n, readErr := f.Read(header)
			_ = f.Close()
			if readErr != nil || n < 4 || string(header) != "%PDF" {
				needsRegen = true
			}
		}
	}

	if needsRegen {
		pdfSvc := services.NewPDFService()
		var client *models.Client
		clientSvc := services.NewClientService(database.DB)
		if cobj, e := clientSvc.GetClientByID(c.Request.Context(), offer.ClientID); e == nil {
			client = cobj
		}
		if _, err := pdfSvc.GenerateOfferPDF(offer, client); err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	c.File(path)
}
