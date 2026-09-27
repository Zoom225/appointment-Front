const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/;

export function parseLocalDateTime(value: string): Date {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);
  if (!match) {
    return new Date(Number.NaN);
  }

  const [, year, month, day, hour, minute, second = '0'] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

export function formatLocalDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parseLocalDateTime(value));
}

export function formatLocalTime(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parseLocalDateTime(value));
}
