package service

import (
	"fmt"
	"hrms-backend/internal/models"
	"time"

	"github.com/signintech/gopdf"
)

func GenerateEmploymentContract(user models.User) ([]byte, error) {
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})
	pdf.AddPage()

	// Try to load a font that supports Cyrillic
	// On Windows, Arial usually has it.
	err := pdf.AddTTFFont("arial", "C:\\Windows\\Fonts\\arial.ttf")
	if err != nil {
		// Fallback or handle error
		return nil, fmt.Errorf("failed to load font: %v", err)
	}

	err = pdf.SetFont("arial", "", 14)
	if err != nil {
		return nil, err
	}

	// Title
	pdf.SetX(50)
	pdf.SetY(50)
	pdf.Cell(nil, "ТРУДОВОЙ ДОГОВОР")

	err = pdf.SetFont("arial", "", 11)
	if err != nil {
		return nil, err
	}

	y := 100.0
	lineHeight := 20.0

	writeLine := func(label, value string) {
		pdf.SetX(50)
		pdf.SetY(y)
		pdf.Cell(nil, fmt.Sprintf("%s: %s", label, value))
		y += lineHeight
	}

	formatDate := func(t *time.Time) string {
		if t == nil {
			return "-"
		}
		return t.Format("02.01.2006")
	}

	writeLine("Сотрудник", user.FullName)
	writeLine("Должность", user.Position.Title)
	writeLine("Департамент", user.Department.Name)
	writeLine("Дата рождения", formatDate(user.BirthDate))
	writeLine("Место рождения", user.BirthPlace)
	writeLine("Паспорт", fmt.Sprintf("%s %s", user.PassportSeries, user.PassportNumber))
	writeLine("ИНН", user.INN)
	writeLine("СНИЛС", user.SNILS)
	writeLine("Адрес", user.Address)
	writeLine("Телефон", user.Phone)

	y += 30
	pdf.SetX(50)
	pdf.SetY(y)
	pdf.Cell(nil, "Настоящий договор подтверждает условия найма сотрудника.")

	y += 50
	pdf.SetX(50)
	pdf.SetY(y)
	pdf.Cell(nil, "__________________________")
	pdf.SetX(350)
	pdf.Cell(nil, "__________________________")
	
	y += 20
	pdf.SetX(50)
	pdf.SetY(y)
	pdf.Cell(nil, "Подпись работодателя")
	pdf.SetX(350)
	pdf.Cell(nil, "Подпись сотрудника")

	// Return as bytes
	return pdf.GetBytesPdf(), nil
}
