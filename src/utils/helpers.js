/**
 * Order calculation utilities – pure functions, no dependencies
 */

export function calcSubtotal(items) {
  return items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  }, 0);
}

export function calcDiscount(subtotal, type, value) {
  if (!value || value <= 0) return 0;
  if (type === 'percent') return Math.round((subtotal * value) / 100);
  return Math.min(parseFloat(value) || 0, subtotal);
}

export function calcOrder({ items = [], discountType = 'amount', discountValue = 0, paidAmount = 0 }) {
  const subtotal       = calcSubtotal(items);
  const discountAmount = calcDiscount(subtotal, discountType, discountValue);
  const totalAmount    = Math.max(0, subtotal - discountAmount);
  const paid           = parseFloat(paidAmount) || 0;
  const changeAmount   = Math.max(0, paid - totalAmount);
  const debtAmount     = Math.max(0, totalAmount - paid);

  return { subtotal, discountAmount, totalAmount, paid, changeAmount, debtAmount };
}

export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr, withTime = false) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return d.toLocaleString('vi-VN', opts);
}

export function genOrderCode() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `DH${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

export function parseExcelDate(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 864e5));
    return d.toISOString().split('T')[0];
  }
  return String(val);
}
