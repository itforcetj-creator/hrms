package models

import (
	"time"

	"gorm.io/gorm"
)

// SalaryConfiguration defines the monthly payment settings for an employee.
type SalaryConfiguration struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	UserID           uint           `gorm:"unique;not null" json:"user_id"`
	BaseSalary       float64        `gorm:"default:0" json:"base_salary"`
	Currency         string         `gorm:"default:'USD'" json:"currency"`
	PaymentFrequency string         `gorm:"default:'MONTHLY'" json:"payment_frequency"`
	
	// Encrypted Fields (AES-256)
	BankName         string `gorm:"type:text" json:"bank_name"`
	AccountNumber    string `gorm:"type:text" json:"account_number"`
	TaxID            string `gorm:"type:text" json:"tax_id"`

	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// SalaryHistory tracks every change to an employee's compensation.
type SalaryHistory struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	OldSalary float64   `json:"old_salary"`
	NewSalary float64   `json:"new_salary"`
	Reason    string    `json:"reason"`
	ChangedBy uint      `json:"changed_by"`
	CreatedAt time.Time `json:"created_at"`
}

// PayslipStatus defines if a payment has been processed or not.
type PayslipStatus string

const (
	PayslipStatusPaid      PayslipStatus = "PAID"
	PayslipStatusPending   PayslipStatus = "PENDING"
	PayslipStatusCancelled PayslipStatus = "CANCELLED"
)

// Payslip represents a monthly earning record for an employee.
// It tracks net amount and payment period.
type Payslip struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null" json:"user_id"`
	User        User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Month       int            `gorm:"not null" json:"month"` // 1-12
	Year        int            `gorm:"not null" json:"year"`
	NetAmount   float64        `gorm:"not null" json:"net_amount"`
	Status      PayslipStatus  `gorm:"default:'PENDING'" json:"status"`
	BonusAmount   float64        `gorm:"default:0" json:"bonus_amount"`
	PenaltyAmount float64        `gorm:"default:0" json:"penalty_amount"`
	GeneratedAt time.Time      `json:"generated_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
