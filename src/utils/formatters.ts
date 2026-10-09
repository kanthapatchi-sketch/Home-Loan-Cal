/**
 * Financial and number formatting utilities
 * Standardizes currency, year, and decimal formatting across all components.
 */

/**
 * Safely parse any value (number, string with commas, etc.) to a float number
 */
export const cleanNum = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const num = Number(String(val).replace(/,/g, '').trim());
  return isNaN(num) ? 0 : num;
};

/**
 * Format any numeric value as Thai currency string with commas and exactly 2 decimal places.
 * Example: 1356995 -> "1,356,995.00"
 * Example: 0 -> "0.00"
 * Example: 1234.5 -> "1,234.50"
 */
export const formatMoney = (val: any): string => {
  if (val === undefined || val === null || val === '') return '0.00';
  const num = cleanNum(val);
  return num.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Format any numeric value as an integer string with commas and NO decimal places (for years, months, counts).
 * Example: 30 -> "30"
 * Example: 360 -> "360"
 */
export const formatYears = (val: any): string => {
  if (val === undefined || val === null || val === '') return '0';
  const num = cleanNum(val);
  return Math.round(num).toLocaleString('th-TH', {
    maximumFractionDigits: 0,
  });
};

/**
 * Format percentage or interest rate with specified decimal places (defaults to 2).
 * Example: 3.5 -> "3.50%"
 */
export const formatPercent = (val: any, decimals: number = 2): string => {
  const num = cleanNum(val);
  return `${num.toFixed(decimals)}%`;
};

/**
 * Format string with comma separators while editing/typing
 */
export const formatWithCommas = (
  raw: number | string | undefined | null,
  options: { allowDecimal?: boolean; isCurrency?: boolean } = {}
): string => {
  if (raw === undefined || raw === null || raw === '') return '';
  const str = String(raw).replace(/,/g, '').trim();
  if (str === '-' || str === '.') return str;
  if (str === '-.') return '-0.';

  const isNeg = str.startsWith('-');
  const unsigned = isNeg ? str.slice(1) : str;
  const parts = unsigned.split('.');

  // Format integer part with commas
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let res = (isNeg ? '-' : '') + intPart;
  if (parts.length > 1) {
    res += '.' + parts[1];
  }
  return res;
};
