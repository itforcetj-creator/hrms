"use client";

import React from "react";
import { usePayroll, TJ_REFERENCE_TAX_RATE, UI_TIME_ZONE, STANDARD_CURRENCY } from "./hooks/usePayroll";
import { PayrollStatCard } from "./components/PayrollStatCard";
import { FlashMessage } from "./components/FlashMessage";
import { PayrollHeader } from "./components/PayrollHeader";
import { AnalyticsSection } from "./components/AnalyticsSection";
import { PayslipHistoryTable } from "./components/PayslipHistoryTable";
import { SalarySettingsModal } from "./components/SalarySettingsModal";
import { BonusPenaltyModal } from "./components/BonusPenaltyModal";

const PayrollPage = () => {
  const {
    t,
    payslips,
    loading,
    generateLoading,
    message,
    isAdminOrHR,
    uiLocale,

    // Settings
    showSettingsModal,
    setShowSettingsModal,
    users,
    usersLoading,
    salarySubmitting,
    salaryForm,
    setSalaryForm,
    openSettingsModal,
    handleApplySalary,

    // Bonus
    showBonusModal,
    setShowBonusModal,
    bonusPenalties,
    bonusLoading,
    bonusSubmitting,
    bonusForm,
    setBonusForm,
    handleBonusSubmit,
    handleDeleteBonus,

    // PDF
    pdfLoading,

    // Formatters
    formatDate,
    formatCurrency,
    formatNumber,
    getMonthName,

    // Actions
    handleGenerate,
    exportAnalyticsCsv,
    exportHistoryCsv,
    exportPayslipsPdf,
    fetchUsers,

    // Analytics
    currentYear,
    totalNetCurrentYear,
    paidCount,
    pendingCount,
    referenceTaxCurrentYear,
    byStatus,
    monthlyTotals,
  } = usePayroll();

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <PayrollHeader
        t={t}
        isAdminOrHR={isAdminOrHR}
        pdfLoading={pdfLoading}
        generateLoading={generateLoading}
        payslipsCount={payslips.length}
        usersCount={users.length}
        onExportAnalytics={exportAnalyticsCsv}
        onExportHistory={exportHistoryCsv}
        onExportPdf={exportPayslipsPdf}
        onGenerate={handleGenerate}
        onOpenSettings={openSettingsModal}
        onOpenBonus={() => setShowBonusModal(true)}
        onFetchUsers={fetchUsers}
      />

      {/* Flash message */}
      {message && <FlashMessage type={message.type} text={message.text} />}

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <PayrollStatCard
          title={t("payroll.ytd")}
          value={formatCurrency(totalNetCurrentYear)}
          sub={`${t("payroll.analytics.year")}: ${currentYear}`}
        />
        <PayrollStatCard
          title={t("payroll.analytics.referenceTax")}
          value={formatCurrency(referenceTaxCurrentYear)}
          sub={`${formatNumber(TJ_REFERENCE_TAX_RATE * 100)}%`}
        />
        <PayrollStatCard
          title={t("payroll.analytics.pendingCount")}
          value={String(pendingCount)}
          sub={t("payroll.analytics.status")}
        />
        <PayrollStatCard
          title={t("payroll.analytics.totalRecords")}
          value={String(payslips.length)}
          sub={t("payroll.history")}
        />
      </div>

      {/* Analytics section */}
      <AnalyticsSection
        t={t}
        uiLocale={uiLocale}
        timezone={UI_TIME_ZONE}
        currency={STANDARD_CURRENCY}
        byStatus={byStatus}
        monthlyTotals={monthlyTotals}
        formatCurrency={formatCurrency}
      />

      {/* Payslip history table */}
      <PayslipHistoryTable
        t={t}
        payslips={payslips}
        loading={loading}
        getMonthName={getMonthName}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      {/* Salary settings modal */}
      <SalarySettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        t={t}
        users={users}
        usersLoading={usersLoading}
        salarySubmitting={salarySubmitting}
        salaryForm={salaryForm}
        setSalaryForm={setSalaryForm}
        onSubmit={handleApplySalary}
      />

      {/* Bonus/Penalty modal */}
      <BonusPenaltyModal
        isOpen={showBonusModal}
        onClose={() => setShowBonusModal(false)}
        t={t}
        users={users}
        bonusPenalties={bonusPenalties}
        bonusLoading={bonusLoading}
        bonusSubmitting={bonusSubmitting}
        bonusForm={bonusForm}
        setBonusForm={setBonusForm}
        formatCurrency={formatCurrency}
        onSubmit={handleBonusSubmit}
        onDelete={handleDeleteBonus}
      />
    </div>
  );
};

export default PayrollPage;
