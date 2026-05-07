// Tests for the filtering/grouping logic embedded in TransactionsScreen

interface Transaction {
  id: string;
  description: string;
  category: string;
  owner: string;
  amount: number;
  status: string;
  date: string;
}

interface Member {
  nickname: string;
  fullName: string;
}

// Mirrors the filter logic from TransactionsScreen (line 85-98)
function filterTransactions(
  transactions: Transaction[],
  members: Member[],
  search: string,
  filter: 'All' | 'Paid' | 'Unpaid',
  ownerFilter: string | null,
): Transaction[] {
  return transactions.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.owner.toLowerCase().includes(q) ||
      (members.find(m => m.nickname === t.owner)?.fullName.toLowerCase().includes(q) ?? false);
    const matchFilter =
      filter === 'All' ||
      (filter === 'Paid' && t.status === 'P') ||
      (filter === 'Unpaid' && t.status === 'NP');
    const matchOwner = !ownerFilter || t.owner === ownerFilter;
    return matchSearch && matchFilter && matchOwner;
  });
}

const MEMBERS: Member[] = [
  { nickname: 'TH', fullName: 'Tharindu' },
  { nickname: 'MA', fullName: 'Malsha' },
];

const TRANSACTIONS: Transaction[] = [
  { id: '1', description: 'Groceries',  category: 'Food',      owner: 'TH', amount: 120, status: 'P',  date: '2025-05-01' },
  { id: '2', description: 'Power Bill', category: 'Bill',      owner: 'MA', amount: 80,  status: 'NP', date: '2025-05-02' },
  { id: '3', description: 'Netflix',    category: 'Subscription', owner: 'TH', amount: 15, status: 'NP', date: '2025-05-03' },
  { id: '4', description: 'Uber',       category: 'Taxi',      owner: 'MA', amount: 22,  status: 'P',  date: '2025-05-04' },
];

describe('filterTransactions', () => {
  it('All filter returns all transactions', () => {
    expect(filterTransactions(TRANSACTIONS, MEMBERS, '', 'All', null)).toHaveLength(4);
  });

  it('Paid filter returns only paid transactions', () => {
    const result = filterTransactions(TRANSACTIONS, MEMBERS, '', 'Paid', null);
    expect(result.every(t => t.status === 'P')).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('Unpaid filter returns only unpaid transactions', () => {
    const result = filterTransactions(TRANSACTIONS, MEMBERS, '', 'Unpaid', null);
    expect(result.every(t => t.status === 'NP')).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('owner filter restricts to a single user', () => {
    const result = filterTransactions(TRANSACTIONS, MEMBERS, '', 'All', 'TH');
    expect(result.every(t => t.owner === 'TH')).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('owner filter combined with status filter', () => {
    const result = filterTransactions(TRANSACTIONS, MEMBERS, '', 'Unpaid', 'TH');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('search matches by description (case insensitive)', () => {
    const result = filterTransactions(TRANSACTIONS, MEMBERS, 'grocer', 'All', null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('search matches by category', () => {
    const result = filterTransactions(TRANSACTIONS, MEMBERS, 'bill', 'All', null);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('search matches by owner nickname', () => {
    const result = filterTransactions(TRANSACTIONS, MEMBERS, 'th', 'All', null);
    // 'th' matches nickname 'TH' and could match 'Tharindu' too
    expect(result.some(t => t.owner === 'TH')).toBe(true);
  });

  it('search matches by full name', () => {
    const result = filterTransactions(TRANSACTIONS, MEMBERS, 'malsha', 'All', null);
    expect(result.every(t => t.owner === 'MA')).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('empty search returns all', () => {
    expect(filterTransactions(TRANSACTIONS, MEMBERS, '', 'All', null)).toHaveLength(4);
  });

  it('search with no match returns empty array', () => {
    expect(filterTransactions(TRANSACTIONS, MEMBERS, 'zzzzz', 'All', null)).toHaveLength(0);
  });

  it('null ownerFilter includes all owners', () => {
    const result = filterTransactions(TRANSACTIONS, MEMBERS, '', 'All', null);
    const owners = new Set(result.map(t => t.owner));
    expect(owners.has('TH')).toBe(true);
    expect(owners.has('MA')).toBe(true);
  });
});

describe('transaction totals', () => {
  it('calculates total amount correctly', () => {
    const total = TRANSACTIONS.reduce((s, t) => s + t.amount, 0);
    expect(total).toBe(237);
  });

  it('calculates percentage change correctly', () => {
    const current = 200;
    const previous = 100;
    const pct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    expect(pct).toBe(100);
  });

  it('percentage change is 0 when previous is 0', () => {
    const current = 200;
    const previous = 0;
    const pct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    expect(pct).toBe(0);
  });

  it('negative percentage change for decrease', () => {
    const current = 80;
    const previous = 100;
    const pct = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    expect(pct).toBe(-20);
  });
});
