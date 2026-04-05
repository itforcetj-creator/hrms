package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetMyNotifications fetches the notifications for the logged-in user
func GetMyNotifications(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var notifications []models.Notification
	// Fetch unread first, then recent ones
	database.DB.Where("user_id = ?", userID).Order("is_read asc, created_at desc").Limit(50).Find(&notifications)

	c.JSON(http.StatusOK, notifications)
}

// MarkNotificationRead marks a specific notification as read
func MarkNotificationRead(c *gin.Context) {
	userID, _ := c.Get("user_id")
	notifID := c.Param("id")

	var notification models.Notification
	if err := database.DB.Where("id = ? AND user_id = ?", notifID, userID).First(&notification).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	notification.IsRead = true
	database.DB.Save(&notification)

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Notification marked as read"})
}

// MarkAllNotificationsRead marks all user notifications as read
func MarkAllNotificationsRead(c *gin.Context) {
	userID, _ := c.Get("user_id")

	database.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Update("is_read", true)

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "All notifications marked as read"})
}
