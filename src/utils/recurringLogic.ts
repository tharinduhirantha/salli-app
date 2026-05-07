export type SplitMethod = 'Salary %' | '50/50' | 'Custom';

export function inferSplitMethod(
  pays: number[],
  amount: number,
  splitPcts: number[],
): SplitMethod {
  const n = pays.length;
  if (n === 0) return 'Custom';
  let salarySum = 0;
  const sMatches = pays.every((p, i) => {
    const expected =
      i < n - 1
        ? Math.round(amount * (splitPcts[i] / 100) * 100) / 100
        : Math.round((amount - salarySum) * 100) / 100;
    if (i < n - 1) salarySum += expected;
    return Math.abs(p - expected) <= 0.02;
  });
  if (sMatches) return 'Salary %';
  const even = Math.round((amount / n) * 100) / 100;
  if (pays.every(p => Math.abs(p - even) <= 0.02)) return '50/50';
  return 'Custom';
}

export function calcSalaryPays(amt: number, splitPcts: number[]): number[] {
  return splitPcts.map((pct, i) => {
    if (i < splitPcts.length - 1)
      return Math.round(amt * (pct / 100) * 100) / 100;
    const sum = splitPcts
      .slice(0, i)
      .reduce((s, p) => s + Math.round(amt * (p / 100) * 100) / 100, 0);
    return Math.round((amt - sum) * 100) / 100;
  });
}

export function calcEvenPays(amt: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    if (i < n - 1) return Math.round((amt / n) * 100) / 100;
    const sum = (n - 1) * Math.round((amt / n) * 100) / 100;
    return Math.round((amt - sum) * 100) / 100;
  });
}
