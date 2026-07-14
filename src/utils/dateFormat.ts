const MSK_TZ = 'Europe/Moscow';

export function parseDbDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  let s = String(value).trim();
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  if (!hasTz) {
    s = s.replace(' ', 'T') + 'Z';
  }
  return new Date(s);
}

export function formatMskDateTime(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = parseDbDate(value);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MSK_TZ,
    ...options,
  }).format(date);
}

export function formatMskDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return formatMskDateTime(value, {
    hour: undefined,
    minute: undefined,
    ...options,
  });
}
