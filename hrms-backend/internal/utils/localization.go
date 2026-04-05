package utils

import (
	"encoding/json"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

var (
	translations     map[string]map[string]string
	translationsLock sync.RWMutex
	defaultLang      = "ru"
)

// InitLocalization initializes the translation mappings.
func InitLocalization() {
	translationsLock.Lock()
	defer translationsLock.Unlock()

	seedJSON := `{
		"en": {
			"error_unauthorized": "Unauthorized access. Please log in.",
			"error_internal": "Internal server error occurred.",
			"leave_approved": "Your leave request has been approved.",
			"leave_rejected": "Your leave request has been rejected."
		},
		"ru": {
			"error_unauthorized": "Неавторизованный доступ. Пожалуйста, войдите.",
			"error_internal": "Произошла внутренняя ошибка сервера.",
			"leave_approved": "Ваш запрос на отпуск был одобрен.",
			"leave_rejected": "Ваш запрос на отпуск был отклонен."
		},
		"tj": {
			"error_unauthorized": "Дастрасии беиҷозат. Лутфан ворид шавед.",
			"error_internal": "Хатогии дохилии сервер рух дод.",
			"leave_approved": "Дархости рухсатии шумо тасдиқ шуд.",
			"leave_rejected": "Дархости рухсатии шумо рад карда шуд."
		}
	}`

	translations = make(map[string]map[string]string)
	json.Unmarshal([]byte(seedJSON), &translations)
}

// GetLangFromHeader extracts the language code from the Accept-Language header.
func GetLangFromHeader(c *gin.Context) string {
	lang := c.GetHeader("Accept-Language")
	if lang == "" {
		return defaultLang
	}
	// Take first language code (e.g., "en-US,en;q=0.9" -> "en")
	parts := strings.Split(lang, ",")
	if len(parts) > 0 {
		subParts := strings.Split(parts[0], "-")
		return strings.ToLower(subParts[0])
	}
	return defaultLang
}

// GetTrans returns the translated string for a given key and language.
func GetTrans(lang, key string) string {
	translationsLock.RLock()
	defer translationsLock.RUnlock()

	if langDict, ok := translations[lang]; ok {
		if val, ok := langDict[key]; ok {
			return val
		}
	}

	// Fallback to RU
	if langDict, ok := translations["ru"]; ok {
		if val, ok := langDict[key]; ok {
			return val
		}
	}

	return key
}
