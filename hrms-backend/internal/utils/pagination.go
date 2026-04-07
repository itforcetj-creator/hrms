package utils

import "gorm.io/gorm"

// PaginationParams holds query parameters for pagination.
type PaginationParams struct {
	Page     int `form:"page" json:"page"`
	PageSize int `form:"page_size" json:"page_size"`
}

// PaginatedResponse wraps list responses with metadata.
type PaginatedResponse struct {
	Data     interface{} `json:"data"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
}

// ParsePaginationParams extracts page and page_size from query strings.
func ParsePaginationParams(c QueryContext) PaginationParams {
	return PaginationParams{
		Page:     ParseIntOrDefault(c.Query("page"), 1),
		PageSize: ParseIntOrDefault(c.Query("page_size"), 20),
	}
}

// QueryContext is a minimal interface for accessing query parameters.
type QueryContext interface {
	Query(key string) string
}

// ApplyPagination adds limit/offset to a GORM query based on pagination params.
// Defaults to page=1, page_size=20 if not provided. Max page_size is 100.
func ApplyPagination(params PaginationParams, db *gorm.DB) *gorm.DB {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 {
		params.PageSize = 20
	}
	if params.PageSize > 100 {
		params.PageSize = 100
	}

	offset := (params.Page - 1) * params.PageSize
	return db.Offset(offset).Limit(params.PageSize)
}
