import { isValidBirthdate } from '../birthdate';

describe('isValidBirthdate', () => {
  it('accepts a normal valid date', () => {
    expect(isValidBirthdate('1998-06-15')).toBe(true);
  });

  it('accepts Feb 29 on a leap year', () => {
    expect(isValidBirthdate('2000-02-29')).toBe(true);
  });

  it('rejects a swapped day/month (the 1995-28-02 bug)', () => {
    expect(isValidBirthdate('1995-28-02')).toBe(false);
  });

  it('rejects Feb 29 on a non-leap year', () => {
    expect(isValidBirthdate('1999-02-29')).toBe(false);
  });

  it('rejects Feb 30', () => {
    expect(isValidBirthdate('1995-02-30')).toBe(false);
  });

  it('rejects day 32', () => {
    expect(isValidBirthdate('1995-01-32')).toBe(false);
  });

  it('rejects month 0 and day 0', () => {
    expect(isValidBirthdate('1995-00-15')).toBe(false);
    expect(isValidBirthdate('1995-06-00')).toBe(false);
  });

  it('rejects dates in the future', () => {
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const y = next.getFullYear();
    expect(isValidBirthdate(`${y}-01-01`)).toBe(false);
  });

  it('rejects implausibly old years', () => {
    expect(isValidBirthdate('1899-12-31')).toBe(false);
  });

  it('rejects empty and malformed input', () => {
    expect(isValidBirthdate('')).toBe(false);
    expect(isValidBirthdate('not-a-date')).toBe(false);
    expect(isValidBirthdate('1995-6-5')).toBe(false);
  });
});
