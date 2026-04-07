package utils

import (
	"crypto/tls"
	"fmt"
	"hrms-backend/internal/config"
	"net/smtp"

	"go.uber.org/zap"
)

// EmailService handles sending emails via SMTP
type EmailService struct {
	host     string
	port     int
	user     string
	password string
	from     string
	useTLS   bool
}

var emailSvc *EmailService

func InitEmailService() {
	if config.AppConfig == nil {
		config.Load()
	}
	emailSvc = &EmailService{
		host:     config.AppConfig.SMTPHost,
		port:     config.AppConfig.SMTPPort,
		user:     config.AppConfig.SMTPUser,
		password: config.AppConfig.SMTPPassword,
		from:     config.AppConfig.SMTPFromEmail,
		useTLS:   config.AppConfig.SMTPUseTLS,
	}
}

// SendEmail sends an email to the specified recipient
func (svc *EmailService) SendEmail(to, subject, body string) error {
	if svc.user == "" || svc.password == "" || svc.from == "" {
		Logger.Warn("Email service not configured, skipping send",
			zap.String("to", to),
			zap.String("subject", subject),
		)
		return nil // Not an error — just not configured
	}

	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=\"UTF-8\"\r\n\r\n%s",
		svc.from, to, subject, body)

	addr := fmt.Sprintf("%s:%d", svc.host, svc.port)

	var auth smtp.Auth
	if svc.useTLS {
		auth = smtp.PlainAuth("", svc.user, svc.password, svc.host)
	} else {
		auth = smtp.PlainAuth("", svc.user, svc.password, svc.host)
	}

	if svc.useTLS {
		// Use TLS
		tlsConfig := &tls.Config{
			ServerName: svc.host,
		}
		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			return fmt.Errorf("failed to connect to SMTP server: %w", err)
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, svc.host)
		if err != nil {
			return fmt.Errorf("failed to create SMTP client: %w", err)
		}
		defer client.Quit()

		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("failed to authenticate: %w", err)
		}

		if err := client.Mail(svc.from); err != nil {
			return fmt.Errorf("failed to set sender: %w", err)
		}

		if err := client.Rcpt(to); err != nil {
			return fmt.Errorf("failed to set recipient: %w", err)
		}

		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("failed to start data: %w", err)
		}

		if _, err := w.Write([]byte(msg)); err != nil {
			return fmt.Errorf("failed to write message: %w", err)
		}

		if err := w.Close(); err != nil {
			return fmt.Errorf("failed to close data writer: %w", err)
		}
	} else {
		// Non-TLS
		if err := smtp.SendMail(addr, auth, svc.from, []string{to}, []byte(msg)); err != nil {
			return fmt.Errorf("failed to send email: %w", err)
		}
	}

	Logger.Info("Email sent successfully",
		zap.String("to", to),
		zap.String("subject", subject),
	)
	return nil
}

// SendLeaveStatusEmail sends a leave status notification
func (svc *EmailService) SendLeaveStatusEmail(to, leaveType, status, startDate, endDate string) error {
	subject := fmt.Sprintf("Leave Request %s — %s", status, leaveType)
	body := fmt.Sprintf(`
		<html>
		<body style="font-family: Arial, sans-serif;">
			<h2>Leave Request Notification</h2>
			<p>Your leave request has been <strong>%s</strong>.</p>
			<table style="border-collapse: collapse; margin: 20px 0;">
				<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Type:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">%s</td></tr>
				<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Start Date:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">%s</td></tr>
				<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>End Date:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">%s</td></tr>
			</table>
		</body>
		</html>
	`, status, leaveType, startDate, endDate)

	return svc.SendEmail(to, subject, body)
}

// GetEmailService returns the initialized email service
func GetEmailService() *EmailService {
	if emailSvc == nil {
		InitEmailService()
	}
	return emailSvc
}
