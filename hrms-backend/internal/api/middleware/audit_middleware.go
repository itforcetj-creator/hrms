package middleware

import (
	"bytes"
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

// AuditMiddleware captures every POST, PUT, PATCH, and DELETE request.
// It logs who performed the action, the target endpoint, and the payload.
func AuditMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only log mutation methods
		if c.Request.Method == http.MethodGet || c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Read the request body
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			// Restore the request body for the actual handler
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Process the actual request first
		c.Next()

		// If the request was successful, log it
		if c.Writer.Status() < 400 {
			userID := c.GetUint("user_id")
			
			log := models.AuditLog{
				UserID:    userID,
				Action:    c.Request.Method,
				Table:     c.Request.URL.Path, // Using path as table alias for now
				IPAddress: c.ClientIP(),
				NewValues: string(bodyBytes),
				Message:   "API Mutation Event",
			}

			// Save to database asynchronously to avoid blocking the user
			go database.DB.Create(&log)
		}
	}
}
