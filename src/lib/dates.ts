export function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromLocalKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

export function startOfDayIso(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next.toISOString();
}

export function endOfDayIso(date = new Date()) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next.toISOString();
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function shortDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function mediumDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function rangeStart(range: '7D' | '30D' | '90D' | 'All') {
  if (range === 'All') {
    return null;
  }

  const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;
  return addDays(new Date(), -days + 1).toISOString();
}
