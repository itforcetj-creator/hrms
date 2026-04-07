package utils

import "strconv"

// ParseIntOrDefault parses a string to int, returning fallback if empty or invalid.
func ParseIntOrDefault(s string, fallback int) int {
	if s == "" {
		return fallback
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return fallback
	}
	return v
}
