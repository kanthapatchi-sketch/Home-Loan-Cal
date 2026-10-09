/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Percent,
  Home,
  TrendingUp,
  Coins,
  CalendarCheck,
  Plus,
  Trash2,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Award,
  BadgePercent,
  TrendingUp as IconTrending,
  ChevronRight,
  Calculator,
  FileDown,
  AlertTriangle,
  FileText,
  History,
  ChevronDown,
  Smartphone,
  Terminal
} from 'lucide-react';
import { InterestStep, PaymentStep, ExtraPaymentStep, ExtraPaymentType, LoanScenario, BankMrr } from './types';
import { calculateLoan, calculateSuggestedPMT, getEffectiveRate } from './utils/calculator';
import MetricCard from './components/MetricCard';
import LoanCharts from './components/LoanCharts';
import AmortizationTable from './components/AmortizationTable';
import SavedScenarios from './components/SavedScenarios';
import CompareScenarios from './components/CompareScenarios';
import MrrStatus from './components/MrrStatus';
import ApprovalNoticeModal from './components/ApprovalNoticeModal';
import { AndroidProjectModal } from './components/AndroidProjectModal';
import { PromptModal } from './components/PromptModal';
import { jsPDF } from 'jspdf';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { formatMoney, formatYears, cleanNum } from './utils/formatters';
import { FormattedNumberInput } from './components/FormattedNumberInput';
import { OFFICIAL_BOT_MRR_BANKS, fetchBotMrrRates } from './services/botMrrData';


interface FlexibleInputProps {
  id: string;
  value: number;
  onChange: (val: number) => void;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  isCurrency?: boolean;
  isYears?: boolean;
  allowDecimal?: boolean;
}

function FlexibleInput({
  id,
  value,
  onChange,
  className = "",
  min = 0,
  max,
  step = 1,
  placeholder = "",
  disabled = false,
  isCurrency = false,
  isYears = false,
  allowDecimal
}: FlexibleInputProps) {
  return (
    <FormattedNumberInput
      id={id}
      value={value}
      onChange={(v) => onChange(typeof v === 'number' ? v : cleanNum(v))}
      className={className}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      disabled={disabled}
      isCurrency={isCurrency}
      isYears={isYears}
      allowDecimal={allowDecimal}
    />
  );
}

