import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  X, 
  Settings, 
  Check, 
  RefreshCw, 
  TrendingUp, 
  ArrowRight, 
  Coins, 
  User, 
  Users,
  UserPlus,
  Briefcase, 
  Percent, 
  FileDown,
  Info,
  ChevronRight,
  Plus,
  Trash2,
  Shield,
  Calculator,
  CheckCircle
} from 'lucide-react';
import { InterestStep, PaymentStep } from '../types';
import { exportApprovalNoticePDF, getStepActualRate, CombinedPaymentStep, getCombinedPaymentSteps } from '../utils/approvalNoticePdf';
import { FormattedNumberInput, formatWithCommas } from './FormattedNumberInput';
import { formatMoney } from '../utils/formatters';

export interface ApprovalStep {
  startMonth: number | string;
  endMonth: number | string;
  rateType: 'fixed' | 'floating';
  rateValue: number | string;
}

export const calculate3YearAverageRate = (steps: ApprovalStep[], mrr: number): number => {
  if (!steps || steps.length === 0) return 0;
  let totalRate = 0;
  for (let m = 1; m <= 36; m++) {
    const step = steps.find(s => m >= cleanNum(s.startMonth) && m <= cleanNum(s.endMonth));
    if (step) {
      totalRate += getStepActualRate(step, mrr);
    } else {
      if (m < cleanNum(steps[0].startMonth)) {
        totalRate += getStepActualRate(steps[0], mrr);
      } else {
        totalRate += getStepActualRate(steps[steps.length - 1], mrr);
      }
    }
  }
  return totalRate / 36;
};

export interface ApprovalPaymentStep {
  startMonth: number | string;
  endMonth: number | string;
  monthlyPayment: number | string;
}

export type LoanTypePreset = 'ไม่มี' | 'สินเชื่อบ้าน' | 'สินเชื่ออเนกประสงค์' | 'เพื่อชำระค่าเบี้ยประกันชีวิต' | 'custom';

export const LOAN_TYPE_PRESETS: { value: LoanTypePreset; label: string }[] = [
  { value: 'ไม่มี', label: 'ไม่มี' },
  { value: 'สินเชื่อบ้าน', label: 'สินเชื่อบ้าน' },
  { value: 'สินเชื่ออเนกประสงค์', label: 'สินเชื่ออเนกประสงค์' },
  { value: 'เพื่อชำระค่าเบี้ยประกันชีวิต', label: 'เพื่อชำระค่าเบี้ยประกันชีวิต' },
  { value: 'custom', label: 'อื่นๆ (ระบุเอง)' }
];

export interface ApprovalLoan {
  id: string;
  typePreset?: LoanTypePreset;
  name: string;
  amount: number | string;
  paymentType?: 'constant' | 'step'; // 'constant': ผ่อนแบบคงที่เท่ากันทุกเดือน, 'step': ผ่อนแบบขั้นบันได
  monthlyPayment: number | string;
  paymentSteps?: ApprovalPaymentStep[];
  termMonths: number | string;
  interestSteps: ApprovalStep[];
  averageRateLabel: string;
}

export interface InsuredPerson {
  id: string;
  name: string;
  coverageAmount: number | string;
  coveragePercent: number | string;
  coverageYears: number | string;
  coverageYearsPercent: number | string;
  premiumAmount: number | string;
}

export interface MrtaInsuranceDetails {
  enabled?: boolean;
  insuredPersons: InsuredPerson[];
  coverageAmount?: number | string;
  coveragePercent?: number | string;
  coverageYears?: number | string;
  coverageYearsPercent?: number | string;
  premiumAmount?: number | string;
}

export interface ApprovalNoticeData {
  salutation: string;
  borrower: string;
  coBorrower?: string;
  coOwners: string;
  statusType?: 'actual' | 'preliminary';
  mrr: number | string;
  loans: ApprovalLoan[];
  mrtaDetails?: MrtaInsuranceDetails;
  // Backwards compatibility legacy fields
  homeLoan?: ApprovalLoan;
  multiLoan?: ApprovalLoan;
  mrtaLoan?: ApprovalLoan;
  appraisalFee: number | string;
  appraisalNote: string;
  stampDuty: number | string;
  insuranceFee: number | string;
  mortgageFeePercent: number | string;
  otherFees: number | string;
}

export const PRELIMINARY_APPRAISAL_NOTE = 'เป็นราคาเริ่มต้น ทั้งนี้ ค่าบริการขึ้นอยู่กับพื้นที่ให้บริการ และ ขนาดของเนื้อที่ทรัพย์สิน';
export const ACTUAL_APPRAISAL_NOTE = 'ธนาคารจะคืนเข้าบัญชีเงินกู้ หลังจากจดจำนองกับธนาคารเรียบร้อยแล้ว ในค่างวดที่ 2';

export const DEFAULT_APPROVAL_DATA: ApprovalNoticeData = {
  salutation: 'คุณ มงคล ทองมนต์',
  borrower: 'นายมงคล ทองมนต์',
  coBorrower: 'นางสาว วิจิตตรา สิทธิวงษา',
  coOwners: 'นายมงคล ทองมนต์ และ นางสาว วิจิตตรา สิทธิวงษา',
  statusType: 'preliminary',
  mrr: 9.60,
  loans: [
    {
      id: 'loan-1',
      typePreset: 'สินเชื่อบ้าน',
      name: 'สินเชื่อบ้าน',
      amount: 1782162,
      paymentType: 'constant',
      monthlyPayment: 10700,
      paymentSteps: [
        { startMonth: 1, endMonth: 12, monthlyPayment: 8500 },
        { startMonth: 13, endMonth: 36, monthlyPayment: 10700 },
        { startMonth: 37, endMonth: 360, monthlyPayment: 12500 }
      ],
      termMonths: 360,
      interestSteps: [
        { startMonth: 1, endMonth: 6, rateType: 'fixed', rateValue: 0 },
        { startMonth: 7, endMonth: 36, rateType: 'floating', rateValue: -6.30 },
        { startMonth: 37, endMonth: 360, rateType: 'floating', rateValue: -4.65 }
      ],
      averageRateLabel: 'เฉลี่ย 3 ปี = 2.75%'
    },
    {
      id: 'loan-2',
      typePreset: 'สินเชื่ออเนกประสงค์',
      name: 'สินเชื่ออเนกประสงค์',
      amount: 140948,
      paymentType: 'constant',
      monthlyPayment: 1200,
      paymentSteps: [
        { startMonth: 1, endMonth: 36, monthlyPayment: 1200 },
        { startMonth: 37, endMonth: 360, monthlyPayment: 1400 }
      ],
      termMonths: 360,
      interestSteps: [
        { startMonth: 1, endMonth: 3, rateType: 'fixed', rateValue: 0 },
        { startMonth: 4, endMonth: 36, rateType: 'floating', rateValue: -1.75 },
        { startMonth: 37, endMonth: 360, rateType: 'floating', rateValue: -1.50 }
      ],
      averageRateLabel: 'เฉลี่ย 4 ปี = 7.24%'
    },
    {
      id: 'loan-3',
      typePreset: 'เพื่อชำระค่าเบี้ยประกันชีวิต',
      name: 'เพื่อชำระค่าเบี้ยประกันชีวิต',
      amount: 76890,
      paymentType: 'constant',
      monthlyPayment: 700,
      paymentSteps: [
        { startMonth: 1, endMonth: 36, monthlyPayment: 700 },
        { startMonth: 37, endMonth: 360, monthlyPayment: 800 }
      ],
      termMonths: 360,
      interestSteps: [
        { startMonth: 1, endMonth: 3, rateType: 'fixed', rateValue: 0 },
        { startMonth: 4, endMonth: 36, rateType: 'floating', rateValue: -1.75 },
        { startMonth: 37, endMonth: 360, rateType: 'floating', rateValue: -1.50 }
      ],
      averageRateLabel: 'เฉลี่ย 4 ปี = 7.24%'
    }
  ],
  mrtaDetails: {
    enabled: true,
    insuredPersons: [
      {
        id: 'insured-1',
        name: 'นายมงคล ทองมนต์',
        coverageAmount: 1782162,
        coveragePercent: 100,
        coverageYears: 10,
        coverageYearsPercent: 33,
        premiumAmount: 76890
      }
    ],
    coverageAmount: 1782162,
    coveragePercent: 100,
    coverageYears: 10,
    coverageYearsPercent: 33,
    premiumAmount: 76890
  },
  appraisalFee: 3210,
  appraisalNote: PRELIMINARY_APPRAISAL_NOTE,
  stampDuty: 1000,
  insuranceFee: 3000,
  mortgageFeePercent: 1.0,
  otherFees: 1000
};

const cleanNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const num = Number(String(val).replace(/,/g, '').trim());
  return isNaN(num) ? 0 : num;
};

const createDefaultPaymentSteps = (monthlyPayment: number | string, termMonths: number | string): ApprovalPaymentStep[] => {
  const pmt = cleanNum(monthlyPayment) || 10000;
  const term = cleanNum(termMonths) || 360;
  return [
    { startMonth: 1, endMonth: 12, monthlyPayment: Math.round((pmt * 0.8) / 100) * 100 || 8000 },
    { startMonth: 13, endMonth: 36, monthlyPayment: pmt || 10000 },
    { startMonth: 37, endMonth: term, monthlyPayment: Math.round((pmt * 1.15) / 100) * 100 || 12000 }
  ];
};

