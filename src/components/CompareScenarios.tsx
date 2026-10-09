/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { LoanScenario, InterestStep, PaymentStep, ExtraPaymentStep, ExtraPaymentType } from '../types';
import { calculateLoan, getEffectiveRate } from '../utils/calculator';
import { 
  Percent, 
  Coins, 
  Calendar, 
  ArrowRight, 
  Check, 
  HelpCircle, 
  RefreshCw, 
  Plus, 
  Sliders, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Zap,
  Flame
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { formatMoney } from '../utils/formatters';

interface CompareScenariosProps {
  currentScenario: Omit<LoanScenario, 'id' | 'name' | 'createdAt'>;
  onApplyCompareToMain?: (scenario: Omit<LoanScenario, 'id' | 'name' | 'createdAt'>) => void;
}

export default function CompareScenarios({ currentScenario, onApplyCompareToMain }: CompareScenariosProps) {
  // Scenario B (Temporary) local state
  const [tempScenario, setTempScenario] = useState<Omit<LoanScenario, 'id' | 'name' | 'createdAt'>>(() => ({
    ...currentScenario,
    // Deep copy objects to avoid mutation issues
    interestSteps: currentScenario.interestSteps.map(s => ({ ...s })),
    paymentSteps: currentScenario.paymentSteps.map(p => ({ ...p })),
    extraPaymentSteps: currentScenario.extraPaymentSteps.map(e => ({ ...e })),
  }));

  // Controls for quick tweaking
  const [interestOffset, setInterestOffset] = useState<number>(0); // -3.00% to +3.00%
  const [flatInterestRate, setFlatInterestRate] = useState<number>(3.5);
  const [useFlatInterest, setUseFlatInterest] = useState<boolean>(false);

  const [extraPaymentTweak, setExtraPaymentTweak] = useState<number>(() => {
    return currentScenario.extraPaymentType === 'monthly_fixed' ? currentScenario.extraPaymentAmount : 0;
  });
  const [overrideExtraType, setOverrideExtraType] = useState<'current' | 'flat'>('current');

  const [regularPaymentTweak, setRegularPaymentTweak] = useState<number>(() => {
    return currentScenario.paymentMode === 'equal' ? currentScenario.equalPaymentAmount : 15000;
  });

  // Reset comparison scenario B to match main scenario A
  const handleResetToMain = () => {
    setTempScenario({
      ...currentScenario,
      interestSteps: currentScenario.interestSteps.map(s => ({ ...s })),
      paymentSteps: currentScenario.paymentSteps.map(p => ({ ...p })),
      extraPaymentSteps: currentScenario.extraPaymentSteps.map(e => ({ ...e })),
    });
    setInterestOffset(0);
    setUseFlatInterest(false);
    setOverrideExtraType('current');
    setExtraPaymentTweak(currentScenario.extraPaymentType === 'monthly_fixed' ? currentScenario.extraPaymentAmount : 0);
    setRegularPaymentTweak(currentScenario.paymentMode === 'equal' ? currentScenario.equalPaymentAmount : 15000);
  };

  // Keep Temp Scenario updated whenever inputs tweak
  useEffect(() => {
    // 1. Build modified interest steps
    let finalInterestSteps: InterestStep[] = [];
    if (useFlatInterest) {
      finalInterestSteps = [{
        id: 'temp-int-fixed',
        startMonth: 1,
        endMonth: currentScenario.loanTermYears * 12,
        rate: flatInterestRate,
      }];
    } else {
      // Apply offset to existing steps
      finalInterestSteps = currentScenario.interestSteps.map(step => ({
        ...step,
        rate: Math.max(0.1, Math.round((step.rate + interestOffset) * 100) / 100),
      }));
    }

    // 2. Build modified payment steps
    let finalEqualAmount = currentScenario.equalPaymentAmount;
    let finalPaymentSteps = currentScenario.paymentSteps.map(p => ({ ...p }));
    if (currentScenario.paymentMode === 'equal') {
      finalEqualAmount = regularPaymentTweak;
    } else {
      // Scale steps proportionally if tweaked? Or keep same. For simple UI, we update the first/current step.
    }

    // 3. Build modified extra payments
    let finalExtraType = currentScenario.extraPaymentType;
    let finalExtraAmount = currentScenario.extraPaymentAmount;
    let finalExtraSteps = currentScenario.extraPaymentSteps.map(e => ({ ...e }));

    if (overrideExtraType === 'flat') {
      finalExtraType = extraPaymentTweak > 0 ? 'monthly_fixed' : 'none';
      finalExtraAmount = extraPaymentTweak;
    } else {
      // Keeping original type, but if monthly_fixed, apply tweak
      if (currentScenario.extraPaymentType === 'monthly_fixed') {
        finalExtraAmount = extraPaymentTweak;
      }
    }

    setTempScenario({
      loanAmount: currentScenario.loanAmount,
      loanTermYears: currentScenario.loanTermYears,
      interestSteps: finalInterestSteps,
      paymentMode: currentScenario.paymentMode,
      equalPaymentAmount: finalEqualAmount,
      paymentSteps: finalPaymentSteps,
      extraPaymentType: finalExtraType,
      extraPaymentAmount: finalExtraAmount,
      extraPaymentSteps: finalExtraSteps,
    });
  }, [
    currentScenario,
    interestOffset,
    flatInterestRate,
    useFlatInterest,
    extraPaymentTweak,
    overrideExtraType,
    regularPaymentTweak,
  ]);

  // Calculations for both Scenario A (Main) and Scenario B (Temp comparison)
  const resultA = useMemo(() => {
    return calculateLoan(currentScenario);
  }, [currentScenario]);

  const resultB = useMemo(() => {
    return calculateLoan(tempScenario);
  }, [tempScenario]);

  // Comparatives
  const interestDifference = resultB.totalInterest - resultA.totalInterest;
  const paymentDifference = resultB.totalPayments - resultA.totalPayments;
  const termDifferenceMonths = resultB.actualTermMonths - resultA.actualTermMonths;

  // Helper for displaying time difference
  const formatTimeDiff = (monthsDiff: number) => {
    if (monthsDiff === 0) return 'ระยะเวลาเท่ากัน';
    const isFaster = monthsDiff < 0;
    const absMonths = Math.abs(monthsDiff);
    const yrs = Math.floor(absMonths / 12);
    const mos = absMonths % 12;

    let text = '';
    if (yrs > 0) text += `${yrs} ปี `;
    if (mos > 0) text += `${mos} เดือน`;

    return isFaster ? `หมดหนี้เร็วขึ้น ${text} ⚡` : `หมดหนี้ช้าลง ${text} ⚠️`;
  };

  // Formatting currency
  const formatCurrency = (val: number) => {
    return `${formatMoney(Math.abs(val))} บาท`;
  };

  // Graph Data
  const chartData = [
    {
      name: 'แผนหลัก (A)',
      'เงินต้นรวม': resultA.totalPrincipal,
      'ดอกเบี้ยรวม': resultA.totalInterest,
      'ยอดรวมทั้งหมด': resultA.totalPayments,
    },
    {
      name: 'แผนเปรียบเทียบ (B)',
      'เงินต้นรวม': resultB.totalPrincipal,
      'ดอกเบี้ยรวม': resultB.totalInterest,
      'ยอดรวมทั้งหมด': resultB.totalPayments,
    }
  ];

  const yearsA = Math.floor(resultA.actualTermMonths / 12);
  const monthsA = resultA.actualTermMonths % 12;

  const yearsB = Math.floor(resultB.actualTermMonths / 12);
  const monthsB = resultB.actualTermMonths % 12;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header & Controls Card */}
      <div className="rounded-3xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/40 dark:bg-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-emerald-500" />
              วิเคราะห์เปรียบเทียบแผนแบบเรียลไทม์ (What-If Comparison)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              ปรับแต่งตัวแปรดอกเบี้ยหรือเงินโปะเพิ่มเติม เพื่อดูความแตกต่างเปรียบเทียบกับแผนหลักแบบเคียงข้างทันที
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetToMain}
            className="flex items-center justify-center gap-1.5 self-start rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> คืนค่าเริ่มต้นให้เท่าแผนหลัก
          </button>
        </div>

        {/* Adjustments Panel */}
        <div className="grid gap-6 md:grid-cols-3 mt-6">
          
          {/* A. INTEREST RATE CONTROLLER */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-900/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-indigo-500" />
                1. ตัวเลือกดอกเบี้ย แผน B
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setUseFlatInterest(false)}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition ${!useFlatInterest ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}
                >
                  ขั้นบันได
                </button>
                <button
                  type="button"
                  onClick={() => setUseFlatInterest(true)}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition ${useFlatInterest ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}
                >
                  คงที่
                </button>
              </div>
            </div>

            {!useFlatInterest ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">บวก/ลบ อัตราดอกเบี้ยเดิม:</span>
                  <span className={`font-mono font-bold ${interestOffset > 0 ? 'text-rose-500' : interestOffset < 0 ? 'text-emerald-500' : 'text-slate-600'}`}>
                    {interestOffset > 0 ? `+${interestOffset.toFixed(2)}%` : `${interestOffset.toFixed(2)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.05"
                  value={interestOffset}
                  onChange={(e) => setInterestOffset(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>ลดลง -3%</span>
                  <span>เท่าเดิม (0%)</span>
                  <span>เพิ่มขึ้น +3%</span>
                </div>
                <div className="rounded-lg bg-indigo-50/30 dark:bg-indigo-950/10 p-2.5 border border-indigo-100/30">
                  <span className="block text-[10px] font-bold text-indigo-500 uppercase">ประมาณการดอกเบี้ยแต่ละช่วง:</span>
                  <div className="space-y-1 mt-1">
                    {tempScenario.interestSteps.map((step, idx) => (
                      <div key={idx} className="flex justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        <span>งวด {step.startMonth} - {step.endMonth === 360 ? 'สิ้นสุด' : step.endMonth}:</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">{(step.rate ?? getEffectiveRate(step) ?? 0).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">อัตราดอกเบี้ยคงที่ใหม่:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {flatInterestRate.toFixed(2)}% ต่อปี
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="12.0"
                  step="0.1"
                  value={flatInterestRate}
                  onChange={(e) => setFlatInterestRate(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0.5%</span>
                  <span>6.0%</span>
                  <span>12.0%</span>
                </div>
                <div className="rounded-lg bg-indigo-50/30 dark:bg-indigo-950/10 p-2 text-center border border-indigo-100/30 text-[10px] text-slate-500">
                  ใช้อัตราคงที่นี้ครอบคลุมระยะเวลาผ่อนตลอดอายุสัญญา
                </div>
              </div>
            )}
          </div>

          {/* B. EXTRA PAYMENT CONTROLLER */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-900/10 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-500" />
                2. เงินโปะพิเศษต่อเดือน แผน B
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOverrideExtraType('current')}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition ${overrideExtraType === 'current' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}
                >
                  อิงแผนหลัก
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideExtraType('flat')}
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold transition ${overrideExtraType === 'flat' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}
                >
                  กำหนดใหม่
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">จำนวนเงินโปะรายเดือน:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatMoney(extraPaymentTweak)} บาท
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={extraPaymentTweak}
                onChange={(e) => {
                  setExtraPaymentTweak(parseInt(e.target.value));
                  if (overrideExtraType === 'current' && currentScenario.extraPaymentType !== 'monthly_fixed') {
                    // Force shift to flat override so the slider works
                    setOverrideExtraType('flat');
                  }
                }}
                className="w-full accent-emerald-600 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>ไม่โปะ (0)</span>
                <span>25,000</span>
                <span>50,000 บาท</span>
              </div>

              <div className="rounded-lg bg-emerald-50/30 dark:bg-emerald-950/10 p-2.5 border border-emerald-100/30 text-[10px] text-slate-500 leading-normal">
                {overrideExtraType === 'current' ? (
                  <>
                    <span className="font-bold text-emerald-600">สถานะ:</span> อิงรูปแบบการโปะเดิมจากแผนหลัก (
                    {currentScenario.extraPaymentType === 'none' && 'ไม่ได้โปะ'}
                    {currentScenario.extraPaymentType === 'monthly_fixed' && `โปะคงที่ที่ ${formatMoney(currentScenario.extraPaymentAmount)} บาท`}
                    {currentScenario.extraPaymentType === 'step' && 'โปะแบบขั้นบันได'}
                    )
                  </>
                ) : (
                  <>
                    <span className="font-bold text-emerald-600">สถานะ:</span> ปรับเปลี่ยนเป็นโปะรายเดือนเท่ากันคงที่ตลอดอายุสัญญา
                  </>
                )}
              </div>
            </div>
          </div>

          {/* C. REGULAR MONTHLY INSTALLMENT */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-900/10 space-y-4">
            <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-amber-500" />
              3. ยอดผ่อนปกติ แผน B
            </label>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">ยอดผ่อนต่อเดือนเริ่มต้น:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatMoney(regularPaymentTweak)} บาท
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="100000"
                step="1000"
                value={regularPaymentTweak}
                onChange={(e) => setRegularPaymentTweak(parseInt(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>5,000</span>
                <span>50,000</span>
                <span>100,000 บาท</span>
              </div>
              <div className="rounded-lg bg-amber-50/30 dark:bg-amber-950/10 p-2 text-center border border-amber-100/30 text-[10px] text-slate-500">
                {currentScenario.paymentMode === 'step' 
                  ? '⚠️ แผนหลักของคุณใช้ยอดผ่อนแบบสเต็ป การเปลี่ยนที่นี่จะบังคับใช้เป็นยอดผ่อนคงที่เท่ากันทุกงวดเพื่อคำนวณเปรียบเทียบชั่วคราว' 
                  : 'ปรับยอดผ่อนรายเดือนที่ธนาคารกำหนดพื้นฐาน'}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Side-by-Side Impact Analysis Dashboard */}
      <div className="grid gap-6 md:grid-cols-12">
        
        {/* LEFT COLUMN: METRICS & SAVINGS INSIGHTS (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Comparative Summary Metrics Grid */}
          <div className="grid gap-4 grid-cols-2">
            
            {/* Main Plan A Box */}
            <div className="rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800/40 dark:bg-slate-950">
              <span className="inline-flex rounded-lg bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                แผนหลัก (PLAN A)
              </span>
              <div className="mt-3 space-y-2.5">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">ดอกเบี้ยรวมที่จ่าย</span>
                  <span className="font-mono text-base font-bold text-slate-700 dark:text-slate-300">
                    {formatMoney(resultA.totalInterest)} บาท
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">ระยะเวลาผ่อนจริง</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {yearsA > 0 ? `${yearsA} ปี ` : ''}{monthsA > 0 ? `${monthsA} เดือน` : ''}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">รวมจ่ายทั้งสิ้น</span>
                  <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {formatMoney(resultA.totalPayments)} บาท
                  </span>
                </div>
              </div>
            </div>

            {/* Compare Plan B Box */}
            <div className="rounded-2xl border border-indigo-200/50 bg-indigo-50/10 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/10">
              <span className="inline-flex rounded-lg bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                แผนเปรียบเทียบ B (PLAN B)
              </span>
              <div className="mt-3 space-y-2.5">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">ดอกเบี้ยรวมที่จ่าย</span>
                  <span className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400">
                    {formatMoney(resultB.totalInterest)} บาท
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">ระยะเวลาผ่อนจริง</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {yearsB > 0 ? `${yearsB} ปี ` : ''}{monthsB > 0 ? `${monthsB} เดือน` : ''}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">รวมจ่ายทั้งสิ้น</span>
                  <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {formatMoney(resultB.totalPayments)} บาท
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Side-by-Side Savings Analysis Card */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800/40 dark:bg-slate-950">
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 pb-3 dark:border-slate-800/80">
              <Zap className="h-4.5 w-4.5 text-amber-500" />
              สรุปความคุ้มค่าและแรงผลักดัน (Impact Analysis)
            </h4>

            <div className="space-y-4 mt-4">
              
              {/* Interest Difference */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">ส่วนต่างดอกเบี้ยจ่ายสะสม:</span>
                  <span className="block text-[10px] text-slate-400">ค่าดอกเบี้ยรวม แผน B เทียบกับ แผน A</span>
                </div>
                <div className="text-right">
                  <span className={`font-mono text-sm sm:text-base font-black ${interestDifference <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {interestDifference <= 0 ? '-' : '+'}{formatCurrency(interestDifference)}
                  </span>
                  <span className={`block text-[10px] font-bold ${interestDifference <= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                    {interestDifference <= 0 ? 'ประหยัดดอกเบี้ยได้สำเร็จ' : 'จ่ายดอกเบี้ยเพิ่มขึ้น'}
                  </span>
                </div>
              </div>

              {/* Time Difference */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">ความต่างของระยะเวลาผ่อนหมด:</span>
                  <span className="block text-[10px] text-slate-400">ระยะเวลาหนี้ผูกพันรวม</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm sm:text-base font-black flex items-center justify-end gap-1 ${termDifferenceMonths <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {termDifferenceMonths === 0 ? 'เท่ากัน' : termDifferenceMonths < 0 ? 'เร็วขึ้น' : 'ช้าลง'}
                    {termDifferenceMonths !== 0 && (
                      <span className="font-mono">
                        {Math.abs(termDifferenceMonths)} เดือน
                      </span>
                    )}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {formatTimeDiff(termDifferenceMonths)}
                  </span>
                </div>
              </div>

              {/* Total Cost Difference */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">ความแตกต่างของกระแสเงินสดรวม (Total Cost):</span>
                  <span className="block text-[10px] text-slate-400">เงินต้น + ดอกเบี้ย + เงินโปะพิเศษสะสมตลอดอายุสัญญา</span>
                </div>
                <div className="text-right">
                  <span className={`font-mono text-sm sm:text-base font-black ${paymentDifference <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                    {paymentDifference <= 0 ? 'จ่ายน้อยลง ' : 'จ่ายรวมเยอะขึ้น '}
                    {formatCurrency(paymentDifference)}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    รวมเงินที่จ่ายออกทั้งหมด
                  </span>
                </div>
              </div>

            </div>

            {/* Quick Action to Apply */}
            {onApplyCompareToMain && (
              <div className="mt-5 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => onApplyCompareToMain(tempScenario)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-black shadow-md shadow-emerald-600/10 hover:shadow-lg active:scale-95 transition cursor-pointer"
                >
                  <Check className="h-4 w-4" /> ใช้ค่าจำลองเหล่านี้เป็นแผนหลักของแอปพลิเคชัน
                </button>
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: RECHARTS BAR GRAPH VISUALIZATION (5 cols) */}
        <div className="md:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800/40 dark:bg-slate-950">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-100 pb-3 dark:border-slate-800/80">
              <Activity className="h-4.5 w-4.5 text-indigo-500" />
              เปรียบเทียบสัดส่วนยอดชำระสะสม (Plan A vs Plan B)
            </h4>
            <p className="text-[10px] text-slate-400 mt-2">
              กราฟแสดงความคุ้มค่าเปรียบเทียบระหว่างเงินต้นหนี้สะสมกับอัตราดอกเบี้ยสุทธิที่ต้องเสียให้กับธนาคาร
            </p>
          </div>

          <div className="h-56 w-full mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  formatter={(value: any) => [`${formatMoney(Number(value))} บาท`]}
                  contentStyle={{ borderRadius: '16px', fontSize: '11px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="เงินต้นรวม" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="ดอกเบี้ยรวม" stackId="a" fill="#f43f5e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-3 text-center text-[10px] text-slate-500 leading-normal mt-4">
            {interestDifference < 0 ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                🎉 แผนเปรียบเทียบ B ประหยัดเงินจากดอกเบี้ยลงไปได้ถึง {formatCurrency(interestDifference)}!
              </span>
            ) : interestDifference > 0 ? (
              <span className="font-bold text-rose-500">
                ⚠️ แผนเปรียบเทียบ B มีภาระดอกเบี้ยสูงกว่าแผนหลัก {formatCurrency(interestDifference)} แนะนำให้เพิ่มเงินโปะหรือหาธนาคารที่ดอกเบี้ยต่ำกว่านี้
              </span>
            ) : (
              <span>แผนทั้งสองมีสัดส่วนเงินต้นและดอกเบี้ยเท่ากันพอดี</span>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
