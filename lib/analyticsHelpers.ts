export function subDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - days);
  return d;
}

export function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function shortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - ((day + 6) % 7));
  copy.setHours(0, 0, 0, 0);
  return copy;
}