const normalizeApprovalData = (raw: any): ApprovalNoticeData => {
  let loans: ApprovalLoan[] = [];
  if (Array.isArray(raw.loans) && raw.loans.length > 0) {
    loans = raw.loans.map((l: any, idx: number) => {
      let typePreset: LoanTypePreset = l.typePreset;
      if (!typePreset) {
        if (l.name === 'สินเชื่อบ้าน') typePreset = 'สินเชื่อบ้าน';
        else if (l.name === 'สินเชื่ออเนกประสงค์') typePreset = 'สินเชื่ออเนกประสงค์';
        else if (l.name === 'เพื่อชำระค่าเบี้ยประกันชีวิต') typePreset = 'เพื่อชำระค่าเบี้ยประกันชีวิต';
        else if (l.name === 'ไม่มี') typePreset = 'ไม่มี';
        else typePreset = 'custom';
      }
      const paymentType: 'constant' | 'step' = l.paymentType === 'step' ? 'step' : 'constant';
      let paymentSteps: ApprovalPaymentStep[] = Array.isArray(l.paymentSteps) && l.paymentSteps.length > 0
        ? l.paymentSteps
        : (paymentType === 'step' ? createDefaultPaymentSteps(l.monthlyPayment, l.termMonths) : []);

      return {
        ...l,
        id: l.id || `loan-${idx}-${Date.now()}`,
        typePreset,
        name: l.name || (typePreset !== 'custom' && typePreset !== 'ไม่มี' ? typePreset : ''),
        paymentType,
        paymentSteps,
        interestSteps: Array.isArray(l.interestSteps) ? l.interestSteps : []
      };
    });
  } else {
    // Migration from old schema
    if (raw.homeLoan) {
      loans.push({
        ...raw.homeLoan,
        id: `loan-home-${Date.now()}`,
        typePreset: 'สินเชื่อบ้าน',
        name: raw.homeLoan.name || 'สินเชื่อบ้าน',
        paymentType: raw.homeLoan.paymentType || 'constant',
        paymentSteps: raw.homeLoan.paymentSteps || []
      });
    }
    if (raw.multiLoan) {
      loans.push({
        ...raw.multiLoan,
        id: `loan-multi-${Date.now()}`,
        typePreset: 'สินเชื่ออเนกประสงค์',
        name: raw.multiLoan.name || 'สินเชื่ออเนกประสงค์',
        paymentType: raw.multiLoan.paymentType || 'constant',
        paymentSteps: raw.multiLoan.paymentSteps || []
      });
    }
    if (raw.mrtaLoan) {
      loans.push({
        ...raw.mrtaLoan,
        id: `loan-mrta-${Date.now()}`,
        typePreset: 'เพื่อชำระค่าเบี้ยประกันชีวิต',
        name: raw.mrtaLoan.name || 'เพื่อชำระค่าเบี้ยประกันชีวิต',
        paymentType: raw.mrtaLoan.paymentType || 'constant',
        paymentSteps: raw.mrtaLoan.paymentSteps || []
      });
    }
  }

  if (loans.length === 0) {
    loans = [...DEFAULT_APPROVAL_DATA.loans];
  }

  const statusType = raw.statusType || 'preliminary';
  let appraisalFee = raw.appraisalFee;
  let appraisalNote = raw.appraisalNote;

  if (appraisalFee === undefined || appraisalFee === null) {
    appraisalFee = 3210;
  }
  if (!appraisalNote) {
    appraisalNote = statusType === 'preliminary' ? PRELIMINARY_APPRAISAL_NOTE : ACTUAL_APPRAISAL_NOTE;
  }

  const homeLoan = loans.find(l => l.typePreset === 'สินเชื่อบ้าน') || loans[0];
  const mrtaLoan = loans.find(l => l.typePreset === 'เพื่อชำระค่าเบี้ยประกันชีวิต' || l.name?.includes('ประกัน'));
  const baseCoverageAmount = homeLoan ? cleanNum(homeLoan.amount) : 1782162;
  const basePremiumAmount = mrtaLoan ? cleanNum(mrtaLoan.amount) : 76890;

  let insuredPersons: InsuredPerson[] = [];
  if (Array.isArray(raw.mrtaDetails?.insuredPersons) && raw.mrtaDetails.insuredPersons.length > 0) {
    insuredPersons = raw.mrtaDetails.insuredPersons.map((p: any, idx: number) => ({
      id: p.id || `insured-${idx + 1}`,
      name: p.name || (idx === 0 ? raw.borrower || DEFAULT_APPROVAL_DATA.borrower : raw.coBorrower || `ผู้เอาประกันคนที่ ${idx + 1}`),
      coverageAmount: p.coverageAmount !== undefined ? cleanNum(p.coverageAmount) : baseCoverageAmount,
      coveragePercent: p.coveragePercent !== undefined ? cleanNum(p.coveragePercent) : 100,
      coverageYears: p.coverageYears !== undefined ? cleanNum(p.coverageYears) : 10,
      coverageYearsPercent: p.coverageYearsPercent !== undefined ? cleanNum(p.coverageYearsPercent) : 33,
      premiumAmount: p.premiumAmount !== undefined ? cleanNum(p.premiumAmount) : (idx === 0 ? basePremiumAmount : 0)
    }));
  } else {
    insuredPersons = [
      {
        id: 'insured-1',
        name: raw.mrtaDetails?.insuredName || raw.borrower || DEFAULT_APPROVAL_DATA.borrower,
        coverageAmount: raw.mrtaDetails?.coverageAmount !== undefined ? cleanNum(raw.mrtaDetails.coverageAmount) : baseCoverageAmount,
        coveragePercent: raw.mrtaDetails?.coveragePercent !== undefined ? cleanNum(raw.mrtaDetails.coveragePercent) : 100,
        coverageYears: raw.mrtaDetails?.coverageYears !== undefined ? cleanNum(raw.mrtaDetails.coverageYears) : 10,
        coverageYearsPercent: raw.mrtaDetails?.coverageYearsPercent !== undefined ? cleanNum(raw.mrtaDetails.coverageYearsPercent) : 33,
        premiumAmount: raw.mrtaDetails?.premiumAmount !== undefined ? cleanNum(raw.mrtaDetails.premiumAmount) : basePremiumAmount
      }
    ];
  }

  const mrtaDetails: MrtaInsuranceDetails = {
    enabled: raw.mrtaDetails?.enabled !== undefined ? raw.mrtaDetails.enabled : Boolean(mrtaLoan),
    insuredPersons,
    coverageAmount: insuredPersons[0]?.coverageAmount ?? baseCoverageAmount,
    coveragePercent: insuredPersons[0]?.coveragePercent ?? 100,
    coverageYears: insuredPersons[0]?.coverageYears ?? 10,
    coverageYearsPercent: insuredPersons[0]?.coverageYearsPercent ?? 33,
    premiumAmount: insuredPersons[0]?.premiumAmount ?? basePremiumAmount
  };

  return {
    ...DEFAULT_APPROVAL_DATA,
    ...raw,
    statusType,
    appraisalFee,
    appraisalNote,
    loans,
    mrtaDetails
  };
};

interface ApprovalNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadLoan: (
    loanAmount: number,
    loanTermYears: number,
    equalPaymentAmount: number,
    steps: InterestStep[],
    paymentMode?: 'equal' | 'step',
    paymentSteps?: PaymentStep[]
  ) => void;
}

