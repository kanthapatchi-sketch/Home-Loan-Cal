import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  X,
  CheckCircle2,
  Share2,
  ExternalLink,
  Copy,
  Check,
  MoreVertical,
  Layers,
  Zap,
  HardDrive,
  PackageCheck,
  HelpCircle,
  FileDown
} from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'android' | 'apk' | 'ios';
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose, defaultTab = 'apk' }) => {
  const { isInstallable, install, isInstalled } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'apk' | 'ios'>(defaultTab);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(currentUrl || 'https://ais-pre-3rhel6sqq2767wofahjbx4-926909798896.asia-southeast1.run.app')}`;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDirectInstall = async () => {
    const outcome = await install();
    if (outcome === 'accepted') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 md:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          aria-label="ปิด"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative shrink-0">
            <img 
              src="/pwa-192x192.png" 
              alt="Home Loan App Icon" 
              className="h-16 w-16 rounded-2xl shadow-md border border-slate-100 dark:border-slate-800 object-cover"
              onError={(e) => {
                // Fallback to icon.svg if PNG fails
                (e.target as HTMLImageElement).src = '/icon.svg';
              }}
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 text-white border-2 border-white dark:border-slate-900">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 mb-1">
              <Smartphone className="h-3 w-3" />
              Progressive Web App (PWA)
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              ติดตั้งแอปคำนวณสินเชื่อบ้าน
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ลงในโทรศัพท์มือถือ ใช้งานได้เหมือนแอปแท้ 100%
            </p>
          </div>
        </div>

        {/* Direct Install Button if supported */}
        {isInstallable && !isInstalled && (
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-sky-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black">เบราว์เซอร์ของคุณพร้อมติดตั้งทันที!</p>
                <p className="text-xs text-blue-100">แตะปุ่มเพื่อเพิ่มแอปลงหน้าจอหลักใน 1 วินาที</p>
              </div>
              <button
                onClick={handleDirectInstall}
                className="shrink-0 flex items-center gap-1.5 bg-white text-blue-700 hover:bg-blue-50 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition transform active:scale-95 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                ติดตั้งทันที
              </button>
            </div>
          </div>
        )}

        {/* Highlight Benefits */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <Zap className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">เต็มหน้าจอ</p>
            <p className="text-[10px] text-slate-400">ไร้แถบ URL กวนใจ</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <HardDrive className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">เบาเครื่อง</p>
            <p className="text-[10px] text-slate-400">ใช้พื้นที่ไม่ถึง 2 MB</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
            <Layers className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">ออฟไลน์</p>
            <p className="text-[10px] text-slate-400">แคชเปิดได้แม้ไม่มีเน็ต</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex items-center gap-1.5 pb-2.5 px-3.5 text-xs font-black transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'apk'
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <PackageCheck className="h-4 w-4 text-emerald-500" />
            ดาวน์โหลดไฟล์ APK 📦
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 pb-2.5 px-3.5 text-xs font-black transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'android'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            ติดตั้งตรงผ่าน Chrome
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-1.5 pb-2.5 px-3.5 text-xs font-black transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'ios'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Share2 className="h-4 w-4" />
            iPhone / iPad (iOS)
          </button>
        </div>

        {/* Tab Content: APK Download */}
        {activeTab === 'apk' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <PackageCheck className="h-4 w-4 text-emerald-600" />
                    <span>สร้างและดาวน์โหลดไฟล์ .APK (Android Package)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    แปลง PWA นี้เป็นไฟล์ APK พร้อมส่งต่อหรือลงในโทรศัพท์ Android ผ่านระบบ PWABuilder (เครื่องมือมาตรฐานสากลของ Microsoft & Google)
                  </p>
                </div>
              </div>

              {/* Direct Link Button to PWABuilder */}
              <div className="my-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    เครื่องมือสร้าง APK ออนไลน์ (PWABuilder)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ตรวจเช็ค Manifest และแพ็กไฟล์ .apk ให้เสร็จใน 1 นาที
                  </p>
                </div>
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition cursor-pointer text-center"
                >
                  <FileDown className="h-4 w-4" />
                  <span>สร้างไฟล์ .APK ทันที</span>
                  <ExternalLink className="h-3.5 w-3.5 opacity-80" />
                </a>
              </div>

              {/* Step by step */}
              <ol className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900/40">
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white">
                    1
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">กดปุ่มสีเขียว &ldquo;สร้างไฟล์ .APK ทันที&rdquo;</span>
                    <span className="text-slate-500 dark:text-slate-400"> ด้านบน เพื่อเปิดหน้า PWABuilder ของแอปนี้</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white">
                    2
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">คลิกปุ่ม &ldquo;Package for Stores&rdquo;</span>
                    <span className="text-slate-500 dark:text-slate-400"> ที่หัวข้อ Android</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white">
                    3
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">กด &ldquo;Generate Package&rdquo;</span>
                    <span className="text-slate-500 dark:text-slate-400"> ระบบจะดาวน์โหลดไฟล์ Zip ที่มีไฟล์ .apk อยู่ข้างใน</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white">
                    4
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">เปิดไฟล์ .apk ในมือถือ Android แล้วกดติดตั้ง</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      (หากมือถือขึ้นเตือนความปลอดภัย ให้แตะอนุญาต &ldquo;ติดตั้งจากแหล่งที่ไม่รู้จัก / Install unknown apps&rdquo;)
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Comparison tip */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20 text-xs">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-blue-700 dark:text-blue-300">ข้อแนะนำ: </span>
                  หากต้องการติดตั้งลงเครื่องตัวเองทันทีโดยไม่ต้องผ่านไฟล์ APK คุณสามารถใช้แท็บ <strong>&ldquo;ติดตั้งตรงผ่าน Chrome&rdquo;</strong> ได้เช่นกัน ซึ่งระบบ Android จะสร้างเป็น WebAPK ติดตั้งลงเครื่องโดยตรง ปลอดภัย และอัปเดตอัตโนมัติไม่ต้องลงไฟล์ทับ
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Android */}
        {activeTab === 'android' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <h4 className="text-xs font-black text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-1.5">
                <span>วิธีติดตั้งในโทรศัพท์ Android (ผ่าน Google Chrome)</span>
              </h4>
              <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      เปิดลิงก์นี้ใน Google Chrome บนมือถือ
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      หากเปิดผ่าน LINE หรือ Facebook ให้แตะจุด 3 จุด แล้วเลือก &ldquo;เปิดด้วยเบราว์เซอร์ภายนอก / Chrome&rdquo;
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      แตะจุดสามจุด <MoreVertical className="inline h-3.5 w-3.5 text-slate-500" /> ที่มุมขวาบนของ Chrome
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      เลือก &ldquo;ติดตั้งแอป&rdquo; (Install App) หรือ &ldquo;เพิ่มลงในหน้าจอหลัก&rdquo; (Add to Home Screen)
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                    4
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      กดยืนยัน &ldquo;ติดตั้ง&rdquo; (Install)
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      ไอคอนแอปรูปบ้านจะปรากฏบนหน้าจอโทรศัพท์ของคุณทันที เปิดใช้งานได้ตลอดเวลาโดยไม่ต้องเข้าเว็บอีกต่อไป
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab Content: iOS */}
        {activeTab === 'ios' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-850">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <span>วิธีติดตั้งบน iPhone / iPad (ผ่าน Safari)</span>
              </h4>
              <ol className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px] font-black text-white">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      เปิดลิงก์นี้ใน Safari บน iPhone
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px] font-black text-white">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      แตะปุ่มแชร์ <Share2 className="inline h-3.5 w-3.5 text-blue-500" /> ที่แถบเมนูด้านล่าง
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px] font-black text-white">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      เลื่อนลงมาแล้วเลือก &ldquo;เพิ่มไปยังหน้าจอโฮม&rdquo; (Add to Home Screen)
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[11px] font-black text-white">
                    4
                  </span>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      แตะ &ldquo;เพิ่ม&rdquo; (Add) ที่มุมบนขวา
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Copy Link Section for opening on phone */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
            คัดลอกลิงก์แอปเพื่อส่งเปิดในโทรศัพท์มือถือ:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-600 dark:text-slate-300 select-all truncate"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center gap-1 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>คัดลอก</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
