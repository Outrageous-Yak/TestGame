export function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v));
}

export class ExponentialSmoother {
  value: number;
  private coeff: number;

  constructor(initial = 0, coeff = 0.04) {
    this.value = initial;
    this.coeff = coeff;
  }

  update(target: number): number {
    this.value += this.coeff * (target - this.value);
    return this.value;
  }

  reset(v = 0): void {
    this.value = v;
  }
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randBetween(a: number, b: number): number {
  return a + Math.random() * (b - a);
}
