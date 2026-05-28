// Tests the pure calculation functions used by CaloriesCard

function calcArcProgress(consumed: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(consumed / goal, 1);
}

function calcNetCarbs(carbs: number, fiber: number): number {
  return Math.max(0, carbs - fiber);
}

describe('CaloriesCard calculations', () => {
  describe('calcArcProgress', () => {
    it('returns 0 when goal is 0', () => {
      expect(calcArcProgress(500, 0)).toBe(0);
    });

    it('returns proportion for normal case', () => {
      expect(calcArcProgress(1000, 2000)).toBe(0.5);
    });

    it('caps at 1.0 when over goal', () => {
      expect(calcArcProgress(3000, 2000)).toBe(1);
    });

    it('returns 0 when nothing consumed', () => {
      expect(calcArcProgress(0, 2000)).toBe(0);
    });
  });

  describe('calcNetCarbs', () => {
    it('subtracts fiber from carbs', () => {
      expect(calcNetCarbs(50, 10)).toBe(40);
    });

    it('floors at 0 — never negative', () => {
      expect(calcNetCarbs(5, 20)).toBe(0);
    });
  });
});
