package service

import (
	"fmt"
	"hrms-backend/database"
	"hrms-backend/internal/models"
)

// NotificationService handles sending system notifications and emails
type NotificationService struct{}

func NewNotificationService() *NotificationService {
	return &NotificationService{}
}

// SendSystemNotification creates an in-app notification for a user
func (s *NotificationService) SendSystemNotification(userID uint, title, message, link string) error {
	notification := models.Notification{
		UserID:  userID,
		Title:   title,
		Message: message,
		Link:    link,
		Type:    models.NotificationTypeSystem,
		IsRead:  false,
	}

	if err := database.DB.Create(&notification).Error; err != nil {
		return fmt.Errorf("failed to create system notification: %w", err)
	}

	return nil
}

// SendEmailNotification sends an email notification (mock implementation for now)
func (s *NotificationService) SendEmailNotification(userID uint, subject, body string) error {
	// 1. Fetch user to get email address
	var user models.User
	if err := database.DB.Select("email").First(&user, userID).Error; err != nil {
		return fmt.Errorf("failed to get user for email: %w", err)
	}

	// 2. Here we would normally connect to an SMTP server (e.g. using net/smtp)
	// For simulation, we'll just log it and save it as an EMAIL log type in the DB
	fmt.Printf("[SIMULATED EMAIL] To: %s | Subject: %s | Body: %s\n", user.Email, subject, body)

	notification := models.Notification{
		UserID:  userID,
		Title:   subject,
		Message: body,
		Type:    models.NotificationTypeEmail,
		IsRead:  false, // Emails don't really have a "read" state in the system view typically, but we track it
	}

	database.DB.Create(&notification)
	return nil
}

// SendCombined notification sends both system and email
func (s *NotificationService) SendCombinedNotification(userID uint, title, message, link string) error {
	s.SendSystemNotification(userID, title, message, link)
	s.SendEmailNotification(userID, title, message)
	return nil
}
