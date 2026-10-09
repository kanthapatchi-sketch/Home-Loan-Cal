import { jsPDF } from 'jspdf';
import { ApprovalNoticeData, ApprovalStep, ApprovalLoan, InsuredPerson } from '../components/ApprovalNoticeModal';
import { formatMoney } from './formatters';

export const cleanNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const num = Number(String(val).replace(/,/g, '').trim());
  return isNaN(num) ? 0 : num;
};

export interface CombinedPaymentStep {
  startMonth: number;
  endMonth: number;
  monthlyPayment: number;
  isLast?: boolean;
}

export const getCombinedPaymentSteps = (loans: ApprovalLoan[]): CombinedPaymentStep[] => {
  const activeLoans = loans.filter(l => cleanNum(l.amount) > 0);
  if (activeLoans.length === 0) return [];

  // Determine the maximum term across all active loans
  const maxTerm = Math.max(...activeLoans.map(l => cleanNum(l.termMonths) || 360), 12);
  
  // Calculate total monthly payment for each month from 1 to maxTerm
  const monthlyTotals: number[] = new Array(maxTerm + 1).fill(0);
  for (let m = 1; m <= maxTerm; m++) {
    let sum = 0;
    for (const loan of activeLoans) {
      const term = cleanNum(loan.termMonths) || 360;
      if (m <= term) {
        if (loan.paymentType === 'step' && loan.paymentSteps && loan.paymentSteps.length > 0) {
          const stepMatch = loan.paymentSteps.find(s => m >= cleanNum(s.startMonth) && m <= cleanNum(s.endMonth));
          if (stepMatch) {
            sum += cleanNum(stepMatch.monthlyPayment);
          } else {
            if (m < cleanNum(loan.paymentSteps[0].startMonth)) {
              sum += cleanNum(loan.paymentSteps[0].monthlyPayment);
            } else {
              const last = loan.paymentSteps[loan.paymentSteps.length - 1];
              sum += cleanNum(last.monthlyPayment);
            }
          }
        } else {
          sum += cleanNum(loan.monthlyPayment);
        }
      }
    }
    monthlyTotals[m] = sum;
  }

  // Aggregate contiguous months with equal total payment
  const steps: CombinedPaymentStep[] = [];
  let currentStart = 1;
  let currentPmt = monthlyTotals[1];

  for (let m = 2; m <= maxTerm; m++) {
    if (monthlyTotals[m] !== currentPmt) {
      if (currentPmt > 0) {
        steps.push({
          startMonth: currentStart,
          endMonth: m - 1,
          monthlyPayment: currentPmt
        });
      }
      currentStart = m;
      currentPmt = monthlyTotals[m];
    }
  }

  if (currentPmt > 0) {
    steps.push({
      startMonth: currentStart,
      endMonth: maxTerm,
      monthlyPayment: currentPmt
    });
  }

  if (steps.length > 0) {
    steps[steps.length - 1].isLast = true;
  }

  return steps;
};

export const getStepActualRate = (step: ApprovalStep, mrr: number): number => {
  const rateValue = cleanNum(step.rateValue);
  if (step.rateType === 'floating') {
    return Math.max(0, cleanNum(mrr) + rateValue);
  }
  return rateValue;
};

