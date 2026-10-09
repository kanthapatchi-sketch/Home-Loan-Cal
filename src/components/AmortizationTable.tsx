/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AmortizationMonth } from '../types';
import { ChevronDown, ChevronUp, Download, Eye, EyeOff, Calendar, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { formatMoney } from '../utils/formatters';

interface AmortizationTableProps {
  schedule: AmortizationMonth[];
  loanAmount: number;
}

export default function AmortizationTable({ schedule, loanAmount }: AmortizationTableProps) {
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const [expandedYears, setExpandedYears] = useState<{ [key: number]: boolean }>({ 1: true }); // Default Year 1 expanded
  const [showCSVConfirm, setShowCSVConfirm] = useState(false);

  // Group months by year
  const yearsMap: { [key: number]: AmortizationMonth[] } = {};
  schedule.forEach(m => {
    if (!yearsMap[m.year]) {
      yearsMap[m.year] = [];
    }
    yearsMap[m.year].push(m);
  });

  const years = Object.keys(yearsMap).map(Number).sort((a, b) => a - b);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const expandAllYears = () => {
    const updated: { [key: number]: boolean } = {};
    years.forEach(y => {
      updated[y] = true;
    });
    setExpandedYears(updated);
  };

  const collapseAllYears = () => {
    setExpandedYears({});
  };

  // Helper to calculate summary for a given year
  const getYearlySummary = (yearMonths: AmortizationMonth[]) => {
    const totalPayment = yearMonths.reduce((sum, m) => sum + m.payment, 0);
    const totalExtra = yearMonths.reduce((sum, m) => sum + m.extraPayment, 0);
    const totalInterest = yearMonths.reduce((sum, m) => sum + m.interestPaid, 0);
    const totalPrincipal = yearMonths.reduce((sum, m) => sum + m.principalPaid, 0);
    const endingBalance = yearMonths[yearMonths.length - 1].endingBalance;
    const rates = Array.from(new Set(yearMonths.map(m => m.interestRate)));
    const ratesString = rates.map(r => `${r.toFixed(2)}%`).join(' → ');

    return {
      totalPayment,
      totalExtra,
      totalInterest,
      totalPrincipal,
      endingBalance,
      ratesString,
    };
  };

  // CSV Export handler
  const exportToCSV = () => {
    const headers = [
      'เดือนที่ (Month)',
      'ปีที่ (Year)',
      'อัตราดอกเบี้ย (Interest Rate %)',
      'ยอดชำระปกติ (Payment)',
      'ยอดโปะเพิ่ม (Extra Payment)',
      'ดอกเบี้ยที่คิด (Interest Paid)',
      'เงินต้นที่จ่าย (Principal Paid)',
      'ยอดหนี้คงเหลือ (Remaining Balance)',
    ];

    const rows = schedule.map(m => [
      m.month,
      m.year,
      m.interestRate.toFixed(2),
      m.payment.toFixed(2),
      m.extraPayment.toFixed(2),
      m.interestPaid.toFixed(2),
      m.principalPaid.toFixed(2),
      m.endingBalance.toFixed(2),
    ]);

    const csvContent =
      '\uFEFF' + // UTF-8 BOM for Thai characters in Excel
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mortgage_schedule.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="amortization-table-container" className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/40 dark:bg-slate-950">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
            ตารางจำลองการผ่อนชำระแบบละเอียด
          </h3>
          <p className="text-xs text-slate-400">
            แสดงรายละเอียดดอกเบี้ยสะสมและการตัดเงินต้นในทุกงวด
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {/* View Mode Select */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            <button
              onClick={() => setViewMode('yearly')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'yearly'
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              ดูรายปี (สรุป)
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              ดูรายเดือนเต็ม
            </button>
          </div>

          {/* Quick Actions */}
          {viewMode === 'yearly' && (
            <div className="flex rounded-xl border border-slate-150 p-0.5 dark:border-slate-800">
              <button
                onClick={expandAllYears}
                title="ขยายทั้งหมด"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={collapseAllYears}
                title="ย่อทั้งหมด"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => setShowCSVConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/40 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400"
          >
            <Download className="h-3.5 w-3.5" />
            ดาวน์โหลด CSV
          </button>
        </div>
      </div>

      {/* Amortization Table */}
      <div className="mb-2 flex items-center justify-between sm:hidden">
        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-0.5 rounded-full animate-pulse">
          ↔️ เลื่อนตารางซ้าย-ขวา เพื่อดูทั้งหมด
        </span>
      </div>
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
        <table className="w-full text-left border-collapse min-w-[700px] sm:min-w-0">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] sm:text-xs font-bold text-slate-500 dark:border-slate-800/40 dark:bg-slate-900/20">
              {viewMode === 'yearly' && <th className="py-2.5 px-2 sm:py-3 sm:px-4 w-10"></th>}
              <th className="py-2.5 px-2 sm:py-3 sm:px-4">{viewMode === 'yearly' ? 'ปีที่' : 'งวดที่'}</th>
              <th className="py-2.5 px-2 sm:py-3 sm:px-4 text-center">อัตราดอกเบี้ย %</th>
              <th className="py-2.5 px-2 sm:py-3 sm:px-4 text-right">ยอดผ่อนชำระ</th>
              <th className="py-2.5 px-2 sm:py-3 sm:px-4 text-right">เงินต้นปกติ</th>
              <th className="py-2.5 px-2 sm:py-3 sm:px-4 text-right">เงินโปะเพิ่ม</th>
              <th className="py-2.5 px-2 sm:py-3 sm:px-4 text-right">ดอกเบี้ยที่คิด</th>
              <th className="py-2.5 px-2 sm:py-3 sm:px-4 text-right">เงินต้นที่จ่ายจริง</th>
              <th className="py-2.5 px-2 sm:py-3 sm:px-4 text-right">ยอดหนี้คงเหลือ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60 text-sm dark:divide-slate-800/40">
            {viewMode === 'yearly' ? (
              // Yearly summary with accordion months
              years.map(year => {
                const yearMonths = yearsMap[year];
                const summary = getYearlySummary(yearMonths);
                const isExpanded = !!expandedYears[year];

                return (
                  <React.Fragment key={year}>
                    {/* Yearly Accordion Header Row */}
                    <tr
                      onClick={() => toggleYear(year)}
                      className="group cursor-pointer bg-white transition hover:bg-slate-50/80 dark:bg-transparent dark:hover:bg-slate-900/30"
                    >
                      <td className="py-2 px-2 sm:py-3.5 sm:px-4 text-center">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                        )}
                      </td>
                      <td className="py-2 px-2 sm:py-3.5 sm:px-4 font-bold text-slate-700 dark:text-slate-300">
                        ปีที่ {year}
                      </td>
                      <td className="py-2 px-2 sm:py-3.5 sm:px-4 text-center font-mono font-medium text-slate-500">
                        {summary.ratesString}
                      </td>
                      <td className="py-2 px-2 sm:py-3.5 sm:px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {formatMoney(summary.totalPayment + summary.totalExtra)}
                      </td>
                      <td className="py-2 px-2 sm:py-3.5 sm:px-4 text-right text-slate-400">
                        {formatMoney(summary.totalPayment)}
                      </td>
                      <td className="py-2 px-2 sm:py-3.5 sm:px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {summary.totalExtra > 0 ? `+${formatMoney(summary.totalExtra)}` : '-'}
                      </td>
                      <td className="py-2 px-2 sm:py-3.5 sm:px-4 text-right text-rose-600/90 font-medium dark:text-rose-400/90">
                        {formatMoney(summary.totalInterest)}
                      </td>
                      <td className="py-2 px-2 sm:py-3.5 sm:px-4 text-right text-emerald-600 font-bold dark:text-emerald-400">
                        {formatMoney(summary.totalPrincipal)}
                      </td>
                      <td className="py-2 px-2 sm:py-3.5 sm:px-4 text-right font-bold text-slate-800 dark:text-slate-100">
                        {formatMoney(summary.endingBalance)}
                      </td>
                    </tr>

                    {/* Expanded Monthly Rows for this year */}
                    {isExpanded && (
                      <tr className="bg-slate-50/30 dark:bg-slate-900/10">
                        <td colSpan={9} className="p-0">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse border-l-2 border-emerald-500/30 dark:border-emerald-500/10">
                              <tbody>
                                {yearMonths.map(m => {
                                  // Highlight paid off month
                                  const isLastMonth = m.endingBalance === 0 && m.beginningBalance > 0;
                                  return (
                                    <tr
                                      key={m.month}
                                      className={`border-b border-slate-100/40 text-xs hover:bg-slate-50 dark:border-slate-800/20 dark:hover:bg-slate-900/20 ${
                                        isLastMonth ? 'bg-emerald-50/40 text-emerald-900 font-medium dark:bg-emerald-950/20 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      <td className="py-2 px-2 sm:py-2.5 sm:px-4 w-10 text-center text-slate-300">
                                        •
                                      </td>
                                      <td className="py-2 px-2 sm:py-2.5 sm:px-4 font-mono">
                                        งวดที่ {m.month}
                                      </td>
                                      <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-center font-mono">
                                        {m.interestRate.toFixed(2)}%
                                      </td>
                                      <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono text-slate-500">
                                        {formatMoney(m.payment)}
                                      </td>
                                      <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono text-slate-400">
                                        {formatMoney(m.payment - m.interestPaid > 0 ? m.payment - m.interestPaid : 0)}
                                      </td>
                                      <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                        {m.extraPayment > 0 ? `+${formatMoney(m.extraPayment)}` : '-'}
                                      </td>
                                      <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono text-rose-500">
                                        {formatMoney(m.interestPaid)}
                                      </td>
                                      <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                        {formatMoney(m.principalPaid)}
                                      </td>
                                      <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {m.endingBalance === 0 ? (
                                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">
                                            ปิดบัญชีสำเร็จ 🎉
                                          </span>
                                        ) : (
                                          formatMoney(m.endingBalance)
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              // Continuous flat monthly view
              schedule.map(m => {
                const isLastMonth = m.endingBalance === 0 && m.beginningBalance > 0;
                return (
                  <tr
                    key={m.month}
                    className={`hover:bg-slate-50 text-xs transition dark:hover:bg-slate-900/20 ${
                      isLastMonth ? 'bg-emerald-50/50 text-emerald-900 font-medium dark:bg-emerald-950/25 dark:text-emerald-300' : ''
                    }`}
                  >
                    <td className="py-2 px-2 sm:py-2.5 sm:px-4 font-mono text-slate-600 dark:text-slate-400">
                      งวดที่ {m.month} <span className="text-[10px] text-slate-400">(ปีที่ {m.year})</span>
                    </td>
                    <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                      {m.interestRate.toFixed(2)}%
                    </td>
                    <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {formatMoney(m.payment)}
                    </td>
                    <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono text-slate-400">
                      {formatMoney(m.payment - m.interestPaid > 0 ? m.payment - m.interestPaid : 0)}
                    </td>
                    <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {m.extraPayment > 0 ? `+${formatMoney(m.extraPayment)}` : '-'}
                    </td>
                    <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono text-rose-500">
                      {formatMoney(m.interestPaid)}
                    </td>
                    <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(m.principalPaid)}
                    </td>
                    <td className="py-2 px-2 sm:py-2.5 sm:px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                      {m.endingBalance === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400">
                          ปิดบัญชีสำเร็จ 🎉
                        </span>
                      ) : (
                        formatMoney(m.endingBalance)
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-300" />
          <span>จำลองการคำนวณแบบ 30 วัน/เดือน อ้างอิงตามมาตรฐานทั่วไป</span>
        </div>
        <span>รวมทั้งหมด {schedule.length} งวด</span>
      </div>

      {showCSVConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-4">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">ยืนยันการบันทึกไฟล์ CSV?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                ระบบกำลังจะส่งออกข้อมูลจำลองตารางผ่อนชำระแบบละเอียด ทั้งหมด <strong className="text-slate-700 dark:text-slate-300">{schedule.length} งวด</strong> ไปยังอุปกรณ์ของคุณในรูปแบบไฟล์ <strong className="text-slate-700 dark:text-slate-300">.csv</strong> เพื่อนำไปเปิดใน Excel หรือ Numbers
              </p>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCSVConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  exportToCSV();
                  setShowCSVConfirm(false);
                }}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-500/10 transition hover:shadow-lg cursor-pointer"
              >
                ยืนยันบันทึกไฟล์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
