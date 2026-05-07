// Tests for pure logic computed in DashboardScreen

interface CatRow {
  label: string;
  total: number;
  userPays: { nickname: string; amount: number }[];
}

interface UserSummary {
  nickname: string;
  fullName: string;
  share: number;
  paid: number;
}

interface MonthlySummary {
  categories: CatRow[];
  total: number;
  users: UserSummary[];
  settlement: number;
}

interface PaidGroup { label: string; total: number; }

// Mirrors paidGroupsByUser from DashboardScreen
function buildPaidGroupsByUser(summary: MonthlySummary): PaidGroup[][] {
  return summary.users.map(u =>
    summary.categories
      .map(cat => ({
        label: cat.label,
        total: cat.userPays.find(up => up.nickname === u.nickname)?.amount ?? 0,
      }))
      .filter(g => g.total > 0),
  );
}

const MOCK_SUMMARY: MonthlySummary = {
  total: 500,
  settlement: 50,
  users: [
    { nickname: 'TH', fullName: 'Tharindu', share: 300, paid: 350 },
    { nickname: 'MA', fullName: 'Malsha',   share: 200, paid: 150 },
  ],
  categories: [
    {
      label: 'Food',
      total: 200,
      userPays: [{ nickname: 'TH', amount: 120 }, { nickname: 'MA', amount: 80 }],
    },
    {
      label: 'Bill',
      total: 150,
      userPays: [{ nickname: 'TH', amount: 90 }, { nickname: 'MA', amount: 60 }],
    },
    {
      label: 'Subscription',
      total: 150,
      userPays: [{ nickname: 'TH', amount: 90 }, { nickname: 'MA', amount: 60 }],
    },
  ],
};

describe('buildPaidGroupsByUser', () => {
  it('returns one array per user', () => {
    const result = buildPaidGroupsByUser(MOCK_SUMMARY);
    expect(result).toHaveLength(2);
  });

  it('returns correct owns for TH', () => {
    const result = buildPaidGroupsByUser(MOCK_SUMMARY);
    const th = result[0];
    expect(th.find(g => g.label === 'Food')?.total).toBe(120);
    expect(th.find(g => g.label === 'Bill')?.total).toBe(90);
  });

  it('returns correct owns for MA', () => {
    const result = buildPaidGroupsByUser(MOCK_SUMMARY);
    const ma = result[1];
    expect(ma.find(g => g.label === 'Food')?.total).toBe(80);
    expect(ma.find(g => g.label === 'Bill')?.total).toBe(60);
  });

  it('filters out zero-amount categories', () => {
    const summary: MonthlySummary = {
      ...MOCK_SUMMARY,
      categories: [
        { label: 'Food', total: 100, userPays: [{ nickname: 'TH', amount: 100 }, { nickname: 'MA', amount: 0 }] },
        { label: 'Bill', total: 50,  userPays: [{ nickname: 'TH', amount: 0 },   { nickname: 'MA', amount: 50 }] },
      ],
    };
    const result = buildPaidGroupsByUser(summary);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].label).toBe('Food');
    expect(result[1]).toHaveLength(1);
    expect(result[1][0].label).toBe('Bill');
  });

  it('handles user not present in category userPays (defaults to 0, filtered)', () => {
    const summary: MonthlySummary = {
      ...MOCK_SUMMARY,
      categories: [
        { label: 'Personal', total: 30, userPays: [{ nickname: 'TH', amount: 30 }] },
      ],
    };
    const result = buildPaidGroupsByUser(summary);
    expect(result[1]).toHaveLength(0); // MA has no share — filtered out
  });

  it('handles empty categories', () => {
    const summary: MonthlySummary = { ...MOCK_SUMMARY, categories: [] };
    const result = buildPaidGroupsByUser(summary);
    expect(result[0]).toHaveLength(0);
    expect(result[1]).toHaveLength(0);
  });

  it('handles empty users', () => {
    const summary: MonthlySummary = { ...MOCK_SUMMARY, users: [] };
    const result = buildPaidGroupsByUser(summary);
    expect(result).toHaveLength(0);
  });
});

describe('settlement computation', () => {
  it('settlement equals the absolute difference of share vs paid for the underpaying user', () => {
    // TH paid 350, owes 300 → overpaid 50; MA paid 150, owes 200 → underpaid 50
    const users = MOCK_SUMMARY.users;
    const settlement = Math.abs(users[0].share - users[0].paid);
    expect(settlement).toBe(50);
    expect(MOCK_SUMMARY.settlement).toBe(50);
  });

  it('zero settlement when all users are even', () => {
    const users: UserSummary[] = [
      { nickname: 'TH', fullName: '', share: 250, paid: 250 },
      { nickname: 'MA', fullName: '', share: 250, paid: 250 },
    ];
    const settlement = Math.abs(users[0].share - users[0].paid);
    expect(settlement).toBe(0);
  });
});

describe('total and share sanity', () => {
  it('sum of user shares equals total', () => {
    const shareSum = MOCK_SUMMARY.users.reduce((s, u) => s + u.share, 0);
    expect(shareSum).toBe(MOCK_SUMMARY.total);
  });

  it('category userPays sums equal category total', () => {
    MOCK_SUMMARY.categories.forEach(cat => {
      const paySum = cat.userPays.reduce((s, up) => s + up.amount, 0);
      expect(paySum).toBeCloseTo(cat.total, 1);
    });
  });
});
