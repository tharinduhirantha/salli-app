import { monthLabel, prevMonth, nextMonth, currentMonth, currentYear, today } from '../../src/utils/date';

describe('monthLabel', () => {
  it('formats January correctly', () => {
    expect(monthLabel('2025-01')).toBe('Jan 2025');
  });

  it('formats December correctly', () => {
    expect(monthLabel('2024-12')).toBe('Dec 2024');
  });

  it('formats all months', () => {
    const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    names.forEach((name, i) => {
      const m = String(i + 1).padStart(2, '0');
      expect(monthLabel(`2025-${m}`)).toBe(`${name} 2025`);
    });
  });
});

describe('prevMonth', () => {
  it('decrements month within a year', () => {
    expect(prevMonth('2025-05')).toBe('2025-04');
  });

  it('wraps from January to previous year December', () => {
    expect(prevMonth('2025-01')).toBe('2024-12');
  });

  it('pads single-digit months', () => {
    expect(prevMonth('2025-10')).toBe('2025-09');
  });

  it('handles February correctly', () => {
    expect(prevMonth('2025-02')).toBe('2025-01');
  });
});

describe('nextMonth', () => {
  it('increments month within a year', () => {
    expect(nextMonth('2025-04')).toBe('2025-05');
  });

  it('wraps from December to next year January', () => {
    expect(nextMonth('2024-12')).toBe('2025-01');
  });

  it('pads single-digit months', () => {
    expect(nextMonth('2025-08')).toBe('2025-09');
  });

  it('handles November correctly', () => {
    expect(nextMonth('2025-11')).toBe('2025-12');
  });
});

describe('prevMonth and nextMonth are inverses', () => {
  it('nextMonth(prevMonth(x)) === x', () => {
    const months = ['2025-01', '2025-06', '2025-12', '2024-12'];
    months.forEach(m => {
      expect(nextMonth(prevMonth(m))).toBe(m);
    });
  });

  it('prevMonth(nextMonth(x)) === x', () => {
    const months = ['2025-01', '2025-06', '2025-12', '2024-12'];
    months.forEach(m => {
      expect(prevMonth(nextMonth(m))).toBe(m);
    });
  });
});

describe('currentMonth', () => {
  it('returns YYYY-MM format', () => {
    expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('month is between 01 and 12', () => {
    const [, m] = currentMonth().split('-');
    expect(parseInt(m, 10)).toBeGreaterThanOrEqual(1);
    expect(parseInt(m, 10)).toBeLessThanOrEqual(12);
  });
});

describe('currentYear', () => {
  it('returns a 4-digit year string', () => {
    expect(currentYear()).toMatch(/^\d{4}$/);
  });

  it('year is reasonable', () => {
    const y = parseInt(currentYear(), 10);
    expect(y).toBeGreaterThanOrEqual(2024);
    expect(y).toBeLessThanOrEqual(2100);
  });
});

describe('today', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('is a valid date', () => {
    const d = new Date(today());
    expect(isNaN(d.getTime())).toBe(false);
  });
});
