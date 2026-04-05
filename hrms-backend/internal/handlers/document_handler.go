package handlers

import (
	"hrms-backend/database"
	"hrms-backend/internal/models"
	"hrms-backend/internal/storage"
	"hrms-backend/internal/utils"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

var FileStorage storage.FileStorage = storage.NewLocalStorage("uploads")

func UploadDocument(c *gin.Context) {
	currentUserID := c.GetUint("user_id")
	if currentUserID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context is missing"})
		return
	}
	userRole := c.GetString("role")
	targetUserID := currentUserID

	if rawUserID := strings.TrimSpace(c.PostForm("user_id")); rawUserID != "" {
		parsed, err := strconv.ParseUint(rawUserID, 10, 64)
		if err != nil || parsed == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id"})
			return
		}

		requestedUserID := uint(parsed)
		if requestedUserID != currentUserID {
			if userRole != models.RoleAdmin && userRole != models.RoleHR {
				c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to upload documents for other users"})
				return
			}

			var user models.User
			if err := database.DB.Select("id").First(&user, requestedUserID).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "Target user not found"})
				return
			}
		}

		targetUserID = requestedUserID
	}

	fileHeader, err := c.FormFile("document")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open uploaded file"})
		return
	}
	defer file.Close()

	// Use storage abstraction
	path, err := FileStorage.Upload(file, fileHeader.Filename)
	if err != nil {
		utils.Logger.Error("Failed to upload file to storage", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	doc := models.Document{
		UserID:         targetUserID,
		FileName:       fileHeader.Filename,
		FilePath:       path,
		FileType:       c.PostForm("type"),
		UploadedByRole: userRole,
		IsContract:     c.PostForm("is_contract") == "true",
	}

	if err := database.DB.Create(&doc).Error; err != nil {
		utils.Logger.Error("Failed to save document record", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record document in database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File uploaded successfully", "document": doc})
}

func GetMyDocuments(c *gin.Context) {
	userID := c.GetUint("user_id")
	var documents []models.Document

	if err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&documents).Error; err != nil {
		utils.Logger.Error("Failed to fetch documents", zap.Uint("user_id", userID), zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch documents"})
		return
	}

	c.JSON(http.StatusOK, documents)
}

func GetDocumentsByUsers(c *gin.Context) {
	userRole := c.GetString("role")
	if userRole != models.RoleAdmin && userRole != models.RoleHR && userRole != models.RoleDirector {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to view all documents"})
		return
	}

	var documents []models.Document
	query := database.DB.Model(&models.Document{}).
		Preload("User").
		Order("documents.created_at DESC")

	if userID := strings.TrimSpace(c.Query("user_id")); userID != "" {
		query = query.Where("documents.user_id = ?", userID)
	}

	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + strings.ToLower(search) + "%"
		query = query.
			Joins("LEFT JOIN users ON users.id = documents.user_id").
			Where(
				"LOWER(documents.file_name) LIKE ? OR LOWER(documents.file_type) LIKE ? OR LOWER(users.full_name) LIKE ? OR LOWER(users.email) LIKE ?",
				like, like, like, like,
			)
	}

	if err := query.Find(&documents).Error; err != nil {
		utils.Logger.Error("Failed to fetch all documents", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch documents"})
		return
	}

	c.JSON(http.StatusOK, documents)
}

func DownloadDocument(c *gin.Context) {
	docID := c.Param("id")
	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	var doc models.Document
	if err := database.DB.First(&doc, docID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	if doc.UserID != userID && userRole != models.RoleAdmin && userRole != models.RoleHR && userRole != models.RoleDirector {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to access this document"})
		return
	}

	resolvedPath := resolveDocumentPath(doc.FilePath)
	if _, err := os.Stat(resolvedPath); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document file not found on server"})
		return
	}

	c.FileAttachment(resolvedPath, doc.FileName)
}

func DeleteDocument(c *gin.Context) {
	docID := c.Param("id")
	userID := c.GetUint("user_id")
	userRole := c.GetString("role")

	var doc models.Document
	if err := database.DB.First(&doc, docID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	// RBAC check
	if doc.UserID != userID && userRole != models.RoleAdmin && userRole != models.RoleHR {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this document"})
		return
	}

	// Prevent users from deleting official documents or contracts
	if userRole == models.RoleEmployee && (doc.UploadedByRole == models.RoleHR || doc.UploadedByRole == models.RoleAdmin || doc.IsContract) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You cannot delete official documents or contracts uploaded by HR"})
		return
	}

	// Delete from storage
	resolvedPath := resolveDocumentPath(doc.FilePath)
	_ = os.Remove(resolvedPath)

	if err := database.DB.Delete(&doc).Error; err != nil {
		utils.Logger.Error("Failed to delete document record", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete document"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Document deleted successfully"})
}

func resolveDocumentPath(storedPath string) string {
	candidates := make([]string, 0, 8)
	cleanStored := filepath.Clean(storedPath)
	candidates = append(candidates, cleanStored)

	if !filepath.IsAbs(cleanStored) {
		candidates = append(candidates, filepath.Join("..", cleanStored))
		candidates = append(candidates, filepath.Join("hrms-backend", cleanStored))
		candidates = append(candidates, filepath.Join("..", "hrms-backend", cleanStored))

		if exePath, err := os.Executable(); err == nil {
			exeDir := filepath.Dir(exePath)
			candidates = append(candidates, filepath.Join(exeDir, cleanStored))
			candidates = append(candidates, filepath.Join(exeDir, "..", cleanStored))
			candidates = append(candidates, filepath.Join(exeDir, "..", "hrms-backend", cleanStored))
		}
	}

	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return cleanStored
}
