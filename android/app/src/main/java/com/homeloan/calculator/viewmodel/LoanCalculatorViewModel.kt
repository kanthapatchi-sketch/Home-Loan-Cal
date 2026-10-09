package com.homeloan.calculator.viewmodel

import androidx.lifecycle.ViewModel
import com.homeloan.calculator.engine.LoanCalculatorEngine
import com.homeloan.calculator.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

data class LoanCalculatorUiState(
    val loanAmount: Double = 1356995.0,
    val loanTermYears: Int = 30,
    val interestSteps: List<InterestStep> = listOf(
        InterestStep(id = "1", startMonth = 1, endMonth = 12, type = InterestType.FIXED, rate = 2.50),
        InterestStep(id = "2", startMonth = 13, endMonth = 24, type = InterestType.FIXED, rate = 3.25),
        InterestStep(id = "3", startMonth = 25, endMonth = 36, type = InterestType.FIXED, rate = 4.00),
        InterestStep(
            id = "4",
            startMonth = 37,
            endMonth = 360,
            type = InterestType.FLOATING,
            mrr = 6.545,
            operator = "-",
            margin = 1.50,
            bankName = "GHB"
        )
    ),
    val paymentMode: PaymentMode = PaymentMode.EQUAL,
    val equalPaymentAmount: Double = 8900.0,
    val paymentSteps: List<PaymentStep> = listOf(
        PaymentStep(id = "p1", startMonth = 1, endMonth = 12, amount = 7000.0),
        PaymentStep(id = "p2", startMonth = 13, endMonth = 24, amount = 8000.0),
        PaymentStep(id = "p3", startMonth = 25, endMonth = 360, amount = 9500.0)
    ),
    val extraPaymentType: ExtraPaymentType = ExtraPaymentType.NONE,
    val extraPaymentAmount: Double = 1000.0,
    val extraPaymentSteps: List<ExtraPaymentStep> = listOf(
        ExtraPaymentStep(id = "e1", startMonth = 1, endMonth = 60, amount = 2000.0)
    ),
    val calculationResult: CalculationResult? = null,
    val selectedBankMrr: List<BankMrr> = listOf(
        BankMrr("GSB", "ธนาคารออมสิน", 6.045, "#F43F5E", "2569-10-09"),
        BankMrr("GHB", "ธนาคารอาคารสงเคราะห์", 6.145, "#F97316", "2569-10-09"),
        BankMrr("BBL", "ธนาคารกรุงเทพ", 6.500, "#3B82F6", "2569-10-09"),
        BankMrr("SCB", "ธนาคารไทยพาณิชย์", 6.575, "#8B5CF6", "2569-10-09"),
        BankMrr("KBank", "ธนาคารกสิกรไทย", 6.580, "#10B981", "2569-10-09"),
        BankMrr("BAY", "ธนาคารกรุงศรีอยุธยา", 6.670, "#FBBF24", "2569-10-09"),
        BankMrr("KTB", "ธนาคารกรุงไทย", 6.845, "#06B6D4", "2569-10-09"),
        BankMrr("TTB", "ธนาคารทหารไทยธนชาต", 7.105, "#EC4899", "2569-10-09")
    )
)

class LoanCalculatorViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(LoanCalculatorUiState())
    val uiState: StateFlow<LoanCalculatorUiState> = _uiState.asStateFlow()

    init {
        recalculate()
    }

    fun setLoanAmount(amount: Double) {
        val safeAmount = amount.coerceAtLeast(0.0)
        _uiState.value = _uiState.value.copy(loanAmount = safeAmount)
        autoUpdatePMT()
        recalculate()
    }

    fun setLoanTermYears(years: Int) {
        val safeYears = years.coerceIn(1, 40)
        val maxMonths = safeYears * 12
        // Update the last interest step endMonth if it capped at old max
        val updatedInterest = _uiState.value.interestSteps.mapIndexed { idx, step ->
            if (idx == _uiState.value.interestSteps.size - 1) {
                step.copy(endMonth = maxMonths)
            } else step
        }
        _uiState.value = _uiState.value.copy(
            loanTermYears = safeYears,
            interestSteps = updatedInterest
        )
        autoUpdatePMT()
        recalculate()
    }

    fun setPaymentMode(mode: PaymentMode) {
        _uiState.value = _uiState.value.copy(paymentMode = mode)
        recalculate()
    }

    fun setEqualPaymentAmount(amount: Double) {
        _uiState.value = _uiState.value.copy(equalPaymentAmount = amount.coerceAtLeast(0.0))
        recalculate()
    }

    fun setExtraPaymentType(type: ExtraPaymentType) {
        _uiState.value = _uiState.value.copy(extraPaymentType = type)
        recalculate()
    }

    fun setExtraPaymentAmount(amount: Double) {
        _uiState.value = _uiState.value.copy(extraPaymentAmount = amount.coerceAtLeast(0.0))
        recalculate()
    }

    fun updateInterestStep(index: Int, updated: InterestStep) {
        val list = _uiState.value.interestSteps.toMutableList()
        if (index in list.indices) {
            list[index] = updated
            _uiState.value = _uiState.value.copy(interestSteps = list)
            autoUpdatePMT()
            recalculate()
        }
    }

    fun addInterestStep() {
        val list = _uiState.value.interestSteps.toMutableList()
        val lastStep = list.lastOrNull()
        val nextStart = (lastStep?.startMonth ?: 1) + 12
        val nextEnd = _uiState.value.loanTermYears * 12

        if (lastStep != null && lastStep.endMonth > nextStart) {
            list[list.lastIndex] = lastStep.copy(endMonth = nextStart - 1)
        }

        list.add(
            InterestStep(
                id = UUID.randomUUID().toString(),
                startMonth = nextStart,
                endMonth = nextEnd,
                type = InterestType.FIXED,
                rate = 4.5
            )
        )
        _uiState.value = _uiState.value.copy(interestSteps = list)
        recalculate()
    }

    fun removeInterestStep(index: Int) {
        val list = _uiState.value.interestSteps.toMutableList()
        if (list.size > 1 && index in list.indices) {
            list.removeAt(index)
            // Adjust end month of new last item
            if (index == list.size) {
                list[list.lastIndex] = list.last().copy(endMonth = _uiState.value.loanTermYears * 12)
            }
            _uiState.value = _uiState.value.copy(interestSteps = list)
            recalculate()
        }
    }

    private fun autoUpdatePMT() {
        val state = _uiState.value
        val avgRate = if (state.interestSteps.isNotEmpty()) {
            state.interestSteps.map { LoanCalculatorEngine.getEffectiveRate(it) }.average()
        } else 5.0
        val suggested = LoanCalculatorEngine.calculateSuggestedPMT(
            principal = state.loanAmount,
            annualRate = avgRate,
            years = state.loanTermYears
        )
        // If current equal payment is 0 or unassigned, update
        if (state.equalPaymentAmount <= 0.0) {
            _uiState.value = _uiState.value.copy(equalPaymentAmount = suggested)
        }
    }

    fun recalculate() {
        val state = _uiState.value
        val result = LoanCalculatorEngine.calculateLoan(
            loanAmount = state.loanAmount,
            loanTermYears = state.loanTermYears,
            interestSteps = state.interestSteps,
            paymentMode = state.paymentMode,
            equalPaymentAmount = state.equalPaymentAmount,
            paymentSteps = state.paymentSteps,
            extraPaymentType = state.extraPaymentType,
            extraPaymentAmount = state.extraPaymentAmount,
            extraPaymentSteps = state.extraPaymentSteps
        )
        _uiState.value = _uiState.value.copy(calculationResult = result)
    }
}
