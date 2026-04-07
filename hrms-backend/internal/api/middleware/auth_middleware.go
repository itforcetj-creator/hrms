package middleware

import (
	"hrms-backend/internal/config"
	"hrms-backend/internal/models"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func getJWTSecret() []byte {
	if config.AppConfig == nil {
		config.Load()
	}
	return []byte(config.AppConfig.JWTSecret)
}

func AuthorizeRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return getJWTSecret(), nil
		})

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			userRole := claims["role"].(string)

			// Check if role is authorized
			authorized := false
			for _, role := range allowedRoles {
				if role == userRole {
					authorized = true
					break
				}
			}

			if !authorized {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "You don't have permission"})
				return
			}

			// Pass data to next handlers (with robust extraction)
			userID, okID := claims["user_id"].(float64)
			role, okRole := claims["role"].(string)

			if !okID || !okRole {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token payload"})
				return
			}

			c.Set("user_id", uint(userID))
			c.Set("role", role)

			if deptID, ok := claims["department_id"].(float64); ok {
				c.Set("department_id", uint(deptID))
			}

			c.Next()
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		}
	}
}

// AuthorizePermission checks if the user's role has the required permission,
// taking role inheritance into account.
func AuthorizePermission(requiredPermission models.Permission) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return getJWTSecret(), nil
		})

		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			// Pass data to next handlers (with robust extraction)
			userID, okID := claims["user_id"].(float64)
			role, okRole := claims["role"].(string)

			if !okID || !okRole {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token payload"})
				return
			}

			if !models.HasPermission(role, requiredPermission) {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions for this action"})
				return
			}

			c.Set("user_id", uint(userID))
			c.Set("role", role)

			if deptID, ok := claims["department_id"].(float64); ok {
				c.Set("department_id", uint(deptID))
			}

			c.Next()
		} else {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		}
	}
}
