package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/internal/utils"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GetAllAssets returns every asset with its assigned user preloaded.
func GetAllAssets(c *gin.Context) {
	var assets []models.Asset
	query := database.DB.Preload("AssignedTo")

	if cat := c.Query("category"); cat != "" {
		query = query.Where("category = ?", cat)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&assets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch assets"})
		return
	}
	c.JSON(http.StatusOK, assets)
}

// AssignAsset handles the hardware allocation to an employee.
func AssignAsset(c *gin.Context) {
	var input struct {
		AssetID uint `json:"asset_id" binding:"required"`
		UserID  uint `json:"user_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "asset_id and user_id are required"})
		return
	}

	tx := database.DB.Begin()
	var asset models.Asset
	if err := tx.First(&asset, input.AssetID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	if asset.Status == models.AssetStatusAssigned {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Asset is already assigned elsewhere"})
		return
	}

	// Update Asset
	asset.Status = models.AssetStatusAssigned
	asset.AssignedToUserID = &input.UserID
	if err := tx.Save(&asset).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign asset"})
		return
	}

	// Audit Log
	adminID := c.GetUint("user_id")
	tx.Create(&models.AuditLog{
		UserID:    adminID,
		Action:    "ASSIGN_ASSET",
		Table:     "assets",
		RecordID:  asset.ID,
		NewValues: "Assigned to user " + strconv.Itoa(int(input.UserID)),
		CreatedAt: time.Now(),
	})

	tx.Commit()

	// Reload with relation
	database.DB.Preload("AssignedTo").First(&asset, asset.ID)

	utils.Logger.Info("Asset assigned successfully", zap.Uint("asset_id", asset.ID), zap.Uint("user_id", input.UserID))
	c.JSON(http.StatusOK, gin.H{"message": "Asset assigned successfully", "asset": asset})
}

// UnassignAsset releases an asset back to STOCK.
func UnassignAsset(c *gin.Context) {
	id := c.Param("id")
	tx := database.DB.Begin()

	var asset models.Asset
	if err := tx.First(&asset, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	asset.Status = models.AssetStatusStock
	asset.AssignedToUserID = nil
	if err := tx.Save(&asset).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unassign asset"})
		return
	}

	adminID := c.GetUint("user_id")
	tx.Create(&models.AuditLog{
		UserID:   adminID,
		Action:   "UNASSIGN_ASSET",
		Table:    "assets",
		RecordID: asset.ID,
		CreatedAt: time.Now(),
	})

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Asset unassigned", "asset": asset})
}

// UpdateAsset updates mutable asset fields (name, category, status, serial).
func UpdateAsset(c *gin.Context) {
	id := c.Param("id")
	var asset models.Asset
	if err := database.DB.First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid data"})
		return
	}

	if err := database.DB.Model(&asset).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update asset"})
		return
	}

	database.DB.Preload("AssignedTo").First(&asset, asset.ID)
	c.JSON(http.StatusOK, asset)
}

// DeleteAsset hard-deletes an asset record.
func DeleteAsset(c *gin.Context) {
	id := c.Param("id")
	var asset models.Asset
	if err := database.DB.First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Asset not found"})
		return
	}

	if err := database.DB.Delete(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete asset"})
		return
	}

	adminID := c.GetUint("user_id")
	database.DB.Create(&models.AuditLog{
		UserID:   adminID,
		Action:   "DELETE_ASSET",
		Table:    "assets",
		RecordID: asset.ID,
		CreatedAt: time.Now(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "Asset deleted"})
}

// GetMyAssets returns hardware assigned to the logged-in employee.
func GetMyAssets(c *gin.Context) {
	userID := c.GetUint("user_id")
	var assets []models.Asset
	if err := database.DB.Preload("AssignedTo").Where("assigned_to_user_id = ?", userID).Find(&assets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch your assets"})
		return
	}
	c.JSON(http.StatusOK, assets)
}

// CreateAsset adds new hardware to the pool.
func CreateAsset(c *gin.Context) {
	var asset models.Asset
	if err := c.ShouldBindJSON(&asset); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid asset data"})
		return
	}

	if asset.Status == "" {
		asset.Status = models.AssetStatusStock
	}

	if err := database.DB.Create(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create asset"})
		return
	}

	c.JSON(http.StatusCreated, asset)
}
