/**
 * Validates a birthdate string in strict YYYY-MM-DD format.
 *
 * Rejects impossible calendar dates (e.g. "1995-28-02" from swapped
 * day/month entry), future dates, and years before 1900 — Postgres
 * would otherwise reject these at save time with a raw
 * "date/time field value out of range" error.
 */
export function isValidBirthdate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1900) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Round-trip through Date to catch invalid days like Feb 30:
  // new Date(1995, 1, 30) silently rolls over to Mar 2.
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }

  return date.getTime() <= Date.now();
}
