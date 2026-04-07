package utils

import (
	"time"

	"hrms-backend/internal/config"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func getJWTSecret() []byte {
	if config.AppConfig == nil {
		config.Load()
	}
	return []byte(config.AppConfig.JWTSecret)
}

// Хешируем пароль
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

// Проверяем пароль
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Генерируем JWT токен
func GenerateToken(userID uint, role string, departmentID uint) (string, error) {
	expirationHours := time.Duration(24)
	if config.AppConfig != nil {
		expirationHours = time.Duration(config.AppConfig.JWTExpirationHours)
	}
	claims := jwt.MapClaims{
		"user_id":       userID,
		"role":          role,
		"department_id": departmentID,
		"exp":           time.Now().Add(time.Hour * expirationHours).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}
