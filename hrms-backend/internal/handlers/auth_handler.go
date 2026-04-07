package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func generateCSRFTokenForLogin() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return hex.EncodeToString(b)
}

func Login(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if !utils.CheckPasswordHash(input.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect password"})
		return
	}

	deptID := uint(0)
	if user.DepartmentID != nil {
		deptID = *user.DepartmentID
	}
	token, _ := utils.GenerateToken(user.ID, user.Role, deptID)

	// Set CSRF token cookie so subsequent requests have it
	csrfToken := generateCSRFTokenForLogin()
	c.SetCookie("XSRF-TOKEN", csrfToken, 3600*24, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"role":  user.Role,
		"user": gin.H{
			"id":        user.ID,
			"email":     user.Email,
			"full_name": user.FullName,
			"role":      user.Role,
			"is_active": user.IsActive,
		},
		"csrf_token": csrfToken,
	})
}

// GetMe returns the current authenticated user's information
func GetMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := database.DB.Preload("Department").Preload("Position").First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// UpdateMe allows the user to update their own profile fields.
func UpdateMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input struct {
		Phone      string `json:"phone"`
		Address    string `json:"address"`
		BirthPlace string `json:"birth_place"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update permitted fields
	user.Phone = input.Phone
	user.Address = input.Address
	user.BirthPlace = input.BirthPlace

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}
