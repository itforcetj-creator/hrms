package main

import (
	"fmt"
	"hrms-backend/database"
	_ "hrms-backend/docs"
	"hrms-backend/internal/api/middleware"
	"hrms-backend/internal/api/routes"
	"hrms-backend/internal/config"
	"hrms-backend/internal/utils"
	"hrms-backend/internal/workers"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"
)

// @title HRMS API
// @version 1.0
// @description Human Resource Management System Backend Developer API
// @host localhost:8080
// @BasePath /
// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization
func main() {
	// 1. Initialize Logger First
	utils.InitLogger()
	defer utils.Logger.Sync()

	// 2. Load Configuration from .env / Environment Variables
	cfg := config.Load()

	database.Connect()
	database.Seed()

	// 3. Start Background Workers
	workers.StartLeaveAccrualWorker()
	workers.StartPayrollWorker()

	// 4. Init Localization
	utils.InitLocalization()

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-CSRF-Token"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Rate Limiting
	r.Use(middleware.RateLimitMiddleware())

	// CSRF Protection
	r.Use(middleware.CSRFMiddleware())

	// 5. Setup Modular Routes
	routes.SetupRoutes(r)

	// 5. Swagger Documentation Endpoint
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	utils.Logger.Info("HRMS Backend Server Starting", zap.String("address", addr))
	r.Run(addr)
}
