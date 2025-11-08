package handlers

import (
    "encoding/json"
    "net/http"
    "strconv"
    "strings"
    "time"

    "freelance-monitor-system/internal/services"
    "github.com/gin-gonic/gin"
)

type MonthlyReportHandler struct {
    reportService  *services.MonthlyReportService
    clientService  *services.ClientService
    serviceService *services.ServiceService
}

func NewMonthlyReportHandler(
	reportService *services.MonthlyReportService,
    clientService *services.ClientService,
    serviceService *services.ServiceService,
) *MonthlyReportHandler {
    return &MonthlyReportHandler{
        reportService:  reportService,
        clientService:  clientService,
        serviceService: serviceService,
    }
}

// GenerateMonthlyReport handles monthly report generation
func (h *MonthlyReportHandler) GenerateMonthlyReport(c *gin.Context) {
	idParam := c.Param("serviceId")
	if idParam == "" {
		idParam = c.Param("id")
	}
	serviceID, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service ID"})
		return
	}
	h.generateMonthlyReportFor(c, serviceID, c.Query("month"))
}

type monthlyReportRequest struct {
    ServiceID int    `json:"service_id"`
    Month     string `json:"month"`
    Activities []string `json:"activities"`
    MaintenanceHours float64 `json:"maintenance_hours"`
    ActivityItems []struct {
        Date        string `json:"date"`
        Description string `json:"description"`
    } `json:"activity_items"`
    Summary string `json:"summary"`
}

// GenerateMonthlyReportFromBody accepts JSON payload { service_id, month }
func (h *MonthlyReportHandler) GenerateMonthlyReportFromBody(c *gin.Context) {
    var req monthlyReportRequest
    if err := c.ShouldBindJSON(&req); err != nil || req.ServiceID <= 0 || req.Month == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "service_id and month are required"})
        return
    }
    // Parse month and generate base report
    t, err := time.Parse("2006-01", req.Month)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid month format (YYYY-MM)"})
        return
    }

    ctx := c.Request.Context()
    report, err := h.reportService.GenerateMonthlyReport(ctx, req.ServiceID, t)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    if uid, ok := c.Get("user_id"); ok { _ = h.reportService.SetMonthlyReportUser(ctx, report.ID, uid.(int)) }

    // Optionally update details if provided
    if len(req.ActivityItems) > 0 || len(req.Activities) > 0 || req.MaintenanceHours > 0 {
        // Prefer structured activity items if provided
        if len(req.ActivityItems) > 0 {
            if b, err := json.Marshal(req.ActivityItems); err == nil {
                if err := h.reportService.UpdateMonthlyDetailsRaw(ctx, report.ID, string(b), req.MaintenanceHours); err != nil {
                    c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
                    return
                }
                report.Activities = string(b)
            }
        } else if len(req.Activities) > 0 {
            if err := h.reportService.UpdateMonthlyDetails(ctx, report.ID, req.Activities, req.MaintenanceHours); err != nil {
                c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
                return
            }
            if b, marshalErr := json.Marshal(req.Activities); marshalErr == nil {
                report.Activities = string(b)
            }
        }
        if req.MaintenanceHours > 0 { report.MaintenanceHours = req.MaintenanceHours }
    }
    if strings.TrimSpace(req.Summary) != "" {
        _ = h.reportService.UpdateMonthlySummary(ctx, report.ID, req.Summary)
        report.Summary = req.Summary
    }

    c.JSON(http.StatusOK, report)
}

func (h *MonthlyReportHandler) generateMonthlyReportFor(c *gin.Context, serviceID int, month string) {
	if strings.TrimSpace(month) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "month query is required"})
		return
	}
	t, err := time.Parse("2006-01", month)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid month format (YYYY-MM)"})
		return
	}

	ctx := c.Request.Context()
	report, err := h.reportService.GenerateMonthlyReport(ctx, serviceID, t)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

// ListMonthlyReports handles listing monthly reports for a service
func (h *MonthlyReportHandler) ListMonthlyReports(c *gin.Context) {
	idParam := c.Param("serviceId")
	if idParam == "" {
		idParam = c.Param("id")
	}
	serviceID, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid service ID"})
		return
	}

    ctx := c.Request.Context()
    var uid int
    if v, ok := c.Get("user_id"); ok { uid = v.(int) }
    reports, err := h.reportService.GetMonthlyReportsForUser(ctx, uid, serviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, reports)
}

// GetMonthlyReport handles fetching a single monthly report
func (h *MonthlyReportHandler) GetMonthlyReport(c *gin.Context) {
	reportID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid report ID"})
		return
	}

    ctx := c.Request.Context()
    var uid int
    if v, ok := c.Get("user_id"); ok { uid = v.(int) }
    report, err := h.reportService.GetMonthlyReportByIDForUser(ctx, uid, reportID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, report)
}

// Backend PDF generation removed; PDFs are rendered client-side.
