/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoanScenario, AmortizationMonth, CalculationResult, InterestStep } from '../types';

export function getEffectiveRate(step: InterestStep): number {
  if (!step) return 0;
  if (step.type === 'floating') {
    const mrr = step.mrr ?? 0;
    const margin = step.margin ?? 0;
    if (step.operator === '-') {
      return Math.max(0, mrr - margin);
    } else {
      return Math.max(0, mrr + margin);
    }
  }
  return step.rate ?? 0;
}

export function calculateLoan(scenario: Omit<LoanScenario, 'id' | 'name' | 'createdAt'>): CalculationResult {
  const {
    loanAmount,
    loanTermYears,
    interestSteps,
    paymentMode,
    equalPaymentAmount,
    paymentSteps,
    extraPaymentType,
    extraPaymentAmount,
    extraPaymentSteps,
  } = scenario;

  const totalTermMonths = loanTermYears * 12;
  const schedule: AmortizationMonth[] = [];
  let currentBalance = loanAmount;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalPayments = 0;
  let isPaidOff = false;

  // Prevent infinite loops or excessive memory: Cap at max of 1200 months (100 years)
  const MAX_MONTHS = Math.max(totalTermMonths * 2, 1200);

  for (let m = 1; m <= MAX_MONTHS; m++) {
    if (currentBalance <= 0) {
      isPaidOff = true;
      break;
    }

    // 1. Find Interest Rate for this month
    let rate = 0;
    const matchingInterestStep = interestSteps.find(step => m >= step.startMonth && m <= step.endMonth);
    if (matchingInterestStep) {
      rate = getEffectiveRate(matchingInterestStep);
    } else if (interestSteps.length > 0) {
      // Find the latest step based on endMonth
      const sortedSteps = [...interestSteps].sort((a, b) => b.endMonth - a.endMonth);
      rate = getEffectiveRate(sortedSteps[0]);
    }

    // 2. Find Scheduled Payment for this month
    let scheduledPayment = 0;
    if (paymentMode === 'equal') {
      scheduledPayment = equalPaymentAmount;
    } else {
      const matchingPaymentStep = paymentSteps.find(step => m >= step.startMonth && m <= step.endMonth);
      if (matchingPaymentStep) {
        scheduledPayment = matchingPaymentStep.amount;
      } else if (paymentSteps.length > 0) {
        // Fallback to the latest payment step
        const sortedPayments = [...paymentSteps].sort((a, b) => b.endMonth - a.endMonth);
        scheduledPayment = sortedPayments[0].amount;
      }
    }

    // 3. Find Extra Payment for this month
    let extraPayment = 0;
    if (extraPaymentType === 'monthly_fixed') {
      extraPayment = extraPaymentAmount;
    } else if (extraPaymentType === 'step') {
      const matchingExtraStep = extraPaymentSteps.find(step => m >= step.startMonth && m <= step.endMonth);
      if (matchingExtraStep) {
        extraPayment = matchingExtraStep.amount;
      }
    }

    // Calculate Interest: Home loan reducing balance usually uses:
    // Interest = Balance * Rate% * (Days in month / 365)
    // To make it standard and clean, we use standard monthly calculation:
    // Interest = Balance * (Rate / 100) / 12
    const monthlyInterest = currentBalance * (rate / 100) / 12;
    const roundedInterest = Math.round(monthlyInterest * 100) / 100;

    const proposedTotalPayment = scheduledPayment + extraPayment;
    const payoffAmount = currentBalance + roundedInterest;

    let actualPayment = 0;
    let actualExtraPayment = 0;
    let interestPaid = 0;
    let principalPaid = 0;
    let endingBalance = 0;

    if (proposedTotalPayment >= payoffAmount) {
      // Loan is paid off this month
      endingBalance = 0;
      interestPaid = roundedInterest;
      principalPaid = currentBalance;
      
      // Determine how to distribute actual payments
      if (scheduledPayment >= payoffAmount) {
        actualPayment = payoffAmount;
        actualExtraPayment = 0;
      } else {
        actualPayment = scheduledPayment;
        actualExtraPayment = payoffAmount - scheduledPayment;
      }
      currentBalance = 0;
    } else {
      actualPayment = scheduledPayment;
      actualExtraPayment = extraPayment;
      const totalPaid = proposedTotalPayment;

      if (totalPaid >= roundedInterest) {
        interestPaid = roundedInterest;
        principalPaid = totalPaid - roundedInterest;
        endingBalance = currentBalance - principalPaid;
      } else {
        // If the payment is less than the calculated interest, the unpaid interest increases the principal
        interestPaid = totalPaid;
        principalPaid = 0;
        endingBalance = currentBalance + (roundedInterest - totalPaid);
      }
      currentBalance = endingBalance;
    }

    schedule.push({
      month: m,
      year: Math.ceil(m / 12),
      beginningBalance: 0, // Filled in correctly in post-processing below
      interestRate: rate,
      payment: Math.round(actualPayment * 100) / 100,
      extraPayment: Math.round(actualExtraPayment * 100) / 100,
      interestPaid: Math.round(interestPaid * 100) / 100,
      principalPaid: Math.round(principalPaid * 100) / 100,
      endingBalance: Math.max(0, Math.round(endingBalance * 100) / 100),
    });

    totalInterest += interestPaid;
    totalPrincipal += principalPaid;
    totalPayments += (actualPayment + actualExtraPayment);

    if (currentBalance <= 0) {
      isPaidOff = true;
      break;
    }
  }

  // Post-process to ensure correct beginningBalance chains
  let prevBalance = loanAmount;
  for (let i = 0; i < schedule.length; i++) {
    schedule[i].beginningBalance = Math.round(prevBalance * 100) / 100;
    prevBalance = schedule[i].endingBalance;
  }

  return {
    schedule,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPrincipal: Math.round(totalPrincipal * 100) / 100,
    totalPayments: Math.round(totalPayments * 100) / 100,
    actualTermMonths: schedule.length,
    isPaidOff,
  };
}

/**
 * Generates standard baseline payments required to amortize a loan given a fixed rate.
 * This is useful to set default equal monthly payments for users.
 * PMT formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
export function calculateSuggestedPMT(principal: number, annualRate: number, years: number): number {
  const r = (annualRate / 100) / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  const pmt = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.ceil(pmt / 100) * 100; // Round up to nearest 100 for safety buffer
}
