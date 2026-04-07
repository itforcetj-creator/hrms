package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"hrms-backend/internal/config"
	"net/http"
	"time"

	"go.uber.org/zap"
)

// NotificationService coordinates multi-channel alerts (Email, Telegram, etc.)
type NotificationService struct {
	emailSvc    *EmailService
	tgBotToken  string
	tgChatID    string
}

var notifySvc *NotificationService

// InitNotificationService initializes the notification coordinator
func InitNotificationService() {
	if config.AppConfig == nil {
		config.Load()
	}
	
	notifySvc = &NotificationService{
		emailSvc:   GetEmailService(),
		tgBotToken: config.AppConfig.TelegramBotToken,
		tgChatID:   config.AppConfig.TelegramChatID,
	}
}

// GetNotificationService returns a singleton instance of the service
func GetNotificationService() *NotificationService {
	if notifySvc == nil {
		InitNotificationService()
	}
	return notifySvc
}

// NotifyLeaveRequest sends alerts when a new leave request is submitted
func (s *NotificationService) NotifyLeaveRequest(userName, leaveType string, days float64, start, end time.Time) {
	subject := fmt.Sprintf("New Leave Request: %s", userName)
	msg := fmt.Sprintf(
		"👤 <b>New Leave Request</b>\n\n"+
			"<b>Employee:</b> %s\n"+
			"<b>Type:</b> %s\n"+
			"<b>Duration:</b> %.1f days\n"+
			"<b>Dates:</b> %s — %s",
		userName, leaveType, days, start.Format("02.01.2006"), end.Format("02.01.2006"),
	)

	// Send to Telegram (non-blocking)
	go s.SendTelegram(msg)
	
	// Email would usually go to the Manager. 
	// For this demo, we log it. In production, we'd lookup manager's email.
	Logger.Info("Leave request notification triggered", zap.String("subject", subject))
}

// SendTelegram sends a formatted message to the configured Telegram chat
func (s *NotificationService) SendTelegram(message string) error {
	if s.tgBotToken == "" || s.tgChatID == "" {
		Logger.Debug("Telegram not configured, skipping")
		return nil
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", s.tgBotToken)
	payload := map[string]string{
		"chat_id":    s.tgChatID,
		"text":       message,
		"parse_mode": "HTML",
	}

	jsonData, _ := json.Marshal(payload)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		Logger.Error("Failed to send Telegram message", zap.Error(err))
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		Logger.Error("Telegram API returned non-OK status", zap.Int("status", resp.StatusCode))
		return fmt.Errorf("telegram api error: %d", resp.StatusCode)
	}

	return nil
}
