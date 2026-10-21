const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function getDurationParts(duration) {
  if (typeof duration === 'number' && Number.isSafeInteger(duration) && duration > 0) {
    return { amount: duration, unit: 'months' };
  }
  if (typeof duration !== 'string') return null;

  const match = duration.trim().match(/^(\d+)\s*(months?|mos?|m|days?|d)?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount) || amount <= 0) return null;
  const unit = match[2]?.toLowerCase() || 'months';
  return { amount, unit: /^(d|day|days)$/.test(unit) ? 'days' : 'months' };
}

function addCalendarMonths(date, months) {
  const result = new Date(date);
  const originalDay = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0
  )).getUTCDate();
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
}

export function calculateCourseExpiryDate(startDate, duration) {
  if (startDate == null || startDate === '') return null;
  const value = typeof startDate?.toDate === 'function' ? startDate.toDate() : startDate;
  const start = value instanceof Date ? new Date(value) : new Date(value);
  const durationParts = getDurationParts(duration);
  if (Number.isNaN(start.getTime()) || !durationParts) return null;

  if (durationParts.unit === 'days') {
    start.setUTCDate(start.getUTCDate() + durationParts.amount);
  } else {
    return addCalendarMonths(start, durationParts.amount).toISOString();
  }
  return start.toISOString();
}

export function getCourseValidity(expiresAt, now = new Date()) {
  if (!expiresAt) return { isActive: true, isExpired: false, remaining: 'No expiry set' };
  const expiryValue = typeof expiresAt?.toDate === 'function' ? expiresAt.toDate() : expiresAt;
  const nowValue = typeof now?.toDate === 'function' ? now.toDate() : now;
  const expiry = expiryValue instanceof Date ? new Date(expiryValue) : new Date(expiryValue);
  const current = nowValue instanceof Date ? new Date(nowValue) : new Date(nowValue);
  if (Number.isNaN(expiry.getTime()) || Number.isNaN(current.getTime())) {
    return { isActive: false, isExpired: true, remaining: 'Validity unavailable' };
  }
  const difference = expiry.getTime() - current.getTime();
  if (difference <= 0) return { isActive: false, isExpired: true, remaining: 'Validity Expired' };

  let months = (expiry.getUTCFullYear() - current.getUTCFullYear()) * 12
    + expiry.getUTCMonth() - current.getUTCMonth();
  while (months > 0 && addCalendarMonths(current, months).getTime() > expiry.getTime()) months -= 1;
  const afterMonths = addCalendarMonths(current, months);
  const days = Math.floor((expiry.getTime() - afterMonths.getTime()) / DAY_IN_MILLISECONDS);
  const remainingParts = [];
  if (months > 0) remainingParts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (days > 0) remainingParts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  const remaining = remainingParts.length
    ? `Expires in ${remainingParts.join(' ')}`
    : 'Expires in less than a day';
  return {
    isActive: true,
    isExpired: false,
    remaining
  };
}

export function isCourseEntitlementActive(entitlement, duration, now = new Date()) {
  const expiry = entitlement?.expiresAt
    || calculateCourseExpiryDate(
      entitlement?.purchasedAt || entitlement?.enrolledAt || entitlement?.purchaseDate,
      entitlement?.duration || duration
    );
  return getCourseValidity(expiry, now).isActive;
}
