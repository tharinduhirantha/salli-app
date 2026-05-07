// Tests for save-validation and userUnpaid computation in FixedPaymentsScreen

interface UserShare { userId: string; pay: number; isPaid: boolean; }
interface Payment { id: string; amount: number; userShares: UserShare[]; }
interface MemberWithSplit { userId: string; nickname: string; splitPct: number; }

// Mirrors save validation logic from FixedPaymentsScreen
function validatePaymentForm(
  name: string,
  amountStr: string,
  dueDate: string,
  members: MemberWithSplit[],
  customPays: string[],
  splitMethod: string,
): string | null {
  if (!name.trim()) return 'Enter a payment name';
  const amt = parseFloat(amountStr);
  if (!amountStr || isNaN(amt) || amt <= 0) return 'Enter a valid amount';
  if (!dueDate) return 'Select a due date';
  if (members.length === 0) return 'No members found';
  if (splitMethod === 'Custom') {
    const total = customPays.reduce((s, p) => s + (parseFloat(p) || 0), 0);
    if (Math.abs(total - amt) > 0.02) return `Custom amounts must sum to ${amt.toFixed(2)}`;
  }
  return null;
}

// Mirrors userUnpaid computation from FixedPaymentsScreen
function computeUserUnpaid(members: MemberWithSplit[], payments: Payment[]): number[] {
  return members.map(m =>
    payments.reduce((sum, p) => {
      const share = p.userShares.find(s => s.userId === m.userId);
      return sum + (share && !share.isPaid ? share.pay : 0);
    }, 0),
  );
}

const MEMBERS: MemberWithSplit[] = [
  { userId: 'u1', nickname: 'TH', splitPct: 60 },
  { userId: 'u2', nickname: 'MA', splitPct: 40 },
];

describe('validatePaymentForm', () => {
  it('passes valid form', () => {
    expect(validatePaymentForm('Rent', '1000', '2025-05-01', MEMBERS, ['600', '400'], 'Salary %')).toBeNull();
  });

  it('rejects empty name', () => {
    expect(validatePaymentForm('', '1000', '2025-05-01', MEMBERS, [], 'Salary %')).toBe('Enter a payment name');
  });

  it('rejects whitespace-only name', () => {
    expect(validatePaymentForm('   ', '1000', '2025-05-01', MEMBERS, [], 'Salary %')).toBe('Enter a payment name');
  });

  it('rejects empty amount', () => {
    expect(validatePaymentForm('Rent', '', '2025-05-01', MEMBERS, [], 'Salary %')).toBe('Enter a valid amount');
  });

  it('rejects zero amount', () => {
    expect(validatePaymentForm('Rent', '0', '2025-05-01', MEMBERS, [], 'Salary %')).toBe('Enter a valid amount');
  });

  it('rejects negative amount', () => {
    expect(validatePaymentForm('Rent', '-100', '2025-05-01', MEMBERS, [], 'Salary %')).toBe('Enter a valid amount');
  });

  it('rejects missing due date', () => {
    expect(validatePaymentForm('Rent', '1000', '', MEMBERS, [], 'Salary %')).toBe('Select a due date');
  });

  it('rejects empty members array', () => {
    expect(validatePaymentForm('Rent', '1000', '2025-05-01', [], [], 'Salary %')).toBe('No members found');
  });

  it('rejects Custom split where amounts do not sum to total', () => {
    const err = validatePaymentForm('Rent', '1000', '2025-05-01', MEMBERS, ['300', '500'], 'Custom');
    expect(err).toContain('1000.00');
  });

  it('accepts Custom split where amounts exactly sum to total', () => {
    expect(validatePaymentForm('Rent', '1000', '2025-05-01', MEMBERS, ['600', '400'], 'Custom')).toBeNull();
  });

  it('accepts Custom split within 0.02 tolerance', () => {
    expect(validatePaymentForm('Rent', '1000', '2025-05-01', MEMBERS, ['600.01', '399.99'], 'Custom')).toBeNull();
  });
});

describe('computeUserUnpaid', () => {
  it('sums unpaid shares per user', () => {
    const payments: Payment[] = [
      {
        id: 'p1', amount: 1000,
        userShares: [
          { userId: 'u1', pay: 600, isPaid: false },
          { userId: 'u2', pay: 400, isPaid: true },
        ],
      },
      {
        id: 'p2', amount: 500,
        userShares: [
          { userId: 'u1', pay: 300, isPaid: false },
          { userId: 'u2', pay: 200, isPaid: false },
        ],
      },
    ];
    const result = computeUserUnpaid(MEMBERS, payments);
    expect(result[0]).toBe(900); // TH: 600 + 300 (both unpaid)
    expect(result[1]).toBe(200); // MA: 0 (paid) + 200 (unpaid)
  });

  it('returns zeros when all shares are paid', () => {
    const payments: Payment[] = [
      {
        id: 'p1', amount: 200,
        userShares: [
          { userId: 'u1', pay: 120, isPaid: true },
          { userId: 'u2', pay: 80,  isPaid: true },
        ],
      },
    ];
    const result = computeUserUnpaid(MEMBERS, payments);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
  });

  it('returns zeros when payments array is empty', () => {
    const result = computeUserUnpaid(MEMBERS, []);
    expect(result).toEqual([0, 0]);
  });

  it('handles user with no share in a payment (defaults to 0)', () => {
    const payments: Payment[] = [
      {
        id: 'p1', amount: 500,
        userShares: [{ userId: 'u1', pay: 500, isPaid: false }],
      },
    ];
    const result = computeUserUnpaid(MEMBERS, payments);
    expect(result[0]).toBe(500);
    expect(result[1]).toBe(0);
  });
});
