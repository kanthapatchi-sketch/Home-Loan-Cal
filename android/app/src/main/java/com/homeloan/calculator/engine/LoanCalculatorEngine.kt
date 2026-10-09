package com.homeloan.calculator.engine

import com.homeloan.calculator.model.*
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.round

object LoanCalculatorEngine {

    /**
     * Calculates the effective annual interest rate for a given step.
     */
    fun getEffectiveRate(step: InterestStep): Double {
        if (step.type == InterestType.FLOATING) {
            val mrr = step.mrr ?: 0.0
            val margin = step.margin ?: 0.0
            return if (step.operator == "-") {
                max(0.0, mrr - margin)
            } else {
                max(0.0, mrr + margin)
            }
        }
        return step.rate
    }

    /**
     * Standard monthly calculation of reducing balance home loan amortization.
     */
    fun calculateLoan(
        loanAmount: Double,
        loanTermYears: Int,
        interestSteps: List<InterestStep>,
        paymentMode: PaymentMode,
        equalPaymentAmount: Double,
        paymentSteps: List<PaymentStep>,
        extraPaymentType: ExtraPaymentType,
        extraPaymentAmount: Double,
        extraPaymentSteps: List<ExtraPaymentStep>
    ): CalculationResult {
        val totalTermMonths = loanTermYears * 12
        val schedule = mutableListOf<AmortizationMonth>()
        var currentBalance = loanAmount
        var totalInterest = 0.0
        var totalPrincipal = 0.0
        var totalPayments = 0.0
        var isPaidOff = false

        val maxMonths = max(totalTermMonths * 2, 1200)

        for (m in 1..maxMonths) {
            if (currentBalance <= 0.0001) {
                isPaidOff = true
                break
            }

            // 1. Find Interest Rate for this month
            var rate = 0.0
            val matchingInterestStep = interestSteps.find { m >= it.startMonth && m <= it.endMonth }
            if (matchingInterestStep != null) {
                rate = getEffectiveRate(matchingInterestStep)
            } else if (interestSteps.isNotEmpty()) {
                val sortedSteps = interestSteps.sortedByDescending { it.endMonth }
                rate = getEffectiveRate(sortedSteps[0])
            }

            // 2. Find Scheduled Payment for this month
            var scheduledPayment = 0.0
            if (paymentMode == PaymentMode.EQUAL) {
                scheduledPayment = equalPaymentAmount
            } else {
                val matchingPaymentStep = paymentSteps.find { m >= it.startMonth && m <= it.endMonth }
                if (matchingPaymentStep != null) {
                    scheduledPayment = matchingPaymentStep.amount
                } else if (paymentSteps.isNotEmpty()) {
                    val sortedPayments = paymentSteps.sortedByDescending { it.endMonth }
                    scheduledPayment = sortedPayments[0].amount
                }
            }

            // 3. Find Extra Payment for this month
            var extraPayment = 0.0
            when (extraPaymentType) {
                ExtraPaymentType.MONTHLY_FIXED -> {
                    extraPayment = extraPaymentAmount
                }
                ExtraPaymentType.STEP -> {
                    val matchingExtra = extraPaymentSteps.find { m >= it.startMonth && m <= it.endMonth }
                    if (matchingExtra != null) {
                        extraPayment = matchingExtra.amount
                    }
                }
                ExtraPaymentType.NONE -> {
                    extraPayment = 0.0
                }
            }

            val monthlyInterest = currentBalance * (rate / 100.0) / 12.0
            val roundedInterest = round(monthlyInterest * 100.0) / 100.0

            val proposedTotalPayment = scheduledPayment + extraPayment
            val payoffAmount = currentBalance + roundedInterest

            val actualPayment: Double
            val actualExtraPayment: Double
            val interestPaid: Double
            val principalPaid: Double
            val endingBalance: Double

            if (proposedTotalPayment >= payoffAmount) {
                endingBalance = 0.0
                interestPaid = roundedInterest
                principalPaid = currentBalance

                if (scheduledPayment >= payoffAmount) {
                    actualPayment = payoffAmount
                    actualExtraPayment = 0.0
                } else {
                    actualPayment = scheduledPayment
                    actualExtraPayment = payoffAmount - scheduledPayment
                }
                currentBalance = 0.0
            } else {
                actualPayment = scheduledPayment
                actualExtraPayment = extraPayment
                val totalPaid = proposedTotalPayment

                if (totalPaid >= roundedInterest) {
                    interestPaid = roundedInterest
                    principalPaid = totalPaid - roundedInterest
                    endingBalance = currentBalance - principalPaid
                } else {
                    interestPaid = totalPaid
                    principalPaid = 0.0
                    endingBalance = currentBalance + (roundedInterest - totalPaid)
                }
                currentBalance = endingBalance
            }

            schedule.add(
                AmortizationMonth(
                    month = m,
                    year = ceil(m / 12.0).toInt(),
                    beginningBalance = 0.0, // Filled in post-processing
                    interestRate = rate,
                    payment = round(actualPayment * 100.0) / 100.0,
                    extraPayment = round(actualExtraPayment * 100.0) / 100.0,
                    interestPaid = round(interestPaid * 100.0) / 100.0,
                    principalPaid = round(principalPaid * 100.0) / 100.0,
                    endingBalance = max(0.0, round(endingBalance * 100.0) / 100.0)
                )
            )

            totalInterest += interestPaid
            totalPrincipal += principalPaid
            totalPayments += (actualPayment + actualExtraPayment)

            if (currentBalance <= 0.0001) {
                isPaidOff = true
                break
            }
        }

        // Post-processing beginningBalance chain
        var prevBalance = loanAmount
        for (i in schedule.indices) {
            schedule[i].beginningBalance = round(prevBalance * 100.0) / 100.0
            prevBalance = schedule[i].endingBalance
        }

        return CalculationResult(
            schedule = schedule,
            totalInterest = round(totalInterest * 100.0) / 100.0,
            totalPrincipal = round(totalPrincipal * 100.0) / 100.0,
            totalPayments = round(totalPayments * 100.0) / 100.0,
            actualTermMonths = schedule.size,
            isPaidOff = isPaidOff
        )
    }

    /**
     * Calculates baseline PMT for equal monthly amortized installments.
     */
    fun calculateSuggestedPMT(principal: Double, annualRate: Double, years: Int): Double {
        val r = (annualRate / 100.0) / 12.0
        val n = years * 12
        if (r == 0.0) return principal / n
        val pmt = (principal * r * (1.0 + r).pow(n)) / ((1.0 + r).pow(n) - 1.0)
        return ceil(pmt / 100.0) * 100.0
    }
}
