package main

import (
	"hrms-backend/database"
	_ "hrms-backend/docs"
	"hrms-backend/internal/api/routes"
	"hrms-backend/internal/utils"
	"hrms-backend/internal/workers"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
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

	database.Connect()
	database.Seed()

	// 2. Start Background Workers
	workers.StartLeaveAccrualWorker()
	workers.StartPayrollWorker()

	// 3. Init Localization
	utils.InitLocalization()

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // React Vite
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 4. Setup Modular Routes
	routes.SetupRoutes(r)

	// 5. Swagger Documentation Endpoint
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	utils.Logger.Info("HRMS Backend Server Starting on :8080")
	r.Run(":8080")
}
