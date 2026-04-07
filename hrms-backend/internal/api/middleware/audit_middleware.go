package middleware

import (
	"bytes"
	"encoding/json"
	"hrms-backend/database"
	"hrms-backend/internal/config"
	"hrms-backend/internal/models"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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

			// Try to extract user_id from token if not set in context
			if userID == 0 {
				authHeader := c.GetHeader("Authorization")
				if strings.HasPrefix(authHeader, "Bearer ") {
					tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
					token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
						if config.AppConfig == nil {
							config.Load()
						}
						return []byte(config.AppConfig.JWTSecret), nil
					})
					if err == nil && token.Valid {
						if claims, ok := token.Claims.(jwt.MapClaims); ok {
							if uid, ok := claims["user_id"].(float64); ok {
								userID = uint(uid)
							}
						}
					}
				}
			}

			// Build old values from request body
			var oldValues string
			if len(bodyBytes) > 0 {
				var prettyJSON bytes.Buffer
				if err := json.Indent(&prettyJSON, bodyBytes, "", "  "); err == nil {
					oldValues = prettyJSON.String()
				} else {
					oldValues = string(bodyBytes)
				}
			}

			log := models.AuditLog{
				UserID:    userID,
				Action:    c.Request.Method,
				Table:     c.Request.URL.Path,
				IPAddress: c.ClientIP(),
				NewValues: oldValues,
				Message:   c.Request.Method + " " + c.Request.URL.Path,
			}

			// Save synchronously to ensure data is not lost
			database.DB.Create(&log)
		}
	}
}
