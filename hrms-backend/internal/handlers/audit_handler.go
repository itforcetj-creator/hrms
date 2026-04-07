package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetAuditLogs returns audit logs with optional filtering
func GetAuditLogs(c *gin.Context) {
	type query struct {
		Page     int    `form:"page,default=1"`
		PageSize int    `form:"page_size,default=50"`
		UserID   string `form:"user_id"`
		Action   string `form:"action"`
		Table    string `form:"table"`
	}

	var q query
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid query parameters"})
		return
	}

	if q.Page < 1 {
		q.Page = 1
	}
	if q.PageSize < 1 || q.PageSize > 200 {
		q.PageSize = 50
	}

	query := database.DB.Model(&models.AuditLog{})

	// Optional filters
	if q.UserID != "" {
		if uid, err := strconv.ParseUint(q.UserID, 10, 32); err == nil {
			query = query.Where("user_id = ?", uid)
		}
	}
	if q.Action != "" {
		query = query.Where("action = ?", q.Action)
	}
	if q.Table != "" {
		query = query.Where("table LIKE ?", "%"+q.Table+"%")
	}

	var total int64
	query.Count(&total)

	var logs []models.AuditLog
	offset := (q.Page - 1) * q.PageSize
	if err := query.Order("created_at DESC").Offset(offset).Limit(q.PageSize).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve audit logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs":   logs,
		"total":  total,
		"page":   q.Page,
		"page_size": q.PageSize,
	})
}
