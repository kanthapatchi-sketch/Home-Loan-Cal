/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { AmortizationMonth } from '../types';
import { TrendingDown, PieChart as ChartIcon } from 'lucide-react';
import { formatMoney } from '../utils/formatters';

interface LoanChartsProps {
  currentSchedule: AmortizationMonth[];
  baselineSchedule: AmortizationMonth[];
}

export default function LoanCharts({ currentSchedule, baselineSchedule }: LoanChartsProps) {
  const [activeTab, setActiveTab] = useState<'balance' | 'breakdown'>('balance');

  // Format currency helper
  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      return `${(val / 1000000).toFixed(2)}M`;
    }
    return val.toLocaleString('th-TH', { maximumFractionDigits: 0 });
  };

  // 1. Prepare data for Balance Comparison over time (grouped by year)
  // We want to find the ending balance at the end of each year (or month 12, 24, 36...)
  const maxYears = Math.ceil(Math.max(currentSchedule.length, baselineSchedule.length) / 12);
  const balanceData = Array.from({ length: maxYears + 1 }, (_, yearNum) => {
    const monthIndex = yearNum * 12;
    
    // Ending balance for current case at this year (or 0 if already paid off)
    let currentBalance = 0;
    if (yearNum === 0) {
      currentBalance = currentSchedule[0]?.beginningBalance || 0;
    } else {
      const monthData = currentSchedule.find(m => m.month === monthIndex);
      if (monthData) {
        currentBalance = monthData.endingBalance;
      } else {
        // If loan was paid off before this month
        const lastMonth = currentSchedule[currentSchedule.length - 1];
        if (lastMonth && monthIndex > lastMonth.month) {
          currentBalance = 0;
        } else {
          currentBalance = currentSchedule[currentSchedule.length - 1]?.endingBalance || 0;
        }
      }
    }

    // Ending balance for baseline case
    let baselineBalance = 0;
    if (yearNum === 0) {
      baselineBalance = baselineSchedule[0]?.beginningBalance || 0;
    } else {
      const monthData = baselineSchedule.find(m => m.month === monthIndex);
      if (monthData) {
        baselineBalance = monthData.endingBalance;
      } else {
        const lastMonth = baselineSchedule[baselineSchedule.length - 1];
        if (lastMonth && monthIndex > lastMonth.month) {
          baselineBalance = 0;
        } else {
          baselineBalance = baselineSchedule[baselineSchedule.length - 1]?.endingBalance || 0;
        }
      }
    }

    return {
      name: `ปีที่ ${yearNum}`,
      'แผนปัจจุบัน (สะสม)': Math.round(currentBalance),
      'แผนปกติ (ไม่โปะ)': Math.round(baselineBalance),
    };
  });

  // 2. Prepare data for Principal vs Interest breakdown for each year (current case)
  // We sum interestPaid and principalPaid for each year
  const breakdownDataMap: { [key: number]: { year: number; principal: number; interest: number } } = {};
  
  currentSchedule.forEach(m => {
    if (!breakdownDataMap[m.year]) {
      breakdownDataMap[m.year] = { year: m.year, principal: 0, interest: 0 };
    }
    breakdownDataMap[m.year].principal += m.principalPaid + m.extraPayment;
    breakdownDataMap[m.year].interest += m.interestPaid;
  });

  const breakdownData = Object.values(breakdownDataMap).map(d => ({
    name: `ปีที่ ${d.year}`,
    'เงินต้นจ่ายสะสม': Math.round(d.principal),
    'ดอกเบี้ยจ่ายสะสม': Math.round(d.interest),
  }));

  // Custom Tooltip components for beautiful Thai UI
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-slate-100 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
          <p className="mb-2 font-bold text-slate-800 dark:text-slate-100">{label}</p>
          <div className="space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
                </div>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatMoney(entry.value)} บาท
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="loan-charts-container" className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/40 dark:bg-slate-950">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
            กราฟวิเคราะห์แนวโน้มการผ่อนชำระ
          </h3>
          <p className="text-xs text-slate-400">
            เปรียบเทียบภาระหนี้คงเหลือและสัดส่วนการชำระรายปี
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('balance')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'balance'
                ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <TrendingDown className="h-3.5 w-3.5" />
            ยอดหนี้คงเหลือ
          </button>
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'breakdown'
                ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <ChartIcon className="h-3.5 w-3.5" />
            สัดส่วนการตัดต้น-ดอก
          </button>
        </div>
      </div>

      <div className="h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'balance' ? (
            <AreaChart data={balanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/50" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              <Area
                name="แผนปัจจุบัน (สะสม)"
                type="monotone"
                dataKey="แผนปัจจุบัน (สะสม)"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCurrent)"
              />
              <Area
                name="แผนปกติ (ไม่โปะ)"
                type="monotone"
                dataKey="แผนปกติ (ไม่โปะ)"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorBaseline)"
              />
            </AreaChart>
          ) : (
            <BarChart data={breakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800/50" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickFormatter={formatCurrency}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              <Bar name="เงินต้นจ่ายสะสม" dataKey="เงินต้นจ่ายสะสม" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Bar name="ดอกเบี้ยจ่ายสะสม" dataKey="ดอกเบี้ยจ่ายสะสม" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-slate-900/40 dark:text-slate-400">
        {activeTab === 'balance' ? (
          <p>
            💡 <strong className="text-slate-700 dark:text-slate-300">ความรู้เรื่องการลดต้นลดดอก:</strong> ยิ่งเทรนด์กราฟของแผนปัจจุบันลาดลงเร็วเท่าไหร่ แสดงว่าคุณจ่ายหนี้หมดเร็วขึ้นเท่านั้น ช่องว่างระหว่างเส้นประและเส้นทึบแสดงถึงมูลค่าหนี้และจำนวนปีที่คุณประหยัดไปได้!
          </p>
        ) : (
          <p>
            💡 <strong className="text-slate-700 dark:text-slate-300">สัดส่วนเงินต้นและดอกเบี้ย:</strong> ในปีแรกๆ ดอกเบี้ย (สีแดง) จะกินสัดส่วนเยอะมากเนื่องจากคำนวณจากยอดหนี้ก้อนใหญ่ การจ่ายโปะเงินต้นเพิ่มตั้งแต่เนิ่นๆ จะทำให้ส่วนที่เป็นเงินต้น (สีเขียว) เติบโตไวขึ้นและตัดดอกเบี้ยได้มหาศาล!
          </p>
        )}
      </div>
    </div>
  );
}
