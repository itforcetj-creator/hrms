package middleware

import (
	"fmt"
	"hrms-backend/internal/config"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements a simple token bucket rate limiter per IP
type RateLimiter struct {
	clients map[string]*clientLimiter
	mu      sync.Mutex
	maxReqs int
	window  time.Duration
}

type clientLimiter struct {
	requests  int
	lastReset time.Time
}

var limiter *RateLimiter

func InitRateLimiter() {
	if config.AppConfig == nil {
		config.Load()
	}
	limiter = &RateLimiter{
		clients: make(map[string]*clientLimiter),
		maxReqs: config.AppConfig.RateLimitRequests,
		window:  time.Duration(config.AppConfig.RateLimitWindowSeconds) * time.Second,
	}

	// Periodic cleanup every 5 minutes
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			limiter.cleanup()
		}
	}()
}

func (rl *RateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	for ip, client := range rl.clients {
		if now.Sub(client.lastReset) > rl.window*2 {
			delete(rl.clients, ip)
		}
	}
}

// RateLimitMiddleware limits requests per IP address
func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if limiter == nil {
			InitRateLimiter()
		}

		ip := c.ClientIP()
		limiter.mu.Lock()

		client, exists := limiter.clients[ip]
		if !exists || time.Since(client.lastReset) > limiter.window {
			limiter.clients[ip] = &clientLimiter{
				requests:  1,
				lastReset: time.Now(),
			}
			limiter.mu.Unlock()
			c.Next()
			return
		}

		client.requests++
		if client.requests > limiter.maxReqs {
			limiter.mu.Unlock()
			retryAfter := fmt.Sprint(int(limiter.window.Seconds()))
			c.Header("Retry-After", retryAfter)
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			return
		}

		limiter.mu.Unlock()
		c.Next()
	}
}
