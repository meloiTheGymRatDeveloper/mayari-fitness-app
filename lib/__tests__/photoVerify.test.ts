import { filterByVisibility, applyVerdicts, type Verdict } from '../photoVerify';

describe('filterByVisibility', () => {
  it('keeps items where is_clearly_visible is true', () => {
    const items = [{ name: 'a', is_clearly_visible: true }];
    expect(filterByVisibility(items)).toEqual(items);
  });

  it('drops items where is_clearly_visible is false', () => {
    const items = [
      { name: 'a', is_clearly_visible: true },
      { name: 'b', is_clearly_visible: false },
    ];
    expect(filterByVisibility(items)).toEqual([{ name: 'a', is_clearly_visible: true }]);
  });

  it('keeps items where is_clearly_visible is undefined (defensive default)', () => {
    const items = [{ name: 'a' }];
    expect(filterByVisibility(items)).toEqual(items);
  });

  it('returns empty array for empty input', () => {
    expect(filterByVisibility([])).toEqual([]);
  });
});

describe('applyVerdicts', () => {
  it('drops items whose verdict is "drop"', () => {
    const items = [{ name: 'rice' }, { name: 'pork chop' }];
    const verdicts: Verdict[] = [
      { name: 'rice', verdict: 'drop' },
      { name: 'pork chop', verdict: 'keep' },
    ];
    expect(applyVerdicts(items, verdicts)).toEqual([{ name: 'pork chop' }]);
  });

  it('keeps items whose verdict is "keep"', () => {
    const items = [{ name: 'pork chop' }];
    const verdicts: Verdict[] = [{ name: 'pork chop', verdict: 'keep' }];
    expect(applyVerdicts(items, verdicts)).toEqual([{ name: 'pork chop' }]);
  });

  it('keeps items not mentioned in verdicts (defensive — verifier may omit)', () => {
    const items = [{ name: 'rice' }, { name: 'pork chop' }];
    const verdicts: Verdict[] = [{ name: 'rice', verdict: 'keep' }];
    expect(applyVerdicts(items, verdicts)).toEqual(items);
  });

  it('matches names case-insensitively', () => {
    const items = [{ name: 'Pork Chop' }];
    const verdicts: Verdict[] = [{ name: 'pork chop', verdict: 'drop' }];
    expect(applyVerdicts(items, verdicts)).toEqual([]);
  });

  it('matches names ignoring leading/trailing whitespace', () => {
    const items = [{ name: '  pork chop  ' }];
    const verdicts: Verdict[] = [{ name: 'pork chop', verdict: 'drop' }];
    expect(applyVerdicts(items, verdicts)).toEqual([]);
  });

  it('returns all items when verdicts array is empty', () => {
    const items = [{ name: 'rice' }, { name: 'pork chop' }];
    expect(applyVerdicts(items, [])).toEqual(items);
  });

  it('returns empty array when items array is empty', () => {
    expect(applyVerdicts([], [{ name: 'rice', verdict: 'drop' }])).toEqual([]);
  });
});