export default function App() {
  // --- BOT (Bank of Thailand) MRR States & Auto-Sync ---
  const [isBotAutoSync, setIsBotAutoSync] = useState<boolean>(() => {
    const saved = localStorage.getItem('bot_mrr_auto_sync');
    return saved !== null ? saved === 'true' : true;
  });
  const [botLastSyncTime, setBotLastSyncTime] = useState<string>('9 ตุลาคม 2569 (ประกาศ ธปท.)');
  const [isSyncingBot, setIsSyncingBot] = useState<boolean>(false);

  const [bankMrrs, setBankMrrs] = useState<BankMrr[]>(() => {
    const saved = localStorage.getItem('premium_thai_bank_mrr');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return OFFICIAL_BOT_MRR_BANKS;
  });

  const handleSaveBankMrrs = (updatedList: BankMrr[]) => {
    setBankMrrs(updatedList);
    localStorage.setItem('premium_thai_bank_mrr', JSON.stringify(updatedList));

    // Also update any matching interest steps that are set to use this bank's MRR
    setInterestSteps(prevSteps => 
      prevSteps.map(step => {
        if (step.type === 'floating' && step.bankName && step.bankName !== 'custom') {
          const matchingBank = updatedList.find(b => b.name === step.bankName);
          if (matchingBank) {
            return { ...step, mrr: matchingBank.mrr };
          }
        }
        return step;
      })
    );
  };

  const handleSyncBotRates = async () => {
    setIsSyncingBot(true);
    try {
      const data = await fetchBotMrrRates();
      if (data && data.banks && data.banks.length > 0) {
        setBankMrrs(data.banks);
        localStorage.setItem('premium_thai_bank_mrr', JSON.stringify(data.banks));
        const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        setBotLastSyncTime(`${data.asOfDate} (${nowStr} น. / ธปท.)`);

        // Synchronize any matching floating interest steps
        setInterestSteps(prevSteps => 
          prevSteps.map(step => {
            if (step.type === 'floating' && step.bankName && step.bankName !== 'custom') {
              const matchingBank = data.banks.find(b => b.name === step.bankName);
              if (matchingBank) {
                return { ...step, mrr: matchingBank.mrr };
              }
            }
            return step;
          })
        );
      }
    } catch (err) {
      console.warn('Auto sync BOT MRR error:', err);
    } finally {
      setIsSyncingBot(false);
    }
  };

  // Auto-sync with BOT on initial load if enabled
  useEffect(() => {
    if (isBotAutoSync) {
      handleSyncBotRates();
    }
  }, []);

  // Quick apply chosen bank MRR to all floating steps
  const handleApplyBankToFloatingSteps = (bankName: string, mrrVal: number) => {
    setInterestSteps(prevSteps => 
      prevSteps.map(step => {
        if (step.type === 'floating') {
          return { ...step, bankName, mrr: mrrVal };
        }
        return step;
      })
    );
  };


  const [loanAmount, setLoanAmount] = useState<number>(() => {
    const saved = localStorage.getItem('mortgage_loanAmount');
    return saved !== null ? Number(saved) : 3000000;
  });
  const [loanTermYears, setLoanTermYears] = useState<number>(() => {
    const saved = localStorage.getItem('mortgage_loanTermYears');
    return saved !== null ? Number(saved) : 30;
  });
  
  // Interest Steps
  const [interestMode, setInterestMode] = useState<'fixed' | 'step'>(() => {
    const saved = localStorage.getItem('mortgage_interestMode');
    return (saved === 'fixed' || saved === 'step') ? saved : 'step';
  });
  const [interestSteps, setInterestSteps] = useState<InterestStep[]>(() => {
    const saved = localStorage.getItem('mortgage_interestSteps');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing interestSteps from localStorage', e);
      }
    }
    return [
      { id: 'int-1', startMonth: 1, endMonth: 12, rate: 2.50 },
      { id: 'int-2', startMonth: 13, endMonth: 36, rate: 3.50 },
      { id: 'int-3', startMonth: 37, endMonth: 360, rate: 5.25 },
    ];
  });

  // Payment Steps
  const [paymentMode, setPaymentMode] = useState<'equal' | 'step'>(() => {
    const saved = localStorage.getItem('mortgage_paymentMode');
    return (saved === 'equal' || saved === 'step') ? saved : 'equal';
  });
  const [equalPaymentAmount, setEqualPaymentAmount] = useState<number>(() => {
    const saved = localStorage.getItem('mortgage_equalPaymentAmount');
    return saved !== null ? Number(saved) : 14000;
  });
  const [paymentSteps, setPaymentSteps] = useState<PaymentStep[]>(() => {
    const saved = localStorage.getItem('mortgage_paymentSteps');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing paymentSteps from localStorage', e);
      }
    }
    return [
      { id: 'pay-1', startMonth: 1, endMonth: 12, amount: 11000 },
      { id: 'pay-2', startMonth: 13, endMonth: 36, amount: 13000 },
      { id: 'pay-3', startMonth: 37, endMonth: 360, amount: 16000 },
    ];
  });

  // Extra Payments
  const [extraPaymentType, setExtraPaymentType] = useState<ExtraPaymentType>(() => {
    const saved = localStorage.getItem('mortgage_extraPaymentType');
    return saved !== null ? saved as ExtraPaymentType : 'none';
  });
  const [extraPaymentAmount, setExtraPaymentAmount] = useState<number>(() => {
    const saved = localStorage.getItem('mortgage_extraPaymentAmount');
    return saved !== null ? Number(saved) : 3000;
  });
  const [extraPaymentSteps, setExtraPaymentSteps] = useState<ExtraPaymentStep[]>(() => {
    const saved = localStorage.getItem('mortgage_extraPaymentSteps');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing extraPaymentSteps from localStorage', e);
      }
    }
    return [
      { id: 'ext-1', startMonth: 1, endMonth: 36, amount: 3000 },
      { id: 'ext-2', startMonth: 37, endMonth: 360, amount: 5000 },
    ];
  });

  // Save states automatically on change to localStorage
  useEffect(() => {
    localStorage.setItem('mortgage_loanAmount', loanAmount.toString());
    localStorage.setItem('mortgage_loanTermYears', loanTermYears.toString());
    localStorage.setItem('mortgage_interestMode', interestMode);
    localStorage.setItem('mortgage_interestSteps', JSON.stringify(interestSteps));
    localStorage.setItem('mortgage_paymentMode', paymentMode);
    localStorage.setItem('mortgage_equalPaymentAmount', equalPaymentAmount.toString());
    localStorage.setItem('mortgage_paymentSteps', JSON.stringify(paymentSteps));
    localStorage.setItem('mortgage_extraPaymentType', extraPaymentType);
    localStorage.setItem('mortgage_extraPaymentAmount', extraPaymentAmount.toString());
    localStorage.setItem('mortgage_extraPaymentSteps', JSON.stringify(extraPaymentSteps));
  }, [
    loanAmount,
    loanTermYears,
    interestMode,
    interestSteps,
    paymentMode,
    equalPaymentAmount,
    paymentSteps,
    extraPaymentType,
    extraPaymentAmount,
    extraPaymentSteps,
  ]);

  // --- Calculation History Feature ---
  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = useState(false);
  const [calculationHistory, setCalculationHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('mortgage_calculation_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing calculation history', e);
      }
    }
    return [];
  });

  const getHistoryLabel = (scenario: any) => {
    const amtStr = scenario.loanAmount >= 1000000 
      ? `${(scenario.loanAmount / 1000000).toFixed(2)}M` 
      : `${(scenario.loanAmount / 1000).toLocaleString('th-TH')}k`;
    const pmtStr = scenario.paymentMode === 'equal' 
      ? (scenario.equalPaymentAmount >= 1000 ? `${(scenario.equalPaymentAmount / 1000).toFixed(1)}k` : `${scenario.equalPaymentAmount}`)
      : 'สเต็ป';
    const extraStr = scenario.extraPaymentType === 'none' 
      ? '' 
      : ` (+โปะ ${scenario.extraPaymentType === 'monthly_fixed' ? (scenario.extraPaymentAmount >= 1000 ? `${(scenario.extraPaymentAmount / 1000).toFixed(1)}k` : `${scenario.extraPaymentAmount}`) : 'สเต็ป'})`;
    return `กู้ ${amtStr} (${scenario.loanTermYears}ปี) ผ่อน ${pmtStr}${extraStr}`;
  };

  const handleLoadHistoryItem = (item: any) => {
    setLoanAmount(item.loanAmount);
    setLoanTermYears(item.loanTermYears);
    setInterestMode(item.interestMode);
    setInterestSteps(item.interestSteps);
    setPaymentMode(item.paymentMode);
    setEqualPaymentAmount(item.equalPaymentAmount);
    setPaymentSteps(item.paymentSteps);
    setExtraPaymentType(item.extraPaymentType);
    setExtraPaymentAmount(item.extraPaymentAmount);
    setExtraPaymentSteps(item.extraPaymentSteps);
    
    // Switch to charts and show results on mobile
    setActiveTab('charts');
    setMobileActiveView('results');
  };

  // Confirmation Modals State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPdfConfirmOpen, setIsPdfConfirmOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Active right side tab
  const [activeTab, setActiveTab] = useState<'charts' | 'table' | 'scenarios' | 'compare' | 'mrr'>('charts');

  // Mobile navigation view (inputs or results)
  const [mobileActiveView, setMobileActiveView] = useState<'inputs' | 'results'>('inputs');

  // --- PDF Export Dialog States ---
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfStartYear, setPdfStartYear] = useState(1);
  const [pdfEndYear, setPdfEndYear] = useState(loanTermYears);
  const [pdfReportType, setPdfReportType] = useState<'yearly' | 'monthly' | 'none'>('yearly');
  const [pdfPlanName, setPdfPlanName] = useState('แผนการชำระเงินหลัก');
  const [pdfPlanColor, setPdfPlanColor] = useState('#bae6fd');

  // --- Chaining Adjusters to maintain validity ---
  const totalMonths = useMemo(() => loanTermYears * 12, [loanTermYears]);

  // Auto-adjust interest steps when loanTermYears changes or when interestSteps are modified
  const adjustInterestSteps = (steps: InterestStep[], totalMs: number): InterestStep[] => {
    if (steps.length === 0) return [];
    const adjusted = [...steps];
    
    // First step always starts at 1
    adjusted[0] = { ...adjusted[0], startMonth: 1 };
    
    for (let i = 1; i < adjusted.length; i++) {
      const prevEnd = adjusted[i - 1].endMonth;
      const newStart = prevEnd + 1;
      let newEnd = adjusted[i].endMonth;
      if (newEnd < newStart) {
        newEnd = newStart + 11;
      }
      adjusted[i] = {
        ...adjusted[i],
        startMonth: newStart,
        endMonth: newEnd,
      };
    }
    
    // Last step always ends at the end of the loan
    const lastIdx = adjusted.length - 1;
    adjusted[lastIdx] = {
      ...adjusted[lastIdx],
      endMonth: Math.max(adjusted[lastIdx].startMonth, totalMs),
    };
    
    return adjusted;
  };

  // Auto-adjust payment steps
  const adjustPaymentSteps = (steps: PaymentStep[], totalMs: number): PaymentStep[] => {
    if (steps.length === 0) return [];
    const adjusted = [...steps];
    
    adjusted[0] = { ...adjusted[0], startMonth: 1 };
    
    for (let i = 1; i < adjusted.length; i++) {
      const prevEnd = adjusted[i - 1].endMonth;
      const newStart = prevEnd + 1;
      let newEnd = adjusted[i].endMonth;
      if (newEnd < newStart) {
        newEnd = newStart + 11;
      }
      adjusted[i] = {
        ...adjusted[i],
        startMonth: newStart,
        endMonth: newEnd,
      };
    }
    
    const lastIdx = adjusted.length - 1;
    adjusted[lastIdx] = {
      ...adjusted[lastIdx],
      endMonth: Math.max(adjusted[lastIdx].startMonth, totalMs),
    };
    
    return adjusted;
  };

  // Auto-adjust extra payment steps
  const adjustExtraPaymentSteps = (steps: ExtraPaymentStep[], totalMs: number): ExtraPaymentStep[] => {
    if (steps.length === 0) return [];
    const adjusted = [...steps];
    
    adjusted[0] = { ...adjusted[0], startMonth: 1 };
    
    for (let i = 1; i < adjusted.length; i++) {
      const prevEnd = adjusted[i - 1].endMonth;
      const newStart = prevEnd + 1;
      let newEnd = adjusted[i].endMonth;
      if (newEnd < newStart) {
        newEnd = newStart + 11;
      }
      adjusted[i] = {
        ...adjusted[i],
        startMonth: newStart,
        endMonth: newEnd,
      };
    }
    
    const lastIdx = adjusted.length - 1;
    adjusted[lastIdx] = {
      ...adjusted[lastIdx],
      endMonth: Math.max(adjusted[lastIdx].startMonth, totalMs),
    };
    
    return adjusted;
  };

  // Keep Steps synced with totalMonths
  useEffect(() => {
    setInterestSteps(prev => adjustInterestSteps(prev, totalMonths));
    setPaymentSteps(prev => adjustPaymentSteps(prev, totalMonths));
    setExtraPaymentSteps(prev => adjustExtraPaymentSteps(prev, totalMonths));
  }, [totalMonths]);

  // --- Handlers for Interest Steps ---
  const handleAddInterestStep = () => {
    if (interestSteps.length >= 10) return; // limit to 10 steps to keep UI clean
    const lastStep = interestSteps[interestSteps.length - 1];
    if (!lastStep) {
      setInterestSteps([{ id: `int-${Date.now()}`, startMonth: 1, endMonth: totalMonths, rate: 3.0 }]);
      return;
    }
    
    // We want to shrink the last step to make room for a new step ending at totalMonths.
    // If the last step has a duration larger than 12 months, we shrink it by 12 months.
    // Otherwise, we shrink it to half its duration (or at least 1 month).
    const currentDuration = lastStep.endMonth - lastStep.startMonth + 1;
    let shrinkBy = 12;
    if (currentDuration <= 12) {
      shrinkBy = Math.max(1, Math.floor(currentDuration / 2));
    }
    
    const newLastStepEnd = Math.max(lastStep.startMonth, lastStep.endMonth - shrinkBy);
    
    const updatedSteps = interestSteps.map((step, idx) => {
      if (idx === interestSteps.length - 1) {
        return { ...step, endMonth: newLastStepEnd };
      }
      return step;
    });
    
    const newStep: InterestStep = {
      id: `int-${Date.now()}`,
      startMonth: newLastStepEnd + 1,
      endMonth: totalMonths,
      rate: lastStep.rate,
    };
    
    setInterestSteps(adjustInterestSteps([...updatedSteps, newStep], totalMonths));
  };

  const handleRemoveInterestStep = (id: string) => {
    if (interestSteps.length <= 1) return; // Must have at least one step
    const filtered = interestSteps.filter(step => step.id !== id);
    setInterestSteps(adjustInterestSteps(filtered, totalMonths));
  };

  const handleUpdateInterestStep = (id: string, updates: Partial<InterestStep>) => {
    const updated = interestSteps.map(step => {
      if (step.id === id) {
        return { ...step, ...updates };
      }
      return step;
    });
    setInterestSteps(adjustInterestSteps(updated, totalMonths));
  };

  // --- Handlers for Payment Steps ---
  const handleAddPaymentStep = () => {
    if (paymentSteps.length >= 10) return; // limit to 10 steps
    const lastStep = paymentSteps[paymentSteps.length - 1];
    if (!lastStep) {
      setPaymentSteps([{ id: `pay-${Date.now()}`, startMonth: 1, endMonth: totalMonths, amount: equalPaymentAmount || 15000 }]);
      return;
    }
    
    const currentDuration = lastStep.endMonth - lastStep.startMonth + 1;
    let shrinkBy = 12;
    if (currentDuration <= 12) {
      shrinkBy = Math.max(1, Math.floor(currentDuration / 2));
    }
    
    const newLastStepEnd = Math.max(lastStep.startMonth, lastStep.endMonth - shrinkBy);
    
    const updatedSteps = paymentSteps.map((step, idx) => {
      if (idx === paymentSteps.length - 1) {
        return { ...step, endMonth: newLastStepEnd };
      }
      return step;
    });
    
    const newStep: PaymentStep = {
      id: `pay-${Date.now()}`,
      startMonth: newLastStepEnd + 1,
      endMonth: totalMonths,
      amount: lastStep.amount + 1000,
    };
    
    setPaymentSteps(adjustPaymentSteps([...updatedSteps, newStep], totalMonths));
  };

  const handleRemovePaymentStep = (id: string) => {
    if (paymentSteps.length <= 1) return;
    const filtered = paymentSteps.filter(step => step.id !== id);
    setPaymentSteps(adjustPaymentSteps(filtered, totalMonths));
  };

  const handleUpdatePaymentStep = (id: string, updates: Partial<PaymentStep>) => {
    const updated = paymentSteps.map(step => {
      if (step.id === id) {
        return { ...step, ...updates };
      }
      return step;
    });
    setPaymentSteps(adjustPaymentSteps(updated, totalMonths));
  };

  // --- Handlers for Extra Payment Steps ---
  const handleAddExtraStep = () => {
    const lastStep = extraPaymentSteps[extraPaymentSteps.length - 1];
    const start = lastStep ? lastStep.endMonth + 1 : 1;
    const end = Math.min(start + 11, totalMonths);
    if (start > totalMonths) return;
    
    const newStep: ExtraPaymentStep = {
      id: `ext-${Date.now()}`,
      startMonth: start,
      endMonth: end,
      amount: lastStep ? lastStep.amount : 2000,
    };
    
    setExtraPaymentSteps(prev => adjustExtraPaymentSteps([...prev, newStep], totalMonths));
  };

  const handleRemoveExtraStep = (id: string) => {
    if (extraPaymentSteps.length <= 1) return;
    const filtered = extraPaymentSteps.filter(step => step.id !== id);
    setExtraPaymentSteps(adjustExtraPaymentSteps(filtered, totalMonths));
  };

  const handleUpdateExtraStep = (id: string, updates: Partial<ExtraPaymentStep>) => {
    const updated = extraPaymentSteps.map(step => {
      if (step.id === id) {
        return { ...step, ...updates };
      }
      return step;
    });
    setExtraPaymentSteps(adjustExtraPaymentSteps(updated, totalMonths));
  };

  // --- Quick Suggestions / Utilities ---
  const handleUseSuggestedPMT = () => {
    // Determine a weighted average interest rate or just first step rate
    const refRate = interestMode === 'fixed' && interestSteps[0] ? interestSteps[0].rate : (interestSteps[0]?.rate || 4.5);
    const suggested = calculateSuggestedPMT(loanAmount, refRate, loanTermYears);
    setEqualPaymentAmount(suggested);
  };

  // --- Calculations ---
  
  // 1. Current user configuration scenario
  const currentScenario = useMemo(() => {
    // If interest mode is fixed, we only take the first step rate and stretch it to total months
    const finalizedInterestSteps = interestMode === 'fixed' && interestSteps[0]
      ? [{ ...interestSteps[0], startMonth: 1, endMonth: totalMonths }]
      : interestSteps;

    return {
      loanAmount,
      loanTermYears,
      interestSteps: finalizedInterestSteps,
      paymentMode,
      equalPaymentAmount,
      paymentSteps,
      extraPaymentType,
      extraPaymentAmount,
      extraPaymentSteps,
    };
  }, [
    loanAmount,
    loanTermYears,
    interestMode,
    interestSteps,
    paymentMode,
    equalPaymentAmount,
    paymentSteps,
    extraPaymentType,
    extraPaymentAmount,
    extraPaymentSteps,
    totalMonths,
  ]);

  const result = useMemo(() => {
    return calculateLoan(currentScenario);
  }, [currentScenario]);

  // Keep PDF year range bounds in sync with the calculated schedule duration
  useEffect(() => {
    const maxYear = result.schedule.length > 0 ? result.schedule[result.schedule.length - 1].year : loanTermYears;
    setPdfEndYear(prev => {
      if (prev > maxYear || prev === 0) {
        return maxYear;
      }
      return prev;
    });
    setPdfStartYear(prev => {
      if (prev > maxYear) {
        return 1;
      }
      return prev;
    });
  }, [result.schedule, loanTermYears]);

  // 2. Baseline Scenario (Standard, equal PMT, NO extra payments)
  // Used to compare and show "How much you saved" and "How much faster you pay off"
  const baselineScenario = useMemo(() => {
    // Take the exact same interest rates, but force equal payments and no extra
    const firstRate = interestSteps[0]?.rate || 4.5;
    const suggestedPMT = calculateSuggestedPMT(loanAmount, firstRate, loanTermYears);

    return {
      loanAmount,
      loanTermYears,
      interestSteps: interestMode === 'fixed' && interestSteps[0]
        ? [{ ...interestSteps[0], startMonth: 1, endMonth: totalMonths }]
        : interestSteps,
      paymentMode: 'equal' as const,
      equalPaymentAmount: Math.max(suggestedPMT, equalPaymentAmount), // minimum that guarantees paying off
      paymentSteps: [],
      extraPaymentType: 'none' as const,
      extraPaymentAmount: 0,
      extraPaymentSteps: [],
    };
  }, [loanAmount, loanTermYears, interestSteps, interestMode, equalPaymentAmount, totalMonths]);

  const baselineResult = useMemo(() => {
    return calculateLoan(baselineScenario);
  }, [baselineScenario]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const label = getHistoryLabel(currentScenario);
      const newEntry = {
        loanAmount: currentScenario.loanAmount,
        loanTermYears: currentScenario.loanTermYears,
        interestMode,
        interestSteps: currentScenario.interestSteps,
        paymentMode: currentScenario.paymentMode,
        equalPaymentAmount: currentScenario.equalPaymentAmount,
        paymentSteps: currentScenario.paymentSteps,
        extraPaymentType: currentScenario.extraPaymentType,
        extraPaymentAmount: currentScenario.extraPaymentAmount,
        extraPaymentSteps: currentScenario.extraPaymentSteps,
        id: `hist-${Date.now()}`,
        label,
        timestamp: Date.now()
      };

      setCalculationHistory(prev => {
        if (prev.length > 0) {
          const last = prev[0];
          const isDuplicate = 
            last.loanAmount === newEntry.loanAmount &&
            last.loanTermYears === newEntry.loanTermYears &&
            last.interestMode === newEntry.interestMode &&
            last.paymentMode === newEntry.paymentMode &&
            last.equalPaymentAmount === newEntry.equalPaymentAmount &&
            last.extraPaymentType === newEntry.extraPaymentType &&
            last.extraPaymentAmount === newEntry.extraPaymentAmount &&
            JSON.stringify(last.interestSteps) === JSON.stringify(newEntry.interestSteps) &&
            JSON.stringify(last.paymentSteps) === JSON.stringify(newEntry.paymentSteps) &&
            JSON.stringify(last.extraPaymentSteps) === JSON.stringify(newEntry.extraPaymentSteps);

          if (isDuplicate) {
            return prev;
          }
        }

        const updated = [newEntry, ...prev].slice(0, 5);
        localStorage.setItem('mortgage_calculation_history', JSON.stringify(updated));
        return updated;
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentScenario, interestMode]);

  // --- Load Scenario from Comparison Panel ---
  const handleLoadScenario = (loaded: LoanScenario) => {
    setLoanAmount(loaded.loanAmount);
    setLoanTermYears(loaded.loanTermYears);
    
    // Detect interest mode
    if (loaded.interestSteps.length === 1 && loaded.interestSteps[0].endMonth >= loaded.loanTermYears * 12) {
      setInterestMode('fixed');
    } else {
      setInterestMode('step');
    }
    setInterestSteps(loaded.interestSteps);

    setPaymentMode(loaded.paymentMode);
    setEqualPaymentAmount(loaded.equalPaymentAmount);
    setPaymentSteps(loaded.paymentSteps.length > 0 ? loaded.paymentSteps : [
      { id: 'pay-1', startMonth: 1, endMonth: 12, amount: Math.round(loaded.equalPaymentAmount * 0.8) },
      { id: 'pay-2', startMonth: 13, endMonth: 36, amount: loaded.equalPaymentAmount },
      { id: 'pay-3', startMonth: 37, endMonth: loaded.loanTermYears * 12, amount: Math.round(loaded.equalPaymentAmount * 1.2) },
    ]);

    setExtraPaymentType(loaded.extraPaymentType);
    setExtraPaymentAmount(loaded.extraPaymentAmount);
    setExtraPaymentSteps(loaded.extraPaymentSteps.length > 0 ? loaded.extraPaymentSteps : [
      { id: 'ext-1', startMonth: 1, endMonth: 36, amount: 2000 },
      { id: 'ext-2', startMonth: 37, endMonth: loaded.loanTermYears * 12, amount: 4000 },
    ]);

    if (loaded.name) {
      setPdfPlanName(loaded.name);
    }

    // Switch to charts and show results on mobile
    setActiveTab('charts');
    setMobileActiveView('results');
  };

  const handleApplyCompareToMain = (applied: Omit<LoanScenario, 'id' | 'name' | 'createdAt'>) => {
    setLoanAmount(applied.loanAmount);
    setLoanTermYears(applied.loanTermYears);
    
    // Detect interest mode
    if (applied.interestSteps.length === 1 && applied.interestSteps[0].endMonth >= applied.loanTermYears * 12) {
      setInterestMode('fixed');
    } else {
      setInterestMode('step');
    }
    setInterestSteps(applied.interestSteps);

    setPaymentMode(applied.paymentMode);
    setEqualPaymentAmount(applied.equalPaymentAmount);
    setPaymentSteps(applied.paymentSteps.length > 0 ? applied.paymentSteps : [
      { id: 'pay-1', startMonth: 1, endMonth: 12, amount: Math.round(applied.equalPaymentAmount * 0.8) },
      { id: 'pay-2', startMonth: 13, endMonth: 36, amount: applied.equalPaymentAmount },
      { id: 'pay-3', startMonth: 37, endMonth: applied.loanTermYears * 12, amount: Math.round(applied.equalPaymentAmount * 1.2) },
    ]);

    setExtraPaymentType(applied.extraPaymentType);
    setExtraPaymentAmount(applied.extraPaymentAmount);
    setExtraPaymentSteps(applied.extraPaymentSteps.length > 0 ? applied.extraPaymentSteps : [
      { id: 'ext-1', startMonth: 1, endMonth: 36, amount: 2000 },
      { id: 'ext-2', startMonth: 37, endMonth: applied.loanTermYears * 12, amount: 4000 },
    ]);

    setActiveTab('charts');
  };

  const getYearlyInterest = (yearNum: number) => {
    return result.schedule
      .filter(m => m.year === yearNum)
      .reduce((sum, m) => sum + m.interestPaid, 0);
  };

  const handleExportPDF = () => {
    // Create high-res canvas for Page 1 (Summary Dashboard)
    const canvas = document.createElement('canvas');
    const width = 1240;
    const height = 1754;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Subtle background pattern
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fillRect(20, 20, width - 40, height - 40);

    // Border
    ctx.strokeStyle = '#cbd5e1'; // slate-300
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, width - 60, height - 60);
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 2;
    ctx.strokeRect(38, 38, width - 76, height - 76);

    // Header Banner (emerald gradient)
    const grad = ctx.createLinearGradient(50, 50, width - 100, 200);
    grad.addColorStop(0, '#047857'); // emerald-700
    grad.addColorStop(1, '#0d9488'); // teal-600
    ctx.fillStyle = grad;

    // Rounded banner
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(50, 50, width - 100, 180, 24);
    } else {
      ctx.rect(50, 50, width - 100, 180);
    }
    ctx.fill();

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ตารางประมาณการผ่อนชำระวงเงินกู้', width / 2, 110);

    // Bolder and larger font for the financial plan name as requested
    ctx.font = 'bold 28px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillStyle = pdfPlanColor;
    ctx.fillText(pdfPlanName, width / 2, 158);

    // Separated date line for aesthetic clarity and readability
    ctx.font = '16px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('ออกเอกสาร ณ วันที่ ' + new Date().toLocaleDateString('th-TH'), width / 2, 196);

    // Section 1: สรุปข้อมูลวงเงินกู้หลัก
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(50, 260, width - 100, 280, 16);
    } else {
      ctx.rect(50, 260, width - 100, 280);
    }
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(50, 260, width - 100, 280);

    ctx.textAlign = 'left';
    ctx.fillStyle = pdfPlanColor;
    ctx.font = 'bold 28px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillText('วงเงิน : ' + pdfPlanName, 80, 310);

    ctx.strokeStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(80, 335);
    ctx.lineTo(width - 80, 335);
    ctx.stroke();

    ctx.font = '24px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillStyle = '#475569'; // slate-600

    // Row 1
    ctx.fillText('วงเงินกู้จำนวน:', 80, 390);
    ctx.fillStyle = '#0f766e'; // teal-700
    ctx.font = 'bold 26px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillText(`${formatMoney(loanAmount)} บาท`, 380, 390);

    // Row 2
    ctx.fillStyle = '#475569';
    ctx.font = '24px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillText('ระยะเวลาการผ่อนชำระ:', 80, 440);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 26px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillText(`${loanTermYears} ปี (${totalMonths} งวด)`, 380, 440);

    // Row 3
    ctx.fillStyle = '#475569';
    ctx.font = '24px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillText('ผ่อนชำระเดือนละ:', 80, 490);
    ctx.fillStyle = '#2563eb'; // blue-600
    ctx.font = 'bold 26px "Sarabun", "Inter", "Thonburi", sans-serif';

    const monthlyPmtStr = paymentMode === 'equal'
      ? `${formatMoney(equalPaymentAmount)} บาท (คงที่ทุกเดือน)`
      : `${formatMoney(paymentSteps[0]?.amount)} บาท (สเต็ปเริ่มต้น)`;
    ctx.fillText(monthlyPmtStr, 380, 490);

    // Section 2: รายละเอียดของอัตราดอกเบี้ย
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(50, 570, width - 100, 320, 16);
    } else {
      ctx.rect(50, 570, width - 100, 320);
    }
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(50, 570, width - 100, 320);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 28px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillText('รายละเอียดของอัตราดอกเบี้ย (Interest Rate Steps)', 80, 620);

    ctx.strokeStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(80, 645);
    ctx.lineTo(width - 80, 645);
    ctx.stroke();

    ctx.font = '22px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillStyle = '#475569';
    let currentY = 690;

    const finalizedInterestSteps = interestMode === 'fixed' && interestSteps[0]
      ? [{ ...interestSteps[0], startMonth: 1, endMonth: totalMonths }]
      : interestSteps;

    finalizedInterestSteps.slice(0, 5).forEach((step, idx) => {
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 22px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText(`สเต็ปที่ ${idx + 1}:`, 80, currentY);

      ctx.fillStyle = '#475569';
      ctx.font = '22px "Sarabun", "Inter", "Thonburi", sans-serif';

      let label = '';
      if (step.endMonth >= totalMonths) {
        label = `งวดที่ ${step.startMonth} - ${totalMonths} (ตลอดอายุสัญญา)`;
      } else {
        label = `งวดที่ ${step.startMonth} - ${step.endMonth}`;
      }
      ctx.fillText(label, 190, currentY);

      const effRate = getEffectiveRate(step);

      ctx.fillStyle = '#047857'; // emerald-700
      ctx.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';

      let rateDetail = '';
      if (step.type === 'floating') {
        rateDetail = `${effRate.toFixed(2)}% ต่อปี (ลอยตัว MRR ${step.mrr ?? 7.30}% ${step.operator ?? '-'} ${step.margin ?? 1.50}%)`;
      } else {
        rateDetail = `${effRate.toFixed(2)}% ต่อปี (คงที่)`;
      }
      ctx.fillText(rateDetail, width - 560, currentY);

      currentY += 45;
    });

    // Section 3: สรุปดอกเบี้ยจ่ายรายปี
    const startYear = pdfStartYear;
    const endYear = pdfEndYear;
    const totalYearsToShow = endYear - startYear + 1;

    // Calculate total period interest
    let totalPeriodInterest = 0;
    for (let y = startYear; y <= endYear; y++) {
      totalPeriodInterest += getYearlyInterest(y);
    }

    // Determine layout columns based on number of years to display
    const cols = totalYearsToShow <= 4 ? 1 : totalYearsToShow <= 12 ? 2 : totalYearsToShow <= 21 ? 3 : 4;
    const rows = Math.ceil(totalYearsToShow / cols);
    const rowHeight = totalYearsToShow <= 12 ? 46 : 38;
    
    const gridHeight = rows * rowHeight;
    const totalBoxY = 1020 + gridHeight + 15;
    const totalBoxHeight = 75;
    const sectionHeight = (totalBoxY + totalBoxHeight + 30) - 920;

    // Draw Section 3 Card background using calculated dynamic height
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(50, 920, width - 100, sectionHeight, 16);
    } else {
      ctx.rect(50, 920, width - 100, sectionHeight);
    }
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(50, 920, width - 100, sectionHeight);

    // Section 3 Header
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 28px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`สรุปยอดดอกเบี้ยจ่ายรายปี (ปีที่ ${startYear} - ${endYear})`, 80, 970);

    ctx.strokeStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.moveTo(80, 995);
    ctx.lineTo(width - 80, 995);
    ctx.stroke();

    // Draw grid items (individual year interest values)
    const colWidth = 1080 / cols;
    for (let i = 0; i < totalYearsToShow; i++) {
      const currentYearNum = startYear + i;
      const yrInterest = getYearlyInterest(currentYearNum);
      const c = i % cols;
      const r = Math.floor(i / cols);

      const xLabel = 80 + c * colWidth;
      // Align value nicely depending on column layout
      const xValue = xLabel + (cols === 1 ? 260 : cols === 2 ? 220 : cols === 3 ? 165 : 140);
      const yPos = 1035 + r * rowHeight;

      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      ctx.font = totalYearsToShow <= 12 ? '22px "Sarabun", "Inter", "Thonburi", sans-serif' : '18px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText(`ดอกเบี้ยปีที่ ${currentYearNum}:`, xLabel, yPos);

      ctx.fillStyle = '#b45309'; // amber-700
      ctx.font = totalYearsToShow <= 12 ? 'bold 23px "Sarabun", "Inter", "Thonburi", sans-serif' : 'bold 19px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText(`${formatMoney(yrInterest)} บาท`, xValue, yPos);
    }

    // Total Period Accumulated Box
    ctx.fillStyle = '#fef3c7'; // amber-100 bg
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(80, totalBoxY, width - 160, totalBoxHeight, 8);
    } else {
      ctx.rect(80, totalBoxY, width - 160, totalBoxHeight);
    }
    ctx.fill();

    ctx.fillStyle = '#78350f'; // amber-900 text
    ctx.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ดอกเบี้ยรวมสะสมในช่วงที่เลือก (${totalYearsToShow} ปี):`, 110, totalBoxY + 46);
    ctx.font = 'bold 28px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${formatMoney(totalPeriodInterest)} บาท`, width - 110, totalBoxY + 48);


    // Footer note
    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8'; // Light blue
    ctx.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillText('ตารางประมาณการผ่อนชำระ เป็นการประมาณการเบื้องต้นเท่านั้น', width / 2, 1640);

    // Generate detailed table pages if selected
    const tableCanvases: HTMLCanvasElement[] = [];

    if (pdfReportType !== 'none') {
      // 1. Group months by year
      const yearsMap: { [key: number]: any[] } = {};
      result.schedule.forEach(m => {
        if (!yearsMap[m.year]) {
          yearsMap[m.year] = [];
        }
        yearsMap[m.year].push(m);
      });

      let scheduleRows: any[] = [];

      if (pdfReportType === 'yearly') {
        // Summarize each year in the selected range
        for (let y = pdfStartYear; y <= pdfEndYear; y++) {
          if (yearsMap[y]) {
            const yearMonths = yearsMap[y];
            const totalPayment = yearMonths.reduce((sum, m) => sum + m.payment, 0);
            const totalExtra = yearMonths.reduce((sum, m) => sum + m.extraPayment, 0);
            const totalInterest = yearMonths.reduce((sum, m) => sum + m.interestPaid, 0);
            const totalPrincipal = yearMonths.reduce((sum, m) => sum + m.principalPaid, 0);
            const endingBalance = yearMonths[yearMonths.length - 1].endingBalance;
            const rates = Array.from(new Set(yearMonths.map(m => m.interestRate)));
            const ratesString = rates.map(r => `${r.toFixed(2)}%`).join(' → ');

            scheduleRows.push({
              year: y,
              totalPayment,
              totalExtra,
              totalInterest,
              totalPrincipal,
              endingBalance,
              ratesString,
            });
          }
        }
      } else {
        // Monthly details in the selected range
        scheduleRows = result.schedule.filter(m => m.year >= pdfStartYear && m.year <= pdfEndYear);
      }

      // Chunk rows into pages (33 rows per page is optimal for A4 at 42px row height)
      const rowsPerPage = 33;
      const totalTablePages = Math.ceil(scheduleRows.length / rowsPerPage);

      for (let i = 0; i < totalTablePages; i++) {
        const chunk = scheduleRows.slice(i * rowsPerPage, (i + 1) * rowsPerPage);
        
        // Render this table page to canvas
        const tCanvas = document.createElement('canvas');
        tCanvas.width = width;
        tCanvas.height = height;
        const tCtx = tCanvas.getContext('2d');
        if (tCtx) {
          // Clear background
          tCtx.fillStyle = '#ffffff';
          tCtx.fillRect(0, 0, width, height);

          // Subtle background pattern
          tCtx.fillStyle = '#f8fafc'; // slate-50
          tCtx.fillRect(20, 20, width - 40, height - 40);

          // Border
          tCtx.strokeStyle = '#cbd5e1'; // slate-300
          tCtx.lineWidth = 4;
          tCtx.strokeRect(30, 30, width - 60, height - 60);
          tCtx.strokeStyle = '#10b981'; // emerald-500
          tCtx.lineWidth = 2;
          tCtx.strokeRect(38, 38, width - 76, height - 76);

          // Mini Header Banner (emerald gradient)
          const miniGrad = tCtx.createLinearGradient(50, 50, width - 100, 120);
          miniGrad.addColorStop(0, '#047857');
          miniGrad.addColorStop(1, '#0d9488');
          tCtx.fillStyle = miniGrad;
          tCtx.beginPath();
          if (typeof tCtx.roundRect === 'function') {
            tCtx.roundRect(50, 50, width - 100, 70, 12);
          } else {
            tCtx.rect(50, 50, width - 100, 70);
          }
          tCtx.fill();

          // Page Header Text
          tCtx.fillStyle = '#ffffff';
          tCtx.textAlign = 'left';
          tCtx.font = 'bold 22px "Sarabun", "Inter", "Thonburi", sans-serif';
          tCtx.fillText(
            pdfReportType === 'yearly'
              ? 'ตารางผ่อนชำระแบบสรุปรายปี (Yearly Summary Amortization)'
              : 'ตารางผ่อนชำระแบบละเอียดรายเดือน (Monthly Detail Amortization)',
            75,
            92
          );

          tCtx.textAlign = 'right';
          tCtx.font = '16px "Sarabun", "Inter", "Thonburi", sans-serif';
          tCtx.fillText(`ปีที่ ${pdfStartYear} - ${pdfEndYear} (ตารางหน้า ${i + 1}/${totalTablePages})`, width - 75, 92);

          // Table Headers Setup
          const tableY = 160;
          tCtx.fillStyle = '#1e293b'; // slate-800 bg for headers
          tCtx.beginPath();
          if (typeof tCtx.roundRect === 'function') {
            tCtx.roundRect(50, tableY, width - 100, 46, 6);
          } else {
            tCtx.rect(50, tableY, width - 100, 46);
          }
          tCtx.fill();

          tCtx.fillStyle = '#ffffff';
          tCtx.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
          
          // Column Headers Text
          tCtx.textAlign = 'center';
          tCtx.fillText(pdfReportType === 'yearly' ? 'ปีที่' : 'งวดที่', 120, tableY + 28);
          tCtx.fillText('อัตราดอกเบี้ย', 245, tableY + 28);
          tCtx.textAlign = 'right';
          tCtx.fillText('ยอดชำระจริง', 440, tableY + 28);
          tCtx.fillText('เงินต้นปกติ', 580, tableY + 28);
          tCtx.fillText('เงินโปะเพิ่ม', 720, tableY + 28);
          tCtx.fillText('ดอกเบี้ยจ่าย', 860, tableY + 28);
          tCtx.fillText('ยอดเงินต้นคงเหลือ', 1170, tableY + 28);

          // Render Rows
          let currentY = tableY + 46;
          tCtx.font = '16px "Sarabun", "Inter", "Thonburi", sans-serif';

          chunk.forEach((row, rIdx) => {
            // Zebra striping
            if (rIdx % 2 === 1) {
              tCtx.fillStyle = 'rgba(241, 245, 249, 0.4)';
              tCtx.fillRect(50, currentY, width - 100, 42);
            }

            // Bottom border
            tCtx.strokeStyle = '#e2e8f0';
            tCtx.lineWidth = 1;
            tCtx.beginPath();
            tCtx.moveTo(50, currentY + 42);
            tCtx.lineTo(width - 50, currentY + 42);
            tCtx.stroke();

            // Values
            tCtx.fillStyle = '#334155';

            // Col 1
            tCtx.textAlign = 'center';
            tCtx.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
            tCtx.fillText(pdfReportType === 'yearly' ? `ปีที่ ${row.year}` : `งวดที่ ${row.month}`, 120, currentY + 26);
            
            // Col 2
            tCtx.font = '16px "Sarabun", "Inter", "Thonburi", sans-serif';
            tCtx.fillText(pdfReportType === 'yearly' ? row.ratesString : `${row.interestRate.toFixed(2)}%`, 245, currentY + 26);

            // Col 3
            tCtx.textAlign = 'right';
            const totalPay = pdfReportType === 'yearly' ? (row.totalPayment + row.totalExtra) : (row.payment + row.extraPayment);
            tCtx.fillText(formatMoney(totalPay) + ' บ.', 440, currentY + 26);

            // Col 4
            const normalPrincipal = pdfReportType === 'yearly' ? row.totalPrincipal : (row.payment - row.interestPaid > 0 ? Math.round(row.payment - row.interestPaid) : 0);
            tCtx.fillText(formatMoney(normalPrincipal) + ' บ.', 580, currentY + 26);

            // Col 5
            const extra = pdfReportType === 'yearly' ? row.totalExtra : row.extraPayment;
            if (extra > 0) {
              tCtx.fillStyle = '#059669'; // emerald-600
              tCtx.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
              tCtx.fillText(`+${formatMoney(extra)} บ.`, 720, currentY + 26);
              tCtx.fillStyle = '#334155';
              tCtx.font = '16px "Sarabun", "Inter", "Thonburi", sans-serif';
            } else {
              tCtx.fillText('-', 720, currentY + 26);
            }

            // Col 6
            const interest = pdfReportType === 'yearly' ? row.totalInterest : row.interestPaid;
            tCtx.fillStyle = '#dc2626'; // rose
            tCtx.fillText(formatMoney(interest) + ' บ.', 860, currentY + 26);
            tCtx.fillStyle = '#334155';

            // Col 7
            tCtx.textAlign = 'right';
            tCtx.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
            const balance = row.endingBalance;
            if (balance === 0) {
              tCtx.fillStyle = '#059669';
              tCtx.fillText('ปิดบัญชีสำเร็จ 🎉', 1170, currentY + 26);
              tCtx.fillStyle = '#334155';
            } else {
              tCtx.fillText(formatMoney(balance) + ' บ.', 1170, currentY + 26);
            }

            currentY += 42;
          });

          // Footer info
          tCtx.textAlign = 'center';
          tCtx.fillStyle = '#38bdf8'; // Light blue
          tCtx.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
          tCtx.fillText('ตารางประมาณการผ่อนชำระ เป็นการประมาณการเบื้องต้นเท่านั้น', width / 2, 1645);

          tCtx.fillStyle = '#94a3b8';
          tCtx.font = 'italic 14px "Sarabun", "Inter", "Thonburi", sans-serif';
          tCtx.fillText(`หน้าสรุปตารางผ่อนชำระ หน้าที่ ${i + 1} จากทั้งหมด ${totalTablePages} หน้า`, width / 2, 1685);

          tableCanvases.push(tCanvas);
        }
      }
    }

    // Generate PDF and save
    try {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add Page 1 (Summary Dashboard)
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

      // Add Table Pages if any
      tableCanvases.forEach((tCanvas) => {
        pdf.addPage();
        const tImgData = tCanvas.toDataURL('image/png');
        pdf.addImage(tImgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      });

      pdf.save(`Mortgage_Amortization_Report_${Date.now()}.pdf`);
      setIsPdfModalOpen(false); // Close modal on success
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // --- Derive Reward Metrics ---
  const yearsSaved = useMemo(() => {
    const diffMonths = baselineResult.actualTermMonths - result.actualTermMonths;
    if (diffMonths <= 0) return { years: 0, months: 0 };
    return {
      years: Math.floor(diffMonths / 12),
      months: diffMonths % 12,
    };
  }, [result.actualTermMonths, baselineResult.actualTermMonths]);

  const interestSaved = useMemo(() => {
    const diff = baselineResult.totalInterest - result.totalInterest;
    return diff > 0 ? diff : 0;
  }, [result.totalInterest, baselineResult.totalInterest]);

  // Thai verbal labels for slider values to make it premium
  const formatThaiAmountLabel = (value: number): string => {
    return `${formatMoney(value)} บาท`;
  };

  // Warning when payment is too low (doesn't cover interest)
  const isPaymentInsufficent = useMemo(() => {
    return result.schedule.some(m => m.beginningBalance < m.endingBalance && m.month <= 120);
  }, [result.schedule]);

  const handleLoadApprovalLoan = (
    amount: number,
    termYears: number,
    pmtAmount: number,
    steps: InterestStep[],
    pMode: 'equal' | 'step' = 'equal',
    pSteps?: PaymentStep[]
  ) => {
    setLoanAmount(amount);
    setLoanTermYears(termYears);
    setInterestMode('step');
    setInterestSteps(steps);
    if (pMode === 'step' && pSteps && pSteps.length > 0) {
      setPaymentMode('step');
      setPaymentSteps(pSteps);
    } else {
      setPaymentMode('equal');
      setEqualPaymentAmount(pmtAmount);
    }
    setMobileActiveView('results');
    setActiveTab('table');
    setIsApprovalModalOpen(false);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center py-0 sm:py-8 px-0 sm:px-4">
      <div 
        id="app-wrapper" 
        className="w-full max-w-[480px] min-h-screen sm:min-h-[850px] sm:max-h-[920px] sm:rounded-[40px] sm:border-[10px] sm:border-slate-800 sm:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.3)] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans antialiased overflow-y-auto overflow-x-hidden relative flex flex-col scrollbar-none"
      >
        
        {/* HEADER SECTION */}
        <header className="relative overflow-hidden bg-white border-b border-slate-100 py-4 px-4 shadow-sm dark:bg-slate-950 dark:border-slate-800/60">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-2xl" />
          <div className="absolute bottom-0 left-10 h-20 w-20 rounded-full bg-indigo-500/5 blur-xl" />

          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-2 text-white shadow-md shadow-emerald-500/15 shrink-0">
                  <Home className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <Sparkles className="h-2.5 w-2.5" /> แผนลดต้นลดดอกอัจฉริยะ
                  </span>
                  <h1 className="text-xs sm:text-sm font-black tracking-tight text-slate-800 dark:text-slate-100 mt-0.5 leading-tight truncate">
                    เครื่องมือคำนวณและวางแผนสินเชื่อบ้าน
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPromptModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 text-[11px] font-black shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  title="ดูและก็อปปี้ Master Prompt คำสั่งสร้างโปรแกรมนี้ทั้งหมด 100%"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Master Prompt 100%</span>
                  <span className="sm:hidden">Prompt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAndroidModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[11px] font-black shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  title="ดูซอร์สโค้ดและดาวน์โหลด Android Native App (Kotlin)"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Android App (Kotlin)</span>
                  <span className="sm:hidden">Android</span>
                </button>
                <PWAInstallButton />
              </div>
            </div>

            {/* TOP LEVEL MAIN MENU BUTTON: APPROVAL NOTICE */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(true)}
                className="w-full flex items-center justify-between gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 p-3.5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-white/10 p-2 text-white shrink-0">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-[12px] text-indigo-50 leading-tight">ใบแจ้งผลวงเงินอนุมัติสินเชื่อ</span>
                    <span className="block text-[9px] font-medium text-indigo-200">ตรวจสอบ แก้ไข และจำลองค่างวดอัตโนมัติ</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-xl text-[9px] font-black border border-white/10 shrink-0">
                  <span>เปิดดูข้อมูล</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            </div>
            
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-1.5 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/40">
              <p className="text-[10px] text-slate-400 pl-1 leading-snug">
                สเต็ปดอกเบี้ย & ผ่อนชำระแบบลดต้นลดดอก
              </p>
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-bold text-rose-600 shadow-xs transition hover:text-rose-700 hover:bg-rose-50/50 dark:bg-slate-800 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/20"
              >
                <RefreshCw className="h-2.5 w-2.5" /> รีเซ็ตข้อมูล
              </button>
            </div>
          </div>
        </header>

        {/* MAIN LAYOUT */}
        <main className="px-4 mt-6">
          
          {/* MOBILE VIEW SEGMENTED CONTROLS */}
          <div className="mb-6 block">
            <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
              <button
                onClick={() => setMobileActiveView('inputs')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  mobileActiveView === 'inputs'
                    ? 'bg-white text-emerald-700 shadow-md shadow-emerald-500/5 dark:bg-slate-800 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Calculator className="h-4 w-4" />
                <span>⚙️ ตั้งค่าเงินกู้ ({formatMoney(loanAmount)} บาท)</span>
              </button>
              <button
                onClick={() => setMobileActiveView('results')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                mobileActiveView === 'results'
                  ? 'bg-white text-indigo-700 shadow-md shadow-indigo-500/5 dark:bg-slate-800 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Coins className="h-4 w-4" />
              <span>📊 ผลลัพธ์ & วิเคราะห์</span>
            </button>
          </div>
        </div>

        {/* TOP SUMMARY METRICS CARDS */}
        <div className={`grid gap-3 grid-cols-2 mb-6 ${mobileActiveView === 'results' ? 'grid' : 'hidden'}`}>
          <MetricCard
            id="stat-total-paid"
            title="ยอดชำระจริงทั้งหมด"
            value={`${formatMoney(result.totalPayments)} บาท`}
            subValue={`ต้น ${formatMoney(loanAmount)} บาท`}
            icon={Coins}
            variant="secondary"
          />
          <MetricCard
            id="stat-total-interest"
            title="ดอกเบี้ยสะสมจ่ายรวม"
            value={`${formatMoney(result.totalInterest)} บาท`}
            subValue={`คิดเป็น ${((result.totalInterest / loanAmount) * 100).toFixed(1)}% ของเงินต้น`}
            icon={Percent}
            variant={result.totalInterest > loanAmount ? 'warning' : 'info'}
          />
          <MetricCard
            id="stat-actual-term"
            title="ระยะเวลาที่ผ่อนหมดจริง"
            value={
              result.actualTermMonths === 0
                ? '0 เดือน'
                : `${Math.floor(result.actualTermMonths / 12)} ปี ${result.actualTermMonths % 12 > 0 ? `${result.actualTermMonths % 12} เดือน` : ''}`
            }
            subValue={
              yearsSaved.years > 0 || yearsSaved.months > 0
                ? `เร็วขึ้น ${yearsSaved.years > 0 ? `${yearsSaved.years} ปี ` : ''}${yearsSaved.months > 0 ? `${yearsSaved.months} เดือน` : ''} 🎉`
                : `ผ่อน ${loanTermYears} ปี`
            }
            icon={CalendarCheck}
            variant={yearsSaved.years > 0 || yearsSaved.months > 0 ? 'success' : 'primary'}
          />
          <MetricCard
            id="stat-interest-saved"
            title="ยอดเงินประหยัดสะสม"
            value={`${formatMoney(interestSaved)} บาท`}
            subValue={
              interestSaved > 0
                ? 'จากการโปะ/ดอกเบี้ยที่ดี'
                : 'เริ่มโปะเพื่อดูความคุ้มค่า!'
            }
            icon={TrendingUp}
            variant="success"
          />
        </div>

        {/* NOTIFICATION: INSUFFICIENT PAYMENTS WARNING */}
        {isPaymentInsufficent && (
          <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-xs text-rose-700 flex items-start gap-2.5 dark:border-rose-950/20 dark:bg-rose-950/10 dark:text-rose-400">
            <HelpCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
            <div>
              <strong className="font-bold">⚠️ ยอดชำระบางช่วงต่ำกว่าดอกเบี้ย!</strong>
              <p className="text-[11px] text-rose-600/90 mt-1 dark:text-rose-400/95">
                ยอดผ่อนน้อยกว่าดอกเบี้ยสะสมรายเดือน จะส่งผลให้ยอดหนี้รวมเพิ่มขึ้น (ทบต้น) แนะนำให้ปรับยอดผ่อนชำระหรือกด "ใช้ยอดแนะนำ"
              </p>
            </div>
          </div>
        )}

        {/* TWO COLUMN GRID - MOBILE OPTIMIZED SINGLE COLUMN */}
        <div className="flex flex-col space-y-6">
          
          {/* LEFT COLUMN: PARAMETERS & STEP CONFIGURATION */}
          <div className={`space-y-6 ${mobileActiveView === 'inputs' ? 'block' : 'hidden'}`}>
            
            {/* CARD 1: LOAN PRINCIPAL & TERM */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/40 dark:bg-slate-950">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <Calculator className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">ข้อมูลวงเงินกู้หลัก</h3>
              </div>

              <div className="space-y-4">
                {/* Loan Amount */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <label htmlFor="loan-amount-input">วงเงินกู้ (บาท)</label>
                    <span className="font-mono text-emerald-600 font-bold dark:text-emerald-400">
                      {formatThaiAmountLabel(loanAmount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLoanAmount(Math.max(100000, loanAmount - 100000))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-bold text-lg cursor-pointer shrink-0 select-none"
                    >
                      -
                    </button>
                    <FlexibleInput
                      id="loan-amount-input"
                      min={100000}
                      max={100000000}
                      step={10000}
                      value={loanAmount}
                      onChange={setLoanAmount}
                      isCurrency
                      className="w-full text-center rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 font-semibold h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setLoanAmount(Math.min(100000000, loanAmount + 100000))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-bold text-lg cursor-pointer shrink-0 select-none"
                    >
                      +
                    </button>
                  </div>
                  
                  {/* Quick selection presets */}
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {[1000000, 3000000, 5000000, 7000000, 10000000, 15000000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setLoanAmount(preset)}
                        className={`text-[10px] sm:text-xs py-1.5 font-bold rounded-lg border transition-all cursor-pointer ${
                          loanAmount === preset
                            ? 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500'
                            : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        {preset / 1000000} ล้าน
                      </button>
                    ))}
                  </div>

                  <div className="hidden sm:block">
                    <input
                      type="range"
                      min={500000}
                      max={20000000}
                      step={100000}
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(parseInt(e.target.value))}
                      className="mt-3 w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Term Years */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <label htmlFor="loan-term-input">ระยะเวลาผ่อนจ่ายตามสัญญา</label>
                    <span className="font-mono text-indigo-600 font-bold dark:text-indigo-400">
                      {loanTermYears} ปี ({totalMonths} งวด)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLoanTermYears(Math.max(1, loanTermYears - 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-bold text-lg cursor-pointer shrink-0 select-none"
                    >
                      -
                    </button>
                    <FlexibleInput
                      id="loan-term-input"
                      min={1}
                      max={50}
                      step={1}
                      value={loanTermYears}
                      onChange={setLoanTermYears}
                      isYears
                      className="w-full text-center rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 font-semibold h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setLoanTermYears(Math.min(50, loanTermYears + 1))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 font-bold text-lg cursor-pointer shrink-0 select-none"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick selection presets */}
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[10, 15, 20, 30].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setLoanTermYears(preset)}
                        className={`text-[10px] sm:text-xs py-1.5 font-bold rounded-lg border transition-all cursor-pointer ${
                          loanTermYears === preset
                            ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500'
                            : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                      >
                        {preset} ปี
                      </button>
                    ))}
                  </div>

                  <div className="hidden sm:block">
                    <input
                      type="range"
                      min={1}
                      max={40}
                      value={loanTermYears}
                      onChange={(e) => setLoanTermYears(parseInt(e.target.value))}
                      className="mt-3 w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: INTEREST RATE STEP CONFIGURATION */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/40 dark:bg-slate-950">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                    <Percent className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">อัตราดอกเบี้ยต่อปี (% ต่อปี)</h3>
                </div>

                {/* Toggle Mode */}
                <div className="flex rounded-lg bg-slate-100 p-0.5 self-start sm:self-auto dark:bg-slate-900">
                  <button
                    onClick={() => setInterestMode('fixed')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                      interestMode === 'fixed'
                        ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    คงที่ตลอดสัญญา
                  </button>
                  <button
                    onClick={() => setInterestMode('step')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                      interestMode === 'step'
                        ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    อัตราดอกเบี้ยแบบสเต็ป
                  </button>
                </div>
              </div>

              {interestMode === 'fixed' ? (
                <div>
                  <label htmlFor="fixed-rate-input" className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    ดอกเบี้ยเฉลี่ยตลอดระยะสัญญากู้ (% ต่อปี)
                  </label>
                  <div className="relative">
                    <FlexibleInput
                      id="fixed-rate-input"
                      step={0.01}
                      min={0}
                      max={20}
                      allowDecimal
                      value={interestSteps[0]?.rate || 5.0}
                      onChange={(val) => handleUpdateInterestStep(interestSteps[0]?.id || 'int-1', { rate: val })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-4 pr-12 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900 font-bold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setInterestMode('step');
                      handleAddInterestStep();
                    }}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-200/80 hover:border-indigo-400 py-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/10 dark:border-slate-800 dark:text-indigo-400 dark:hover:text-indigo-300 dark:bg-slate-900/10 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มข้อมูลสเต็ปดอกเบี้ย (เปลี่ยนเป็นแบบสเต็ป)
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {interestSteps.map((step, index) => {
                    const isLast = index === interestSteps.length - 1;
                    const isFloating = step.type === 'floating';
                    return (
                      <div
                        key={step.id}
                        className="relative rounded-2xl border border-slate-100 bg-slate-50/40 p-4 dark:border-slate-800/40 dark:bg-slate-900/10 shadow-sm"
                      >
                        {/* Step Header */}
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                            สเต็ปที่ {index + 1}
                          </span>
                          {interestSteps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveInterestStep(step.id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                              title="ลบสเต็ปนี้"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Month inputs */}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">ตั้งแต่เดือนที่</span>
                            <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                              {step.startMonth}
                            </div>
                          </div>
                          <div>
                            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">ถึงเดือนที่</span>
                            {isLast ? (
                              <div className="rounded-xl border border-dashed border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-400 text-center dark:border-slate-800">
                                สิ้นสุดสัญญา ({totalMonths})
                              </div>
                            ) : (
                              <FlexibleInput
                                id={`end-month-${step.id}`}
                                min={step.startMonth}
                                max={totalMonths - 1}
                                step={1}
                                isYears
                                value={step.endMonth}
                                onChange={(val) => handleUpdateInterestStep(step.id, { endMonth: val })}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
                              />
                            )}
                          </div>
                        </div>

                        {/* Floating or Fixed sub-tab selection */}
                        <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900 mb-3 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => handleUpdateInterestStep(step.id, { type: 'fixed' })}
                            className={`flex-1 rounded-md py-1 text-center transition-all ${
                              !isFloating
                                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            ดอกเบี้ยคงที่
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateInterestStep(step.id, {
                              type: 'floating',
                              mrr: step.mrr ?? 7.30,
                              operator: step.operator ?? '-',
                              margin: step.margin ?? 1.50
                            })}
                            className={`flex-1 rounded-md py-1 text-center transition-all ${
                              isFloating
                                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            ดอกเบี้ยลอยตัว (MRR)
                          </button>
                        </div>

                        {/* Interest settings based on selection */}
                        {!isFloating ? (
                          <div>
                            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">อัตราดอกเบี้ย (% ต่อปี)</span>
                            <div className="relative">
                              <FlexibleInput
                                id={`rate-${step.id}`}
                                step={0.01}
                                min={0}
                                max={20}
                                allowDecimal
                                value={step.rate}
                                onChange={(val) => handleUpdateInterestStep(step.id, { rate: val })}
                                className="w-full rounded-xl border border-slate-200 py-1.5 pl-3 pr-8 text-xs font-bold outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 bg-white border border-slate-100 p-3 rounded-xl dark:bg-slate-900/40 dark:border-slate-800/40 shadow-inner">
                            {/* Bank Selection Dropdown */}
                            <div>
                              <span className="mb-1 block text-[9px] font-extrabold text-slate-400 uppercase">อ้างอิงอัตราดอกเบี้ย MRR ของธนาคาร</span>
                              <select
                                value={step.bankName || 'custom'}
                                onChange={(e) => {
                                  const selectedVal = e.target.value;
                                  if (selectedVal === 'custom') {
                                    handleUpdateInterestStep(step.id, { bankName: 'custom' });
                                  } else {
                                    const bank = bankMrrs.find(b => b.name === selectedVal);
                                    if (bank) {
                                      handleUpdateInterestStep(step.id, {
                                        bankName: selectedVal,
                                        mrr: bank.mrr
                                      });
                                    }
                                  }
                                }}
                                className="w-full rounded-xl border border-slate-200 py-1.5 px-2.5 text-xs font-bold outline-none bg-white transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                              >
                                <option value="custom">กำหนดเอง (Custom / ระบุเอง)</option>
                                {bankMrrs.map((bank) => (
                                  <option key={bank.name} value={bank.name}>
                                    {bank.name} (MRR = {bank.mrr.toFixed(3)}%)
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <span className="mb-1 block text-[9px] font-extrabold text-slate-400 uppercase">ค่า MRR (%)</span>
                                <div className="relative">
                                  <FlexibleInput
                                    id={`mrr-${step.id}`}
                                    step={0.01}
                                    min={0}
                                    max={20}
                                    allowDecimal
                                    value={step.mrr ?? 7.30}
                                    onChange={(val) => handleUpdateInterestStep(step.id, { mrr: val, bankName: 'custom' })}
                                    className="w-full rounded-xl border border-slate-200 py-1.5 pl-1.5 pr-4 text-[11px] font-bold outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
                                  />
                                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400">%</span>
                                </div>
                              </div>
                              
                              <div>
                                <span className="mb-1 block text-[9px] font-extrabold text-slate-400 uppercase">เครื่องหมาย</span>
                                <select
                                  value={step.operator ?? '-'}
                                  onChange={(e) => handleUpdateInterestStep(step.id, { operator: e.target.value as '+' | '-' })}
                                  className="w-full rounded-xl border border-slate-200 py-1.5 px-1.5 text-[11px] font-bold outline-none bg-white transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
                                >
                                  <option value="+">+</option>
                                  <option value="-">-</option>
                                </select>
                              </div>

                              <div>
                                <span className="mb-1 block text-[9px] font-extrabold text-slate-400 uppercase">ค่าปรับปรุง (%)</span>
                                <div className="relative">
                                  <FlexibleInput
                                    id={`margin-${step.id}`}
                                    step={0.01}
                                    min={0}
                                    max={20}
                                    allowDecimal
                                    value={step.margin ?? 1.50}
                                    onChange={(val) => handleUpdateInterestStep(step.id, { margin: val })}
                                    className="w-full rounded-xl border border-slate-200 py-1.5 pl-1.5 pr-4 text-[11px] font-bold outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900"
                                  />
                                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400">%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Assistive year translation and dynamic rate readout */}
                        <div className="mt-2.5 text-[10px] text-slate-400 font-medium flex justify-between items-center bg-slate-100/40 p-2 rounded-lg dark:bg-slate-900/30">
                          <span>ปีที่ {Math.ceil(step.startMonth / 12)} - {Math.ceil(step.endMonth / 12)} ({step.endMonth - step.startMonth + 1} เดือน)</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            ดอกเบี้ยสุทธิ: {getEffectiveRate(step).toFixed(2)}% ต่อปี
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {interestSteps.length < 10 && (
                    <button
                      type="button"
                      onClick={handleAddInterestStep}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-xs font-bold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      เพิ่มสเต็ปอัตราดอกเบี้ยถัดไป
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* CARD 3: INSTALLMENT PAYMENTS */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/40 dark:bg-slate-950">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                    <Coins className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">ยอดเงินที่ผ่อนต่อเดือน (บาท)</h3>
                </div>

                {/* Toggle Mode */}
                <div className="flex rounded-lg bg-slate-100 p-0.5 self-start sm:self-auto dark:bg-slate-900">
                  <button
                    onClick={() => setPaymentMode('equal')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                      paymentMode === 'equal'
                        ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    ผ่อนเท่ากันทุกเดือน
                  </button>
                  <button
                    onClick={() => setPaymentMode('step')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                      paymentMode === 'step'
                        ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    ผ่อนจ่ายแบบสเต็ป
                  </button>
                </div>
              </div>

              {paymentMode === 'equal' ? (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <label htmlFor="equal-payment-input">ยอดผ่อนชำระเฉลี่ยต่อเดือน (บาท)</label>
                      <span className="font-mono text-emerald-600 font-bold dark:text-emerald-400">
                        {formatThaiAmountLabel(equalPaymentAmount)}
                      </span>
                    </div>
                    <FlexibleInput
                      id="equal-payment-input"
                      min={0}
                      value={equalPaymentAmount}
                      onChange={setEqualPaymentAmount}
                      isCurrency
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900 font-bold"
                    />
                  </div>

                  {/* Suggestion action */}
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3.5 dark:bg-slate-900/50">
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">💡 ยอดผ่อนต่อเดือนที่เหมาะสม</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">ระบบจะวิเคราะห์ยอดผ่อนชำระความปลอดภัยเฉลี่ยต่ำสุด</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUseSuggestedPMT}
                      className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 cursor-pointer"
                    >
                      ใช้ยอดแนะนำ
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('step');
                      handleAddPaymentStep();
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-200/80 hover:border-emerald-400 py-2.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50/10 dark:border-slate-800 dark:text-emerald-400 dark:hover:text-emerald-300 dark:bg-slate-900/10 transition cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มข้อมูลสเต็ปยอดผ่อนชำระ (เปลี่ยนเป็นแบบสเต็ป)
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentSteps.map((step, index) => {
                    const isLast = index === paymentSteps.length - 1;
                    return (
                      <div
                        key={step.id}
                        className="relative rounded-xl border border-slate-100 bg-slate-50/40 p-4 dark:border-slate-800/40 dark:bg-slate-900/10"
                      >
                        {/* Step Header */}
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            ยอดผ่อนสเต็ปที่ {index + 1}
                          </span>
                          {paymentSteps.length > 1 && (
                            <button
                              onClick={() => handleRemovePaymentStep(step.id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                              title="ลบสเต็ปนี้"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Range of months */}
                        <div className="grid grid-cols-3 gap-3.5 items-end">
                          <div>
                            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">ตั้งแต่เดือนที่</span>
                            <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                              {step.startMonth}
                            </div>
                          </div>
                          <div>
                            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">ถึงเดือนที่</span>
                            {isLast ? (
                              <div className="rounded-xl border border-dashed border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-400 text-center dark:border-slate-800">
                                สิ้นสุดสัญญา ({totalMonths})
                              </div>
                            ) : (
                              <FlexibleInput
                                id={`end-month-pay-${step.id}`}
                                min={step.startMonth}
                                max={totalMonths - 1}
                                step={1}
                                isYears
                                value={step.endMonth}
                                onChange={(val) => handleUpdatePaymentStep(step.id, { endMonth: val })}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900"
                              />
                            )}
                          </div>
                          <div>
                            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">ยอดผ่อน (บาท)</span>
                            <FlexibleInput
                              id={`amount-pay-${step.id}`}
                              min={0}
                              step={100}
                              value={step.amount}
                              onChange={(val) => handleUpdatePaymentStep(step.id, { amount: val })}
                              isCurrency
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900"
                            />
                          </div>
                        </div>

                        {/* Info labels */}
                        <div className="mt-2 text-[10px] text-emerald-700/80 font-semibold flex justify-between dark:text-emerald-400/85">
                          <span>{formatThaiAmountLabel(step.amount)} ต่อเดือน</span>
                          <span>ปีที่ {Math.ceil(step.startMonth / 12)} - {Math.ceil(step.endMonth / 12)}</span>
                        </div>
                      </div>
                    );
                  })}

                  {paymentSteps.length < 10 && (
                    <button
                      type="button"
                      onClick={handleAddPaymentStep}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-xs font-bold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-800 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      เพิ่มสเต็ปยอดผ่อนชำระถัดไป
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* CARD 4: EXTRA PAYMENTS (เงินโปะเพิ่มสะสม) */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/40 dark:bg-slate-950">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-teal-50 p-2 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">การโปะเงินต้นเพิ่ม (Extra Pay)</h3>
                    <p className="text-[10px] text-slate-400">เคล็ดลับการปิดบ้านไว ประหยัดดอกเบี้ยสูงสุด</p>
                  </div>
                </div>

                {/* Dropdown/Selection type */}
                <select
                  value={extraPaymentType}
                  onChange={(e) => setExtraPaymentType(e.target.value as ExtraPaymentType)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="none">ไม่ระบุเงินโปะ</option>
                  <option value="monthly_fixed">โปะเท่ากันทุกเดือน</option>
                  <option value="step">โปะเพิ่มแบบสเต็ปตามช่วงเดือน</option>
                </select>
              </div>

              {extraPaymentType === 'monthly_fixed' && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <label htmlFor="fixed-extra-input">ระบุยอดเงินที่จะโปะเพิ่มในทุกๆ เดือน (บาท)</label>
                    <span className="font-mono text-teal-600 font-bold dark:text-teal-400">
                      +{formatThaiAmountLabel(extraPaymentAmount)}
                    </span>
                  </div>
                  <FlexibleInput
                    id="fixed-extra-input"
                    min={0}
                    value={extraPaymentAmount}
                    onChange={setExtraPaymentAmount}
                    isCurrency
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-900 font-bold"
                  />
                  <p className="mt-2.5 text-[10px] leading-relaxed text-slate-400">
                    💡 เงินที่คุณโปะเพิ่มจะถูกนำไปหัก <strong>"เงินต้น"</strong> โดยตรงเต็มจำนวนตั้งแต่วันแรก ทำให้ลดภาระยอดหนี้ในงวดถัดไปทันทีและลดดอกเบี้ยกวนใจได้มหาศาล!
                  </p>
                </div>
              )}

              {extraPaymentType === 'step' && (
                <div className="space-y-4">
                  {extraPaymentSteps.map((step, index) => {
                    const isLast = index === extraPaymentSteps.length - 1;
                    return (
                      <div
                        key={step.id}
                        className="relative rounded-xl border border-slate-100 bg-slate-50/40 p-4 dark:border-slate-800/40 dark:bg-slate-900/10"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                            สเต็ปการโปะที่ {index + 1}
                          </span>
                          {extraPaymentSteps.length > 1 && (
                            <button
                              onClick={() => handleRemoveExtraStep(step.id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                              title="ลบสเต็ปนี้"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-3.5 items-end">
                          <div>
                            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">ตั้งแต่เดือนที่</span>
                            <div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                              {step.startMonth}
                            </div>
                          </div>
                          <div>
                            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">ถึงเดือนที่</span>
                            {isLast ? (
                              <div className="rounded-xl border border-dashed border-slate-200 px-2 py-2 text-[10px] font-bold text-slate-400 text-center dark:border-slate-800">
                                สิ้นสุดสัญญา ({totalMonths})
                              </div>
                            ) : (
                              <FlexibleInput
                                id={`end-month-ext-${step.id}`}
                                min={step.startMonth}
                                max={totalMonths - 1}
                                step={1}
                                isYears
                                value={step.endMonth}
                                onChange={(val) => handleUpdateExtraStep(step.id, { endMonth: val })}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none transition focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900"
                              />
                            )}
                          </div>
                          <div>
                            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">โปะยอดต่อเดือน</span>
                            <FlexibleInput
                              id={`amount-ext-${step.id}`}
                              min={0}
                              step={100}
                              value={step.amount}
                              onChange={(val) => handleUpdateExtraStep(step.id, { amount: val })}
                              isCurrency
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold outline-none transition focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {extraPaymentSteps[extraPaymentSteps.length - 1]?.endMonth < totalMonths && (
                    <button
                      onClick={handleAddExtraStep}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 py-2.5 text-xs font-bold text-slate-500 transition hover:border-teal-300 hover:text-teal-600 dark:border-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      เพิ่มสเต็ปการโปะเงินก้อนถัดไป
                    </button>
                  )}
                </div>
              )}

              {extraPaymentType === 'none' && (
                <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-slate-900/40">
                  <p>ขณะนี้ยังไม่ได้ระบุเงินโปะสะสมรายเดือน</p>
                  <p className="mt-1 font-semibold text-teal-600 dark:text-teal-400">
                    ลองเปลี่ยนตัวเลือกด้านบนเป็น "โปะเท่ากันทุกเดือน" เพื่อประหยัดเงินแสน!
                  </p>
                </div>
              )}
            </div>

            {/* CARD 5: CURRENT MRR RATES & SIMULATOR */}
            <MrrStatus
              interestSteps={interestSteps}
              interestMode={interestMode}
              bankMrrs={bankMrrs}
              onSaveBankMrrs={handleSaveBankMrrs}
              isAutoSync={isBotAutoSync}
              onToggleAutoSync={(enabled) => {
                setIsBotAutoSync(enabled);
                localStorage.setItem('bot_mrr_auto_sync', String(enabled));
              }}
              lastSyncTime={botLastSyncTime}
              onRefreshBotSync={handleSyncBotRates}
              isSyncingBot={isSyncingBot}
              onApplyBankToFloatingSteps={handleApplyBankToFloatingSteps}
            />


          </div>

          {/* RESULTS PANEL */}
          <div className={`space-y-6 ${mobileActiveView === 'results' ? 'block' : 'hidden'}`}>
            
            {/* TAB SELECTOR HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 dark:border-slate-800 gap-3 pb-2 sm:pb-0">
              <div className="flex overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveTab('charts')}
                  className={`border-b-2 px-5 py-3 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'charts'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  กราฟวิเคราะห์แนวโน้ม
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`border-b-2 px-5 py-3 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'table'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  ตารางผ่อนชำระละเอียด
                </button>
                <button
                  onClick={() => setActiveTab('scenarios')}
                  className={`border-b-2 px-5 py-3 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'scenarios'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  เปรียบเทียบข้อเสนอธนาคาร
                </button>
                <button
                  onClick={() => setActiveTab('compare')}
                  className={`border-b-2 px-5 py-3 text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'compare'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  จำลองเปรียบเทียบแผน (What-If)
                </button>

              </div>

              {/* ACTION BUTTONS (History + PDF) */}
              <div className="flex items-center gap-2 self-start sm:self-auto mb-2 sm:mb-0 shrink-0">
                {/* History Dropdown */}
                {calculationHistory.length > 0 && (
                  <div className="relative inline-block text-left shrink-0">
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsHistoryDropdownOpen(!isHistoryDropdownOpen)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        id="history-menu-button"
                        aria-expanded="true"
                        aria-haspopup="true"
                      >
                        <History className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="hidden xs:inline">ประวัติล่าสุด</span>
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                      </button>
                    </div>

                    {isHistoryDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setIsHistoryDropdownOpen(false)} 
                        />
                        <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black/5 dark:ring-white/5 focus:outline-none z-20 overflow-hidden border border-slate-100 dark:border-slate-800/80 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div className="py-1" role="none">
                            <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                              ประวัติคำนวณ 5 ครั้งล่าสุด
                            </div>
                            {calculationHistory.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => {
                                  handleLoadHistoryItem(item);
                                  setIsHistoryDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex flex-col gap-0.5 border-b border-slate-100/50 dark:border-slate-800/40 last:border-0 transition"
                                role="menuitem"
                              >
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.label}</span>
                                <span className="text-[9px] text-slate-400">
                                  {new Date(item.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* PDF EXPORT BUTTON */}
                <button
                  onClick={() => {
                    const maxYear = result.schedule.length > 0 ? result.schedule[result.schedule.length - 1].year : loanTermYears;
                    setPdfStartYear(1);
                    setPdfEndYear(maxYear);
                    setIsPdfModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-black shadow-md shadow-emerald-600/10 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <FileDown className="h-4 w-4" />
                  <span>ส่งออกรายงาน PDF</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENTS */}
            <div className="transition-all duration-300">
              {activeTab === 'charts' && (
                <LoanCharts
                  currentSchedule={result.schedule}
                  baselineSchedule={baselineResult.schedule}
                />
              )}

              {activeTab === 'table' && (
                <AmortizationTable
                  schedule={result.schedule}
                  loanAmount={loanAmount}
                />
              )}

              {activeTab === 'scenarios' && (
                <SavedScenarios
                  currentScenario={currentScenario}
                  onLoadScenario={handleLoadScenario}
                />
              )}

              {activeTab === 'compare' && (
                <CompareScenarios
                  currentScenario={currentScenario}
                  onApplyCompareToMain={handleApplyCompareToMain}
                />
              )}


            </div>

            {/* PREMIUM INSIGHT CARD */}
            {activeTab === 'charts' && (
              <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/40 dark:bg-slate-950">
                <div className="flex gap-4">
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 shrink-0 self-start dark:bg-emerald-950/30 dark:text-emerald-400">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">บทวิเคราะห์แผนชำระเงินกู้ของคุณ</h4>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2 dark:text-slate-400">
                      เมื่อวิเคราะห์ตามแผนปัจจุบันที่มี วงเงินกู้ {formatMoney(loanAmount)} บาท 
                      {yearsSaved.years > 0 || yearsSaved.months > 0 ? (
                        <>
                          {' '}คุณจะสามารถปิดบัญชีหนี้ได้สำเร็จภายในระยะเวลาเพียง{' '}
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {Math.floor(result.actualTermMonths / 12)} ปี {result.actualTermMonths % 12 > 0 ? `${result.actualTermMonths % 12} เดือน` : ''}
                          </span>{' '}
                          ซึ่งไวกว่าปกติถึง{' '}
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {yearsSaved.years > 0 ? `${yearsSaved.years} ปี ` : ''}{yearsSaved.months > 0 ? `${yearsSaved.months} เดือน` : ''}
                          </span>{' '}
                          และช่วยประหยัดดอกเบี้ยที่ต้องสูญเสียไปลงได้สูงสุดถึง{' '}
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(interestSaved)} บาท
                          </span>!
                        </>
                      ) : (
                        <>
                          {' '}ซึ่งเป็นการผ่อนชำระแบบธรรมดาตามสัญญา 30 ปี ทั้งนี้ คุณสามารถประหยัดเงินดอกเบี้ยสะสมได้ง่ายๆ โดยการเพิ่มเงินโปะรายเดือน หรือเปลี่ยนเรตสเต็ปดอกเบี้ยที่ต่ำลง (สามารถจำลองการโปะเงินเพิ่มได้ในแท็บเครื่องมือด้านซ้าย เพื่อดูความแตกต่างของมูลค่าเงินที่ประหยัดได้ทันที)
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* PDF EXPORT CONFIGURATION MODAL */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-250">
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 animate-in zoom-in-95 duration-250">
            
            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5 shrink-0">
              <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">ตั้งค่ารายงาน PDF</h3>
                <p className="text-xs text-slate-400">เลือกช่วงเวลาและรายละเอียดของตารางผ่อนชำระเพื่อพิมพ์รายงาน</p>
              </div>
            </div>

            {/* Config Fields (Scrollable area) */}
            <div className="space-y-5 flex-1 overflow-y-auto pr-1.5 scrollbar-thin">
              
              {/* Option 1: Detail Level Selector */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                  รูปแบบตารางผ่อนชำระในรายงาน
                </label>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setPdfReportType('yearly')}
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                      pdfReportType === 'yearly'
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-150 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        pdfReportType === 'yearly' ? 'border-emerald-600' : 'border-slate-300'
                      }`}>
                        {pdfReportType === 'yearly' && <div className="h-2 w-2 rounded-full bg-emerald-600" />}
                      </div>
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${pdfReportType === 'yearly' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        สรุปเฉพาะยอดรายปี (Yearly Summary)
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                        แนบตารางแสดงยอดจ่าย ยอดต้น ดอกเบี้ยสะสม และยอดคงเหลือรวมในแต่ละปีอย่างกระชับ (แนะนำ ไฟล์ขนาดเล็กกะทัดรัด)
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfReportType('monthly')}
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                      pdfReportType === 'monthly'
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-150 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        pdfReportType === 'monthly' ? 'border-emerald-600' : 'border-slate-300'
                      }`}>
                        {pdfReportType === 'monthly' && <div className="h-2 w-2 rounded-full bg-emerald-600" />}
                      </div>
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${pdfReportType === 'monthly' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        รายละเอียดละเอียดทุกงวด (Monthly Detail)
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                        แสดงข้อมูลตารางผ่อนรายงวด ทุกๆ งวดรายเดือนแยกย่อยอย่างครบถ้วน (ไฟล์จะมีขนาดหน้ามากขึ้นตามช่วงปีที่เลือก)
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfReportType('none')}
                    className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                      pdfReportType === 'none'
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-150 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        pdfReportType === 'none' ? 'border-emerald-600' : 'border-slate-300'
                      }`}>
                        {pdfReportType === 'none' && <div className="h-2 w-2 rounded-full bg-emerald-600" />}
                      </div>
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${pdfReportType === 'none' ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'}`}>
                        ไม่แนบตารางผ่อนชำระ (No Schedule)
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                        ดาวน์โหลดเฉพาะหน้าสรุปข้อมูลทั่วไปและการวิเคราะห์ประสิทธิภาพการชำระหน้าแรกแบบหน้าเดียว (A4 แผ่นเดียวจบ)
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Option 2: Year Range Selectors */}
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 space-y-3">
                <span className="block text-xs font-black text-slate-400 uppercase tracking-wider">
                  เลือกช่วงปีที่ต้องการประมาณการและแสดงรายงาน
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      เริ่มต้นจาก (ปีที่)
                    </label>
                    <select
                      value={pdfStartYear}
                      onChange={(e) => {
                        const startVal = Number(e.target.value);
                        setPdfStartYear(startVal);
                        if (pdfEndYear < startVal) {
                          setPdfEndYear(startVal);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 cursor-pointer"
                    >
                      {Array.from(
                        { length: result.schedule.length > 0 ? result.schedule[result.schedule.length - 1].year : loanTermYears },
                        (_, i) => i + 1
                      ).map((y) => (
                        <option key={y} value={y}>
                          ปีที่ {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      สิ้นสุดถึง (ปีที่)
                    </label>
                    <select
                      value={pdfEndYear}
                      onChange={(e) => setPdfEndYear(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 cursor-pointer"
                    >
                      {Array.from(
                        { length: result.schedule.length > 0 ? result.schedule[result.schedule.length - 1].year : loanTermYears },
                        (_, i) => i + 1
                      )
                        .filter((y) => y >= pdfStartYear)
                        .map((y) => (
                          <option key={y} value={y}>
                            ปีที่ {y}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 text-center pt-1 italic">
                  ข้อมูลสรุปดอกเบี้ยและตารางจะครอบคลุมช่วง ปีที่ {pdfStartYear} ถึง ปีที่ {pdfEndYear}
                </p>
              </div>

              {/* Option 3: Custom Plan Name & Color Picker */}
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 space-y-4">
                <div>
                  <label htmlFor="pdf-plan-name-input" className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    ระบุชื่อแผนการเงิน (บรรทัดที่ 2 ของหัวกระดาษ)
                  </label>
                  <input
                    id="pdf-plan-name-input"
                    type="text"
                    value={pdfPlanName}
                    onChange={(e) => setPdfPlanName(e.target.value)}
                    placeholder="ระบุชื่อแผนการเงินที่จะแสดงในรายงาน..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                    เลือกสีตัวอักษรของชื่อแผน (บรรทัดที่ 2)
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {[
                      { value: '#bae6fd', label: 'ฟ้าอ่อน', bg: 'bg-[#bae6fd]' },
                      { value: '#fed7aa', label: 'ส้มอ่อน', bg: 'bg-[#fed7aa]' },
                      { value: '#fef08a', label: 'เหลืองอ่อน', bg: 'bg-[#fef08a]' },
                      { value: '#bbf7d0', label: 'เขียวอ่อน', bg: 'bg-[#bbf7d0]' },
                      { value: '#fbcfe8', label: 'ชมพูอ่อน', bg: 'bg-[#fbcfe8]' },
                      { value: '#e9d5ff', label: 'ม่วงอ่อน', bg: 'bg-[#e9d5ff]' },
                      { value: '#ffffff', label: 'ขาว', bg: 'bg-white border border-slate-200' },
                    ].map((colorObj) => (
                      <button
                        key={colorObj.value}
                        type="button"
                        onClick={() => setPdfPlanColor(colorObj.value)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          pdfPlanColor === colorObj.value
                            ? 'ring-2 ring-emerald-500 ring-offset-1 scale-105 bg-emerald-50/20 dark:bg-emerald-950/20'
                            : 'hover:scale-102 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full ${colorObj.bg}`} />
                        <span className="text-slate-600 dark:text-slate-300">{colorObj.label}</span>
                      </button>
                    ))}
                    
                    {/* Custom Raw Color Picker */}
                    <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 dark:border-slate-800 bg-white dark:bg-slate-950">
                      <input
                        type="color"
                        value={pdfPlanColor}
                        onChange={(e) => setPdfPlanColor(e.target.value)}
                        className="h-5 w-5 rounded border-0 cursor-pointer"
                        title="ระบุสีแบบอิสระ"
                      />
                      <span className="text-[9px] font-bold text-slate-400 uppercase font-mono px-1">
                        {pdfPlanColor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => setIsPdfConfirmOpen(true)}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-500/10 transition hover:shadow-lg cursor-pointer"
              >
                ดาวน์โหลดรายงาน PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- RESET DATA CONFIRMATION MODAL (LARGE POP-UP) --- */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-rose-50 p-5 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 mb-5">
                <AlertTriangle className="h-10 w-10 animate-bounce" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">
                ยืนยันการรีเซ็ตข้อมูลทั้งหมด?
              </h3>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                การดำเนินการนี้จะ <strong className="text-rose-600 dark:text-rose-400 font-bold">ล้างข้อมูลการคำนวณทั้งหมดที่คุณกรอกไว้</strong> รวมถึงแผนอัตราดอกเบี้ย ยอดผ่อนชำระ และข้อมูลการโปะเพิ่มทั้งหมด และจะทำการคืนค่าเริ่มต้น (Default Template) ของระบบกลับคืนมา
              </p>
              <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4 w-full text-left border border-slate-100 dark:border-slate-900">
                <span className="block text-xs font-bold text-slate-400 mb-1.5">ค่าที่จะถูกตั้งใหม่:</span>
                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                  <li>วงเงินกู้เริ่มต้น: 3,000,000 บาท</li>
                  <li>ระยะเวลากู้: 30 ปี</li>
                  <li>อัตราดอกเบี้ยขั้นบันไดแบบเริ่มต้น</li>
                  <li>ยอดผ่อนชำระและรายการโปะเงินทั้งหมด</li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition cursor-pointer order-2 sm:order-1"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                type="button"
                onClick={() => {
                  // Reset all back to standard default template
                  setLoanAmount(3000000);
                  setLoanTermYears(30);
                  setInterestMode('step');
                  setInterestSteps([
                    { id: 'int-1', startMonth: 1, endMonth: 12, rate: 2.50 },
                    { id: 'int-2', startMonth: 13, endMonth: 36, rate: 3.50 },
                    { id: 'int-3', startMonth: 37, endMonth: 360, rate: 5.25 },
                  ]);
                  setPaymentMode('equal');
                  setEqualPaymentAmount(14000);
                  setPaymentSteps([
                    { id: 'pay-1', startMonth: 1, endMonth: 12, amount: 11000 },
                    { id: 'pay-2', startMonth: 13, endMonth: 36, amount: 13000 },
                    { id: 'pay-3', startMonth: 37, endMonth: 360, amount: 16000 },
                  ]);
                  setExtraPaymentType('none');
                  setExtraPaymentAmount(3000);
                  setExtraPaymentSteps([
                    { id: 'ext-1', startMonth: 1, endMonth: 36, amount: 3000 },
                    { id: 'ext-2', startMonth: 37, endMonth: 360, amount: 5000 },
                  ]);
                  setIsResetConfirmOpen(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-3 text-sm font-black text-white shadow-md shadow-rose-500/10 transition hover:shadow-lg cursor-pointer order-1 sm:order-2"
              >
                ยืนยันการรีเซ็ตข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PDF CONFIRMATION MODAL --- */}
      {isPdfConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-4">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">ยืนยันการบันทึกรายงาน PDF?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                ระบบกำลังจะดำเนินการจัดเตรียมไฟล์ประมาณการผ่อนชำระสินเชื่อบ้านในรูปแบบเอกสาร <strong className="text-slate-700 dark:text-slate-300">PDF (สัดส่วน A4 สีสันคมชัด)</strong> คุณต้องการดาวน์โหลดและบันทึกเอกสารใช่หรือไม่?
              </p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsPdfConfirmOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExportPDF();
                  setIsPdfConfirmOpen(false);
                }}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-500/10 transition hover:shadow-lg cursor-pointer"
              >
                ยืนยันดาวน์โหลด PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <ApprovalNoticeModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        onLoadLoan={handleLoadApprovalLoan}
      />

      <AndroidProjectModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
        loanAmount={loanAmount}
        loanTermYears={loanTermYears}
      />

      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
      />

      <OfflineIndicator />

      </div>
    </div>
  );
}
