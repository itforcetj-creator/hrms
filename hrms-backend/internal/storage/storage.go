package storage

import (
	"io"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

// FileStorage defines the interface for document operations.
type FileStorage interface {
	Upload(file io.Reader, filename string) (string, error)
	Delete(path string) error
}

// LocalStorage implements FileStorage using the server's local file system.
type LocalStorage struct {
	BaseDir string
}

func (s *LocalStorage) Upload(file io.Reader, filename string) (string, error) {
	// Generate unique filename to prevent collisions
	ext := filepath.Ext(filename)
	newFileName := uuid.New().String() + ext
	path := filepath.Join(s.BaseDir, newFileName)

	out, err := os.Create(path)
	if err != nil {
		return "", err
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		return "", err
	}

	// Return relative path for database storage
	return filepath.Join("uploads", newFileName), nil
}

func (s *LocalStorage) Delete(path string) error {
	return os.Remove(path)
}

// NewLocalStorage creates a new local storage instance.
func NewLocalStorage(baseDir string) *LocalStorage {
	// Ensure base directory exists
	os.MkdirAll(baseDir, os.ModePerm)
	return &LocalStorage{BaseDir: baseDir}
}
