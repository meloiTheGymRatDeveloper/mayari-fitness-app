export interface Verdict {
  name: string;
  verdict: 'keep' | 'drop';
  reason?: string;
}

export function filterByVisibility<T extends Record<string, unknown>>(items: T[]): T[] {
  return items.filter((item) => item.is_clearly_visible !== false);
}

export function applyVerdicts<T extends { name: string }>(items: T[], verdicts: Verdict[]): T[] {
  const lookup = new Map<string, 'keep' | 'drop'>();
  for (const v of verdicts) {
    lookup.set(v.name.trim().toLowerCase(), v.verdict);
  }
  return items.filter((item) => lookup.get(item.name.trim().toLowerCase()) !== 'drop');
}
