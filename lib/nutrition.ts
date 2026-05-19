export function calculateNetCarbs(carbs_g: number, fiber_g: number): number {
  return Math.max(0, carbs_g - fiber_g);
}
