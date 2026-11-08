/**
 * Currency & Number Formatting Helpers for MOEX Russian Ruble Data
 */

export function formatRubles(val: number, showSign = false): string {
  if (val === null || val === undefined || isNaN(val)) return '0 ₽';
  const absVal = Math.abs(val);
  const sign = val > 0 ? (showSign ? '+' : '') : val < 0 ? '-' : '';

  // For very large numbers in compact view
  if (absVal >= 1_000_000_000) {
    return `${sign}${(absVal / 1_000_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} млрд ₽`;
  }
  if (absVal >= 100_000_000) {
    return `${sign}${(absVal / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} млн ₽`;
  }

  return `${sign}${absVal.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
}

export function formatRublesExact(val: number, showSign = false): string {
  if (val === null || val === undefined || isNaN(val)) return '0,00 ₽';
  const sign = val > 0 ? (showSign ? '+' : '') : val < 0 ? '-' : '';
  const absVal = Math.abs(val);
  return `${sign}${absVal.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

export function formatLots(val: number, showSign = false): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const sign = val > 0 ? (showSign ? '+' : '') : val < 0 ? '-' : '';
  return `${sign}${Math.abs(val).toLocaleString('ru-RU')}`;
}

export function formatPrice(val: number, minStep = 0.01): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  const stepStr = String(minStep);
  const decimals = stepStr.includes('.') ? stepStr.split('.')[1].length : 0;
  return val.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPercent(val: number, showSign = false): string {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  const sign = val > 0 ? (showSign ? '+' : '') : val < 0 ? '-' : '';
  return `${sign}${Math.abs(val).toFixed(2)}%`;
}
