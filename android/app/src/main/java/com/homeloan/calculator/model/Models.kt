package com.homeloan.calculator.model

data class BankMrr(
    val name: String,
    val fullName: String,
    val mrr: Double,
    val colorHex: String,
    val updateDate: String
)

data class InterestStep(
    val id: String,
    val startMonth: Int,
    val endMonth: Int,
    val type: InterestType = InterestType.FIXED,
    val rate: Double = 0.0,
    val mrr: Double? = null,
    val operator: String? = null, // "+" or "-"
    val margin: Double? = null,
    val bankName: String? = null
)

enum class InterestType {
    FIXED,
    FLOATING
}

data class PaymentStep(
    val id: String,
    val startMonth: Int,
    val endMonth: Int,
    val amount: Double
)

data class ExtraPaymentStep(
    val id: String,
    val startMonth: Int,
    val endMonth: Int,
    val amount: Double
)

enum class PaymentMode {
    EQUAL,
    STEP
}

enum class ExtraPaymentType {
    NONE,
    MONTHLY_FIXED,
    STEP
}

data class LoanScenario(
    val id: String,
    val name: String,
    val loanAmount: Double,
    val loanTermYears: Int,
    val interestSteps: List<InterestStep>,
    val paymentMode: PaymentMode,
    val equalPaymentAmount: Double,
    val paymentSteps: List<PaymentStep>,
    val extraPaymentType: ExtraPaymentType,
    val extraPaymentAmount: Double,
    val extraPaymentSteps: List<ExtraPaymentStep>,
    val createdAt: Long = System.currentTimeMillis()
)

data class AmortizationMonth(
    val month: Int,
    val year: Int,
    var beginningBalance: Double,
    val interestRate: Double,
    val payment: Double,
    val extraPayment: Double,
    val interestPaid: Double,
    val principalPaid: Double,
    val endingBalance: Double
)

data class CalculationResult(
    val schedule: List<AmortizationMonth>,
    val totalInterest: Double,
    val totalPrincipal: Double,
    val totalPayments: Double,
    val actualTermMonths: Int,
    val isPaidOff: Boolean
)
