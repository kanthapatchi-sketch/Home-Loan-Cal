/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LoanScenario, CalculationResult, InterestStep } from '../types';
import { calculateLoan, getEffectiveRate } from '../utils/calculator';
import { Trash2, FolderHeart, Plus, Copy, Check, BarChart2, Download, ArrowRight } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { formatMoney } from '../utils/formatters';

interface SavedScenariosProps {
  currentScenario: Omit<LoanScenario, 'id' | 'name' | 'createdAt'>;
  onLoadScenario: (scenario: LoanScenario) => void;
}

export default function SavedScenarios({ currentScenario, onLoadScenario }: SavedScenariosProps) {
  const [scenarios, setScenarios] = useState<LoanScenario[]>(() => {
    try {
      const saved = localStorage.getItem('mortgage_saved_scenarios');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    // Return standard initial templates
    return [
      {
        id: 'sc-1',
        name: 'ตัวอย่าง: ธนาคารกสิกร (ดอกเบี้ยปีแรกต่ำ)',
        loanAmount: 3000000,
        loanTermYears: 30,
        interestSteps: [
          { id: 'i-1', startMonth: 1, endMonth: 12, rate: 2.25 },
          { id: 'i-2', startMonth: 13, endMonth: 36, rate: 3.50 },
          { id: 'i-3', startMonth: 37, endMonth: 360, rate: 5.25 },
        ],
        paymentMode: 'equal',
        equalPaymentAmount: 14000,
        paymentSteps: [],
        extraPaymentType: 'none',
        extraPaymentAmount: 0,
        extraPaymentSteps: [],
        createdAt: Date.now() - 10000,
      },
      {
        id: 'sc-2',
        name: 'ตัวอย่าง: ธนาคารอาคารสงเคราะห์ (ดอกเบี้ยเฉลี่ย 3 ปีแรกดี)',
        loanAmount: 3000000,
        loanTermYears: 30,
        interestSteps: [
          { id: 'i-4', startMonth: 1, endMonth: 36, rate: 2.99 },
          { id: 'i-5', startMonth: 37, endMonth: 360, rate: 5.50 },
        ],
        paymentMode: 'equal',
        equalPaymentAmount: 14000,
        paymentSteps: [],
        extraPaymentType: 'monthly_fixed',
        extraPaymentAmount: 3000, // Show them how a 3,000 extra cuts off years!
        extraPaymentSteps: [],
        createdAt: Date.now(),
      }
    ];
  });

  const [newScenarioName, setNewScenarioName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const saveToLocalStorage = (updated: LoanScenario[]) => {
    setScenarios(updated);
    try {
      localStorage.setItem('mortgage_saved_scenarios', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;

    const newScenario: LoanScenario = {
      ...currentScenario,
      id: `sc-${Date.now()}`,
      name: newScenarioName.trim(),
      createdAt: Date.now(),
    };

    const updated = [newScenario, ...scenarios];
    saveToLocalStorage(updated);
    setNewScenarioName('');
    
    setSuccessMsg('บันทึกข้อเสนอสำเร็จ! 🎉');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = scenarios.filter(sc => sc.id !== id);
    saveToLocalStorage(updated);
  };

  // Pre-calculate stats of each saved scenario for the comparison grid
  const scenarioStats = scenarios.map(sc => {
    const result = calculateLoan(sc);
    return {
      scenario: sc,
      result,
    };
  });

  const handleExportComparisonPDF = () => {
    const canvas = document.createElement('canvas');
    const width = 1240;
    const height = 1754; // A4 size
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
    ctx.fillText('รายงานการเปรียบเทียบข้อเสนอธนาคาร', width / 2, 115);

    ctx.font = '22px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillStyle = '#e2f0fd';
    ctx.fillText('เปรียบเทียบข้อเสนอเงินกู้บ้าน • ออกเอกสาร ณ วันที่ ' + new Date().toLocaleDateString('th-TH'), width / 2, 160);

    let startY = 270;
    const cardHeight = 440;
    const cardSpacing = 30;

    const stats = scenarioStats.map(({ scenario, result }) => {
      const schedule = result.schedule;
      const y1Interest = schedule
        .filter(m => m.month >= 1 && m.month <= 12)
        .reduce((sum, m) => sum + m.interestPaid, 0);
      const y2Interest = schedule
        .filter(m => m.month >= 13 && m.month <= 24)
        .reduce((sum, m) => sum + m.interestPaid, 0);
      const y3Interest = schedule
        .filter(m => m.month >= 25 && m.month <= 36)
        .reduce((sum, m) => sum + m.interestPaid, 0);
      const first3YearsInterest = y1Interest + y2Interest + y3Interest;

      return {
        scenario,
        result,
        y1Interest,
        y2Interest,
        y3Interest,
        first3YearsInterest
      };
    });

    stats.slice(0, 3).forEach((item, index) => {
      const { scenario, y1Interest, y2Interest, y3Interest, first3YearsInterest } = item;
      const cardY = startY + (index * (cardHeight + cardSpacing));

      // Draw Card Container
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(50, cardY, width - 100, cardHeight, 16);
      } else {
        ctx.rect(50, cardY, width - 100, cardHeight);
      }
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(50, cardY, width - 100, cardHeight);

      // Card Header Banner (subtle bg for bank name)
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(50, cardY, width - 100, 60, [16, 16, 0, 0]);
      } else {
        ctx.rect(50, cardY, width - 100, 60);
      }
      ctx.fill();

      // Bank/Scenario Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText(`ธนาคาร: ${scenario.name}`, 80, cardY + 38);

      // Section labels
      ctx.fillStyle = '#475569';
      ctx.font = '20px "Sarabun", "Inter", "Thonburi", sans-serif';

      // 1. Loan Amount
      ctx.fillText(`วงเงินกู้:`, 80, cardY + 110);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText(`${formatMoney(scenario.loanAmount)} บาท`, 170, cardY + 110);

      // 2. Interest Rate Details
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText('รายละเอียดอัตราดอกเบี้ย:', 80, cardY + 160);
      
      ctx.font = '16px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillStyle = '#334155';
      scenario.interestSteps.slice(0, 5).forEach((step, idx) => {
        const typeStr = step.type === 'fixed' ? 'คงที่' : 'ลอยตัว';
        const rateStr = step.type === 'fixed' 
          ? `${(step.rate ?? 0).toFixed(2)}%` 
          : `MRR ${step.operator ?? '-'}${(step.margin ?? 0).toFixed(2)}%`;
        const rangeStr = step.endMonth === 360 
          ? `เดือนที่ ${step.startMonth} เป็นต้นไป` 
          : `เดือนที่ ${step.startMonth} - ${step.endMonth}`;
        ctx.fillText(`• ${rangeStr}: ${typeStr} ${rateStr}`, 100, cardY + 195 + (idx * 25));
      });

      // 3. Payment Details
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText('รายละเอียดการผ่อนชำระ:', 500, cardY + 160);

      ctx.font = '16px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillStyle = '#334155';
      const payModeStr = scenario.paymentMode === 'equal' ? 'ผ่อนคงที่เท่ากัน' : 'ผ่อนขั้นบันได';
      ctx.fillText(`• โหมด: ${payModeStr}`, 520, cardY + 195);
      
      if (scenario.paymentMode === 'equal') {
        ctx.fillText(`• ผ่อนหลัก: ${formatMoney(scenario.equalPaymentAmount)} บาท/เดือน`, 520, cardY + 220);
      } else {
        const firstStep = scenario.paymentSteps[0];
        if (firstStep) {
          ctx.fillText(`• ผ่อนหลักเริ่มต้น: ${formatMoney(firstStep.amount)} บาท/เดือน`, 520, cardY + 220);
        }
      }

      const extraStr = scenario.extraPaymentType === 'monthly_fixed'
        ? `โปะเพิ่มคงที่: ${formatMoney(scenario.extraPaymentAmount)} บาท/เดือน`
        : scenario.extraPaymentType === 'step' ? 'โปะเพิ่มขั้นบันได' : 'ไม่ได้โปะเพิ่ม';
      ctx.fillText(`• การโปะเพิ่ม: ${extraStr}`, 520, cardY + 245);

      // 4. Summarize Interest Year 1, 2, 3 & Sum 3 Years
      const boxX = 850;
      const boxY = cardY + 85;
      const boxW = 310;
      const boxH = 320;

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxW, boxH, 12);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#4f46e5'; // indigo-600
      ctx.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText('สรุปภาระดอกเบี้ยสะสม', boxX + 20, boxY + 35);

      ctx.fillStyle = '#475569';
      ctx.font = '16px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText(`ปีที่ 1:`, boxX + 20, boxY + 85);
      ctx.fillText(`ปีที่ 2:`, boxX + 20, boxY + 130);
      ctx.fillText(`ปีที่ 3:`, boxX + 20, boxY + 175);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText(`${formatMoney(y1Interest)} บาท`, boxX + 290, boxY + 85);
      ctx.fillText(`${formatMoney(y2Interest)} บาท`, boxX + 290, boxY + 130);
      ctx.fillText(`${formatMoney(y3Interest)} บาท`, boxX + 290, boxY + 175);

      // First 3 years total
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(boxX + 15, boxY + 215);
      ctx.lineTo(boxX + boxW - 15, boxY + 215);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#4f46e5';
      ctx.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText('รวม 3 ปีแรก:', boxX + 20, boxY + 255);

      ctx.textAlign = 'right';
      ctx.font = 'bold 20px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx.fillText(`${formatMoney(first3YearsInterest)} บาท`, boxX + 290, boxY + 255);
    });

    // Draw page footer info
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 16px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx.fillText('เอกสารรายงานสรุปเปรียบเทียบข้อเสนอธนาคาร • จัดทำโดยระบบคำนวณลดต้นลดดอกอัจฉริยะ', width / 2, height - 70);

    // Save
    try {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Mortgage_Comparison_Report_${Date.now()}.pdf`);
    } catch (e) {
      console.error('Error generating comparison PDF:', e);
    }
  };

  return (
    <div id="saved-scenarios-container" className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/40 dark:bg-slate-950">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
            บันทึกและเปรียบเทียบข้อเสนอธนาคาร
          </h3>
          <p className="text-xs text-slate-400">
            บันทึกข้อเสนอของแต่ละธนาคารเพื่อนำมาเปรียบเทียบหาตัวเลือกที่คุ้มค่าที่สุด
          </p>
        </div>
      </div>

      {/* Save Form */}
      <form onSubmit={handleSaveCurrent} className="mb-6">
        <label className="mb-1.5 block text-xs font-semibold text-slate-500 dark:text-slate-400">
          บันทึกแผนชำระเงินปัจจุบันเป็น... (เช่น แผนธนาคารกรุงเทพ, กสิกร ดอกเบี้ยต่ำ)
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            required
            placeholder="ชื่อแผนการชำระเงิน..."
            value={newScenarioName}
            onChange={(e) => setNewScenarioName(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            บันทึกดีลนี้
          </button>
        </div>
        {successMsg && (
          <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {successMsg}
          </p>
        )}
      </form>

      {/* Comparison Grid */}
      {scenarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
          <FolderHeart className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p>ยังไม่มีแผนที่บันทึกไว้ ลองตั้งชื่อและกดบันทึกด้านบนได้เลย!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800/80">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              📋 ตารางเปรียบเทียบดีลที่บันทึกไว้ (คลิกเพื่อโหลดกลับมาคำนวณและปรับแต่ง)
            </p>
            <button
              onClick={handleExportComparisonPDF}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              ส่งออกเปรียบเทียบเป็น PDF
            </button>
          </div>

          <div className="grid gap-4 grid-cols-1">
            {scenarioStats.map(({ scenario, result }) => {
              const schedule = result.schedule;
              
              // Calculate Year 1, 2, 3 interest
              const y1Interest = schedule
                .filter(m => m.month >= 1 && m.month <= 12)
                .reduce((sum, m) => sum + m.interestPaid, 0);
              const y2Interest = schedule
                .filter(m => m.month >= 13 && m.month <= 24)
                .reduce((sum, m) => sum + m.interestPaid, 0);
              const y3Interest = schedule
                .filter(m => m.month >= 25 && m.month <= 36)
                .reduce((sum, m) => sum + m.interestPaid, 0);
              const first3YearsInterest = y1Interest + y2Interest + y3Interest;

              return (
                <div
                  key={scenario.id}
                  onClick={() => onLoadScenario(scenario)}
                  className="group relative cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/50 p-4 sm:p-5 transition hover:border-emerald-200 hover:bg-emerald-50/10 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-emerald-900/20"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <h4 className="font-bold text-sm sm:text-base text-slate-800 group-hover:text-emerald-700 dark:text-slate-200 dark:group-hover:text-emerald-400">
                      🏢 ธนาคาร: {scenario.name}
                    </h4>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`คุณต้องการลบแผนการเงิน "${scenario.name}" ใช่หรือไม่?`)) {
                          handleDelete(scenario.id, e);
                        }
                      }}
                      title="ลบแผนนี้"
                      className="relative z-30 flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950/30 transition-all cursor-pointer active:scale-90 shrink-0"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-y-3 gap-x-4 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">วงเงินกู้</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatMoney(scenario.loanAmount)} บาท
                      </span>
                    </div>

                    <div className="border-t border-dashed border-slate-100 dark:border-slate-800 pt-2">
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">รายละเอียดอัตราดอกเบี้ย</span>
                      <div className="space-y-1 mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-300">
                        {scenario.interestSteps.map((step, idx) => {
                          const typeStr = step.type === 'fixed' ? 'คงที่' : 'ลอยตัว';
                          const rateStr = step.type === 'fixed' 
                            ? `${(step.rate ?? 0).toFixed(2)}%` 
                            : `MRR ${step.operator ?? '-'}${(step.margin ?? 0).toFixed(2)}%`;
                          
                          const rangeStr = step.endMonth === 360 
                            ? `เดือนที่ ${step.startMonth} ขึ้นไป` 
                            : `เดือนที่ ${step.startMonth} - ${step.endMonth}`;
                          
                          return (
                            <div key={idx} className="flex justify-between border-b border-dashed border-slate-100 dark:border-slate-800/40 pb-0.5">
                              <span>{rangeStr} ({typeStr})</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">{rateStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-100 dark:border-slate-800 pt-2">
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider">รายละเอียดการผ่อนชำระ</span>
                      <div className="space-y-1 mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span>โหมดผ่อนชำระ:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {scenario.paymentMode === 'equal' ? 'ผ่อนคงที่เท่ากัน' : 'ผ่อนขั้นบันได'}
                          </span>
                        </div>
                        {scenario.paymentMode === 'equal' ? (
                          <div className="flex justify-between">
                            <span>ยอดผ่อนชำระหลัก:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {formatMoney(scenario.equalPaymentAmount)} บาท/เดือน
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5 pl-2 text-[10px] text-slate-500">
                            {scenario.paymentSteps.map((pStep, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>• เดือน {pStep.startMonth} - {pStep.endMonth}:</span>
                                <span>{formatMoney(pStep.amount)} บาท/เดือน</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {scenario.extraPaymentType !== 'none' && (
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                            <span>ยอดโปะเพิ่มพิเศษ:</span>
                            <span>
                              {scenario.extraPaymentType === 'monthly_fixed' 
                                ? `+${formatMoney(scenario.extraPaymentAmount)} บาท/เดือน`
                                : `โปะขั้นบันได`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interest summaries per year & cumulative 3 years */}
                    <div className="border-t border-dashed border-slate-100 dark:border-slate-800 pt-2">
                      <div className="mt-1 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/20 p-3 space-y-2 border border-indigo-100/30">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-indigo-500">สรุปดอกเบี้ยสะสม 3 ปีแรก</span>
                        
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-slate-500">
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] text-slate-400">ดอกเบี้ยปีที่ 1</span>
                            <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">
                              {formatMoney(y1Interest)}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] text-slate-400">ดอกเบี้ยปีที่ 2</span>
                            <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">
                              {formatMoney(y2Interest)}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            <span className="block text-[8px] text-slate-400">ดอกเบี้ยปีที่ 3</span>
                            <span className="font-mono text-slate-700 dark:text-slate-200 font-bold">
                              {formatMoney(y3Interest)}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-dashed border-indigo-100 dark:border-indigo-900/50 font-bold text-xs">
                          <span className="text-indigo-600 dark:text-indigo-400">รวมดอกเบี้ย 3 ปีแรก:</span>
                          <span className="font-mono text-indigo-700 dark:text-indigo-300">
                            {formatMoney(first3YearsInterest)} บาท
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs">
                    <span className="text-[10px] text-slate-400 font-medium">
                      บันทึกเมื่อ: {new Date(scenario.createdAt).toLocaleDateString('th-TH')}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 transition-all group-hover:translate-x-1">
                      คลิกเพื่อโหลดข้อมูล <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
