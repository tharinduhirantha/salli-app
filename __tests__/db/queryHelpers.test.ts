import { calcSplit, splitAmount } from '../../src/db/queries';

describe('calcSplit', () => {
  it('splits 50/50 for equal salaries', () => {
    const { thPct, maPct } = calcSplit(5000, 5000);
    expect(thPct).toBeCloseTo(0.5, 2);
    expect(maPct).toBeCloseTo(0.5, 2);
  });

  it('splits proportionally for unequal salaries', () => {
    const { thPct, maPct } = calcSplit(6000, 4000);
    expect(thPct).toBeCloseTo(0.6, 2);
    expect(maPct).toBeCloseTo(0.4, 2);
  });

  it('handles when one salary is 0', () => {
    const { thPct, maPct } = calcSplit(5000, 0);
    expect(thPct).toBeCloseTo(1, 2);
    expect(maPct).toBeCloseTo(0, 2);
  });

  it('percentages sum to ~1', () => {
    const pairs: [number, number][] = [[3000, 7000], [12000, 8000], [5500, 4500]];
    pairs.forEach(([th, ma]) => {
      const { thPct, maPct } = calcSplit(th, ma);
      expect(thPct + maPct).toBeCloseTo(1, 1);
    });
  });
});

describe('splitAmount', () => {
  const thPct = 0.6;
  const maPct = 0.4;

  it('TH split gives full amount to th, zero to ma', () => {
    const result = splitAmount(100, 'TH', thPct, maPct);
    expect(result.th).toBe(100);
    expect(result.ma).toBe(0);
  });

  it('MA split gives full amount to ma, zero to th', () => {
    const result = splitAmount(100, 'MA', thPct, maPct);
    expect(result.th).toBe(0);
    expect(result.ma).toBe(100);
  });

  it('Split divides by salary percentages', () => {
    const result = splitAmount(100, 'Split', thPct, maPct);
    expect(result.th).toBeCloseTo(60, 2);
    expect(result.ma).toBeCloseTo(40, 2);
  });

  it('Half divides equally', () => {
    const result = splitAmount(200, 'Half', thPct, maPct);
    expect(result.th).toBe(100);
    expect(result.ma).toBe(100);
  });

  it('defaults to Half for unknown split type', () => {
    const result = splitAmount(200, 'Unknown' as any, thPct, maPct);
    expect(result.th).toBe(100);
    expect(result.ma).toBe(100);
  });

  it('handles zero amount', () => {
    const result = splitAmount(0, 'Split', thPct, maPct);
    expect(result.th).toBe(0);
    expect(result.ma).toBe(0);
  });

  it('Split amounts sum to original amount', () => {
    const amounts = [99.99, 1000, 0.01, 123.45];
    amounts.forEach(amt => {
      const result = splitAmount(amt, 'Split', thPct, maPct);
      expect(result.th + result.ma).toBeCloseTo(amt, 5);
    });
  });
});
