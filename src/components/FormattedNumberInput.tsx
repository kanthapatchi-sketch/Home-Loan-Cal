import React, { useState, useEffect, useRef } from 'react';
import { formatMoney, formatYears, cleanNum } from '../utils/formatters';

/**
 * Format a number or string with comma separators for digits > 3 (e.g. 1,000 or 1,782,162)
 */
export function formatWithCommas(
  raw: number | string | undefined | null,
  isCurrency?: boolean
): string {
  if (raw === undefined || raw === null || raw === '') return '';
  if (isCurrency && typeof raw === 'number') {
    return formatMoney(raw);
  }
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
}

export function parseNumberString(str: string): number | string {
  if (!str) return '';
  const cleaned = str.replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return cleaned;
  const num = Number(cleaned);
  return isNaN(num) ? cleaned : num;
}

export interface FormattedNumberInputProps {
  id?: string;
  value: number | string | undefined | null;
  onChange: (val: any) => void;
  className?: string;
  placeholder?: string;
  isCurrency?: boolean;
  isYears?: boolean;
  allowDecimal?: boolean;
  allowNegative?: boolean;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  id,
  value,
  onChange,
  className = '',
  placeholder = '',
  isCurrency = false,
  isYears = false,
  allowDecimal,
  allowNegative = false,
  min,
  max,
  step,
  disabled = false,
  autoFocus = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const effectiveAllowDecimal = isYears ? false : (allowDecimal !== undefined ? allowDecimal : (isCurrency || false));

  const formatInitialOrExternal = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';
    if (isCurrency) {
      return formatMoney(val);
    }
    if (isYears) {
      return formatYears(val);
    }
    return formatWithCommas(val);
  };

  const [displayValue, setDisplayValue] = useState<string>(() => formatInitialOrExternal(value));
  const isFocusedRef = useRef(false);

  // Sync external value changes when not focused
  useEffect(() => {
    if (!isFocusedRef.current) {
      setDisplayValue(formatInitialOrExternal(value));
    }
  }, [value, isCurrency, isYears]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawVal = input.value;
    const selStart = input.selectionStart || 0;

    // Count non-comma characters before cursor
    const rawBeforeCursor = rawVal.slice(0, selStart);
    let nonCommaCountBefore = 0;
    for (let i = 0; i < rawBeforeCursor.length; i++) {
      if (rawBeforeCursor[i] !== ',') {
        nonCommaCountBefore++;
      }
    }

    // Clean input
    let cleaned = rawVal.replace(/,/g, '');

    // Handle negative sign
    if (!allowNegative) {
      cleaned = cleaned.replace(/-/g, '');
    } else {
      const isNeg = cleaned.startsWith('-');
      cleaned = (isNeg ? '-' : '') + cleaned.replace(/-/g, '');
    }

    // Handle decimal point
    if (!effectiveAllowDecimal) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
      // If currency and user already typed decimal point, allow up to 2 decimal places
      if (isCurrency && parts.length === 2 && parts[1].length > 2) {
        cleaned = parts[0] + '.' + parts[1].slice(0, 2);
      }
    }

    // Strip any invalid characters
    cleaned = cleaned.replace(/[^0-9.-]/g, '');

    const formatted = formatWithCommas(cleaned);
    setDisplayValue(formatted);

    // Free editing: pass empty string or partial string if in progress, else number
    if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-0.') {
      onChange(cleaned === '' ? 0 : cleaned);
    } else {
      const parsedNum = Number(cleaned);
      onChange(isNaN(parsedNum) ? cleaned : parsedNum);
    }

    // Restore caret position smoothly
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let newCursorPos = 0;
      let count = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (formatted[i] !== ',') {
          count++;
        }
        if (count === nonCommaCountBefore) {
          newCursorPos = i + 1;
          break;
        }
      }
      if (nonCommaCountBefore === 0) newCursorPos = 0;
      if (newCursorPos > formatted.length) newCursorPos = formatted.length;
      inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    let cleaned = displayValue.replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned === '.') {
      const fallback = min !== undefined ? min : 0;
      setDisplayValue(isCurrency ? formatMoney(fallback) : (isYears ? formatYears(fallback) : ''));
      onChange(fallback);
      return;
    }

    let num = Number(cleaned);
    if (!isNaN(num)) {
      if (min !== undefined && num < min) num = min;
      if (max !== undefined && num > max) num = max;
      if (isYears) {
        num = Math.round(num);
      }
      if (isCurrency) {
        setDisplayValue(formatMoney(num));
      } else if (isYears) {
        setDisplayValue(formatYears(num));
      } else {
        setDisplayValue(formatWithCommas(num));
      }
      onChange(num);
    } else {
      setDisplayValue(formatInitialOrExternal(value));
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
  };

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode={effectiveAllowDecimal ? 'decimal' : 'numeric'}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      className={className}
    />
  );
};
