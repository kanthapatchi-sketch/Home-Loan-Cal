/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id?: string;
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
}

export default function MetricCard({
  id,
  title,
  value,
  subValue,
  icon: Icon,
  variant = 'primary',
}: MetricCardProps) {
  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-emerald-50/50 dark:bg-emerald-950/10',
          iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
          border: 'border-emerald-100/80 dark:border-emerald-900/20',
          text: 'text-emerald-700 dark:text-emerald-400',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50/50 dark:bg-amber-950/10',
          iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
          border: 'border-amber-100/80 dark:border-amber-900/20',
          text: 'text-amber-700 dark:text-amber-400',
        };
      case 'secondary':
        return {
          bg: 'bg-slate-50/50 dark:bg-slate-900/20',
          iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
          border: 'border-slate-150 dark:border-slate-800/40',
          text: 'text-slate-700 dark:text-slate-300',
        };
      case 'info':
        return {
          bg: 'bg-blue-50/50 dark:bg-blue-950/10',
          iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
          border: 'border-blue-100/80 dark:border-blue-900/20',
          text: 'text-blue-700 dark:text-blue-400',
        };
      case 'primary':
      default:
        return {
          bg: 'bg-indigo-50/50 dark:bg-indigo-950/10',
          iconBg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
          border: 'border-indigo-100/80 dark:border-indigo-900/20',
          text: 'text-indigo-700 dark:text-indigo-400',
        };
    }
  };

  const colors = getColors();

  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-4 sm:p-6 transition-all duration-300 hover:shadow-md hover:translate-y-[-2px]`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 break-words">
            {value}
          </p>
          {subValue && (
            <p className={`text-[10px] sm:text-xs font-bold leading-normal ${colors.text}`}>
              {subValue}
            </p>
          )}
        </div>
        <div className={`rounded-xl p-2.5 sm:p-3 shrink-0 ${colors.iconBg}`}>
          <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
        </div>
      </div>
      <div className="absolute right-0 bottom-0 -mb-4 -mr-4 h-16 w-16 rounded-full bg-slate-300/10 dark:bg-slate-700/5" />
    </div>
  );
}
