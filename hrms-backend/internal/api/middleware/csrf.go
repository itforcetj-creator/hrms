package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CSRFMiddleware generates and validates CSRF tokens.
// For SPA applications, it uses the Double Submit Cookie pattern:
// - GET requests set a CSRF token cookie
// - POST/PUT/PATCH/DELETE requests must include the token in X-CSRF-Token header

// Paths excluded from CSRF validation (public/auth routes)
var csrfExcludedPaths = []string{
	"/login",
	"/health",
	"/swagger",
	"/public/apply",
}

const csrfCookieName = "XSRF-TOKEN"
const csrfHeaderName = "X-CSRF-Token"

func isCSRFExcluded(path string) bool {
	for _, excluded := range csrfExcludedPaths {
		if strings.HasPrefix(path, excluded) {
			return true
		}
	}
	return false
}

func generateCSRFToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func CSRFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// For safe methods, just ensure the cookie is set
		if c.Request.Method == http.MethodGet || c.Request.Method == http.MethodOptions || c.Request.Method == http.MethodHead {
			// If cookie doesn't exist, set it
			cookie, err := c.Cookie(csrfCookieName)
			if err != nil || cookie == "" {
				token, err := generateCSRFToken()
				if err != nil {
					c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate CSRF token"})
					return
				}
				c.SetCookie(csrfCookieName, token, 3600*24, "/", "", false, true)
			}
			c.Next()
			return
		}

		// For mutation methods, validate the token
		// Skip validation for excluded paths (public/auth routes)
		if isCSRFExcluded(c.Request.URL.Path) {
			c.Next()
			return
		}

		cookieToken, err := c.Cookie(csrfCookieName)
		if err != nil || cookieToken == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "CSRF token missing in cookie. Make a GET request first to obtain the token.",
			})
			return
		}

		headerToken := c.GetHeader(csrfHeaderName)
		if headerToken == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "CSRF token missing in header. Include X-CSRF-Token header with your request.",
			})
			return
		}

		if cookieToken != headerToken {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": "CSRF token mismatch. The token in the header must match the token in the cookie.",
			})
			return
		}

		c.Next()
	}
}
