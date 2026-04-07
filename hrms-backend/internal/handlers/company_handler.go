package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/internal/utils"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GetDepartments returns all departments with their manager info.
// Used by the frontend for dropdowns (create user, announcements, etc.)
func GetDepartments(c *gin.Context) {
	var departments []models.Department
	if err := database.DB.Preload("Manager").Order("name asc").Find(&departments).Error; err != nil {
		utils.Logger.Error("Failed to fetch departments", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch departments"})
		return
	}
	c.JSON(http.StatusOK, departments)
}

// CreateDepartment creates a new department for organizational setup.
func CreateDepartment(c *gin.Context) {
	var input struct {
		Name      string `json:"name" binding:"required"`
		ManagerID *uint  `json:"manager_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name cannot be empty"})
		return
	}

	department := models.Department{
		Name: name,
	}
	if input.ManagerID != nil {
		var manager models.User
		if err := database.DB.First(&manager, *input.ManagerID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "manager not found"})
			return
		}
		if manager.Role != models.RoleManager {
			c.JSON(http.StatusBadRequest, gin.H{"error": "selected user is not a department manager"})
			return
		}
		department.ManagerID = input.ManagerID
	}

	if err := database.DB.Create(&department).Error; err != nil {
		lowErr := strings.ToLower(err.Error())
		if strings.Contains(lowErr, "duplicate") || strings.Contains(lowErr, "unique") {
			c.JSON(http.StatusConflict, gin.H{"error": "department with this name already exists"})
			return
		}
		utils.Logger.Error("Failed to create department", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create department"})
		return
	}

	if err := database.DB.Preload("Manager").First(&department, department.ID).Error; err != nil {
		c.JSON(http.StatusCreated, department)
		return
	}
	c.JSON(http.StatusCreated, department)
}

// UpdateDepartment updates department fields like name and manager assignment.
func UpdateDepartment(c *gin.Context) {
	var department models.Department
	if err := database.DB.First(&department, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "department not found"})
		return
	}

	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request payload"})
		return
	}

	updates := map[string]interface{}{}
	nameProvided := false
	managerProvided := false

	if rawName, ok := payload["name"]; ok {
		nameProvided = true
		name, ok := rawName.(string)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "name must be a string"})
			return
		}
		name = strings.TrimSpace(name)
		if name == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "name cannot be empty"})
			return
		}
		updates["name"] = name
	}

	if rawManagerID, ok := payload["manager_id"]; ok {
		managerProvided = true

		if rawManagerID == nil {
			updates["manager_id"] = nil
		} else {
			var managerID uint

			switch value := rawManagerID.(type) {
			case float64:
				parsed := uint(value)
				if value <= 0 || value != float64(parsed) {
					c.JSON(http.StatusBadRequest, gin.H{"error": "manager_id must be a positive integer"})
					return
				}
				managerID = parsed
			case string:
				parsed, err := strconv.ParseUint(strings.TrimSpace(value), 10, 64)
				if err != nil || parsed == 0 {
					c.JSON(http.StatusBadRequest, gin.H{"error": "manager_id must be a positive integer"})
					return
				}
				managerID = uint(parsed)
			default:
				c.JSON(http.StatusBadRequest, gin.H{"error": "manager_id must be a number or null"})
				return
			}

			var manager models.User
			if err := database.DB.First(&manager, managerID).Error; err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "manager not found"})
				return
			}
			if manager.Role != models.RoleManager {
				c.JSON(http.StatusBadRequest, gin.H{"error": "selected user is not a department manager"})
				return
			}
			updates["manager_id"] = managerID
		}
	}

	if !nameProvided && !managerProvided {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields provided for update"})
		return
	}

	if err := database.DB.Model(&department).Updates(updates).Error; err != nil {
		lowErr := strings.ToLower(err.Error())
		if strings.Contains(lowErr, "duplicate") || strings.Contains(lowErr, "unique") {
			c.JSON(http.StatusConflict, gin.H{"error": "department with this name already exists"})
			return
		}
		utils.Logger.Error("Failed to update department", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update department"})
		return
	}

	if err := database.DB.Preload("Manager").First(&department, department.ID).Error; err != nil {
		c.JSON(http.StatusOK, department)
		return
	}
	c.JSON(http.StatusOK, department)
}

// GetPositions returns all positions, optionally filtered by department.
func GetPositions(c *gin.Context) {
	var positions []models.Position
	query := database.DB

	if dept := c.Query("department_id"); dept != "" {
		query = query.Where("department_id = ?", dept)
	}

	if err := query.Find(&positions).Error; err != nil {
		utils.Logger.Error("Failed to fetch positions", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch positions"})
		return
	}
	c.JSON(http.StatusOK, positions)
}

// DeleteDepartment deletes a department (only if no employees are assigned)
func DeleteDepartment(c *gin.Context) {
	var department models.Department
	if err := database.DB.First(&department, c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "department not found"})
		return
	}

	// Check if any users are assigned to this department
	var count int64
	database.DB.Model(&models.User{}).Where("department_id = ?", department.ID).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot delete department with assigned employees"})
		return
	}

	if err := database.DB.Delete(&department).Error; err != nil {
		utils.Logger.Error("Failed to delete department", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete department"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "department deleted successfully"})
}
