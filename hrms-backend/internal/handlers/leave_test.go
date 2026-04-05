package handlers

import (
	"bytes"
	"encoding/json"
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRequestLeave_Overlap(t *testing.T) {
	// Initialize test DB (Simplified for this example)
	database.Connect()
	gin.SetMode(gin.TestMode)

	testUser := models.User{
		Email:        "leave-overlap-test-" + time.Now().Format("20060102150405") + "@example.com",
		Password:     "hashed-pass",
		FullName:     "Leave Test User",
		Role:         models.RoleEmployee,
		IsActive:     true,
		LeaveBalance: 20,
	}
	database.DB.Create(&testUser)

	r := gin.Default()
	r.POST("/leave/request", func(c *gin.Context) {
		c.Set("user_id", testUser.ID)
		RequestLeave(c)
	})

	// Create a mock approved leave in DB
	existingLeave := models.LeaveRequest{
		UserID:    testUser.ID,
		Status:    models.StatusApproved,
		StartDate: time.Now().AddDate(0, 0, 5),
		EndDate:   time.Now().AddDate(0, 0, 10),
		Days:      6,
		Type:      "VACATION",
	}
	database.DB.Create(&existingLeave)

	// Test Case 1: Overlapping request (Should Error 400)
	payload := map[string]interface{}{
		"type":       "VACATION",
		"start_date": time.Now().AddDate(0, 0, 7), // Inside existing leave
		"end_date":   time.Now().AddDate(0, 0, 12),
		"reason":     "I want an overlap test",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/leave/request", bytes.NewBuffer(body))
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	assert.Equal(t, http.StatusBadRequest, resp.Code)

	// Cleanup
	database.DB.Unscoped().Delete(&existingLeave)
	database.DB.Unscoped().Delete(&testUser)
}
