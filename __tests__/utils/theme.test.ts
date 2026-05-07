import { fmt, memberBadgeColor, Colors } from '../../src/utils/theme';

describe('fmt', () => {
  it('formats whole dollars', () => {
    expect(fmt(1000)).toBe('$1,000.00');
  });

  it('formats cents correctly', () => {
    expect(fmt(9.99)).toBe('$9.99');
  });

  it('formats zero', () => {
    expect(fmt(0)).toBe('$0.00');
  });

  it('formats large numbers with commas', () => {
    expect(fmt(1234567.89)).toBe('$1,234,567.89');
  });

  it('always shows 2 decimal places', () => {
    expect(fmt(5)).toBe('$5.00');
    expect(fmt(5.1)).toBe('$5.10');
  });

  it('formats negative amounts', () => {
    expect(fmt(-50)).toBe('-$50.00');
  });
});

describe('memberBadgeColor', () => {
  it('returns an object with bg and text strings', () => {
    const result = memberBadgeColor('TH');
    expect(result).toHaveProperty('bg');
    expect(result).toHaveProperty('text');
    expect(typeof result.bg).toBe('string');
    expect(typeof result.text).toBe('string');
  });

  it('is deterministic — same nickname always returns same color', () => {
    expect(memberBadgeColor('Alice')).toEqual(memberBadgeColor('Alice'));
    expect(memberBadgeColor('Bob')).toEqual(memberBadgeColor('Bob'));
  });

  it('different nicknames can return different colors', () => {
    // Not guaranteed for every pair, but common enough
    const results = ['TH', 'MA', 'Bob', 'Carol'].map(memberBadgeColor);
    const unique = new Set(results.map(r => r.text));
    expect(unique.size).toBeGreaterThan(1);
  });

  it('returns one of the 4 palette colors', () => {
    const palette = [Colors.th, Colors.ma, Colors.user3, Colors.user4];
    ['TH', 'MA', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace'].forEach(n => {
      const { text } = memberBadgeColor(n);
      expect(palette).toContain(text);
    });
  });

  it('handles empty string without throwing', () => {
    expect(() => memberBadgeColor('')).not.toThrow();
  });

  it('handles single character nicknames', () => {
    const result = memberBadgeColor('A');
    expect(result).toHaveProperty('bg');
    expect(result).toHaveProperty('text');
  });
});
