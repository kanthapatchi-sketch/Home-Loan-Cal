/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { InterestStep, BankMrr } from '../types';
import { BOT_INTEREST_RATE_URL, OFFICIAL_BOT_MRR_BANKS } from '../services/botMrrData';
import { 
  Percent, 
  TrendingDown, 
  ShieldAlert, 
  Check, 
  TrendingUp, 
  Sliders, 
  Info,
  Building,
  Edit2,
  Save,
  Undo2,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Search,
  CheckCircle2,
  Landmark,
  Radio
} from 'lucide-react';

interface MrrStatusProps {
  interestSteps: InterestStep[];
  interestMode: 'fixed' | 'step';
  bankMrrs: BankMrr[];
  onSaveBankMrrs: (updated: BankMrr[]) => void;
  isAutoSync?: boolean;
  onToggleAutoSync?: (enabled: boolean) => void;
  lastSyncTime?: string;
  onRefreshBotSync?: () => Promise<void>;
  isSyncingBot?: boolean;
  onApplyBankToFloatingSteps?: (bankName: string, mrr: number) => void;
}

export default function MrrStatus({ 
  interestSteps, 
  interestMode, 
  bankMrrs, 
  onSaveBankMrrs,
  isAutoSync = true,
  onToggleAutoSync,
  lastSyncTime = '9 ตุลาคม 2569 (ประกาศ ธปท.)',
  onRefreshBotSync,
  isSyncingBot = false,
  onApplyBankToFloatingSteps
}: MrrStatusProps) {
  // Local state for editing bank MRRs
  const [localBanks, setLocalBanks] = useState<BankMrr[]>(bankMrrs);
  const [isEditing, setIsEditing] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showSyncSuccessToast, setShowSyncSuccessToast] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'state' | 'commercial'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync local banks when parent props update
  useEffect(() => {
    setLocalBanks(bankMrrs);
  }, [bankMrrs]);

  // Calculate average MRR of all listed banks
  const averageMrr = useMemo(() => {
    if (!localBanks.length) return 7.0;
    const sum = localBanks.reduce((acc, bank) => acc + bank.mrr, 0);
    return Math.round((sum / localBanks.length) * 1000) / 1000;
  }, [localBanks]);

  // Find lowest and highest bank MRR
  const { lowestBank, highestBank } = useMemo(() => {
    if (!localBanks.length) return { lowestBank: null, highestBank: null };
    const sorted = [...localBanks].sort((a, b) => a.mrr - b.mrr);
    return {
      lowestBank: sorted[0],
      highestBank: sorted[sorted.length - 1]
    };
  }, [localBanks]);

  // Central MRR state for interactive "What-If" simulator
  const [centralMrr, setCentralMrr] = useState<number>(() => {
    return localBanks.find(b => b.name.includes('KBANK'))?.mrr ?? 6.58;
  });
  const [selectedBank, setSelectedBank] = useState<string>('กสิกรไทย (KBANK)');

  // Quick select a bank to simulate its rate
  const handleSelectBank = (bank: BankMrr) => {
    if (isEditing) return;
    setCentralMrr(bank.mrr);
    setSelectedBank(bank.name);
  };

  const handleSelectAverage = () => {
    if (isEditing) return;
    setCentralMrr(averageMrr);
    setSelectedBank('ค่าเฉลี่ยทุกธนาคาร');
  };

  // Handle single bank MRR change in editing form
  const handleEditBankRate = (bankName: string, val: number) => {
    setLocalBanks(prev => 
      prev.map(b => b.name === bankName ? { ...b, mrr: isNaN(val) ? 0 : val } : b)
    );
  };

  // Save customized rates
  const handleSaveBaseline = () => {
    onSaveBankMrrs(localBanks);
    setIsEditing(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);

    const currentSelectedBankObj = localBanks.find(b => b.name === selectedBank);
    if (currentSelectedBankObj) {
      setCentralMrr(currentSelectedBankObj.mrr);
    } else if (selectedBank === 'ค่าเฉลี่ยทุกธนาคาร') {
      const sum = localBanks.reduce((acc, bank) => acc + bank.mrr, 0);
      const newAvg = Math.round((sum / localBanks.length) * 1000) / 1000;
      setCentralMrr(newAvg);
    }
  };

  // Revert unsaved edits
  const handleCancelEdit = () => {
    setLocalBanks(bankMrrs);
    setIsEditing(false);
  };

  // Reset entirely to Official BOT rates
  const handleResetToBotOfficial = () => {
    setLocalBanks(OFFICIAL_BOT_MRR_BANKS);
    onSaveBankMrrs(OFFICIAL_BOT_MRR_BANKS);
    setIsEditing(false);
    setShowSyncSuccessToast(true);
    setTimeout(() => setShowSyncSuccessToast(false), 3000);
  };

  const handleTriggerSync = async () => {
    if (onRefreshBotSync) {
      await onRefreshBotSync();
      setShowSyncSuccessToast(true);
      setTimeout(() => setShowSyncSuccessToast(false), 3000);
    } else {
      handleResetToBotOfficial();
    }
  };

  // Find floating steps in the current plan
  const floatingSteps = useMemo(() => {
    return interestSteps.filter(step => step.type === 'floating');
  }, [interestSteps]);

  const hasFloating = floatingSteps.length > 0;

  // Filtered banks based on category and search
  const filteredBanks = useMemo(() => {
    return localBanks.filter(bank => {
      const matchesCategory = 
        filterCategory === 'all' ? true :
        filterCategory === 'state' ? bank.category === 'state' :
        bank.category !== 'state';
      
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery = !q || 
        bank.name.toLowerCase().includes(q) || 
        bank.fullName.toLowerCase().includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [localBanks, filterCategory, searchQuery]);

  // Render comparative data for the simulator
  const compareData = useMemo(() => {
    const targetSteps = hasFloating ? floatingSteps : [
      { id: 'mock-1', startMonth: 37, endMonth: 360, type: 'floating', mrr: 6.58, operator: '-', margin: 1.50 } as InterestStep
    ];

    return targetSteps.map(step => {
      const stepMrr = step.mrr ?? 6.58;
      const margin = step.margin ?? 0;
      const op = step.operator ?? '-';
      
      let originalRate = 0;
      if (op === '-') {
        originalRate = Math.max(0, stepMrr - margin);
      } else {
        originalRate = Math.max(0, stepMrr + margin);
      }

      let comparedRate = 0;
      if (op === '-') {
        comparedRate = Math.max(0, centralMrr - margin);
      } else {
        comparedRate = Math.max(0, centralMrr + margin);
      }

      const diff = comparedRate - originalRate;

      return {
        step,
        originalMrr: stepMrr,
        originalRate,
        comparedRate,
        diff,
        formula: `MRR ${op} ${margin.toFixed(2)}%`,
      };
    });
  }, [floatingSteps, hasFloating, centralMrr]);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/40 dark:bg-slate-950 space-y-5 animate-in fade-in duration-200">
      
      {/* BOT OFFICIAL SOURCE BRANDING HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <Landmark className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
              <span>สถานะดอกเบี้ย MRR อ้างอิง</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                ธปท. / BOT
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
            <span>อ้างอิงทางการตามเว็บไซต์:</span>
            <a 
              href={BOT_INTEREST_RATE_URL} 
              target="_blank" 
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              <span>ธนาคารแห่งประเทศไทย (bot.or.th)</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Live Auto Sync Status Indicator */}
          <div className="flex items-center gap-2 pt-0.5 text-[10px] flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Auto-Sync: {isAutoSync ? 'เปิดใช้งาน (เชื่อมต่อ ธปท.)' : 'กำหนดเอง (Manual)'}
            </span>
            <span className="text-slate-400">
              {lastSyncTime}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap self-start">
          {/* Refresh / Auto Sync Button */}
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={isSyncingBot}
            className="flex items-center gap-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 text-xs font-bold transition dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900 cursor-pointer disabled:opacity-50"
            title="ดึงข้อมูลอัตราดอกเบี้ย MRR ล่าสุดจาก ธปท."
          >
            <RefreshCw className={`h-3 w-3 ${isSyncingBot ? 'animate-spin' : ''}`} />
            <span>ซิงค์ข้อมูล ธปท.</span>
          </button>

          {/* Edit Rates Button */}
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80 transition cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>ปรับแต่งเรต</span>
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1 rounded-lg border border-slate-200 hover:bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-500 dark:border-slate-800 dark:hover:bg-slate-900 transition cursor-pointer"
              >
                <Undo2 className="h-3 w-3" />
                <span>ยกเลิก</span>
              </button>
              <button
                type="button"
                onClick={handleSaveBaseline}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer shadow-sm"
              >
                <Save className="h-3 w-3" />
                <span>บันทึก</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TOAST ALERTS */}
      {showSavedToast && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700 font-bold dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400 flex items-center gap-2 animate-in slide-in-from-top-1">
          <Check className="h-4 w-4 shrink-0" />
          <span>บันทึกค่า MRR อ้างอิงเป็นข้อมูลหลักของระบบสำเร็จ!</span>
        </div>
      )}

      {showSyncSuccessToast && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-xs text-blue-700 font-bold dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-300 flex items-center gap-2 animate-in slide-in-from-top-1">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>ซิงค์ข้อมูลสถิติอัตราดอกเบี้ย MRR จาก ธปท. (ธนาคารแห่งประเทศไทย) ล่าสุดสำเร็จเรียบร้อย!</span>
        </div>
      )}

      {/* BOT MACRO & POLICY STATS HIGHLIGHT */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800">
        <div>
          <span className="block text-[9px] font-black uppercase text-slate-400">อัตราดอกเบี้ยนโยบาย ธปท.</span>
          <span className="font-mono text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400">2.25%</span>
          <span className="block text-[8px] text-slate-400">อัตราดอกเบี้ยซื้อคืน 1 วัน</span>
        </div>
        <div>
          <span className="block text-[9px] font-black uppercase text-slate-400">MRR ต่ำสุดในระบบ</span>
          <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
            {lowestBank ? `${lowestBank.mrr.toFixed(3)}%` : '6.045%'}
          </span>
          <span className="block text-[8px] text-slate-400 truncate">{lowestBank?.name ?? 'ออมสิน (GSB)'}</span>
        </div>
        <div>
          <span className="block text-[9px] font-black uppercase text-slate-400">MRR เฉลี่ยในระบบ</span>
          <span className="font-mono text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400">
            {averageMrr.toFixed(3)}%
          </span>
          <span className="block text-[8px] text-slate-400">เฉลี่ย {localBanks.length} สถาบัน</span>
        </div>
        <div>
          <span className="block text-[9px] font-black uppercase text-slate-400">โหมดการซิงค์ข้อมูล</span>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAutoSync ? 'Auto-Update' : 'Manual'}
            </span>
            {onToggleAutoSync && (
              <button
                type="button"
                onClick={() => onToggleAutoSync(!isAutoSync)}
                className={`text-[8px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                  isAutoSync 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isAutoSync ? 'เปิดอยู่' : 'ปิดอยู่'}
              </button>
            )}
          </div>
          <span className="block text-[8px] text-slate-400">อ้างอิง ธปท. อัตโนมัติ</span>
        </div>
      </div>

      {/* BANNER FOR ACTIVE SELECTION (WHAT-IF BASELINE) */}
      {!isEditing && (
        <div className="rounded-xl bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40 p-3.5 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              ค่า MRR ธนาคารที่เลือกสำหรับจำลอง What-If
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {selectedBank}
            </span>
          </div>

          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {centralMrr.toFixed(3)}%
              </span>
              <span className="text-[10px] text-slate-400 font-bold">ต่อปี (ตามประกาศ ธปท.)</span>
            </div>

            {/* One click apply to floating steps in active plan */}
            {hasFloating && onApplyBankToFloatingSteps && (
              <button
                type="button"
                onClick={() => {
                  onApplyBankToFloatingSteps(selectedBank, centralMrr);
                  setShowSavedToast(true);
                  setTimeout(() => setShowSavedToast(false), 3000);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer shadow-sm"
              >
                <Check className="h-3 w-3" />
                <span>นำค่า MRR นี้ไปปรับในสเต็ปคำนวณทันที</span>
              </button>
            )}
          </div>

          {/* Quick preset selector buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <button
              type="button"
              onClick={handleSelectAverage}
              className={`rounded-lg px-2 py-1 text-[9px] font-extrabold transition cursor-pointer ${
                selectedBank === 'ค่าเฉลี่ยทุกธนาคาร'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
              }`}
            >
              ค่าเฉลี่ยทั้งระบบ ({averageMrr.toFixed(3)}%)
            </button>

            {localBanks.slice(0, 5).map(b => (
              <button
                key={b.name}
                type="button"
                onClick={() => handleSelectBank(b)}
                className={`rounded-lg px-2 py-1 text-[9px] font-extrabold transition cursor-pointer ${
                  selectedBank === b.name
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
                }`}
              >
                {b.name} ({b.mrr.toFixed(3)}%)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BANK SEARCH & CATEGORY FILTER */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
            {isEditing 
              ? 'ระบุค่า MRR ใหม่เพื่อบันทึกข้อมูลพื้นฐาน (หรือคลิก "รีเซ็ตค่า ธปท.")' 
              : 'ตารางอัตรา MRR ตามเว็บไซต์ ธปท. (คลิกเลือกเพื่อดูผลกระทบ)'}
          </span>

          {/* Search box & Category tabs */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อธนาคาร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-28 sm:w-36 rounded-lg border border-slate-200 bg-white pl-6 pr-2 py-1 text-[10px] font-bold outline-none transition focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setFilterCategory('all')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                  filterCategory === 'all' 
                    ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-800 dark:text-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('state')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                  filterCategory === 'state' 
                    ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-800 dark:text-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                สถาบันรัฐ
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory('commercial')}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                  filterCategory === 'commercial' 
                    ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-800 dark:text-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                พาณิชย์
              </button>
            </div>
          </div>
        </div>

        {/* BANK LIST */}
        <div className="grid gap-2 max-h-[310px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {filteredBanks.map((bank) => {
            const isSelected = selectedBank === bank.name;
            return (
              <div
                key={bank.name}
                onClick={() => handleSelectBank(bank)}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                  isEditing 
                    ? 'border-slate-100 bg-slate-50/10 dark:border-slate-800' 
                    : isSelected
                      ? 'bg-indigo-50/30 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/60 cursor-pointer shadow-xs'
                      : 'border-slate-100 hover:bg-slate-50/50 dark:border-slate-800/80 dark:hover:bg-slate-900/40 cursor-pointer'
                }`}
              >
                {/* Bank Name Logo placeholder */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0 ${bank.color.split(' ')[0]}`}>
                    {bank.name.substring(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {bank.fullName}
                      </span>
                      {bank.category === 'state' && (
                        <span className="text-[7.5px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900 shrink-0">
                          สถาบันรัฐ
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[8px] text-slate-400 font-medium">
                      <span>ชื่อย่อ: {bank.name}</span>
                      <span>•</span>
                      <span>อัปเดต ธปท.: {bank.updateDate}</span>
                      {bank.change !== undefined && bank.change < 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ({bank.change.toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* MRR input or static value */}
                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <div className="relative">
                      <input
                        type="number"
                        step="0.005"
                        min="0"
                        max="25"
                        value={bank.mrr}
                        onChange={(e) => handleEditBankRate(bank.name, parseFloat(e.target.value))}
                        className="w-18 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-right text-xs font-bold font-mono outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                      />
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 bg-white dark:bg-slate-900 pl-0.5">%</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">
                        {bank.mrr.toFixed(3)}%
                      </span>
                      {isSelected ? (
                        <span className="rounded-full bg-indigo-500 p-0.5 text-white">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold text-slate-400 hover:text-indigo-500">
                          เลือก
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reset to official BOT button while editing */}
        {isEditing && (
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={handleResetToBotOfficial}
              className="text-[10px] font-bold text-blue-600 hover:underline dark:text-blue-400 cursor-pointer flex items-center gap-1"
            >
              <Undo2 className="h-3 w-3" />
              <span>รีเซ็ตค่าเป็นทางการตามประกาศ ธปท. ล่าสุดทั้งหมด</span>
            </button>
          </div>
        )}
      </div>

      {/* INTERACTIVE WHAT-IF SLIDER */}
      {!isEditing && (
        <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1 font-extrabold text-[11px] text-slate-500 uppercase tracking-wider">
              <Sliders className="h-3.5 w-3.5 text-indigo-500" />
              จำลองผลกระทบเมื่อดอกเบี้ย MRR เปลี่ยนแปลง (What-If Simulation)
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">{centralMrr.toFixed(2)}%</span>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min="4.0"
              max="11.0"
              step="0.05"
              value={centralMrr}
              onChange={(e) => {
                setCentralMrr(parseFloat(e.target.value));
                setSelectedBank('ปรับเองตามใจชอบ');
              }}
              className="w-full accent-indigo-600 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-slate-400 font-bold font-mono">
              <span>ดอกเบี้ยต่ำ (4.0%)</span>
              <span>เฉลี่ย ธปท. (~{averageMrr.toFixed(2)}%)</span>
              <span>ทิศทางขาขึ้น (11.0%)</span>
            </div>
          </div>

          {/* SIMULATION RESULT IMPACT LIST */}
          <div className="space-y-2">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
              แรงกระทบต่อแผนผ่อนชำระลอยตัว (Floating Steps)
            </span>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {compareData.map((data, index) => {
                const isSaving = data.diff < 0;

                return (
                  <div 
                    key={index} 
                    className="rounded-xl border border-slate-100 dark:border-slate-800/80 p-2.5 bg-slate-50/40 dark:bg-slate-900/20 space-y-2"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {hasFloating 
                          ? `งวดที่ ${data.step.startMonth} - ${data.step.endMonth === 360 || data.step.endMonth === 3600 ? 'สิ้นสุดสัญญา' : data.step.endMonth}` 
                          : 'สเต็ปจำลอง (งวดที่ 37 เป็นต้นไป)'
                        }
                      </span>
                      <span className="bg-slate-100 dark:bg-slate-800 text-[8px] font-black text-slate-500 px-1.5 py-0.5 rounded-md">
                        {data.formula}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase">เรตเดิม (MRR: {data.originalMrr.toFixed(2)}%)</span>
                        <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                          {data.originalRate.toFixed(2)}% <span className="text-[9px] font-normal">/ปี</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] text-slate-400 uppercase">เรตจำลองใหม่ (MRR: {centralMrr.toFixed(2)}%)</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {data.comparedRate.toFixed(2)}% <span className="text-[9px] font-normal text-slate-500">/ปี</span>
                        </span>
                      </div>
                    </div>

                    {/* Impact Badge */}
                    <div className="pt-1.5 border-t border-slate-100/50 dark:border-slate-800/50 flex items-center justify-between text-[10px]">
                      <span className="text-[9px] text-slate-400 font-medium">การเปลี่ยนแปลง:</span>
                      {data.diff === 0 ? (
                        <span className="text-[10px] font-bold text-slate-500">อัตราเดิม</span>
                      ) : isSaving ? (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <TrendingDown className="h-2.5 w-2.5" /> ลดลง {-data.diff.toFixed(2)}% (ประหยัดภาระดอกเบี้ย)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-extrabold text-rose-500 dark:bg-rose-950/40 dark:text-rose-400">
                          <TrendingUp className="h-2.5 w-2.5" /> เพิ่มขึ้น +{data.diff.toFixed(2)}% (ภาระดอกเบี้ยสูงขึ้น)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DISMISSABLE ADVISORY */}
          {!hasFloating && (
            <div className="rounded-xl bg-amber-50/40 border border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/40 p-2.5 text-[10px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5 leading-relaxed font-medium">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                <strong>คำเตือน:</strong> แผนปัจจุบันของคุณเป็นอัตราดอกเบี้ยคงที่ (Fixed Rate) ตลอดระยะเวลาสัญญา จึงไม่ได้รับผลกระทบจากความผันผวนของอัตราดอกเบี้ยลอยตัว (MRR) แต่อย่างใด
              </span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
