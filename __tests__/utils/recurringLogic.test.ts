import { inferSplitMethod, calcSalaryPays, calcEvenPays } from '../../src/utils/recurringLogic';

describe('inferSplitMethod', () => {
  const splitPcts = [60, 40];

  it('returns Salary % when amounts match salary percentages', () => {
    const amt = 1000;
    const pays = calcSalaryPays(amt, splitPcts);
    expect(inferSplitMethod(pays, amt, splitPcts)).toBe('Salary %');
  });

  it('returns 50/50 when amounts are exactly equal', () => {
    const amt = 200;
    expect(inferSplitMethod([100, 100], amt, splitPcts)).toBe('50/50');
  });

  it('returns 50/50 with rounding tolerance', () => {
    // 100 / 3 rounds differently per person
    const amt = 100;
    const even = calcEvenPays(amt, 3);
    expect(inferSplitMethod(even, amt, [33, 33, 34])).toBe('50/50');
  });

  it('returns Custom when neither rule matches', () => {
    expect(inferSplitMethod([70, 30], 100, splitPcts)).toBe('Custom');
  });

  it('returns Custom for empty pays array', () => {
    expect(inferSplitMethod([], 100, [])).toBe('Custom');
  });

  it('handles single member as Salary %', () => {
    expect(inferSplitMethod([500], 500, [100])).toBe('Salary %');
  });

  it('tolerates up to 0.02 rounding error for Salary %', () => {
    // 60% of 100 = 60, slight rounding
    expect(inferSplitMethod([60.01, 39.99], 100, splitPcts)).toBe('Salary %');
  });

  it('tolerates up to 0.02 rounding error for 50/50', () => {
    expect(inferSplitMethod([50.01, 49.99], 100, splitPcts)).toBe('50/50');
  });
});

describe('calcSalaryPays', () => {
  it('splits 1000 by 60/40', () => {
    const result = calcSalaryPays(1000, [60, 40]);
    expect(result[0]).toBe(600);
    expect(result[1]).toBe(400);
  });

  it('last member gets remainder to avoid floating point drift', () => {
    // 33.33... each — last gets remainder
    const result = calcSalaryPays(100, [33, 33, 34]);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(0.01);
  });

  it('handles single member getting full amount', () => {
    expect(calcSalaryPays(250, [100])).toEqual([250]);
  });

  it('handles three-way uneven split', () => {
    const result = calcSalaryPays(300, [50, 30, 20]);
    expect(result[0]).toBe(150);
    expect(result[1]).toBe(90);
    expect(result[2]).toBe(60);
  });

  it('sum always equals amount', () => {
    const amounts = [99, 100, 123.45, 1000, 0.99];
    const pcts = [60, 40];
    amounts.forEach(amt => {
      const result = calcSalaryPays(amt, pcts);
      const sum = result.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - amt)).toBeLessThanOrEqual(0.01);
    });
  });
});

describe('calcEvenPays', () => {
  it('splits evenly between 2', () => {
    expect(calcEvenPays(200, 2)).toEqual([100, 100]);
  });

  it('last member gets remainder for 3-way split of 100', () => {
    const result = calcEvenPays(100, 3);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(0.01);
  });

  it('handles single member', () => {
    expect(calcEvenPays(99.99, 1)).toEqual([99.99]);
  });

  it('sum always equals amount', () => {
    const cases: [number, number][] = [[100, 3], [99.99, 2], [1000, 4], [0.01, 2]];
    cases.forEach(([amt, n]) => {
      const result = calcEvenPays(amt, n);
      expect(result).toHaveLength(n);
      const sum = result.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - amt)).toBeLessThanOrEqual(0.01);
    });
  });

  it('first n-1 members all have the same rounded amount', () => {
    const result = calcEvenPays(100, 3);
    expect(result[0]).toBe(result[1]);
  });
});
