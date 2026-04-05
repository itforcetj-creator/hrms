package models

import "time"

type Department struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"unique;not null" json:"name"`
	ManagerID *uint     `json:"manager_id,omitempty"`
	Manager   *User     `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
	CreatedAt time.Time `json:"-"`
}

type Position struct {
	ID           uint    `gorm:"primaryKey" json:"id"`
	Title        string  `gorm:"unique;not null" json:"title"`
	DepartmentID uint    `json:"department_id"`
	Grade        float64 `json:"grade"`
}
