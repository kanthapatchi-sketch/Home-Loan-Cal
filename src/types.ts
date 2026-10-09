/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BankMrr {
  name: string;
  fullName: string;
  mrr: number;
  color: string;
  updateDate: string;
  effectiveDate?: string;
  category?: 'state' | 'commercial' | 'retail';
  change?: number;
  source?: string;
  note?: string;
}

export interface BotMrrResponse {
  success: boolean;
  source: string;
  sourceUrl: string;
  asOfDate: string;
  policyRate?: number;
  lastSync: string;
  syncMode: 'auto' | 'manual';
  banks: BankMrr[];
  averageMrr: number;
  lowestMrrBank: string;
}


export interface InterestStep {
  id: string;
  startMonth: number;
  endMonth: number; // can be the maximum (e.g. 360) for "rest of loan"
  type?: 'fixed' | 'floating'; // 'fixed' or 'floating'
  rate: number; // Final annual rate used in calculations
  mrr?: number; // MRR value
  operator?: '+' | '-'; // Operator (+ or -)
  margin?: number; // Percentage adjustment to MRR
  bankName?: string; // Selected bank name for MRR tracking
}

export interface PaymentStep {
  id: string;
  startMonth: number;
  endMonth: number;
  amount: number; // Monthly payment in THB (e.g., 15000)
}

export interface ExtraPaymentStep {
  id: string;
  startMonth: number;
  endMonth: number;
  amount: number; // Monthly extra payment in THB
}

export type ExtraPaymentType = 'none' | 'monthly_fixed' | 'step';

export interface LoanScenario {
  id: string;
  name: string;
  loanAmount: number;
  loanTermYears: number;
  interestSteps: InterestStep[];
  paymentMode: 'equal' | 'step';
  equalPaymentAmount: number; // Used if paymentMode === 'equal'
  paymentSteps: PaymentStep[]; // Used if paymentMode === 'step'
  extraPaymentType: ExtraPaymentType;
  extraPaymentAmount: number; // Flat extra amount added every month
  extraPaymentSteps: ExtraPaymentStep[]; // Extra payment steps
  createdAt: number;
}

export interface AmortizationMonth {
  month: number;
  year: number;
  beginningBalance: number;
  interestRate: number;
  payment: number;
  extraPayment: number;
  interestPaid: number;
  principalPaid: number;
  endingBalance: number;
}

export interface CalculationResult {
  schedule: AmortizationMonth[];
  totalInterest: number;
  totalPrincipal: number;
  totalPayments: number;
  actualTermMonths: number;
  isPaidOff: boolean;
}