export default function ApprovalNoticeModal({ isOpen, onClose, onLoadLoan }: ApprovalNoticeModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [selectedInsuredTab, setSelectedInsuredTab] = useState<number>(0);
  const [data, setData] = useState<ApprovalNoticeData>(() => {
    const saved = localStorage.getItem('loan_approval_notice_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return normalizeApprovalData(parsed);
      } catch (e) {
        console.error('Error parsing approval data', e);
      }
    }
    return DEFAULT_APPROVAL_DATA;
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('loan_approval_notice_data', JSON.stringify(data));
  }, [data]);

  if (!isOpen) return null;

  const activeLoans = (data.loans || []).filter(l => l.typePreset !== 'ไม่มี' && l.name);
  const displayLoans = activeLoans.length > 0 ? activeLoans : data.loans;

  const mrtaLoan = displayLoans.find(l => l.typePreset === 'เพื่อชำระค่าเบี้ยประกันชีวิต' || l.name?.includes('ประกัน'));
  const hasMrtaLoan = Boolean(displayLoans.some(l => l.typePreset === 'เพื่อชำระค่าเบี้ยประกันชีวิต' || l.name === 'เพื่อชำระค่าเบี้ยประกันชีวิต'));

  const homeLoan = displayLoans.find(l => l.typePreset === 'สินเชื่อบ้าน') || displayLoans[0];
  const defaultCoverageAmount = homeLoan ? cleanNum(homeLoan.amount) : 1782162;
  const defaultPremiumAmount = mrtaLoan ? cleanNum(mrtaLoan.amount) : 76890;

  const insuredPersons: InsuredPerson[] = (data.mrtaDetails?.insuredPersons && data.mrtaDetails.insuredPersons.length > 0)
    ? data.mrtaDetails.insuredPersons
    : [
        {
          id: 'insured-1',
          name: data.borrower,
          coverageAmount: data.mrtaDetails?.coverageAmount !== undefined ? cleanNum(data.mrtaDetails.coverageAmount) : defaultCoverageAmount,
          coveragePercent: data.mrtaDetails?.coveragePercent !== undefined ? cleanNum(data.mrtaDetails.coveragePercent) : 100,
          coverageYears: data.mrtaDetails?.coverageYears !== undefined ? cleanNum(data.mrtaDetails.coverageYears) : 10,
          coverageYearsPercent: data.mrtaDetails?.coverageYearsPercent !== undefined ? cleanNum(data.mrtaDetails.coverageYearsPercent) : 33,
          premiumAmount: data.mrtaDetails?.premiumAmount !== undefined ? cleanNum(data.mrtaDetails.premiumAmount) : defaultPremiumAmount
        }
      ];

  const hasMrta = Boolean(hasMrtaLoan || (data.mrtaDetails?.enabled !== false && insuredPersons.length > 0 && cleanNum(insuredPersons[0].coverageAmount) > 0));

  const mrtaData: MrtaInsuranceDetails = {
    enabled: hasMrta,
    insuredPersons,
    coverageAmount: insuredPersons[0]?.coverageAmount ?? defaultCoverageAmount,
    coveragePercent: insuredPersons[0]?.coveragePercent ?? 100,
    coverageYears: insuredPersons[0]?.coverageYears ?? 10,
    coverageYearsPercent: insuredPersons[0]?.coverageYearsPercent ?? 33,
    premiumAmount: insuredPersons[0]?.premiumAmount ?? defaultPremiumAmount
  };

  const getLoanMonthlyPayment = (l: ApprovalLoan): number => {
    if (l.paymentType === 'step' && l.paymentSteps && l.paymentSteps.length > 0) {
      return cleanNum(l.paymentSteps[0].monthlyPayment);
    }
    return cleanNum(l.monthlyPayment);
  };

  const totalLoanAmount = displayLoans.reduce((sum, l) => sum + cleanNum(l.amount), 0);
  const totalMonthlyPayment = displayLoans.reduce((sum, l) => sum + getLoanMonthlyPayment(l), 0);
  const hasAnyStepLoan = displayLoans.some(l => l.paymentType === 'step' && (l.paymentSteps?.length || 0) > 0);
  const combinedPaymentSteps = hasAnyStepLoan ? getCombinedPaymentSteps(displayLoans) : [];

  const handleReset = () => {
    if (window.confirm('คุณต้องการรีเซ็ตข้อมูลใบแจ้งผลเป็นค่าเริ่มต้นหรือไม่?')) {
      setData(DEFAULT_APPROVAL_DATA);
    }
  };

  const handleStatusTypeChange = (newStatus: 'actual' | 'preliminary') => {
    setData(prev => ({
      ...prev,
      statusType: newStatus,
      appraisalFee: newStatus === 'preliminary' ? 3210 : prev.appraisalFee,
      appraisalNote: newStatus === 'preliminary' ? PRELIMINARY_APPRAISAL_NOTE : ACTUAL_APPRAISAL_NOTE
    }));
  };

  // Helper to load individual loan into main program
  const loadLoanIntoMain = (loan: ApprovalLoan) => {
    const mainSteps: InterestStep[] = loan.interestSteps.map((step, idx) => {
      const actualRate = getStepActualRate(step, cleanNum(data.mrr));
      return {
        id: `int-step-${Date.now()}-${idx}`,
        startMonth: cleanNum(step.startMonth),
        endMonth: cleanNum(step.endMonth),
        type: step.rateType === 'floating' ? 'floating' : 'fixed',
        rate: actualRate,
        mrr: cleanNum(data.mrr),
        operator: cleanNum(step.rateValue) < 0 ? '-' : '+',
        margin: Math.abs(cleanNum(step.rateValue)),
        bankName: 'custom'
      };
    });
    
    if (loan.paymentType === 'step' && loan.paymentSteps && loan.paymentSteps.length > 0) {
      const pSteps: PaymentStep[] = loan.paymentSteps.map((s, idx) => ({
        id: `pmt-step-${Date.now()}-${idx}`,
        startMonth: cleanNum(s.startMonth) || 1,
        endMonth: cleanNum(s.endMonth) || 360,
        amount: cleanNum(s.monthlyPayment)
      }));
      onLoadLoan(
        cleanNum(loan.amount),
        Math.round(cleanNum(loan.termMonths) / 12) || 30,
        pSteps[0]?.amount || cleanNum(loan.monthlyPayment),
        mainSteps,
        'step',
        pSteps
      );
    } else {
      onLoadLoan(
        cleanNum(loan.amount),
        Math.round(cleanNum(loan.termMonths) / 12) || 30,
        cleanNum(loan.monthlyPayment),
        mainSteps,
        'equal'
      );
    }
  };

  // Helper to load combined profile with weighted average rate steps
  const loadCombinedIntoMain = () => {
    const totalAmount = totalLoanAmount;
    if (totalAmount <= 0) return;
    
    const maxTermMonths = Math.max(...displayLoans.map(l => cleanNum(l.termMonths)), 360);
    const maxTermYears = Math.round(maxTermMonths / 12);

    const getRateAtMonth = (loan: ApprovalLoan, m: number) => {
      const step = loan.interestSteps.find(s => m >= cleanNum(s.startMonth) && m <= cleanNum(s.endMonth));
      if (!step) return 0;
      return getStepActualRate(step, cleanNum(data.mrr));
    };

    const getWeightedRate = (m: number) => {
      let weightedSum = 0;
      displayLoans.forEach(loan => {
        const r = getRateAtMonth(loan, m);
        weightedSum += cleanNum(loan.amount) * r;
      });
      return totalAmount > 0 ? weightedSum / totalAmount : 0;
    };

    const r1_3 = getWeightedRate(1);
    const r4_6 = getWeightedRate(4);
    const r7_36 = getWeightedRate(7);
    const r37_plus = getWeightedRate(37);

    const combinedSteps: InterestStep[] = [
      { id: `comb-int-1-${Date.now()}`, startMonth: 1, endMonth: 3, rate: Math.round(r1_3 * 100) / 100, type: 'fixed' },
      { id: `comb-int-2-${Date.now()}`, startMonth: 4, endMonth: 6, rate: Math.round(r4_6 * 100) / 100, type: 'fixed' },
      { id: `comb-int-3-${Date.now()}`, startMonth: 7, endMonth: 36, rate: Math.round(r7_36 * 100) / 100, type: 'fixed' },
      { id: `comb-int-4-${Date.now()}`, startMonth: 37, endMonth: maxTermMonths, rate: Math.round(r37_plus * 100) / 100, type: 'fixed' }
    ];

    if (hasAnyStepLoan && combinedPaymentSteps.length > 1) {
      const pSteps: PaymentStep[] = combinedPaymentSteps.map((s, idx) => ({
        id: `comb-pmt-step-${Date.now()}-${idx}`,
        startMonth: s.startMonth,
        endMonth: s.endMonth,
        amount: s.monthlyPayment
      }));
      onLoadLoan(
        totalAmount,
        maxTermYears,
        combinedPaymentSteps[0].monthlyPayment,
        combinedSteps,
        'step',
        pSteps
      );
    } else {
      onLoadLoan(
        totalAmount,
        maxTermYears,
        totalMonthlyPayment,
        combinedSteps,
        'equal'
      );
    }
  };

  const updateField = (path: string[], value: any) => {
    setData(prev => {
      const next = { ...prev };
      let current: any = next;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return next;
    });
  };

  const updateLoanField = (index: number, field: keyof ApprovalLoan, value: any) => {
    setData(prev => {
      const loans = [...prev.loans];
      loans[index] = { ...loans[index], [field]: value };
      
      let mrtaDetails = prev.mrtaDetails;
      if (loans[index].typePreset === 'เพื่อชำระค่าเบี้ยประกันชีวิต' && field === 'amount') {
        const persons = prev.mrtaDetails?.insuredPersons ? [...prev.mrtaDetails.insuredPersons] : [];
        const newLoanAmount = cleanNum(value);
        if (persons.length === 1) {
          persons[0] = { ...persons[0], premiumAmount: newLoanAmount };
        } else if (persons.length > 1) {
          const curIdx = Math.min(selectedInsuredTab, persons.length - 1);
          const othersTotal = persons.reduce((sum, p, i) => i === curIdx ? sum : sum + cleanNum(p.premiumAmount), 0);
          const remainder = Math.max(0, newLoanAmount - othersTotal);
          persons[curIdx] = { ...persons[curIdx], premiumAmount: remainder };
        }
        mrtaDetails = {
          ...prev.mrtaDetails,
          enabled: true,
          insuredPersons: persons,
          coverageAmount: prev.mrtaDetails?.coverageAmount ?? 1782162,
          coveragePercent: prev.mrtaDetails?.coveragePercent ?? 100,
          coverageYears: prev.mrtaDetails?.coverageYears ?? 10,
          coverageYearsPercent: prev.mrtaDetails?.coverageYearsPercent ?? 33,
          premiumAmount: newLoanAmount
        };
      }
      return { ...prev, loans, mrtaDetails };
    });
  };

  const handlePresetSelect = (index: number, preset: LoanTypePreset) => {
    setData(prev => {
      const loans = [...prev.loans];
      const loan = { ...loans[index], typePreset: preset };
      if (preset === 'ไม่มี') {
        loan.name = 'ไม่มี';
      } else if (preset !== 'custom') {
        loan.name = preset;
      }

      let mrtaDetails = prev.mrtaDetails;
      if (preset === 'เพื่อชำระค่าเบี้ยประกันชีวิต') {
        const homeLoan = loans.find(l => l.typePreset === 'สินเชื่อบ้าน') || loans[0];
        const baseHomeAmount = homeLoan ? cleanNum(homeLoan.amount) : 1782162;
        const baseHomeYears = homeLoan ? Math.round(cleanNum(homeLoan.termMonths || 360) / 12) : 30;
        const existingPersons = prev.mrtaDetails?.insuredPersons || [];
        
        let totalCurrentPremium = existingPersons.reduce((s, p) => s + cleanNum(p.premiumAmount), 0);
        if (totalCurrentPremium === 0) {
          totalCurrentPremium = cleanNum(loan.amount) || 76890;
        }
        loan.amount = totalCurrentPremium;

        const insuredPersons: InsuredPerson[] = existingPersons.length > 0
          ? existingPersons
          : [
              {
                id: 'insured-1',
                name: prev.borrower,
                coverageAmount: baseHomeAmount,
                coveragePercent: 100,
                coverageYears: Math.min(10, baseHomeYears),
                coverageYearsPercent: Math.round((Math.min(10, baseHomeYears) / (baseHomeYears || 30)) * 100),
                premiumAmount: totalCurrentPremium,
              }
            ];

        if (insuredPersons.length === 1) {
          insuredPersons[0].premiumAmount = totalCurrentPremium;
        }

        mrtaDetails = {
          enabled: true,
          insuredPersons,
          coverageAmount: insuredPersons[0].coverageAmount,
          coveragePercent: insuredPersons[0].coveragePercent,
          coverageYears: insuredPersons[0].coverageYears,
          coverageYearsPercent: insuredPersons[0].coverageYearsPercent,
          premiumAmount: totalCurrentPremium,
        };
      }

      loans[index] = loan;
      return { ...prev, loans, mrtaDetails };
    });
  };

  const handleAddInsuredPerson = () => {
    let newIndex = 0;
    setData(prev => {
      const existingPersons = prev.mrtaDetails?.insuredPersons ? [...prev.mrtaDetails.insuredPersons] : [];
      const homeLoan = prev.loans.find(l => l.typePreset === 'สินเชื่อบ้าน') || prev.loans[0];
      const baseHomeAmount = homeLoan ? cleanNum(homeLoan.amount) : 1782162;
      const baseHomeYears = homeLoan ? Math.round(cleanNum(homeLoan.termMonths || 360) / 12) : 30;

      let defaultName = `ผู้เอาประกันคนที่ ${existingPersons.length + 1}`;
      if (existingPersons.length === 1 && prev.coBorrower && existingPersons[0].name === prev.borrower) {
        defaultName = prev.coBorrower;
      }

      const newPerson: InsuredPerson = {
        id: `insured-${Date.now()}`,
        name: defaultName,
        coverageAmount: baseHomeAmount,
        coveragePercent: 100,
        coverageYears: Math.min(10, baseHomeYears),
        coverageYearsPercent: Math.round((Math.min(10, baseHomeYears) / (baseHomeYears || 30)) * 100),
        premiumAmount: 0
      };

      const nextPersons = [...existingPersons, newPerson];
      newIndex = nextPersons.length - 1;
      return {
        ...prev,
        mrtaDetails: {
          ...prev.mrtaDetails,
          enabled: true,
          insuredPersons: nextPersons,
          coverageAmount: nextPersons[0].coverageAmount,
          coveragePercent: nextPersons[0].coveragePercent,
          coverageYears: nextPersons[0].coverageYears,
          coverageYearsPercent: nextPersons[0].coverageYearsPercent,
          premiumAmount: nextPersons[0].premiumAmount
        }
      };
    });
    setSelectedInsuredTab(newIndex);
  };

  const handleRemoveInsuredPerson = (index: number) => {
    setData(prev => {
      const existingPersons = prev.mrtaDetails?.insuredPersons ? [...prev.mrtaDetails.insuredPersons] : [];
      if (existingPersons.length <= 1) return prev;
      existingPersons.splice(index, 1);
      const totalPremium = existingPersons.reduce((sum, p) => sum + cleanNum(p.premiumAmount), 0);

      const loans = prev.loans.map(l => {
        if (l.typePreset === 'เพื่อชำระค่าเบี้ยประกันชีวิต') {
          return { ...l, amount: totalPremium };
        }
        return l;
      });

      return {
        ...prev,
        loans,
        mrtaDetails: {
          ...prev.mrtaDetails,
          insuredPersons: existingPersons,
          coverageAmount: existingPersons[0]?.coverageAmount || 0,
          coveragePercent: existingPersons[0]?.coveragePercent || 0,
          coverageYears: existingPersons[0]?.coverageYears || 0,
          coverageYearsPercent: existingPersons[0]?.coverageYearsPercent || 0,
          premiumAmount: totalPremium
        }
      };
    });
    setSelectedInsuredTab(prev => Math.max(0, prev >= index ? prev - 1 : prev));
  };

  const updateInsuredPerson = (index: number, field: keyof InsuredPerson, value: any, autoCalc: boolean = true) => {
    setData(prev => {
      const existingPersons = (prev.mrtaDetails?.insuredPersons && prev.mrtaDetails.insuredPersons.length > 0)
        ? [...prev.mrtaDetails.insuredPersons]
        : [
            {
              id: 'insured-1',
              name: prev.borrower,
              coverageAmount: prev.mrtaDetails?.coverageAmount ?? 1782162,
              coveragePercent: prev.mrtaDetails?.coveragePercent ?? 100,
              coverageYears: prev.mrtaDetails?.coverageYears ?? 10,
              coverageYearsPercent: prev.mrtaDetails?.coverageYearsPercent ?? 33,
              premiumAmount: prev.mrtaDetails?.premiumAmount ?? 76890
            }
          ];

      if (!existingPersons[index]) return prev;

      const person = { ...existingPersons[index], [field]: value };
      const homeLoan = prev.loans.find(l => l.typePreset === 'สินเชื่อบ้าน') || prev.loans[0];
      const homeLoanAmount = homeLoan ? cleanNum(homeLoan.amount) : 1782162;
      const baseHomeYears = homeLoan ? Math.round(cleanNum(homeLoan.termMonths || 360) / 12) : 30;

      if (autoCalc) {
        if (field === 'coverageAmount' && homeLoanAmount > 0) {
          const amt = cleanNum(value);
          person.coveragePercent = Number(((amt / homeLoanAmount) * 100).toFixed(2));
        } else if (field === 'coveragePercent' && homeLoanAmount > 0) {
          const pct = cleanNum(value);
          person.coverageAmount = Math.round(homeLoanAmount * (pct / 100));
        } else if (field === 'coverageYears' && baseHomeYears > 0) {
          const yrs = cleanNum(value);
          person.coverageYearsPercent = Number(((yrs / baseHomeYears) * 100).toFixed(2));
        } else if (field === 'coverageYearsPercent' && baseHomeYears > 0) {
          const pct = cleanNum(value);
          person.coverageYears = Math.round(baseHomeYears * (pct / 100));
        }
      }

      existingPersons[index] = person;
      const totalPremium = existingPersons.reduce((sum, p) => sum + cleanNum(p.premiumAmount), 0);

      // Auto-sync loan with preset 'เพื่อชำระค่าเบี้ยประกันชีวิต'
      const loans = prev.loans.map(l => {
        if (l.typePreset === 'เพื่อชำระค่าเบี้ยประกันชีวิต') {
          return { ...l, amount: totalPremium };
        }
        return l;
      });

      return {
        ...prev,
        loans,
        mrtaDetails: {
          ...prev.mrtaDetails,
          enabled: true,
          insuredPersons: existingPersons,
          coverageAmount: existingPersons[0]?.coverageAmount ?? 0,
          coveragePercent: existingPersons[0]?.coveragePercent ?? 0,
          coverageYears: existingPersons[0]?.coverageYears ?? 0,
          coverageYearsPercent: existingPersons[0]?.coverageYearsPercent ?? 0,
          premiumAmount: totalPremium
        }
      };
    });
  };

  const handleAddMrtaLoan = () => {
    const homeLoan = data.loans.find(l => l.typePreset === 'สินเชื่อบ้าน') || data.loans[0];
    const baseHomeAmount = homeLoan ? cleanNum(homeLoan.amount) : 1782162;
    const baseHomeYears = homeLoan ? Math.round(cleanNum(homeLoan.termMonths || 360) / 12) : 30;

    setData(prev => {
      const existingPersons = prev.mrtaDetails?.insuredPersons || [];
      const currentTotalPremium = existingPersons.length > 0
        ? existingPersons.reduce((s, p) => s + cleanNum(p.premiumAmount), 0)
        : cleanNum(prev.mrtaDetails?.premiumAmount) || 76890;

      const newMrtaLoan: ApprovalLoan = {
        id: `loan-mrta-${Date.now()}`,
        typePreset: 'เพื่อชำระค่าเบี้ยประกันชีวิต',
        name: 'เพื่อชำระค่าเบี้ยประกันชีวิต',
        amount: currentTotalPremium,
        paymentType: 'constant',
        monthlyPayment: 700,
        paymentSteps: [
          { startMonth: 1, endMonth: 36, monthlyPayment: 700 },
          { startMonth: 37, endMonth: 360, monthlyPayment: 800 }
        ],
        termMonths: 360,
        interestSteps: [
          { startMonth: 1, endMonth: 3, rateType: 'fixed', rateValue: 0 },
          { startMonth: 4, endMonth: 36, rateType: 'floating', rateValue: -1.75 },
          { startMonth: 37, endMonth: 360, rateType: 'floating', rateValue: -1.50 }
        ],
        averageRateLabel: 'เฉลี่ย 4 ปี = 7.24%'
      };

      const loans = [...prev.loans, newMrtaLoan];
      const insuredPersons: InsuredPerson[] = existingPersons.length > 0
        ? existingPersons
        : [
            {
              id: 'insured-1',
              name: prev.borrower,
              coverageAmount: baseHomeAmount,
              coveragePercent: 100,
              coverageYears: Math.min(10, baseHomeYears),
              coverageYearsPercent: Math.round((Math.min(10, baseHomeYears) / (baseHomeYears || 30)) * 100),
              premiumAmount: currentTotalPremium
            }
          ];

      if (insuredPersons.length === 1 && cleanNum(insuredPersons[0].premiumAmount) === 0) {
        insuredPersons[0].premiumAmount = currentTotalPremium;
      }

      return {
        ...prev,
        loans,
        mrtaDetails: {
          enabled: true,
          insuredPersons,
          coverageAmount: insuredPersons[0].coverageAmount,
          coveragePercent: insuredPersons[0].coveragePercent,
          coverageYears: insuredPersons[0].coverageYears,
          coverageYearsPercent: insuredPersons[0].coverageYearsPercent,
          premiumAmount: currentTotalPremium
        }
      };
    });
  };

  const handleAddLoan = () => {
    const newId = `loan-${Date.now()}`;
    const newLoan: ApprovalLoan = {
      id: newId,
      typePreset: 'สินเชื่ออเนกประสงค์',
      name: 'สินเชื่ออเนกประสงค์',
      amount: 100000,
      monthlyPayment: 1000,
      termMonths: 360,
      interestSteps: [
        { startMonth: 1, endMonth: 36, rateType: 'floating', rateValue: -2.0 },
        { startMonth: 37, endMonth: 360, rateType: 'floating', rateValue: -1.5 }
      ],
      averageRateLabel: ''
    };
    setData(prev => ({
      ...prev,
      loans: [...prev.loans, newLoan]
    }));
  };

  const handleRemoveLoan = (index: number) => {
    if (data.loans.length <= 1) {
      alert('ต้องมีประเภทวงเงินกู้อย่างน้อย 1 รายการ หรือเลือกตัวเลือก "ไม่มี"');
      return;
    }
    setData(prev => ({
      ...prev,
      loans: prev.loans.filter((_, i) => i !== index)
    }));
  };

  const updateStepField = (loanIndex: number, stepIndex: number, field: keyof ApprovalStep, value: any) => {
    setData(prev => {
      const loans = [...prev.loans];
      const loan = { ...loans[loanIndex] };
      const steps = [...loan.interestSteps];
      steps[stepIndex] = { ...steps[stepIndex], [field]: value };
      loan.interestSteps = steps;
      loans[loanIndex] = loan;
      return { ...prev, loans };
    });
  };

  const handleAddStep = (loanIndex: number) => {
    setData(prev => {
      const loans = [...prev.loans];
      const loan = { ...loans[loanIndex] };
      const lastStep = loan.interestSteps[loan.interestSteps.length - 1];
      const startMonth = lastStep ? Number(lastStep.endMonth || 0) + 1 : 1;
      loan.interestSteps = [
        ...loan.interestSteps,
        { startMonth, endMonth: 360, rateType: 'floating', rateValue: -1.50 }
      ];
      loans[loanIndex] = loan;
      return { ...prev, loans };
    });
  };

  const handleRemoveStep = (loanIndex: number, stepIndex: number) => {
    setData(prev => {
      const loans = [...prev.loans];
      const loan = { ...loans[loanIndex] };
      if (loan.interestSteps.length <= 1) return prev;
      loan.interestSteps = loan.interestSteps.filter((_, i) => i !== stepIndex);
      loans[loanIndex] = loan;
      return { ...prev, loans };
    });
  };

  const handlePaymentTypeChange = (loanIndex: number, type: 'constant' | 'step') => {
    setData(prev => {
      const loans = [...prev.loans];
      const loan = { ...loans[loanIndex], paymentType: type };
      if (type === 'step' && (!loan.paymentSteps || loan.paymentSteps.length === 0)) {
        loan.paymentSteps = createDefaultPaymentSteps(loan.monthlyPayment, loan.termMonths);
      }
      loans[loanIndex] = loan;
      return { ...prev, loans };
    });
  };

  const handleAddPaymentStep = (loanIndex: number) => {
    setData(prev => {
      const loans = [...prev.loans];
      const loan = { ...loans[loanIndex] };
      const steps = [...(loan.paymentSteps || [])];
      const lastStep = steps[steps.length - 1];
      const startMonth = lastStep ? Number(lastStep.endMonth || 0) + 1 : 1;
      const termMonths = Number(loan.termMonths) || 360;
      const endMonth = Math.max(startMonth, termMonths);
      const defaultPmt = lastStep ? Number(String(lastStep.monthlyPayment).replace(/,/g, '') || 0) + 1000 : Number(String(loan.monthlyPayment).replace(/,/g, '') || 0);

      steps.push({
        startMonth,
        endMonth,
        monthlyPayment: defaultPmt
      });
      loan.paymentSteps = steps;
      loans[loanIndex] = loan;
      return { ...prev, loans };
    });
  };

  const handleRemovePaymentStep = (loanIndex: number, stepIndex: number) => {
    setData(prev => {
      const loans = [...prev.loans];
      const loan = { ...loans[loanIndex] };
      const steps = [...(loan.paymentSteps || [])];
      if (steps.length <= 1) return prev;
      loan.paymentSteps = steps.filter((_, i) => i !== stepIndex);
      loans[loanIndex] = loan;
      return { ...prev, loans };
    });
  };

  const updatePaymentStepField = (loanIndex: number, stepIndex: number, field: keyof ApprovalPaymentStep, value: any) => {
    setData(prev => {
      const loans = [...prev.loans];
      const loan = { ...loans[loanIndex] };
      const steps = [...(loan.paymentSteps || [])];
      steps[stepIndex] = { ...steps[stepIndex], [field]: value };
      loan.paymentSteps = steps;
      loans[loanIndex] = loan;
      return { ...prev, loans };
    });
  };

  const handleAutoCalculateAverageRate = (loanIndex: number) => {
    const targetLoan = data.loans[loanIndex];
    if (!targetLoan) return;
    const avg = calculate3YearAverageRate(targetLoan.interestSteps, cleanNum(data.mrr));
    const formatted = (Math.round(avg * 100) / 100).toFixed(2);
    updateLoanField(loanIndex, 'averageRateLabel', `เฉลี่ย 3 ปีแรก = ${formatted} %`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-[32px] bg-white shadow-2xl dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-6 py-4.5 bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 p-2 text-white shadow-md shadow-indigo-500/15">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">
                ใบแจ้งผลวงเงินอนุมัติสินเชื่อ
              </h2>
              <p className="text-xs text-slate-400">
                ตรวจสอบเงื่อนไขวงเงินกู้ อัตราดอกเบี้ยรายบัญชี และส่งข้อมูลเข้าตารางประมาณการ
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/80 px-6 bg-white dark:bg-slate-950 shrink-0">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-black border-b-2 transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>📄 ตรวจสอบใบแจ้งผล (Preview)</span>
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-black border-b-2 transition-all cursor-pointer ${
              activeTab === 'edit'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>⚙️ แก้ไขรายละเอียด (Edit Info)</span>
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/10">
          
          {/* TAB 1: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              
              {/* STYLED OFFICIAL LETTER LAYOUT */}
              <div className="rounded-[24px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2.5 h-full bg-gradient-to-b from-[#0f2d59] to-sky-500" />
                
                {/* Letter Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dashed border-slate-100 dark:border-slate-800 pb-5 mb-5 pl-3">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-[#0f2d59] dark:text-sky-400">
                      {data.statusType === 'actual' ? 'ใบแจ้งผลการพิจารณาอนุมัติวงเงินกู้' : 'ใบแจ้งผลการพิจารณาอนุมัติวงเงินกู้เบื้องต้น'}
                    </h3>
                  </div>
                  <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-xl px-4 py-2.5 text-xs md:text-[13px] font-black border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                    สถานะ: {data.statusType === 'actual' ? 'อนุมัติจริง' : 'อนุมัติเบื้องต้น'}
                  </div>
                </div>

                {/* Preliminary Approval disclaimer banner */}
                {data.statusType !== 'actual' && (
                  <div className="mb-6 mx-3 bg-amber-50/80 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/40 p-5 rounded-2xl shadow-sm">
                    <h5 className="text-sm md:text-base font-black text-amber-800 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                      <span>⚠️ หมายเหตุสำหรับอนุมัติเบื้องต้น</span>
                    </h5>
                    <p className="text-xs md:text-[15px] font-bold text-amber-900 dark:text-amber-300 leading-relaxed">
                      - วงเงินกู้อนุมัติจริง, อัตราดอกเบี้ย, ยอดผ่อนชำระ ขึ้นอยู่กับราคาประเมินหลักทรัพย์อีกครั้ง
                    </p>
                  </div>
                )}

                {/* Salutation & Owners */}
                <div className="space-y-3.5 mb-6 text-xs text-slate-600 dark:text-slate-300 pl-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-sky-500" />
                    <span><strong>เรียน:</strong> {data.salutation}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <div>
                      <span className="text-slate-400 block mb-0.5">ผู้กู้หลัก</span>
                      <strong className="text-slate-700 dark:text-slate-200 font-bold">{data.borrower}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">ผู้กู้ร่วม</span>
                      <strong className="text-slate-700 dark:text-slate-200 font-bold">{data.coBorrower || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">ผู้ถือกรรมสิทธิ์</span>
                      <strong className="text-slate-700 dark:text-slate-200 font-bold">
                        {(() => {
                          const coOwnersStr = data.coOwners || '-';
                          if (coOwnersStr.includes(' และ')) {
                            const parts = coOwnersStr.split(' และ');
                            return (
                              <span className="block">
                                {parts[0]}
                                <br />
                                และ{parts[1]}
                              </span>
                            );
                          } else if (coOwnersStr.includes('และ')) {
                            const parts = coOwnersStr.split('และ');
                            return (
                              <span className="block">
                                {parts[0]}
                                <br />
                                และ{parts[1]}
                              </span>
                            );
                          }
                          return coOwnersStr;
                        })()}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Loan Accounts Section Title */}
                <div className="mb-4 pl-3">
                  <h4 className="text-xs font-black text-[#0f2d59] dark:text-sky-400 uppercase tracking-wider">
                    รายละเอียดวงเงินกู้ที่ได้รับอนุมัติ
                  </h4>
                </div>

                {/* Dynamic Loan Accounts Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mb-6">
                  {displayLoans.map((loan, idx) => {
                    return (
                      <div 
                        key={loan.id || idx} 
                        className="rounded-2xl border border-slate-150 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/20 hover:border-sky-300 dark:hover:border-sky-900/50 transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Loan Header */}
                          <div className="flex items-center justify-between gap-1.5 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">
                              {idx + 1}. {loan.name}
                            </span>
                          </div>

                          {/* Stats */}
                          <div className="space-y-2 mb-3.5 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">วงเงินกู้:</span>
                              <strong className="text-slate-800 dark:text-slate-100 font-bold">
                                {formatMoney(cleanNum(loan.amount))} บาท
                              </strong>
                            </div>
                            {loan.paymentType === 'step' && loan.paymentSteps && loan.paymentSteps.length > 0 ? (
                              <div className="space-y-1.5 py-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-400">ผ่อนชำระ:</span>
                                  <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-full border border-sky-200/60 dark:border-sky-800/40">
                                    ผ่อนแบบขั้นบันได ({loan.paymentSteps.length} ขั้น)
                                  </span>
                                </div>
                                <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1.5 text-[11px]">
                                  {loan.paymentSteps.map((pStep, pIdx) => {
                                    const isLast = (pIdx === loan.paymentSteps.length - 1 && loan.paymentSteps.length > 1) || (cleanNum(pStep.endMonth) >= cleanNum(loan.termMonths) && cleanNum(pStep.startMonth) > 1);
                                    const pmtVal = formatMoney(cleanNum(pStep.monthlyPayment));
                                    return (
                                      <div key={pIdx} className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                                        <span>
                                          {isLast
                                            ? `เดือนที่ ${pStep.startMonth} จนถึงตลอดสัญญา:`
                                            : `เดือนที่ ${pStep.startMonth}-${pStep.endMonth}:`}
                                        </span>
                                        <strong className="text-sky-600 dark:text-sky-400 font-bold">
                                          ผ่อน {pmtVal} บาท/เดือน
                                        </strong>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between">
                                <span className="text-slate-400">ผ่อนชำระ:</span>
                                <strong className="text-sky-600 dark:text-sky-400 font-bold">
                                  {formatMoney(cleanNum(loan.monthlyPayment))} บาท/เดือน
                                </strong>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-400">ระยะเวลากู้:</span>
                              <strong className="text-slate-700 dark:text-slate-300">
                                {cleanNum(loan.termMonths)} เดือน ({Math.round(cleanNum(loan.termMonths) / 12)} ปี)
                              </strong>
                            </div>
                          </div>

                          {/* Interest Rate List */}
                          <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 mb-3 text-[10px] space-y-1">
                            <span className="block font-black text-slate-400 uppercase tracking-wide mb-1.5">
                              อัตราดอกเบี้ยต่อปี (% ต่อปี)
                            </span>
                            {loan.interestSteps.map((step, sIdx) => {
                              const calculatedRate = getStepActualRate(step, cleanNum(data.mrr));
                              return (
                                <div key={sIdx} className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                  <span>เดือนที่ {cleanNum(step.startMonth)} - {cleanNum(step.endMonth)}:</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {step.rateType === 'floating' 
                                      ? `MRR${cleanNum(step.rateValue) < 0 ? '' : '+'}${cleanNum(step.rateValue)}% (${calculatedRate.toFixed(2)}%)`
                                      : `${cleanNum(step.rateValue).toFixed(2)}%`
                                    }
                                  </span>
                                </div>
                              );
                            })}
                            
                            {loan.averageRateLabel && (
                              <div className="pt-1.5 mt-1 border-t border-dashed border-slate-100 dark:border-slate-800 flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                                <span>อัตราเฉลี่ย:</span>
                                <span>{loan.averageRateLabel}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Export Button */}
                        <button
                          type="button"
                          onClick={() => loadLoanIntoMain(loan)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 dark:hover:bg-sky-900/40 py-2 text-[10px] font-black transition cursor-pointer"
                        >
                          <span>ส่งบัญชีนี้เข้าตารางผ่อนชำระ</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Additional expenses section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-5 text-xs text-slate-600 dark:text-slate-300 pl-3">
                  
                  {/* Left Column: Signing & Mortgage Expenses */}
                  <div className="space-y-3">
                    <h5 className="font-black text-slate-700 dark:text-slate-200">
                      💸 ค่าใช้จ่ายในวันทำสัญญาและจดจำนอง
                    </h5>
                    <div className="space-y-1.5 text-[11px] bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <div className="flex justify-between">
                        <span className="text-slate-400">อากรแสตมป์ปิดสัญญา (0.05%):</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-bold">{formatMoney(cleanNum(data.stampDuty))} บาท</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ค่าประกันอัคคีภัย (3 ปี):</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-bold">{formatMoney(cleanNum(data.insuranceFee))} บาท</strong>
                      </div>
                      <div className="flex justify-between border-t border-dashed border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5">
                        <span className="text-slate-400">ค่าจดจำนองที่ดิน ({cleanNum(data.mortgageFeePercent)}%):</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-bold">{formatMoney(totalLoanAmount * (cleanNum(data.mortgageFeePercent) / 100))} บาท</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ค่าธรรมเนียมอื่นๆ ที่ดิน:</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-bold">{formatMoney(cleanNum(data.otherFees))} บาท</strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Appraisal Notes & Financial Summary */}
                  <div className="space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h5 className="font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-sky-500" />
                        <span>หมายเหตุสำคัญ</span>
                      </h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed bg-amber-50/40 border border-amber-100/60 dark:bg-amber-950/10 dark:border-amber-900/30 p-3 rounded-xl">
                        ค่าประเมิน {formatMoney(cleanNum(data.appraisalFee))} บาท ({data.appraisalNote})
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/40 p-2 text-[10px] text-center text-slate-400 rounded-lg">
                      * อ้างอิงอัตราดอกเบี้ยลอยตัว MRR ปัจจุบันที่ <strong>{cleanNum(data.mrr).toFixed(2)}%</strong>
                    </div>
                  </div>
                </div>

                {/* Combined profile summary */}
                <div className="mt-5.5 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pl-3 bg-gradient-to-r from-sky-50/40 via-white to-blue-50/40 dark:from-sky-950/10 dark:to-blue-950/10 p-4.5 rounded-2xl border border-sky-100/40 dark:border-sky-900/30">
                  <div className="text-left">
                    <span className="block text-[11px] font-black text-slate-400 uppercase tracking-wide">
                      สรุปรวมทุกวงเงิน
                    </span>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <span className="text-xs text-slate-500">
                        วงเงินรวม: <strong className="text-slate-800 dark:text-slate-100 text-sm font-black">{formatMoney(totalLoanAmount)}</strong> บาท
                      </span>
                      {(!hasAnyStepLoan || combinedPaymentSteps.length <= 1) && (
                        <span className="text-xs text-slate-500">
                          ผ่อนชำระรวม: <strong className="text-sky-600 dark:text-sky-400 text-sm font-black">{formatMoney(totalMonthlyPayment)}</strong> บาท/เดือน
                        </span>
                      )}
                    </div>

                    {hasAnyStepLoan && combinedPaymentSteps.length > 1 && (
                      <div className="mt-2.5 space-y-1 pl-3 border-l-2 border-sky-500 bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-sky-100 dark:border-sky-900/40">
                        <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 block mb-0.5">
                          ผ่อนชำระรวม (ผ่อนแบบขั้นบันได):
                        </span>
                        {combinedPaymentSteps.map((cStep, cIdx) => {
                          const isLast = cIdx === combinedPaymentSteps.length - 1 && combinedPaymentSteps.length > 1;
                          const pmtVal = formatMoney(cStep.monthlyPayment);
                          return (
                            <div key={cIdx} className="text-xs font-bold text-sky-600 dark:text-sky-400">
                              {isLast ? (
                                <span>เดือนที่ {cStep.startMonth} จนถึงตลอดสัญญา ผ่อนชำระรวม {pmtVal} บาท/เดือน</span>
                              ) : (
                                <span>เดือนที่ {cStep.startMonth} ถึง {cStep.endMonth} ผ่อนชำระรวม {pmtVal} บาท/เดือน</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={loadCombinedIntoMain}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-[#0f2d59] hover:from-sky-700 hover:to-[#173e73] text-white font-black text-xs px-5 py-3 shadow-md shadow-sky-500/10 transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer shrink-0"
                  >
                    <span>🚀 โหลดแบบผ่อนรวมทุกบัญชีพร้อมกัน</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

              </div>

              {/* PREVIEW PAGE 2: LIFE INSURANCE (MRTA) */}
              {hasMrta && (
                <div className="rounded-[24px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2.5 h-full bg-gradient-to-b from-[#0f2d59] to-blue-500" />
                  
                  {/* Page 2 Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-dashed border-slate-100 dark:border-slate-800 pb-5 mb-5 pl-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-0.5 rounded-md border border-sky-100 dark:border-sky-900/40">
                          หน้าที่ 2 ในไฟล์ PDF
                        </span>
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-[#0f2d59] dark:text-sky-400">
                        แจ้งรายละเอียดประกันชีวิตเพิ่มเติม
                      </h3>
                    </div>
                    <div className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl px-4 py-2.5 text-xs md:text-[13px] font-black border border-blue-100 dark:border-blue-900/50 shadow-sm flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span>ประกันชีวิตคุ้มครองสินเชื่อ</span>
                    </div>
                  </div>

                  {/* Salutation & Owners for Page 2 */}
                  <div className="space-y-3.5 mb-6 text-xs text-slate-600 dark:text-slate-300 pl-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-sky-500" />
                      <span><strong>เรียน:</strong> {data.salutation}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <div>
                        <span className="text-slate-400 block mb-0.5">ผู้ขอเอาประกัน</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-bold">{data.borrower}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">ผู้กู้ร่วม</span>
                        <strong className="text-slate-700 dark:text-slate-200 font-bold">{data.coBorrower || '-'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Insured Persons Metric Cards */}
                  <div className="space-y-5 mb-6 pl-3">
                    {insuredPersons.map((person, pIdx) => (
                      <div key={person.id || pIdx} className="space-y-2.5">
                        {insuredPersons.length > 1 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-[#0f2d59] dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-3 py-1 rounded-lg border border-sky-200 dark:border-sky-800">
                              ผู้เอาประกันคนที่ {pIdx + 1}: {person.name}
                            </span>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4.5 dark:border-sky-900/40 dark:bg-sky-950/20 shadow-sm">
                            <span className="text-xs font-bold text-sky-700 dark:text-sky-300 block mb-1">🛡️ ทุนเอาประกัน</span>
                            <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                              {formatMoney(cleanNum(person.coverageAmount))} <span className="text-xs font-medium text-slate-500">บาท</span>
                            </div>
                            <span className="text-xs font-bold text-sky-600 dark:text-sky-400 mt-1 block">
                              คิดเป็น {cleanNum(person.coveragePercent)}% ของวงเงินกู้
                            </span>
                          </div>

                          <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4.5 dark:border-purple-900/40 dark:bg-purple-950/20 shadow-sm">
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 block mb-1">⏳ ระยะเวลาคุ้มครอง</span>
                            <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                              {cleanNum(person.coverageYears)} <span className="text-xs font-medium text-slate-500">ปี</span>
                            </div>
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1 block">
                              คิดเป็น {cleanNum(person.coverageYearsPercent)}% ของระยะเวลากู้
                            </span>
                          </div>

                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4.5 dark:border-emerald-900/40 dark:bg-emerald-950/20 shadow-sm">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block mb-1">💳 ค่าเบี้ยประกันชีวิต</span>
                            <div className="text-xl font-black text-slate-800 dark:text-slate-100">
                              {formatMoney(cleanNum(person.premiumAmount))} <span className="text-xs font-medium text-slate-500">บาท</span>
                            </div>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                              ชำระครั้งเดียว
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {insuredPersons.length > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <span>รวมค่าเบี้ยประกันชีวิตทั้งหมด:</span>
                        <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                          {formatMoney(insuredPersons.reduce((sum, p) => sum + cleanNum(p.premiumAmount), 0))} บาท ชำระครั้งเดียว
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Coverage Box */}
                  <div className="mb-6 pl-3">
                    <h4 className="text-xs font-black text-[#0f2d59] dark:text-sky-400 uppercase tracking-wider mb-2">
                      รายละเอียดของคุ้มครอง
                    </h4>
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs md:text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          กรณีเสียชีวิต <span className="font-normal text-slate-500 dark:text-slate-400">ตามตารางจำนวนเงินเอาประกันภัยที่ลดลง</span>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          กรณีทุพพลภาพถาวรสิ้นเชิง <span className="font-normal text-slate-500 dark:text-slate-400">ตามตารางจำนวนเงินเอาประกันภัยที่ลดลง</span>
                        </span>
                      </div>
                      <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
                        * ตารางความคุ้มครอง และตารางเวนคืนกรมธรรม์ประกันชีวิต จะถูกส่งไปพร้อมกับกรมธรรม์
                      </div>
                    </div>
                  </div>

                  {/* Important Notes Box */}
                  <div className="mb-6 pl-3">
                    <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                      หมายเหตุ
                    </h4>
                    <div className="bg-amber-50/70 dark:bg-amber-950/20 p-4.5 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-2.5 text-xs md:text-sm text-amber-950 dark:text-amber-200">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-amber-700">1.</span>
                        <span>การทำประกันชีวิต ไม่มีผลต่อการอนุมัติสินเชื่อ แต่มีผลต่ออัตราดอกเบี้ยและโปรโมชั่นพิเศษที่ได้รับ</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-amber-700">2.</span>
                        <div>
                          <span>ผู้ขอเอาประกันสามารถขอยกเลิกกรมธรรม์ได้ ภายใน 30 วัน นับตั้งแต่ได้รับกรมธรรม์ประกันชีวิต</span>
                          <p className="mt-1 text-amber-900 dark:text-amber-300 font-medium leading-relaxed">
                            หากยกเลิกประกัน หรือไม่ผ่านเงื่อนไขการทำประกันชีวิตคุ้มครองสินเชื่อก่อนสัญญาครบกำหนด 3 ปี อัตราดอกเบี้ยจะถูกปรับขึ้นเป็นปกติตามเงื่อนไขผลิตภัณฑ์ที่ได้รับ และเบี้ยประกันนั้นจะถูกนำไปใช้ชำระคืนเงินกู้ตามสัญญา
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Acknowledgement */}
                  <div className="text-center py-4 pl-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-base font-black text-[#0f2d59] dark:text-sky-400">ขอแสดงความนับถือ</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EDIT INFO */}
          {activeTab === 'edit' && (
            <div className="space-y-6">
              
              {/* Reset button bar */}
              <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400">
                  แก้ไขข้อมูลตัวเลข วงเงิน ชื่อ และ อัตราดอกเบี้ยได้อิสระ
                </span>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-xs font-black text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-3.5 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900/40 hover:bg-rose-100 transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>รีเซ็ตข้อมูลเริ่มต้น</span>
                </button>
              </div>

              {/* General metadata */}
              <div className="rounded-[24px] border border-slate-150 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-950">
                <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                  ข้อมูลผู้รับเอกสารและเกณฑ์อ้างอิง
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      สถานะวงเงินอนุมัติ
                    </label>
                    <select
                      value={data.statusType || 'preliminary'}
                      onChange={(e) => handleStatusTypeChange(e.target.value as any)}
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900 cursor-pointer"
                    >
                      <option value="preliminary">อนุมัติเบื้องต้น (Preliminary Approved)</option>
                      <option value="actual">อนุมัติจริง (Approved)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      คำขึ้นต้น (เรียน)
                    </label>
                    <input
                      type="text"
                      value={data.salutation}
                      onChange={(e) => updateField(['salutation'], e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      ชื่อผู้กู้หลัก
                    </label>
                    <input
                      type="text"
                      value={data.borrower}
                      onChange={(e) => updateField(['borrower'], e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      ชื่อผู้กู้ร่วม
                    </label>
                    <input
                      type="text"
                      value={data.coBorrower || ''}
                      onChange={(e) => updateField(['coBorrower'], e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                      placeholder="ระบุชื่อผู้กู้ร่วม (ถ้ามี)"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      ผู้ถือกรรมสิทธิ์
                    </label>
                    <input
                      type="text"
                      value={data.coOwners}
                      onChange={(e) => updateField(['coOwners'], e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      MRR อ้างอิงปัจจุบัน (% ต่อปี)
                    </label>
                    <FormattedNumberInput
                      value={data.mrr}
                      onChange={(v) => updateField(['mrr'], v)}
                      allowDecimal
                      placeholder="9.60"
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Header and Add Loan button */}
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  รายการประเภทวงเงินกู้ ({data.loans.length} รายการ)
                </h4>
                <button
                  type="button"
                  onClick={handleAddLoan}
                  className="flex items-center gap-1.5 text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-2 rounded-xl hover:bg-indigo-100 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>เพิ่มประเภทวงเงินกู้</span>
                </button>
              </div>

              {/* Dynamic Loan Accounts Editing Forms */}
              {data.loans.map((loan, idx) => {
                const currentPreset = loan.typePreset || (
                  loan.name === 'สินเชื่อบ้าน' ? 'สินเชื่อบ้าน' :
                  loan.name === 'สินเชื่ออเนกประสงค์' ? 'สินเชื่ออเนกประสงค์' :
                  loan.name === 'เพื่อชำระค่าเบี้ยประกันชีวิต' ? 'เพื่อชำระค่าเบี้ยประกันชีวิต' :
                  loan.name === 'ไม่มี' ? 'ไม่มี' : 'custom'
                );

                return (
                  <div 
                    key={loan.id || idx} 
                    className="rounded-[24px] border border-slate-150 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-950 relative"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-indigo-50 text-[10px] text-indigo-600 font-black dark:bg-indigo-950/50 dark:text-indigo-400">
                          {idx + 1}
                        </span>
                        <span>{loan.name || 'วงเงินกู้'}</span>
                      </h4>

                      <button
                        type="button"
                        onClick={() => handleRemoveLoan(idx)}
                        className="text-xs font-bold text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                        title="ลบวงเงินนี้"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Loan Type Dropdown */}
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          เลือกประเภทวงเงินกู้
                        </label>
                        <select
                          value={currentPreset}
                          onChange={(e) => handlePresetSelect(idx, e.target.value as LoanTypePreset)}
                          className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900 cursor-pointer"
                        >
                          {LOAN_TYPE_PRESETS.map(preset => (
                            <option key={preset.value} value={preset.value}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Custom Name input if custom is selected */}
                      {currentPreset === 'custom' ? (
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            ระบุชื่อวงเงินกู้เอง
                          </label>
                          <input
                            type="text"
                            value={loan.name}
                            onChange={(e) => updateLoanField(idx, 'name', e.target.value)}
                            placeholder="เช่น สินเชื่อเพื่อสิ่งแวดล้อม, สินเชื่อตกแต่งบ้าน"
                            className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                          />
                        </div>
                      ) : (
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            ชื่อที่แสดงในเอกสาร
                          </label>
                          <input
                            type="text"
                            value={loan.name}
                            onChange={(e) => updateLoanField(idx, 'name', e.target.value)}
                            className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                          />
                        </div>
                      )}

                      {/* Amount */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          จำนวนเงินกู้ (บาท)
                        </label>
                        <FormattedNumberInput
                          value={loan.amount}
                          onChange={(v) => updateLoanField(idx, 'amount', v)}
                          isCurrency
                          allowDecimal
                          placeholder="เช่น 1,782,162.00"
                          className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                        />
                        {currentPreset === 'เพื่อชำระค่าเบี้ยประกันชีวิต' && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>เชื่อมโยงเท่ากับค่าเบี้ยประกันชีวิตรวม</span>
                          </div>
                        )}
                      </div>

                      {/* Term Months */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          ระยะเวลากู้ (เดือน)
                        </label>
                        <FormattedNumberInput
                          value={loan.termMonths}
                          onChange={(v) => updateLoanField(idx, 'termMonths', v)}
                          isYears={false}
                          placeholder="เช่น 360"
                          className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                        />
                      </div>

                      {/* Payment Method Dropdown Block */}
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          แบบการผ่อนชำระ
                        </label>
                        <select
                          value={loan.paymentType || 'constant'}
                          onChange={(e) => handlePaymentTypeChange(idx, e.target.value as 'constant' | 'step')}
                          className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900 cursor-pointer"
                        >
                          <option value="constant">ผ่อนแบบคงที่เท่ากันทุกเดือน</option>
                          <option value="step">ผ่อนแบบขั้นบันได (เดือนที่ xx ถึง xx ผ่อนชำระ xx บาท/เดือน)</option>
                        </select>
                      </div>

                      {/* If constant: Monthly Payment Field */}
                      {(!loan.paymentType || loan.paymentType === 'constant') && (
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-400 mb-1">
                            ผ่อนจ่ายต่อเดือน (บาท)
                          </label>
                          <FormattedNumberInput
                            value={loan.monthlyPayment}
                            onChange={(v) => updateLoanField(idx, 'monthlyPayment', v)}
                            isCurrency
                            allowDecimal
                            placeholder="เช่น 10,700.00"
                            className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                          />
                        </div>
                      )}
                    </div>

                    {/* If step: Step payment configuration block */}
                    {loan.paymentType === 'step' && (
                      <div className="space-y-3 bg-sky-50/70 dark:bg-sky-950/20 p-4 rounded-2xl border border-sky-200 dark:border-sky-900/40">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="block text-xs font-black text-sky-800 dark:text-sky-300">
                              แบบการผ่อนชำระ: ผ่อนแบบขั้นบันได
                            </span>
                            <span className="text-[10px] text-sky-600 dark:text-sky-400">
                              กำหนดเดือนที่เริ่มต้น - สิ้นสุด และยอดผ่อนชำระต่อเดือน (บาท)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddPaymentStep(idx)}
                            className="text-[11px] font-bold text-sky-700 bg-white hover:bg-sky-50 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-sky-300 flex items-center gap-1 px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 transition cursor-pointer shadow-xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>เพิ่มขั้นบันไดผ่อน</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(loan.paymentSteps || []).map((pStep, pIdx) => (
                            <div key={pIdx} className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end bg-white dark:bg-slate-900 p-3 rounded-xl border border-sky-150 dark:border-sky-900/40">
                              <div className="md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                                  ตั้งแต่เดือนที่
                                </label>
                                <FormattedNumberInput
                                  value={pStep.startMonth}
                                  onChange={(v) => updatePaymentStepField(idx, pIdx, 'startMonth', v)}
                                  placeholder="1"
                                  className="w-full text-xs font-bold rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 outline-none dark:border-slate-800 dark:bg-slate-950"
                                />
                              </div>
                              <div className="md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                                  ถึงเดือนที่
                                </label>
                                <FormattedNumberInput
                                  value={pStep.endMonth}
                                  onChange={(v) => updatePaymentStepField(idx, pIdx, 'endMonth', v)}
                                  placeholder="12"
                                  className="w-full text-xs font-bold rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 outline-none dark:border-slate-800 dark:bg-slate-950"
                                />
                              </div>
                              <div className="md:col-span-5">
                                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                                  ผ่อนชำระ (บาท/เดือน)
                                </label>
                                <FormattedNumberInput
                                  value={pStep.monthlyPayment}
                                  onChange={(v) => updatePaymentStepField(idx, pIdx, 'monthlyPayment', v)}
                                  isCurrency
                                  allowDecimal
                                  placeholder="เช่น 8,500.00"
                                  className="w-full text-xs font-bold rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 outline-none dark:border-slate-800 dark:bg-slate-950 text-sky-600 dark:text-sky-400"
                                />
                              </div>
                              <div className="md:col-span-1 pb-1 flex justify-end">
                                {(loan.paymentSteps || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePaymentStep(idx, pIdx)}
                                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                    title="ลบขั้นบันไดนี้"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interest steps editing lists */}
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wide">
                          ขั้นบันไดอัตราดอกเบี้ย (% ต่อปี)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAddStep(idx)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>เพิ่มช่วงเดือน</span>
                        </button>
                      </div>

                      {loan.interestSteps.map((step, sIdx) => {
                        return (
                          <div key={sIdx} className="grid grid-cols-2 md:grid-cols-6 gap-2.5 items-end">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">
                                ตั้งแต่เดือนที่
                              </label>
                              <FormattedNumberInput
                                value={step.startMonth}
                                onChange={(v) => updateStepField(idx, sIdx, 'startMonth', v)}
                                placeholder="1"
                                className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 outline-none dark:border-slate-800 dark:bg-slate-950"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">
                                ถึงเดือนที่
                              </label>
                              <FormattedNumberInput
                                value={step.endMonth}
                                onChange={(v) => updateStepField(idx, sIdx, 'endMonth', v)}
                                placeholder="36"
                                className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 outline-none dark:border-slate-800 dark:bg-slate-950"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">
                                ประเภทดอกเบี้ย
                              </label>
                              <select
                                value={step.rateType}
                                onChange={(e) => updateStepField(idx, sIdx, 'rateType', e.target.value as any)}
                                className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 outline-none dark:border-slate-800 dark:bg-slate-950 cursor-pointer"
                              >
                                <option value="fixed">คงที่ (Fixed %)</option>
                                <option value="floating">ลอยตัว (MRR +/- %)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 mb-1">
                                {step.rateType === 'floating' ? 'ส่วนลด/ส่วนต่าง (-/+ %)' : 'อัตราดอกเบี้ย (%)'}
                              </label>
                              <FormattedNumberInput
                                value={step.rateValue}
                                onChange={(v) => updateStepField(idx, sIdx, 'rateValue', v)}
                                allowDecimal
                                allowNegative
                                placeholder="-2.00"
                                className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 outline-none dark:border-slate-800 dark:bg-slate-950"
                              />
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 pb-2">
                              คำนวณได้: <span className="text-indigo-600 dark:text-indigo-400">{getStepActualRate(step, Number(data.mrr || 0)).toFixed(2)}%</span>
                            </div>
                            <div className="pb-1.5 flex justify-end">
                              {loan.interestSteps.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStep(idx, sIdx)}
                                  className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                                  title="ลบช่วงเดือนนี้"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Average Rate Summary at the bottom of the interest rate table */}
                      <div className="mt-3.5 pt-3.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              ข้อความสรุปอัตราเฉลี่ย (แสดงท้ายตารางอัตราดอกเบี้ย)
                            </label>
                            {(() => {
                              const calcRate = calculate3YearAverageRate(loan.interestSteps, cleanNum(data.mrr));
                              return calcRate > 0 ? (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
                                  คำนวณเฉลี่ย 3 ปีแรกได้: {calcRate.toFixed(2)}%
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAutoCalculateAverageRate(idx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200/70 dark:border-indigo-800/50 transition cursor-pointer self-start sm:self-auto shadow-xs active:scale-[0.98]"
                            title="ดึงข้อมูลอัตราดอกเบี้ย 36 เดือนแรก หารด้วย 36 เดือน"
                          >
                            <Calculator className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>คำนวณอัตโนมัติ (เฉลี่ย 3 ปีแรก)</span>
                          </button>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={loan.averageRateLabel || ''}
                            onChange={(e) => updateLoanField(idx, 'averageRateLabel', e.target.value)}
                            className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                            placeholder="เช่น เฉลี่ย 3 ปีแรก = 2.75%"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          * กดปุ่มคำนวณอัตโนมัติเพื่อดึงข้อมูลดอกเบี้ย 36 เดือนแรกหารด้วย 36 เดือน (เฉลี่ย 3 ปีแรก = XX %) หรือสามารถพิมพ์แก้ไขข้อความเองได้ตามต้องการ
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* MRTA Insurance Details Configuration */}
              <div className="rounded-[24px] border border-blue-200 bg-blue-50/20 p-5 space-y-4 dark:border-blue-900/50 dark:bg-blue-950/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      แจ้งรายละเอียดประกันชีวิตเพิ่มเติม
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasMrtaLoan && (
                      <button
                        type="button"
                        onClick={handleAddMrtaLoan}
                        className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        + เพิ่มวงเงินกู้เพื่อชำระค่าเบี้ยประกันชีวิต
                      </button>
                    )}
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold px-2.5 py-1 rounded-full">
                      {hasMrta ? 'เปิดใช้งาน' : 'ระบุเพื่อเปิดใช้งาน'}
                    </span>
                  </div>
                </div>

                {/* Toolbar for Insured Persons */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 dark:border-blue-900/40 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      ผู้เอาประกัน:
                    </span>
                    {insuredPersons.map((person, pIdx) => {
                      const isSelected = (selectedInsuredTab >= insuredPersons.length ? 0 : selectedInsuredTab) === pIdx;
                      return (
                        <div key={person.id || pIdx} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedInsuredTab(pIdx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <User className="h-3.5 w-3.5" />
                            <span>{person.name ? `ผู้เอาประกัน: ${person.name}` : `ผู้เอาประกันคนที่ ${pIdx + 1}`}</span>
                          </button>
                          {insuredPersons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveInsuredPerson(pIdx)}
                              className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                              title="ลบผู้เอาประกันนี้"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddInsuredPerson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 transition cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <UserPlus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>เพิ่มผู้เอาประกัน</span>
                  </button>
                </div>

                {/* Form for selected insured person */}
                {(() => {
                  const currentIdx = Math.min(selectedInsuredTab, insuredPersons.length - 1);
                  const currentPerson = insuredPersons[currentIdx] || insuredPersons[0];
                  if (!currentPerson) return null;

                  return (
                    <div className="bg-white dark:bg-slate-950 p-4.5 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-4">
                      {/* Name with quick select buttons */}
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            ชื่อผู้เอาประกัน
                          </label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-medium">เลือกจาก:</span>
                            <button
                              type="button"
                              onClick={() => updateInsuredPerson(currentIdx, 'name', data.borrower)}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                            >
                              ผู้กู้: {data.borrower}
                            </button>
                            {data.coBorrower && (
                              <button
                                type="button"
                                onClick={() => updateInsuredPerson(currentIdx, 'name', data.coBorrower)}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                              >
                                ผู้กู้ร่วม: {data.coBorrower}
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="text"
                          value={currentPerson.name || ''}
                          onChange={(e) => updateInsuredPerson(currentIdx, 'name', e.target.value)}
                          placeholder="ระบุชื่อผู้เอาประกัน"
                          className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ทุนเอาประกัน
                          </label>
                          <FormattedNumberInput
                            value={currentPerson.coverageAmount}
                            onChange={(v) => updateInsuredPerson(currentIdx, 'coverageAmount', v)}
                            isCurrency
                            allowDecimal
                            placeholder="เช่น 1,782,162.00"
                            className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            คิดเป็น % ของวงเงินกู้
                          </label>
                          <FormattedNumberInput
                            value={currentPerson.coveragePercent}
                            onChange={(v) => updateInsuredPerson(currentIdx, 'coveragePercent', v)}
                            allowDecimal
                            placeholder="100"
                            className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ระยะเวลาคุ้มครอง
                          </label>
                          <FormattedNumberInput
                            value={currentPerson.coverageYears}
                            onChange={(v) => updateInsuredPerson(currentIdx, 'coverageYears', v)}
                            isYears
                            placeholder="10"
                            className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            คิดเป็น % ของระยะเวลากู้
                          </label>
                          <FormattedNumberInput
                            value={currentPerson.coverageYearsPercent}
                            onChange={(v) => updateInsuredPerson(currentIdx, 'coverageYearsPercent', v)}
                            allowDecimal
                            placeholder="33"
                            className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
                          />
                        </div>

                        <div className="md:col-span-2 lg:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ค่าเบี้ยประกันชีวิต
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <FormattedNumberInput
                              value={currentPerson.premiumAmount}
                              onChange={(v) => updateInsuredPerson(currentIdx, 'premiumAmount', v)}
                              isCurrency
                              allowDecimal
                              placeholder="เช่น 76,890.00"
                              className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
                            />
                            {mrtaLoan && (
                              <button
                                type="button"
                                onClick={() => updateInsuredPerson(currentIdx, 'premiumAmount', mrtaLoan.amount)}
                                className="shrink-0 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900/50 cursor-pointer transition whitespace-nowrap"
                              >
                                ดึงจากยอดกู้เบี้ยประกัน {formatMoney(cleanNum(mrtaLoan.amount))}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Synchronization Box between Total Premium and MRTA Loan */}
                {(() => {
                  const totalInsuredPremium = insuredPersons.reduce((sum, p) => sum + cleanNum(p.premiumAmount), 0);
                  const isMatching = mrtaLoan ? cleanNum(mrtaLoan.amount) === totalInsuredPremium : false;

                  return (
                    <div className={`p-4 rounded-2xl border transition ${
                      mrtaLoan 
                        ? (isMatching 
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-300'
                            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-300')
                        : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-800/50 text-blue-900 dark:text-blue-300'
                    }`}>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {mrtaLoan && isMatching ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            ) : (
                              <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            )}
                            <span className="text-xs font-black">
                              ค่าเบี้ยประกันชีวิตรวม: {formatMoney(totalInsuredPremium)} บาท
                            </span>
                          </div>
                          {mrtaLoan ? (
                            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                              วงเงินกู้เพื่อชำระค่าเบี้ยประกันชีวิต: <span className="font-bold text-slate-800 dark:text-slate-200">{formatMoney(cleanNum(mrtaLoan.amount))} บาท</span>
                              {isMatching ? (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                  ตรงกัน (100%)
                                </span>
                              ) : (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                  ไม่ตรงกัน
                                </span>
                              )}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              (ยังไม่มีวงเงินกู้เพื่อชำระค่าเบี้ยประกันชีวิตในรายการเงินกู้)
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {mrtaLoan ? (
                            !isMatching && (
                              <button
                                type="button"
                                onClick={() => {
                                  setData(prev => ({
                                    ...prev,
                                    loans: prev.loans.map(l => l.typePreset === 'เพื่อชำระค่าเบี้ยประกันชีวิต' ? { ...l, amount: totalInsuredPremium } : l)
                                  }));
                                }}
                                className="text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
                              >
                                ซิงค์วงเงินกู้ให้เท่ากับค่าเบี้ย ({formatMoney(totalInsuredPremium)})
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={handleAddMrtaLoan}
                              className="text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>เพิ่มวงเงินกู้ประกันชีวิต {formatMoney(totalInsuredPremium)} บาท</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Other fees configuration */}
              <div className="rounded-[24px] border border-slate-150 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-950">
                <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                  ค่าใช้จ่ายเพิ่มเติม
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      ค่าประเมิน (บาท)
                    </label>
                    <FormattedNumberInput
                      value={data.appraisalFee}
                      onChange={(v) => updateField(['appraisalFee'], v)}
                      isCurrency
                      allowDecimal
                      placeholder="เช่น 3,210.00"
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      หมายเหตุค่าประเมิน
                    </label>
                    <input
                      type="text"
                      value={data.appraisalNote}
                      onChange={(e) => updateField(['appraisalNote'], e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      อากรแสตมป์ปิดสัญญา (บาท)
                    </label>
                    <FormattedNumberInput
                      value={data.stampDuty}
                      onChange={(v) => updateField(['stampDuty'], v)}
                      isCurrency
                      allowDecimal
                      placeholder="เช่น 1,000.00"
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      ค่าประกันอัคคีภัย (บาท)
                    </label>
                    <FormattedNumberInput
                      value={data.insuranceFee}
                      onChange={(v) => updateField(['insuranceFee'], v)}
                      isCurrency
                      allowDecimal
                      placeholder="เช่น 3,000.00"
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      ค่าธรรมเนียมจดจำนองที่ดิน (%)
                    </label>
                    <FormattedNumberInput
                      value={data.mortgageFeePercent}
                      onChange={(v) => updateField(['mortgageFeePercent'], v)}
                      allowDecimal
                      placeholder="1.0"
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      ค่าธรรมเนียมอื่นๆ ที่กรมที่ดิน (บาท)
                    </label>
                    <FormattedNumberInput
                      value={data.otherFees}
                      onChange={(v) => updateField(['otherFees'], v)}
                      isCurrency
                      allowDecimal
                      placeholder="เช่น 1,000.00"
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-indigo-500 dark:border-slate-850 dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/40 flex justify-end gap-3 shrink-0 animate-in fade-in duration-300">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-xs px-5 py-3 cursor-pointer"
          >
            ปิดหน้าจอ
          </button>
          
          <button
            onClick={() => {
              setActiveTab(activeTab === 'preview' ? 'edit' : 'preview');
            }}
            className="rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-bold text-xs px-5 py-3 cursor-pointer"
          >
            {activeTab === 'preview' ? '⚙️ ตั้งค่าข้อมูลสินเชื่อ' : '📄 ดูหน้าตารายงานจริง'}
          </button>

          {activeTab === 'preview' && (
            <button
              onClick={() => exportApprovalNoticePDF(data)}
              className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs px-5 py-3 flex items-center gap-2 shadow-md shadow-indigo-500/10 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
            >
              <FileDown className="h-4 w-4" />
              <span>ดาวน์โหลด PDF</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
