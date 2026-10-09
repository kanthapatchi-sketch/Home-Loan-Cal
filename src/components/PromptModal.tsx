/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileCode,
  Copy,
  Check,
  X,
  Sparkles,
  Layers,
  Terminal,
  Download
} from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MASTER_PROMPT_TEXT = `# MASTER SYSTEM SPECIFICATION & ARCHITECTURAL PROMPT
# เครื่องมือคำนวณและวางแผนสินเชื่อบ้านแบบลดต้นลดดอก (Home Loan Step Calculator)
# เวอร์ชันสมบูรณ์แบบ 100% ครบทุกฟังก์ชัน พร้อม Native Android Kotlin & PWA

คุณคือ Senior Financial Software Engineer และ Full-Stack Architect จงสร้างเว็บแอปพลิเคชันและเนทีฟแอปสำหรับ "เครื่องมือคำนวณและวางแผนสินเชื่อบ้าน (Home Loan Step Calculator)" แบบลดต้นลดดอกระดับพรีเมียม โดยต้องมีคุณสมบัติ การคำนวณ การจัดรูปแบบตัวเลข และฟังก์ชันการทำงานครบถ้วน 100% ตามข้อกำหนดต่อไปนี้:

---

## 1. ขอบเขตและสถาปัตยกรรมระบบ (System Architecture)
- **Frontend Web**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Motion
- **Native Android**: Kotlin 2.1.0 + Jetpack Compose (Material 3) + Android SDK 35 (API 24+) + MVVM StateFlow
- **Export & Document Engine**: jsPDF (หนังสือแจ้งผลอนุมัติทางการ A4 พร้อมตราสัญลักษณ์ ตาราง และบล็อกลายเซ็น), CSV Exporter สำหรับตาราง Amortization
- **Mobile & Offline Support**: Progressive Web App (PWA) พร้อม Service Worker แคชออฟไลน์ 100%, Web App Manifest, และระบบสร้าง WebAPK / .apk

---

## 2. กฎเหล็กการจัดรูปแบบตัวเลข (Strict Number Formatting Constitution) - สำคัญ 100%
ระบบต้องบังคับใช้กฎการจัดรูปแบบตัวเลขทุกช่องอย่างเคร่งครัด:
1. **เครื่องหมายคั่นหลักพัน (Comma - ,)**:
   - ตัวเลขที่มีค่าเกิน 3 หลักขึ้นไป ต้องใส่เครื่องหมายจุลภาคคั่นหลักพันเสมอ เช่น 1,000, 10,000, 1,356,995.00
   - ขณะพิมพ์ในช่องกรอก (Input) ต้องรองรับการแสดงคอมมาแบบเรียลไทม์ หรือฟอร์แมตอัตโนมัติเมื่อหลุดโฟกัส (onBlur) โดยไม่ทำให้เคอร์เซอร์กระโดดหรือค่าคำนวณผิดพลาด
2. **จุดทศนิยม 2 ตำแหน่งทุกช่องที่เป็นจำนวนเงิน**:
   - ทุกช่องและทุกพื้นที่ที่แสดงหรือกรอก "จำนวนเงิน (บาท / THB)" ต้องแสดงทศนิยม 2 ตำแหน่งเสมอ เช่น "1,356,995.00 บาท", "8,900.00 บาท", "0.00 บาท"
   - บังคับใช้ทั้งใน หน้าแรก, ช่องกรอกค่างวด, สรุปผลการคำนวณ, ตารางผ่อนชำระรายงวด, หน้าเปรียบเทียบแผน, และหน้าใบแจ้งผลอนุมัติสินเชื่อ
3. **ข้อยกเว้น: จำนวนปีและงวดผ่อน ไม่ต้องใส่จุดทศนิยม**:
   - ช่องที่ระบุจำนวนปี (เช่น ระยะเวลากู้ 30 ปี) และงวดผ่อน (เช่น งวดที่ 360, 360 เดือน) ต้องแสดงเป็นจำนวนเต็ม (Integer) เท่านั้น ห้ามใส่ทศนิยมเด็ดขาด
4. **วงเงินกู้ (บาท) ตัวอักษรสีเขียวเรืองแสง (Hero Glowing Metric)**:
   - ที่การ์ดแสดงยอดวงเงินกู้ด้านบนสุด ต้องแสดงเป็นจำนวนเงินเต็มพร้อมคอมมาและทศนิยม 2 ตำแหน่ง เช่น \`1,356,995.00 บาท\` (ห้ามแสดงเป็นตัวย่อ เช่น 1.36 ล้านบาท เด็ดขาด)
   - ใช้เฉดสีเขียวเรืองแสง Emerald / Neon Green (\`#00E676\` / \`#10B981\`) พร้อมฟอนต์ตัวหนาพิเศษชัดเจน

---

## 3. เอนจินการคำนวณสินเชื่อบ้านแบบลดต้นลดดอก (Reducing Balance Amortization Engine)
1. **การคิดดอกเบี้ยรายเดือน**:
   - คำนวณตามสูตรลดต้นลดดอกมาตรฐานสถาบันการเงิน:
     \`ดอกเบี้ยประจำงวด = ยอดเงินต้นคงเหลือยกมา × (อัตราดอกเบี้ยต่อปี / 100) / 12\`
   - ปัดเศษทศนิยม 2 ตำแหน่ง (\`Math.round(val * 100) / 100\`) ในทุกงวด
2. **การตัดเงินต้น**:
   - \`เงินต้นที่ชำระ = ยอดชำระจริง - ดอกเบี้ยประจำงวด\`
   - \`ยอดเงินต้นคงเหลือยกไป = ยอดเงินต้นคงเหลือยกมา - เงินต้นที่ชำระ\`
3. **การปิดยอดหนี้งวดสุดท้าย (Payoff Logic)**:
   - เมื่องวดใดที่ยอดผ่อน (ค่างวด + ผ่อนเพิ่ม) มากกว่าหรือเท่ากับ ยอดหนี้คงเหลือ + ดอกเบี้ยงวดนั้น ให้ปิดยอดหนี้ทันทีโดยเงินต้นคงเหลือยกไปจะเป็น 0.00 บาท และจบการคำนวณ
4. **สูตรแนะนำค่างวดรายเดือน (Suggested PMT Calculator)**:
   - ใช้สูตร Amortization:
     \`PMT = [P × r × (1 + r)^n] / [(1 + r)^n - 1]\`
     โดย P = วงเงินกู้, r = ดอกเบี้ยต่อเดือน, n = จำนวนงวด (ปี × 12)
   - นำผลลัพธ์มาปัดเศษขึ้นเป็นหลักร้อยเพื่อเป็นบัฟเฟอร์ความปลอดภัย

---

## 4. ระบบอัตราดอกเบี้ยขั้นบันได (Interest Step Rates) & ตาราง MRR อ้างอิง ธปท. (BOT Auto-Sync)
1. **รองรับสเต็ปดอกเบี้ยหลายช่วงเวลา**:
   - ปีที่ 1 (งวดที่ 1-12), ปีที่ 2 (งวดที่ 13-24), ปีที่ 3 (งวดที่ 25-36), ปีที่ 4 เป็นต้นไป (งวดที่ 37-360)
   - สามารถเลือกประเภทได้ 2 แบบ:
     - ดอกเบี้ยคงที่ (Fixed Rate): ระบุเปอร์เซ็นต์โดยตรง เช่น 2.50%, 3.50%
     - ดอกเบี้ยลอยตัว (Floating Rate): อ้างอิง MRR ของธนาคารพาณิชย์ พร้อมสูตรบวก/ลบ Margin เช่น \`MRR - 1.50%\` หรือ \`MRR + 0.25%\`
2. **ฐานข้อมูล MRR อ้างอิงอัตโนมัติตามเว็บไซต์ของธนาคารแห่งประเทศไทย (BOT Auto-Sync)**:
   - แหล่งข้อมูลอ้างอิง: https://www.bot.or.th/th/statistics/interest-rate.html
   - ระบบ Auto-Sync ข้อมูลอัตราดอกเบี้ย MRR ของสถาบันการเงินและธนาคารพาณิชย์ชั้นนำของไทยแบบอัตโนมัติ:
     - สถาบันการเงินเฉพาะกิจของรัฐ: ธอส. (GHB = 6.145%), ธนาคารออมสิน (GSB = 6.045%)
     - ธนาคารพาณิชย์: ธนาคารกรุงเทพ (BBL = 6.500%), ธนาคารไทยพาณิชย์ (SCB = 6.575%), ธนาคารกสิกรไทย (KBANK = 6.580%), ธนาคารกรุงศรีอยุธยา (BAY = 6.670%), ธนาคารกรุงไทย (KTB = 6.845%), ธนาคารทหารไทยธนชาต (ttb = 7.105%), ไอซีบีซี (ICBC = 7.150%), ทิสโก้ (TISCO = 7.400%), เกียรตินาคินภัทร (KKP = 7.400%), ยูโอบี (UOB = 8.075%), LH Bank (8.180%), CIMB Thai (8.525%), ธนาคารไทยเครดิต (9.600%)
   - มีปุ่ม ซิงค์ข้อมูล ธปท. อัตโนมัติ (Auto Sync) พร้อมสวิตช์เปิด/ปิด Auto-Update
   - แสดงอัตราดอกเบี้ยนโยบาย ธปท. (Policy Rate: 2.25%) และสถิติอัตราเฉลี่ยทั้งระบบ
   - มีหน้าต่างตรวจสอบและสามารถแก้ไขค่า MRR ได้เอง พร้อมปุ่ม "รีเซ็ตเป็นค่าทางการ ธปท." และจัดเก็บลง LocalStorage


---

## 5. แผนการผ่อนชำระและโปะเงินต้น (Payment Modes & Extra Principal Prepayments)
1. **โหมดการผ่อนชำระหลัก**:
   - ผ่อนชำระเท่ากันทุกงวด (Equal Payment)
   - ผ่อนชำระแบบขั้นบันได (Step Payment): เช่น ปีที่ 1 ผ่อน 7,000.00 บาท, ปีที่ 2 ผ่อน 8,500.00 บาท, ปีที่ 3 เป็นต้นไป ผ่อน 11,000.00 บาท
2. **การผ่อนชำระเพิ่มเพื่อลดต้น (Extra Payment)**:
   - ไม่ผ่อนเพิ่ม (None)
   - ผ่อนเพิ่มคงที่ทุกเดือน (Monthly Fixed): เช่น ผ่อนเพิ่มเดือนละ 2,000.00 บาท
   - ผ่อนเพิ่มแบบกำหนดช่วงเวลา (Step Extra Payment): เช่น โปะเพิ่มเฉพาะ 3 ปีแรก
   - ระบบต้องคำนวณเปรียบเทียบทันทีว่า: โปะแล้วประหยัดดอกเบี้ยได้กี่บาท (เช่น ประหยัด 450,210.00 บาท) และผ่อนหมดเร็วขึ้นกี่ปี กี่เดือน

---

## 6. ตาราง Amortization และการส่งออกข้อมูล (Schedule Table & Export)
1. **การแสดงผลตาราง**:
   - ตารางรายงวด (Monthly Breakdown): แสดงงวดที่, ปีที่, เงินต้นยกมา, อัตราดอกเบี้ย, ค่างวด, ยอดโปะเพิ่ม, ดอกเบี้ยจ่าย, เงินต้นตัด, และยอดหนี้คงเหลือ
   - ตารางสรุปรายปี (Yearly Summary): ยุบรวมสรุปยอดผ่อนรวม ดอกเบี้ยรวม และเงินต้นรวมในแต่ละปี
2. **การส่งออกข้อมูล**:
   - ส่งออกเป็นไฟล์ CSV / Excel ที่รองรับภาษาไทย
   - รองรับการสั่งพิมพ์ตารางออกเป็น PDF

---

## 7. กราฟและการแสดงผลเชิงวิเคราะห์ (Financial Visualizations & Charts)
- กราฟสัดส่วนเงินต้น vs ดอกเบี้ยจ่ายรวม (Donut Chart)
- กราฟแสดงเส้นทางการลดลงของเงินต้นจนเป็นศูนย์ตามระยะเวลา (Amortization Balance Curve)
- กราฟเปรียบเทียบแผนเดิม vs แผนโปะเพิ่ม แสดงจำนวนเงินที่ประหยัดได้ชัดเจน

---

## 8. ระบบเปรียบเทียบและบันทึกแผนสินเชื่อ (Scenario Comparison & Storage)
- บันทึกแผนการผ่อนสินเชื่อหลายๆ แผนลงใน LocalStorage
- ตารางเปรียบเทียบแผนคู่ขนาน (Side-by-side comparison): เปรียบเทียบวงเงิน, ค่างวดต่อเดือน, ดอกเบี้ยรวมทั้งหมด, ระยะเวลาผ่อนหมดจริง, และยอดเงินที่ประหยัดได้

---

## 9. ใบแจ้งผลวงเงินอนุมัติสินเชื่อทางการ (Official Loan Approval Notice Generator)
- โมดอลจัดทำ "หนังสือแจ้งผลการพิจารณาอนุมัติสินเชื่อเบื้องต้น"
- ช่องกรอกข้อมูลครบถ้วน: ชื่อ-นามสกุลผู้ขอกู้, วงเงินอนุมัติ, สเต็ปดอกเบี้ยและค่างวด, เงื่อนไขประกันชีวิตคุ้มครองวงเงินสินเชื่อ (MRTA), หมายเหตุ และผู้มีอำนาจลงนาม
- **ระบบส่งออก PDF คุณภาพสูง (jsPDF)**:
  - หัวเอกสารราชการ/ธนาคาร ตารางเงื่อนไขการผ่อนที่จัดหน้าสวยงาม
  - บล็อกผู้มีอำนาจลงนามและตำแหน่ง
  - ตัวเลขจัดรูปแบบคอมมาและทศนิยม 2 ตำแหน่งทุกช่อง

---

## 10. โปรเจกต์ Native Android (Kotlin & Jetpack Compose) สมบูรณ์แบบ
- มีโฟลเดอร์ \`/android\` โครงสร้างครบถ้วนสำหรับ Android Studio:
  - \`settings.gradle.kts\`, \`build.gradle.kts\`, \`gradle.properties\`
  - \`app/build.gradle.kts\` ใช้ Jetpack Compose BOM, Material 3, ViewModel, StateFlow
  - \`AndroidManifest.xml\`
  - โค้ด Kotlin ครบทุกไฟล์: \`MainActivity.kt\`, \`LoanCalculatorScreen.kt\`, \`LoanCalculatorViewModel.kt\`, \`LoanCalculatorEngine.kt\`, \`Models.kt\`, \`Formatters.kt\`
  - มีปุ่ม "ดาวน์โหลดทั้งโปรเจกต์ Android (.zip)" ที่แพ็กไฟล์ ZIP ให้ดาวน์โหลดใน 1 คลิก
  - รองรับการ Build APK ผ่านคำสั่ง \`./gradlew assembleDebug\` และมีไฟล์ \`.github/workflows/build-apk.yml\`

---

## 11. ดีไซน์หน้าจอ (UI/UX)
- โทนสี: สีกรมท่าลึก (Deep Navy #0F2D59), สีพื้นหลัง Dark Slate (#020617 / #0F172A), การ์ดแบบโมเดิร์นพร้อมเส้นขอบคมชัด
- ไฮไลต์เรืองแสงสีเขียวมรกต (Glowing Emerald Green #00E676 / #10B981) สำหรับยอดวงเงินกู้และยอดที่ประหยัดได้
- รองรับการใช้งานสมบูรณ์แบบบนสมาร์ตโฟน แท็บเล็ต และคอมพิวเตอร์เดสก์ท็อป`;

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(MASTER_PROMPT_TEXT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([MASTER_PROMPT_TEXT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HomeLoanCalculator-Master-Prompt-100.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Master Prompt คำสั่งสร้างโปรแกรมนี้ (ละเอียด 100%)
                </h2>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                  100% Full Spec
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ครอบคลุมสูตรคำนวณลดต้นลดดอก, กฎทศนิยม 2 ตำแหน่ง, คอมมา, สเต็ปดอกเบี้ย, Android Kotlin และ PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>คำสั่งสมบูรณ์แบบ สามารถนำไปส่งให้ AI หรือทีมพัฒนาสร้างระบบได้ทันที</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition active:scale-95 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ดาวน์โหลด .txt</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>ก็อปปี้ Prompt เรียบร้อยแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>ก็อปปี้ Prompt ทั้งหมดในครั้งเดียว</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Text View Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <pre className="font-mono text-xs text-amber-200/90 whitespace-pre-wrap leading-relaxed select-all selection:bg-amber-500/30">
            {MASTER_PROMPT_TEXT}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <div className="text-[11px] text-slate-400">
            ความยาว {MASTER_PROMPT_TEXT.length.toLocaleString('th-TH')} ตัวอักษร • รวมฟังก์ชันครบถ้วน 100%
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer"
            >
              {copied ? 'คัดลอกเรียบร้อย' : 'คัดลอกข้อความทั้งหมด'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