const drawRoundRect = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, r);
  } else {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number => {
  const chars = text.split('');
  let line = '';
  let currentLineY = y;
  for (let n = 0; n < chars.length; n++) {
    const testLine = line + chars[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentLineY);
      line = chars[n];
      currentLineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentLineY);
  return currentLineY;
};

export const exportApprovalNoticePDF = (data: ApprovalNoticeData) => {
  try {
    const activeLoans = (data.loans || []).filter(l => l.name && l.typePreset !== 'ไม่มี');
    const displayLoans = activeLoans.length > 0 ? activeLoans : data.loans;
    const mrtaLoan = displayLoans.find(l => l.typePreset === 'เพื่อชำระค่าเบี้ยประกันชีวิต' || l.name?.includes('ประกัน'));
    const hasMrta = Boolean(mrtaLoan || (data.mrtaDetails && Number(data.mrtaDetails.coverageAmount || 0) > 0));

    const totalPages = hasMrta ? 2 : 1;

    // --- PAGE 1: LOAN APPROVAL NOTICE ---
    const canvas1 = document.createElement('canvas');
    canvas1.width = 1200;
    canvas1.height = 1700;
    const ctx1 = canvas1.getContext('2d');
    if (!ctx1) return;

    // Background
    ctx1.fillStyle = '#FFFFFF';
    ctx1.fillRect(0, 0, 1200, 1700);

    // Left bar accent
    ctx1.fillStyle = '#0f2d59';
    ctx1.fillRect(0, 0, 20, 1700);

    // Page indicator
    ctx1.fillStyle = '#94a3b8';
    ctx1.font = '14px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.textAlign = 'right';
    ctx1.fillText(`หน้าที่ 1 / ${totalPages}`, 1130, 45);
    ctx1.textAlign = 'left';

    // Header status badge
    ctx1.fillStyle = '#ecfdf5';
    ctx1.beginPath();
    drawRoundRect(ctx1, 810, 65, 320, 56, 12);
    ctx1.fill();
    ctx1.lineWidth = 1.5;
    ctx1.strokeStyle = '#a7f3d0';
    ctx1.stroke();

    // Badge text
    ctx1.fillStyle = '#047857';
    ctx1.font = 'bold 22px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.textAlign = 'center';
    ctx1.fillText(`สถานะ: ${data.statusType === 'actual' ? 'อนุมัติจริง' : 'อนุมัติเบื้องต้น'}`, 970, 101);

    // Title
    ctx1.textAlign = 'left';
    ctx1.fillStyle = '#0f2d59';
    ctx1.font = 'bold 32px "Sarabun", "Inter", "Thonburi", sans-serif';
    const titleText = data.statusType === 'actual' 
      ? 'ใบแจ้งผลการพิจารณาอนุมัติวงเงินกู้' 
      : 'ใบแจ้งผลการพิจารณาอนุมัติวงเงินกู้เบื้องต้น';
    ctx1.fillText(titleText, 70, 102);

    const isPreliminary = data.statusType !== 'actual';
    const shiftY = isPreliminary ? 75 : 0;

    // Dashed divider line
    ctx1.strokeStyle = '#e2e8f0';
    ctx1.lineWidth = 2;
    ctx1.setLineDash([8, 6]);
    ctx1.beginPath();
    ctx1.moveTo(70, 155 + shiftY);
    ctx1.lineTo(1130, 155 + shiftY);
    ctx1.stroke();
    ctx1.setLineDash([]);

    // Preliminary banner
    if (isPreliminary) {
      const noteY = 130;
      ctx1.fillStyle = '#fffbeb';
      ctx1.beginPath();
      drawRoundRect(ctx1, 70, noteY, 1060, 85, 16);
      ctx1.fill();
      ctx1.strokeStyle = '#fde68a';
      ctx1.lineWidth = 1.5;
      ctx1.stroke();

      ctx1.textAlign = 'left';
      ctx1.fillStyle = '#b45309';
      ctx1.font = 'bold 20px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx1.fillText('⚠️ หมายเหตุอนุมัติเบื้องต้น:', 95, noteY + 34);

      ctx1.fillStyle = '#78350f';
      ctx1.font = 'bold 17px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx1.fillText('- วงเงินกู้อนุมัติจริง, อัตราดอกเบี้ย, ยอดผ่อนชำระ ขึ้นอยู่กับราคาประเมินหลักทรัพย์อีกครั้ง', 95, noteY + 62);
    }

    // Salutation
    ctx1.fillStyle = '#1e293b';
    ctx1.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.fillText(`เรียน: ${data.salutation}`, 70, 205 + shiftY);

    // Recipient Card
    ctx1.fillStyle = '#f8fafc';
    ctx1.beginPath();
    drawRoundRect(ctx1, 70, 235 + shiftY, 1060, 135, 16);
    ctx1.fill();
    ctx1.lineWidth = 1;
    ctx1.strokeStyle = '#f1f5f9';
    ctx1.stroke();

    ctx1.fillStyle = '#64748b';
    ctx1.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.fillText('ผู้กู้หลัก', 100, 275 + shiftY);
    ctx1.fillText('ผู้กู้ร่วม', 450, 275 + shiftY);
    ctx1.fillText('ผู้ถือกรรมสิทธิ์', 800, 275 + shiftY);

    ctx1.fillStyle = '#0f172a';
    ctx1.font = 'bold 20px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.fillText(data.borrower, 100, 315 + shiftY);
    ctx1.fillText(data.coBorrower || '-', 450, 315 + shiftY);

    const coOwnersStr = data.coOwners || '-';
    let coOwnerLine1 = coOwnersStr;
    let coOwnerLine2 = '';
    if (coOwnersStr.includes(' และ')) {
      const parts = coOwnersStr.split(' และ');
      coOwnerLine1 = parts[0];
      coOwnerLine2 = 'และ' + parts[1];
    } else if (coOwnersStr.includes('และ')) {
      const parts = coOwnersStr.split('และ');
      coOwnerLine1 = parts[0];
      coOwnerLine2 = 'และ' + parts[1];
    }
    ctx1.fillText(coOwnerLine1, 800, 315 + shiftY);
    if (coOwnerLine2) {
      ctx1.fillText(coOwnerLine2, 800, 345 + shiftY);
    }

    // Accounts section
    ctx1.fillStyle = '#0f2d59';
    ctx1.font = 'bold 26px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.fillText('รายละเอียดวงเงินกู้ที่ได้รับอนุมัติ', 70, 410 + shiftY);

    // Scale height if there are more than 3 loans or if loans have step payments
    const hasAnyStepPayment = displayLoans.some(l => l.paymentType === 'step' && (l.paymentSteps?.length || 0) > 0);
    const cardHeight = displayLoans.length > 3 
      ? Math.max(140, 620 / displayLoans.length - 15) 
      : (hasAnyStepPayment ? 215 : 195);
    const cardSpacing = displayLoans.length > 3 ? cardHeight + 15 : (hasAnyStepPayment ? 235 : 215);

    let currentLoanY = 440 + shiftY;

    displayLoans.forEach((loan, index) => {
      const startY = currentLoanY + index * cardSpacing;

      ctx1.fillStyle = '#f8fafc';
      ctx1.beginPath();
      drawRoundRect(ctx1, 70, startY, 1060, cardHeight, 20);
      ctx1.fill();
      ctx1.strokeStyle = '#e2e8f0';
      ctx1.lineWidth = 1;
      ctx1.stroke();

      // Title
      ctx1.fillStyle = '#0f2d59';
      ctx1.font = 'bold 22px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx1.fillText(`${index + 1}. ${loan.name}`, 100, startY + 36);

      // Labels & values
      ctx1.fillStyle = '#64748b';
      ctx1.font = '18px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx1.fillText('วงเงินกู้:', 100, startY + 70);

      ctx1.fillStyle = '#0f172a';
      ctx1.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx1.fillText(`${formatMoney(cleanNum(loan.amount))} บาท`, 185, startY + 70);

      if (loan.paymentType === 'step' && loan.paymentSteps && loan.paymentSteps.length > 0) {
        ctx1.fillStyle = '#64748b';
        ctx1.font = '15px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx1.fillText('ผ่อนชำระ (ผ่อนแบบขั้นบันได):', 100, startY + 98);

        loan.paymentSteps.slice(0, 3).forEach((pStep, pIdx) => {
          const pmtVal = formatMoney(cleanNum(pStep.monthlyPayment));
          const isLast = (pIdx === loan.paymentSteps.length - 1 && loan.paymentSteps.length > 1) || (cleanNum(pStep.endMonth) >= cleanNum(loan.termMonths) && cleanNum(pStep.startMonth) > 1);
          const stepText = isLast
            ? `เดือนที่ ${pStep.startMonth} จนถึงตลอดสัญญา ผ่อน ${pmtVal} บาท/เดือน`
            : `เดือนที่ ${pStep.startMonth}-${pStep.endMonth} ผ่อน ${pmtVal} บาท/เดือน`;

          ctx1.fillStyle = '#0284c7';
          ctx1.font = 'bold 14px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx1.fillText(stepText, 100, startY + 122 + pIdx * 23);
        });

        const termY = Math.min(startY + 122 + Math.min(loan.paymentSteps.length, 3) * 23 + 4, startY + cardHeight - 16);
        if (cardHeight >= 180) {
          ctx1.fillStyle = '#64748b';
          ctx1.font = '15px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx1.fillText('ระยะเวลากู้:', 100, termY);
          ctx1.fillStyle = '#334155';
          ctx1.font = 'bold 15px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx1.fillText(`${cleanNum(loan.termMonths)} เดือน (${Math.round(cleanNum(loan.termMonths) / 12)} ปี)`, 185, termY);
        }
      } else {
        ctx1.fillStyle = '#64748b';
        ctx1.font = '18px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx1.fillText('ผ่อนชำระ:', 100, startY + 115);

        ctx1.fillStyle = '#0284c7';
        ctx1.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx1.fillText(`${formatMoney(cleanNum(loan.monthlyPayment))} บาท/เดือน`, 185, startY + 115);

        if (cardHeight >= 180) {
          ctx1.fillStyle = '#64748b';
          ctx1.font = '18px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx1.fillText('ระยะเวลากู้:', 100, startY + 155);
          ctx1.fillStyle = '#334155';
          ctx1.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx1.fillText(`${cleanNum(loan.termMonths)} เดือน (${Math.round(cleanNum(loan.termMonths) / 12)} ปี)`, 185, startY + 155);
        }
      }

      // Steps Title
      ctx1.fillStyle = '#0f2d59';
      ctx1.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx1.fillText('อัตราดอกเบี้ยต่อปี (% ต่อปี)', 550, startY + 36);

      loan.interestSteps.forEach((step, sIdx) => {
        const calcRate = getStepActualRate(step, cleanNum(data.mrr));
        const stepText = `เดือนที่ ${cleanNum(step.startMonth)} - ${cleanNum(step.endMonth)}:`;
        const rateText = step.rateType === 'floating'
          ? `MRR${cleanNum(step.rateValue) < 0 ? '' : '+'}${cleanNum(step.rateValue)}% (${calcRate.toFixed(2)}%)`
          : `${cleanNum(step.rateValue).toFixed(2)}%`;

        ctx1.fillStyle = '#475569';
        ctx1.font = '16px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx1.fillText(stepText, 550, startY + 70 + sIdx * 28);

        ctx1.fillStyle = '#0f172a';
        ctx1.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx1.fillText(rateText, 730, startY + 70 + sIdx * 28);
      });

      if (loan.averageRateLabel && cardHeight >= 180) {
        ctx1.strokeStyle = '#e2e8f0';
        ctx1.lineWidth = 1;
        ctx1.setLineDash([4, 4]);
        ctx1.beginPath();
        ctx1.moveTo(550, startY + 150);
        ctx1.lineTo(880, startY + 150);
        ctx1.stroke();
        ctx1.setLineDash([]);

        ctx1.fillStyle = '#059669';
        ctx1.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx1.fillText('อัตราเฉลี่ย:', 550, startY + 172);
        ctx1.fillText(loan.averageRateLabel, 730, startY + 172);
      }
    });

    const getLoanPmt = (l: any): number => {
      if (l.paymentType === 'step' && l.paymentSteps && l.paymentSteps.length > 0) {
        return cleanNum(l.paymentSteps[0].monthlyPayment);
      }
      return cleanNum(l.monthlyPayment);
    };

    const totalLoanAmount = displayLoans.reduce((acc, cur) => acc + cleanNum(cur.amount), 0);
    const totalMonthlyPayment = displayLoans.reduce((acc, cur) => acc + getLoanPmt(cur), 0);

    // Additional expenses section
    const expY = Math.max(1135 + shiftY, currentLoanY + displayLoans.length * cardSpacing + 30);

    // Expenses header
    ctx1.fillStyle = '#0f172a';
    ctx1.font = 'bold 22px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.fillText('💸 ค่าใช้จ่ายในวันทำสัญญาและจดจำนอง', 70, expY);

    // Card for expenses
    ctx1.fillStyle = '#f8fafc';
    ctx1.beginPath();
    drawRoundRect(ctx1, 70, expY + 25, 500, 220, 16);
    ctx1.fill();
    ctx1.strokeStyle = '#e2e8f0';
    ctx1.stroke();

    ctx1.fillStyle = '#475569';
    ctx1.font = '17px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.fillText('อากรแสตมป์ปิดสัญญา (0.05%):', 100, expY + 70);
    ctx1.fillText('ค่าประกันอัคคีภัย (3 ปี):', 100, expY + 110);
    ctx1.fillText(`ค่าจดจำนองที่ดิน (${cleanNum(data.mortgageFeePercent)}%):`, 100, expY + 150);
    ctx1.fillText('ค่าธรรมเนียมอื่นๆ ที่ดิน:', 100, expY + 190);

    ctx1.fillStyle = '#0f172a';
    ctx1.font = 'bold 17px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.textAlign = 'right';
    ctx1.fillText(`${formatMoney(cleanNum(data.stampDuty))} บาท`, 540, expY + 70);
    ctx1.fillText(`${formatMoney(cleanNum(data.insuranceFee))} บาท`, 540, expY + 110);
    ctx1.fillText(`${formatMoney(totalLoanAmount * (cleanNum(data.mortgageFeePercent) / 100))} บาท`, 540, expY + 150);
    ctx1.fillText(`${formatMoney(cleanNum(data.otherFees))} บาท`, 540, expY + 190);
    ctx1.textAlign = 'left';

    // Right column notes
    ctx1.fillStyle = '#0f172a';
    ctx1.font = 'bold 22px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.fillText('ℹ️ หมายเหตุสำคัญ', 630, expY);

    // Appraisal Card
    ctx1.fillStyle = '#fffbeb';
    ctx1.beginPath();
    drawRoundRect(ctx1, 630, expY + 25, 500, 150, 16);
    ctx1.fill();
    ctx1.strokeStyle = '#fef3c7';
    ctx1.stroke();

    ctx1.fillStyle = '#b45309';
    ctx1.font = 'bold 17px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.fillText(`ค่าประเมิน ${formatMoney(cleanNum(data.appraisalFee))} บาท`, 660, expY + 70);

    ctx1.fillStyle = '#78350f';
    ctx1.font = '16px "Sarabun", "Inter", "Thonburi", sans-serif';
    wrapText(ctx1, data.appraisalNote || '', 660, expY + 105, 440, 24);

    // MRR Note Box
    ctx1.fillStyle = '#f8fafc';
    ctx1.beginPath();
    drawRoundRect(ctx1, 630, expY + 190, 500, 55, 12);
    ctx1.fill();
    ctx1.strokeStyle = '#f1f5f9';
    ctx1.stroke();

    ctx1.fillStyle = '#0f2d59';
    ctx1.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';
    ctx1.textAlign = 'center';
    ctx1.fillText(`MRR ปัจจุบัน = ${cleanNum(data.mrr).toFixed(2)}%`, 880, expY + 226);
    ctx1.textAlign = 'left';

    // Summary bottom section
    const hasAnyStepLoan = displayLoans.some(l => l.paymentType === 'step' && (l.paymentSteps?.length || 0) > 0);
    const combinedSteps = hasAnyStepLoan ? getCombinedPaymentSteps(displayLoans) : [];
    const isStepSummary = hasAnyStepLoan && combinedSteps.length > 1;

    const sumBoxHeight = isStepSummary ? Math.max(130, 48 + combinedSteps.length * 28 + 16) : 120;
    const sumY = Math.min(expY + 265, 1680 - sumBoxHeight);

    if (sumY + sumBoxHeight <= 1700) {
      ctx1.fillStyle = '#f0f9ff';
      ctx1.beginPath();
      drawRoundRect(ctx1, 70, sumY, 1060, sumBoxHeight, 24);
      ctx1.fill();
      ctx1.strokeStyle = '#bae6fd';
      ctx1.stroke();

      ctx1.fillStyle = '#0f2d59';
      ctx1.font = 'bold 20px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx1.fillText('สรุปรวมทุกวงเงิน', 100, sumY + 38);

      ctx1.fillStyle = '#334155';
      ctx1.font = '18px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx1.fillText('วงเงินกู้รวม:', 100, sumY + (isStepSummary ? 75 : 85));
      ctx1.fillStyle = '#0f172a';
      ctx1.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';
      ctx1.fillText(`${formatMoney(totalLoanAmount)} บาท`, 210, sumY + (isStepSummary ? 75 : 85));

      if (isStepSummary) {
        // Vertical divider between loan total and combined payment steps
        ctx1.strokeStyle = '#bae6fd';
        ctx1.lineWidth = 1;
        ctx1.setLineDash([4, 4]);
        ctx1.beginPath();
        ctx1.moveTo(470, sumY + 20);
        ctx1.lineTo(470, sumY + sumBoxHeight - 20);
        ctx1.stroke();
        ctx1.setLineDash([]);

        ctx1.fillStyle = '#0f2d59';
        ctx1.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx1.fillText('ผ่อนชำระรวม (ผ่อนแบบขั้นบันได):', 500, sumY + 38);

        combinedSteps.forEach((cStep, cIdx) => {
          const isLast = cIdx === combinedSteps.length - 1 && combinedSteps.length > 1;
          const pmtVal = formatMoney(cStep.monthlyPayment);
          const stepText = isLast
            ? `เดือนที่ ${cStep.startMonth} จนถึงตลอดสัญญา ผ่อนชำระรวม ${pmtVal} บาท/เดือน`
            : `เดือนที่ ${cStep.startMonth} ถึง ${cStep.endMonth} ผ่อนชำระรวม ${pmtVal} บาท/เดือน`;

          ctx1.fillStyle = '#0284c7';
          ctx1.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx1.fillText(stepText, 500, sumY + 68 + cIdx * 27);
        });
      } else {
        ctx1.fillStyle = '#334155';
        ctx1.font = '20px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx1.fillText('ผ่อนชำระรวม:', 550, sumY + 85);
        ctx1.fillStyle = '#0284c7';
        ctx1.font = 'bold 26px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx1.fillText(`${formatMoney(totalMonthlyPayment)} บาท/เดือน`, 680, sumY + 85);
      }
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Add Page 1
    const imgData1 = canvas1.toDataURL('image/png');
    pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    // --- PAGE 2: LIFE INSURANCE (MRTA) DETAILS (IF APPLICABLE) ---
    if (hasMrta) {
      const homeLoan = displayLoans.find(l => l.typePreset === 'สินเชื่อบ้าน') || displayLoans[0];
      const defaultCoverageAmount = homeLoan ? cleanNum(homeLoan.amount) : totalLoanAmount;
      const defaultPremiumAmount = mrtaLoan ? cleanNum(mrtaLoan.amount) : 76890;

      let persons: InsuredPerson[] = [];
      if (Array.isArray(data.mrtaDetails?.insuredPersons) && data.mrtaDetails.insuredPersons.length > 0) {
        persons = data.mrtaDetails.insuredPersons;
      } else {
        persons = [
          {
            id: 'insured-1',
            name: data.borrower,
            coverageAmount: data.mrtaDetails?.coverageAmount ?? defaultCoverageAmount,
            coveragePercent: data.mrtaDetails?.coveragePercent ?? 100,
            coverageYears: data.mrtaDetails?.coverageYears ?? 10,
            coverageYearsPercent: data.mrtaDetails?.coverageYearsPercent ?? 33,
            premiumAmount: data.mrtaDetails?.premiumAmount ?? defaultPremiumAmount
          }
        ];
      }

      const canvas2 = document.createElement('canvas');
      canvas2.width = 1200;
      canvas2.height = 1700;
      const ctx2 = canvas2.getContext('2d');
      if (ctx2) {
        // Background
        ctx2.fillStyle = '#FFFFFF';
        ctx2.fillRect(0, 0, 1200, 1700);

        // Left bar accent
        ctx2.fillStyle = '#0f2d59';
        ctx2.fillRect(0, 0, 20, 1700);

        // Page indicator
        ctx2.fillStyle = '#94a3b8';
        ctx2.font = '14px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.textAlign = 'right';
        ctx2.fillText(`หน้าที่ 2 / ${totalPages}`, 1130, 45);
        ctx2.textAlign = 'left';

        // Badge: Insurance
        ctx2.fillStyle = '#eff6ff';
        ctx2.beginPath();
        drawRoundRect(ctx2, 810, 65, 320, 56, 12);
        ctx2.fill();
        ctx2.lineWidth = 1.5;
        ctx2.strokeStyle = '#bfdbfe';
        ctx2.stroke();

        ctx2.fillStyle = '#1d4ed8';
        ctx2.font = 'bold 20px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.textAlign = 'center';
        ctx2.fillText('ประกันชีวิตคุ้มครองสินเชื่อ', 970, 101);

        // Title
        ctx2.textAlign = 'left';
        ctx2.fillStyle = '#0f2d59';
        ctx2.font = 'bold 32px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText('แจ้งรายละเอียดประกันชีวิตเพิ่มเติม', 70, 102);

        // Divider
        ctx2.strokeStyle = '#e2e8f0';
        ctx2.lineWidth = 2;
        ctx2.setLineDash([8, 6]);
        ctx2.beginPath();
        ctx2.moveTo(70, 150);
        ctx2.lineTo(1130, 150);
        ctx2.stroke();
        ctx2.setLineDash([]);

        // Salutation & Reference Card
        ctx2.fillStyle = '#1e293b';
        ctx2.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText(`เรียน: ${data.salutation}`, 70, 195);

        ctx2.fillStyle = '#f8fafc';
        ctx2.beginPath();
        drawRoundRect(ctx2, 70, 220, 1060, 95, 16);
        ctx2.fill();
        ctx2.lineWidth = 1;
        ctx2.strokeStyle = '#f1f5f9';
        ctx2.stroke();

        ctx2.fillStyle = '#64748b';
        ctx2.font = 'bold 17px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText('ผู้กู้:', 100, 258);
        ctx2.fillText('ผู้กู้ร่วม:', 560, 258);

        ctx2.fillStyle = '#0f172a';
        ctx2.font = 'bold 20px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText(data.borrower, 100, 292);
        ctx2.fillText(data.coBorrower || '-', 560, 292);

        // SECTION 1: INSURED PERSONS & KEY METRICS
        let currentY = 365;

        persons.forEach((person, pIdx) => {
          if (persons.length > 1) {
            ctx2.fillStyle = '#0f2d59';
            ctx2.beginPath();
            drawRoundRect(ctx2, 70, currentY, 460, 42, 10);
            ctx2.fill();
            
            ctx2.fillStyle = '#ffffff';
            ctx2.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
            ctx2.textAlign = 'left';
            ctx2.fillText(`ผู้เอาประกันคนที่ ${pIdx + 1}: ${person.name}`, 92, currentY + 27);
            
            currentY += 56;
          } else {
            ctx2.fillStyle = '#f8fafc';
            ctx2.beginPath();
            drawRoundRect(ctx2, 70, currentY, 1060, 48, 12);
            ctx2.fill();
            ctx2.strokeStyle = '#e2e8f0';
            ctx2.lineWidth = 1;
            ctx2.stroke();

            ctx2.fillStyle = '#0f2d59';
            ctx2.font = 'bold 20px "Sarabun", "Inter", "Thonburi", sans-serif';
            ctx2.textAlign = 'left';
            ctx2.fillText(`ผู้เอาประกัน: ${person.name || data.borrower}`, 95, currentY + 31);
            
            currentY += 64;
          }

          const cardHeight = persons.length > 1 ? 155 : 170;

          // Metric 1: Coverage Amount
          ctx2.fillStyle = '#f0f9ff';
          ctx2.beginPath();
          drawRoundRect(ctx2, 70, currentY, 335, cardHeight, 16);
          ctx2.fill();
          ctx2.strokeStyle = '#bae6fd';
          ctx2.lineWidth = 1.5;
          ctx2.stroke();

          ctx2.fillStyle = '#0369a1';
          ctx2.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.fillText('🛡️ ทุนเอาประกัน', 95, currentY + 38);

          ctx2.fillStyle = '#0f172a';
          ctx2.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.fillText(`${formatMoney(cleanNum(person.coverageAmount))} บาท`, 95, currentY + 84);

          ctx2.fillStyle = '#0284c7';
          ctx2.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.fillText(`คิดเป็น ${cleanNum(person.coveragePercent)}% ของวงเงินกู้`, 95, currentY + 128);

          // Metric 2: Coverage Term
          ctx2.fillStyle = '#fdf4ff';
          ctx2.beginPath();
          drawRoundRect(ctx2, 432, currentY, 335, cardHeight, 16);
          ctx2.fill();
          ctx2.strokeStyle = '#f5d0fe';
          ctx2.lineWidth = 1.5;
          ctx2.stroke();

          ctx2.fillStyle = '#a21caf';
          ctx2.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.fillText('⏳ ระยะเวลาคุ้มครอง', 457, currentY + 38);

          ctx2.fillStyle = '#0f172a';
          ctx2.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.fillText(`${cleanNum(person.coverageYears)} ปี`, 457, currentY + 84);

          ctx2.fillStyle = '#9333ea';
          ctx2.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.fillText(`คิดเป็น ${cleanNum(person.coverageYearsPercent)}% ของระยะเวลากู้`, 457, currentY + 128);

          // Metric 3: Premium Amount
          ctx2.fillStyle = '#ecfdf5';
          ctx2.beginPath();
          drawRoundRect(ctx2, 795, currentY, 335, cardHeight, 16);
          ctx2.fill();
          ctx2.strokeStyle = '#a7f3d0';
          ctx2.lineWidth = 1.5;
          ctx2.stroke();

          ctx2.fillStyle = '#047857';
          ctx2.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.fillText('💳 ค่าเบี้ยประกันชีวิต', 820, currentY + 38);

          ctx2.fillStyle = '#0f172a';
          ctx2.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.fillText(`${formatMoney(cleanNum(person.premiumAmount))} บาท`, 820, currentY + 84);

          ctx2.fillStyle = '#059669';
          ctx2.font = 'bold 16px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.fillText('ชำระครั้งเดียว', 820, currentY + 128);

          currentY += cardHeight + 26;
        });

        if (persons.length > 1) {
          const totalPremium = persons.reduce((sum, p) => sum + cleanNum(p.premiumAmount), 0);
          ctx2.fillStyle = '#f0fdf4';
          ctx2.beginPath();
          drawRoundRect(ctx2, 70, currentY, 1060, 56, 12);
          ctx2.fill();
          ctx2.strokeStyle = '#86efac';
          ctx2.lineWidth = 1.5;
          ctx2.stroke();

          ctx2.fillStyle = '#166534';
          ctx2.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.textAlign = 'left';
          ctx2.fillText(`รวมค่าเบี้ยประกันชีวิตทั้งหมด:`, 95, currentY + 35);
          
          ctx2.fillStyle = '#15803d';
          ctx2.font = 'bold 22px "Sarabun", "Inter", "Thonburi", sans-serif';
          ctx2.textAlign = 'right';
          ctx2.fillText(`${formatMoney(totalPremium)} บาท ชำระครั้งเดียว`, 1105, currentY + 35);
          ctx2.textAlign = 'left';

          currentY += 76;
        } else {
          currentY += 15;
        }

        // SECTION 2: COVERAGE DETAILS
        ctx2.fillStyle = '#0f2d59';
        ctx2.font = 'bold 23px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText('รายละเอียดของความคุ้มครอง', 70, currentY);

        const covBoxHeight = persons.length > 1 ? 190 : 205;
        ctx2.fillStyle = '#f8fafc';
        ctx2.beginPath();
        drawRoundRect(ctx2, 70, currentY + 16, 1060, covBoxHeight, 16);
        ctx2.fill();
        ctx2.strokeStyle = '#e2e8f0';
        ctx2.lineWidth = 1;
        ctx2.stroke();

        ctx2.fillStyle = '#0f172a';
        ctx2.font = 'bold 19px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText('•  กรณีเสียชีวิต', 105, currentY + 54);
        ctx2.font = '18px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillStyle = '#475569';
        ctx2.fillText('ตามตารางจำนวนเงินเอาประกันภัยที่ลดลง', 300, currentY + 54);

        ctx2.fillStyle = '#0f172a';
        ctx2.font = 'bold 19px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText('•  กรณีทุพพลภาพถาวรสิ้นเชิง', 105, currentY + 104);
        ctx2.font = '18px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillStyle = '#475569';
        ctx2.fillText('ตามตารางจำนวนเงินเอาประกันภัยที่ลดลง', 410, currentY + 104);

        ctx2.strokeStyle = '#e2e8f0';
        ctx2.setLineDash([4, 4]);
        ctx2.beginPath();
        ctx2.moveTo(105, currentY + 142);
        ctx2.lineTo(1095, currentY + 142);
        ctx2.stroke();
        ctx2.setLineDash([]);

        ctx2.fillStyle = '#64748b';
        ctx2.font = 'italic 16px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText('* ตารางความคุ้มครอง และตารางเวนคืนกรมธรรม์ประกันชีวิต จะถูกส่งไปพร้อมกับกรมธรรม์', 105, currentY + 175);

        currentY += covBoxHeight + 36;

        // SECTION 3: IMPORTANT NOTES
        ctx2.fillStyle = '#0f2d59';
        ctx2.font = 'bold 23px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText('หมายเหตุ', 70, currentY);

        const noteBoxHeight = persons.length > 1 ? 310 : 325;
        ctx2.fillStyle = '#fffbeb';
        ctx2.beginPath();
        drawRoundRect(ctx2, 70, currentY + 16, 1060, noteBoxHeight, 16);
        ctx2.fill();
        ctx2.strokeStyle = '#fde68a';
        ctx2.lineWidth = 1.5;
        ctx2.stroke();

        let noteY = currentY + 54;

        ctx2.fillStyle = '#92400e';
        ctx2.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText('1.', 105, noteY);
        ctx2.font = '18px "Sarabun", "Inter", "Thonburi", sans-serif';
        noteY = wrapText(ctx2, 'การทำประกันชีวิต ไม่มีผลต่อการอนุมัติสินเชื่อ แต่มีผลต่ออัตราดอกเบี้ยและโปรโมชั่นพิเศษที่ได้รับ', 140, noteY, 940, 36);

        noteY += 46;
        ctx2.fillStyle = '#92400e';
        ctx2.font = 'bold 18px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.fillText('2.', 105, noteY);
        ctx2.font = '18px "Sarabun", "Inter", "Thonburi", sans-serif';
        noteY = wrapText(ctx2, 'ผู้ขอเอาประกันสามารถขอยกเลิกกรมธรรม์ได้ ภายใน 30 วัน นับตั้งแต่ได้รับกรมธรรม์ประกันชีวิต', 140, noteY, 940, 36);

        noteY += 42;
        ctx2.fillStyle = '#78350f';
        ctx2.font = 'bold 17px "Sarabun", "Inter", "Thonburi", sans-serif';
        wrapText(ctx2, 'หากยกเลิกประกัน หรือไม่ผ่านเงื่อนไขการทำประกันชีวิตคุ้มครองสินเชื่อก่อนสัญญาครบกำหนด 3 ปี อัตราดอกเบี้ยจะถูกปรับขึ้นเป็นปกติตามเงื่อนไขผลิตภัณฑ์ที่ได้รับ และเบี้ยประกันนั้นจะถูกนำไปใช้ชำระคืนเงินกู้ตามสัญญา', 140, noteY, 940, 34);

        currentY += noteBoxHeight + 45;

        // SECTION 4: FOOTER (Removed bank name, contact phone, and email as requested)
        ctx2.fillStyle = '#0f2d59';
        ctx2.font = 'bold 24px "Sarabun", "Inter", "Thonburi", sans-serif';
        ctx2.textAlign = 'center';
        ctx2.fillText('ขอแสดงความนับถือ', 600, currentY + 30);
        ctx2.textAlign = 'left';

        // Add Page 2 to PDF
        pdf.addPage();
        const imgData2 = canvas2.toDataURL('image/png');
        pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
    }

    const filename = data.statusType === 'actual'
      ? `ใบแจ้งผลวงเงินอนุมัติ_${data.borrower}_${Date.now()}.pdf`
      : `ใบแจ้งผลวงเงินอนุมัติเบื้องต้น_${data.borrower}_${Date.now()}.pdf`;
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};

