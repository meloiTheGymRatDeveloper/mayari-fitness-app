import { calculateNetCarbs } from '../nutrition';

describe('calculateNetCarbs', () => {
  it('subtracts fiber from carbs', () => {
    expect(calculateNetCarbs(30, 5)).toBe(25);
  });

  it('floors at 0 when fiber > carbs', () => {
    expect(calculateNetCarbs(3, 10)).toBe(0);
  });

  it('returns carbs unchanged when fiber is 0', () => {
    expect(calculateNetCarbs(40, 0)).toBe(40);
  });

  it('returns 0 when both are 0', () => {
    expect(calculateNetCarbs(0, 0)).toBe(0);
  });
});
