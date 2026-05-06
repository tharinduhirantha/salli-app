import { supabase } from '../lib/supabase';
import { Transaction, RecurringPayment, Settings, SplitType, Profile } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  split: 'Half' | 'Salary' | 'Personal' | 'Full';
  sortOrder: number;
  icon: string;
  isRecurring: boolean;
  isOutOfPocket: boolean;
}

export interface HouseMember {
  userId: string;
  nickname: string;
  fullName: string;
  role: 'owner' | 'member';
  splitPct: number | null;
}

export interface CatRow {
  label: string;
  total: number;
  userPays: { nickname: string; amount: number }[];
}

export interface UserSummary {
  nickname: string;
  fullName: string;
  share: number;
  paid: number;
}

export interface MonthlySummary {
  categories: CatRow[];
  total: number;
  users: UserSummary[];
  settlement: number;
}

export interface PersonUserSummary {
  userId: string;
  nickname: string;
  fullName: string;
  personalTotal: number;
  personalPending: number;
  houseNeeds: number;
  housePaid: number;
  housePending: number;
  grandTotal: number;
}

export interface PersonHouseSummary {
  users: PersonUserSummary[];
}

export interface YearlyRow {
  month: string;
  homePay: number;
  carPay: number;
  bills: number;
  household: number;
  carExpense: number;
  food: number;
  subscriptions: number;
  fun: number;
  total: number;
  userShares: { nickname: string; share: number }[];
}


// ─── Helpers ────────────────────────────────────────────────────────────────

export function calcSplit(thSalary: number, maSalary: number) {
  const total = thSalary + maSalary;
  const thPct = Math.round((100 / total) * thSalary) / 100;
  const maPct = Math.round((100 / total) * maSalary) / 100;
  return { thPct, maPct };
}

function salaryPcts(members: HouseMember[]): Record<string, number> {
  if (members.length === 0) return {};
  const total = members.reduce((s, m) => s + (m.splitPct ?? 0), 0);
  if (Math.round(total) !== 100) {
    const even = 1 / members.length;
    return Object.fromEntries(members.map(m => [m.nickname, even]));
  }
  return Object.fromEntries(members.map(m => [m.nickname, (m.splitPct ?? 0) / 100]));
}

export function splitAmount(amount: number, split: SplitType, thPct: number, maPct: number) {
  switch (split) {
    case 'TH':    return { th: amount, ma: 0 };
    case 'MA':    return { th: 0, ma: amount };
    case 'Split': return { th: amount * thPct, ma: amount * maPct };
    case 'Half':
    default:      return { th: amount / 2, ma: amount / 2 };
  }
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food',         split: 'Full',     sortOrder: 1, icon: 'restaurant-outline',  isRecurring: false, isOutOfPocket: false },
  { name: 'Household',    split: 'Full',     sortOrder: 2, icon: 'home-outline',         isRecurring: false, isOutOfPocket: false },
  { name: 'Bill',         split: 'Full',     sortOrder: 3, icon: 'receipt-outline',      isRecurring: true,  isOutOfPocket: false },
  { name: 'Transport',    split: 'Full',     sortOrder: 4, icon: 'car-outline',          isRecurring: false, isOutOfPocket: false },
  { name: 'Subscription', split: 'Full',     sortOrder: 5, icon: 'wifi-outline',         isRecurring: true,  isOutOfPocket: false },
  { name: 'Personal',     split: 'Personal', sortOrder: 6, icon: 'person-outline',       isRecurring: false, isOutOfPocket: false },
];

// ─── House Management ────────────────────────────────────────────────────────

export async function createHouse(name: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let houseId: string | null = null;
  let attempts = 0;

  while (!houseId && attempts < 5) {
    const joinCode = generateJoinCode();
    const { data, error } = await supabase
      .from('houses')
      .insert({ name: name.trim(), join_code: joinCode, created_by: user.id })
      .select('id')
      .single();

    if (!error && data) {
      houseId = data.id;
    } else if (error?.code !== '23505') {
      throw new Error(error?.message ?? 'Failed to create house');
    }
    attempts++;
  }

  if (!houseId) throw new Error('Failed to generate unique join code. Please try again.');

  // Add creator as owner
  const { error: memberError } = await supabase
    .from('house_members')
    .insert({ house_id: houseId, user_id: user.id, role: 'owner' });
  if (memberError) throw new Error(memberError.message);

  // Seed default categories for this house
  const { error: catError } = await supabase.from('categories').insert(
    DEFAULT_CATEGORIES.map(c => ({ name: c.name, split: c.split, sort_order: c.sortOrder, icon: c.icon, house_id: houseId }))
  );
  if (catError) throw new Error(catError.message);

  return houseId;
}

export interface JoinRequest {
  id: string;
  userId: string;
  nickname: string;
  fullName: string;
  createdAt: string;
}

export async function requestJoinHouse(code: string): Promise<{ houseId: string; houseName: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: rows, error } = await supabase.rpc('find_house_by_code', {
    p_join_code: code.trim().toUpperCase(),
  });
  const house = rows?.[0];
  if (error || !house) throw new Error('Invalid join code. Please check and try again.');

  // Check not already a member
  const { data: existing } = await supabase
    .from('house_members')
    .select('user_id')
    .eq('house_id', house.id)
    .eq('user_id', user.id)
    .single();
  if (existing) throw new Error('You are already a member of this house.');

  // Check nickname conflict
  const { data: myProfile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
  const myNick = myProfile?.nickname?.trim().toUpperCase();
  if (myNick) {
    const { data: memberRows } = await supabase.from('house_members').select('user_id').eq('house_id', house.id);
    if (memberRows && memberRows.length > 0) {
      const { data: memberProfiles } = await supabase.from('profiles').select('nickname').in('id', memberRows.map((m: any) => m.user_id));
      const takenNicks = (memberProfiles ?? []).map((p: any) => p.nickname?.trim().toUpperCase());
      if (takenNicks.includes(myNick)) {
        throw new Error(`The nickname "${myProfile!.nickname}" is already taken in this household. Change it in Settings → Profile.`);
      }
    }
  }

  // Remove any previous request (rejected/cancelled) so we can insert fresh.
  // DELETE is allowed by RLS; UPDATE is owner-only so upsert would fail.
  await supabase
    .from('house_join_requests')
    .delete()
    .eq('house_id', house.id)
    .eq('user_id', user.id);

  const { error: reqErr } = await supabase
    .from('house_join_requests')
    .insert({ house_id: house.id, user_id: user.id, status: 'pending' });
  if (reqErr) throw new Error(reqErr.message);

  return { houseId: house.id, houseName: house.name };
}

export async function getUserPendingRequest(): Promise<{ id: string; houseName: string; status: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('house_join_requests')
    .select('id, status, houses(name)')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (!data) return null;
  return { id: data.id, houseName: (data as any).houses?.name ?? '', status: data.status };
}

export async function cancelJoinRequest(requestId: string): Promise<void> {
  const { error } = await supabase.from('house_join_requests').delete().eq('id', requestId);
  if (error) throw new Error(error.message);
}

export async function getPendingJoinRequests(houseId: string): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from('house_join_requests')
    .select('id, user_id, created_at')
    .eq('house_id', houseId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error || !data || data.length === 0) return [];
  const userIds = data.map((r: any) => r.user_id);
  const { data: profiles } = await supabase.from('profiles').select('id, nickname, full_name').in('id', userIds);
  const profileMap: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });
  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    nickname: profileMap[r.user_id]?.nickname ?? '?',
    fullName: profileMap[r.user_id]?.full_name ?? '',
    createdAt: r.created_at,
  }));
}

export async function approveJoinRequest(requestId: string, houseId: string, userId: string): Promise<void> {
  const { error: memberErr } = await supabase
    .from('house_members')
    .insert({ house_id: houseId, user_id: userId, role: 'member' });
  if (memberErr && memberErr.code !== '23505') throw new Error(memberErr.message);
  const { error } = await supabase.from('house_join_requests').update({ status: 'approved' }).eq('id', requestId);
  if (error) throw new Error(error.message);
}

export async function rejectJoinRequest(requestId: string): Promise<void> {
  const { error } = await supabase.from('house_join_requests').update({ status: 'rejected' }).eq('id', requestId);
  if (error) throw new Error(error.message);
}

export async function joinHouse(code: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: rows, error } = await supabase.rpc('find_house_by_code', {
    p_join_code: code.trim().toUpperCase(),
  });

  const house = rows?.[0];
  if (error || !house) throw new Error('Invalid join code. Please check and try again.');

  // Get current user's nickname
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', user.id)
    .single();

  const myNick = myProfile?.nickname?.trim().toUpperCase();

  // Get existing members' nicknames for this house
  if (myNick) {
    const { data: memberRows } = await supabase
      .from('house_members')
      .select('user_id')
      .eq('house_id', house.id);

    if (memberRows && memberRows.length > 0) {
      const memberIds = memberRows.map((m: any) => m.user_id);
      const { data: memberProfiles } = await supabase
        .from('profiles')
        .select('nickname')
        .in('id', memberIds);

      const takenNicks = (memberProfiles ?? []).map((p: any) => p.nickname?.trim().toUpperCase());
      if (takenNicks.includes(myNick)) {
        throw new Error(
          `The nickname "${myProfile!.nickname}" is already taken in this household. ` +
          `Please go to Profile in Settings and choose a different nickname, then try again.`
        );
      }
    }
  }

  const { error: memberError } = await supabase
    .from('house_members')
    .insert({ house_id: house.id, user_id: user.id, role: 'member' });

  if (memberError) {
    if (memberError.code === '23505') throw new Error('You are already a member of this house.');
    throw new Error(memberError.message);
  }

  return house.id;
}

export async function getHouseMembers(houseId: string): Promise<HouseMember[]> {
  const { data: memberRows, error } = await supabase
    .from('house_members')
    .select('user_id, role')
    .eq('house_id', houseId)
    .order('joined_at', { ascending: true });

  if (error) throw new Error(error.message);
  if (!memberRows || memberRows.length === 0) return [];

  const userIds = memberRows.map((m: any) => m.user_id);
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, nickname, full_name')
    .in('id', userIds);

  const profileMap: Record<string, any> = {};
  (profileRows ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  return memberRows.map((m: any) => {
    const p = profileMap[m.user_id];
    return {
      userId:   m.user_id,
      nickname: p?.nickname  ?? '??',
      fullName: p?.full_name ?? 'Unknown',
      role:     m.role as 'owner' | 'member',
      splitPct: null,
    };
  });
}

export async function getMemberSplitPcts(houseId: string, month?: string): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};

  // Load default baseline
  const { data: defData } = await supabase
    .from('member_salaries').select('user_id, split_pct')
    .eq('house_id', houseId).eq('month', 'default');
  (defData ?? []).forEach((r: any) => { result[r.user_id] = r.split_pct ?? null; });

  // Override with month-specific if provided and different from default
  if (month && month !== 'default') {
    const { data: mData } = await supabase
      .from('member_salaries').select('user_id, split_pct')
      .eq('house_id', houseId).eq('month', month);
    (mData ?? []).forEach((r: any) => { result[r.user_id] = r.split_pct ?? null; });
  }

  return result;
}

export async function upsertMemberSplitPct(houseId: string, userId: string, splitPct: number, month = 'default'): Promise<void> {
  const { error } = await supabase.from('member_salaries').upsert(
    { house_id: houseId, user_id: userId, month, salary: 0, split_pct: splitPct },
    { onConflict: 'house_id,user_id,month' }
  );
  if (error) throw new Error(error.message);
}

export async function clearMemberSplitPcts(houseId: string, month = 'default'): Promise<void> {
  await supabase.from('member_salaries').delete().eq('house_id', houseId).eq('month', month);
}

export async function removeMemberFromHouse(houseId: string, userId: string): Promise<void> {
  // Clean up salary split data for this member before removing them
  await supabase.from('member_salaries')
    .delete()
    .eq('house_id', houseId)
    .eq('user_id', userId);

  const { error } = await supabase
    .from('house_members')
    .delete()
    .eq('house_id', houseId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ─── Profiles ───────────────────────────────────────────────────────────────

export async function getProfiles(houseId: string): Promise<Profile[]> {
  const members = await getHouseMembers(houseId);
  return members.map(m => ({ id: m.userId, nickname: m.nickname, fullName: m.fullName }));
}

export async function upsertProfile(profile: Profile): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: profile.id, nickname: profile.nickname, full_name: profile.fullName,
  });
  if (error) throw new Error(error.message);
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const { data } = await supabase.from('settings').select('key, value');
  const map: Record<string, string> = {};
  (data ?? []).forEach((r: { key: string; value: string }) => (map[r.key] = r.value));
  return {
    thSalary: parseFloat(map['th_salary'] ?? '0'),
    maSalary: parseFloat(map['ma_salary'] ?? '0'),
    thName:   map['th_name'] ?? 'User 1',
    maName:   map['ma_name'] ?? 'User 2',
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const upserts = [
    { key: 'th_salary', value: settings.thSalary.toString() },
    { key: 'ma_salary', value: settings.maSalary.toString() },
    { key: 'th_name',   value: settings.thName },
    { key: 'ma_name',   value: settings.maName },
  ];
  const { error } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' });
  if (error) throw new Error(error.message);
}

// ─── Categories ─────────────────────────────────────────────────────────────

// Client-side icon fallback — used when the DB icon column doesn't exist yet
// or when a category has no icon stored.
const DEFAULT_ICON_MAP: Record<string, string> = {
  Food:         'restaurant-outline',
  Household:    'home-outline',
  Car:          'car-outline',
  Bill:         'receipt-outline',
  Baby:         'heart-outline',
  Maintenance:  'construct-outline',
  Other:        'ellipsis-horizontal-circle-outline',
  Fun:          'game-controller-outline',
  Subscription: 'phone-portrait-outline',
  Shopping:     'bag-handle-outline',
  Online:       'globe-outline',
  Taxi:         'car-sport-outline',
  Medicine:     'medkit-outline',
  Installment:  'card-outline',
  Deposit:      'wallet-outline',
  Personal:     'person-outline',
};

function resolveIcon(r: any): string {
  return r.icon ?? DEFAULT_ICON_MAP[r.name] ?? 'help-circle-outline';
}

export async function getCategories(houseId: string): Promise<Category[]> {
  const fetchRows = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, split, sort_order, icon, is_recurring, is_out_of_pocket')
      .eq('house_id', houseId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      const { data: data2, error: err2 } = await supabase
        .from('categories')
        .select('id, name, split, sort_order, icon')
        .eq('house_id', houseId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (err2) throw new Error(err2.message);
      return data2 ?? [];
    }
    return data ?? [];
  };

  let rows = await fetchRows();
  if (rows.length === 0) {
    await supabase.from('categories').insert(
      DEFAULT_CATEGORIES.map(c => ({
        name: c.name, split: c.split, sort_order: c.sortOrder,
        icon: c.icon, is_recurring: c.isRecurring, is_out_of_pocket: c.isOutOfPocket,
        house_id: houseId,
      }))
    );
    rows = await fetchRows();
  }

  return rows.map((r: any) => ({
    id: r.id, name: r.name, split: r.split as Category['split'],
    sortOrder: r.sort_order, icon: resolveIcon(r),
    isRecurring: r.is_recurring ?? false,
    isOutOfPocket: r.is_out_of_pocket ?? false,
  }));
}

export async function addCategory(c: Omit<Category, 'id'>, houseId: string): Promise<void> {
  const { error } = await supabase.from('categories').insert({
    name: c.name, split: c.split, sort_order: c.sortOrder,
    icon: c.icon ?? 'help-circle-outline', is_recurring: c.isRecurring ?? false,
    is_out_of_pocket: c.isOutOfPocket ?? false,
    house_id: houseId,
  });
  if (error) throw new Error(error.message);
}

export async function updateCategory(c: Category): Promise<void> {
  const { error } = await supabase.from('categories').update({
    name: c.name, split: c.split, sort_order: c.sortOrder,
    icon: c.icon ?? 'help-circle-outline', is_recurring: c.isRecurring ?? false,
    is_out_of_pocket: c.isOutOfPocket ?? false,
  }).eq('id', c.id);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Merchants ───────────────────────────────────────────────────────────────

export interface Merchant {
  id: string;
  name: string;
}

export async function getMerchants(houseId: string): Promise<Merchant[]> {
  const { data, error } = await supabase
    .from('merchants')
    .select('id, name')
    .eq('house_id', houseId)
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name }));
}

export async function addMerchant(houseId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('merchants')
    .insert({ house_id: houseId, name: name.trim() });
  if (error) throw new Error(error.message);
}

export async function deleteMerchant(id: string): Promise<void> {
  const { error } = await supabase.from('merchants').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function getTransactions(month: string, houseId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('month', month)
    .eq('house_id', houseId)
    .order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id, date: r.date, owner: r.owner, category: r.category,
    description: r.description, amount: r.amount, status: r.status, month: r.month,
    paymentMethod: r.payment_method ?? 'Card',
    merchant: r.merchant ?? undefined,
  }));
}

export async function addTransaction(t: Omit<Transaction, 'id'>, houseId: string): Promise<string> {
  const payload: any = {
    date: t.date, owner: t.owner, category: t.category,
    description: t.description, amount: t.amount, status: t.status, month: t.month,
    payment_method: t.paymentMethod ?? 'Card',
    house_id: houseId,
    merchant: t.merchant ?? null,
  };
  let { data, error } = await supabase.from('transactions').insert(payload).select('id').single();
  if (error) {
    delete payload.payment_method;
    ({ data, error } = await supabase.from('transactions').insert(payload).select('id').single());
  }
  if (error || !data) throw new Error(error?.message ?? 'Insert failed');
  return data.id;
}

export async function updateTransaction(t: Transaction): Promise<void> {
  const payload: any = {
    date: t.date, owner: t.owner, category: t.category,
    description: t.description, amount: t.amount, status: t.status,
    payment_method: t.paymentMethod ?? 'Card',
    merchant: t.merchant ?? null,
  };
  let { error } = await supabase.from('transactions').update(payload).eq('id', t.id);
  if (error) {
    delete payload.payment_method;
    ({ error } = await supabase.from('transactions').update(payload).eq('id', t.id));
  }
  if (error) throw new Error(error.message);
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Recurring Payments ──────────────────────────────────────────────────────

export async function getRecurringPayments(month: string, houseId: string): Promise<RecurringPayment[]> {
  const { data, error } = await supabase
    .from('recurring_payments')
    .select('*, recurring_payment_shares(user_id, pay, paid, is_paid)')
    .eq('month', month)
    .eq('house_id', houseId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, merchant: r.merchant ?? undefined,
    dueDate: r.due_date, type: r.type,
    amount: r.amount,
    userShares: (r.recurring_payment_shares ?? []).map((s: any) => ({
      userId: s.user_id, pay: s.pay ?? 0, paid: s.paid ?? 0, isPaid: s.is_paid ?? false,
    })),
    month: r.month,
    paymentMethod: r.payment_method ?? 'Card',
  }));
}

export interface DueUserOwes {
  userKey: string;
  nickname: string;
  fullName: string;
  owes: number;
  isPaid: boolean;
}

export interface DuePayment {
  id: string;
  name: string;
  dueDate: string;
  type: string;
  totalOwed: number;
  paymentMethod: string;
  userOwes: DueUserOwes[];
  source: 'recurring' | 'transaction';
}

export async function getDueRecurringPayments(
  month: string,
  houseId: string,
): Promise<DuePayment[]> {
  const [payments, houseMembers] = await Promise.all([
    getRecurringPayments(month, houseId),
    getHouseMembers(houseId),
  ]);
  const nickMap: Record<string, string> = {};
  const nameMap: Record<string, string> = {};
  houseMembers.forEach(m => { nickMap[m.userId] = m.nickname; nameMap[m.userId] = m.fullName; });
  return payments
    .map(p => {
      const userOwes: DueUserOwes[] = [];
      const anyPaidEntered = p.userShares.some(s => s.paid > 0);
      p.userShares.forEach(s => {
        const responsible = anyPaidEntered ? s.paid : s.pay;
        if (responsible <= 0) return;
        userOwes.push({
          userKey: s.userId,
          nickname: nickMap[s.userId] ?? s.userId,
          fullName: nameMap[s.userId] ?? nickMap[s.userId] ?? s.userId,
          owes: s.isPaid ? 0 : responsible,
          isPaid: s.isPaid,
        });
      });
      return {
        id: p.id, name: p.name, dueDate: p.dueDate, type: p.type,
        totalOwed: userOwes.reduce((sum, u) => sum + u.owes, 0),
        paymentMethod: p.paymentMethod, userOwes,
        source: 'recurring' as const,
      };
    })
    .filter(p => p.userOwes.some(u => !u.isPaid));
}

export async function getDueTransactions(month: string, houseId: string): Promise<DuePayment[]> {
  const [{ data, error }, members] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, description, date, category, amount, payment_method, owner, status')
      .eq('month', month)
      .eq('house_id', houseId)
      .eq('status', 'NP')
      .order('date', { ascending: false }),
    getHouseMembers(houseId),
  ]);
  if (error) throw new Error(error.message);
  const fullNameByNick: Record<string, string> = {};
  members.forEach(m => { fullNameByNick[m.nickname] = m.fullName; });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.description,
    dueDate: r.date,
    type: r.category,
    totalOwed: r.amount,
    paymentMethod: r.payment_method ?? 'Card',
    source: 'transaction' as const,
    userOwes: [{
      userKey: r.owner,
      nickname: r.owner,
      fullName: fullNameByNick[r.owner] ?? r.owner,
      owes: r.amount,
      isPaid: false,
    }],
  }));
}

export async function markTransactionPaid(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').update({ status: 'P' }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markRecurringPaymentPaid(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_payment_shares')
    .update({ is_paid: true })
    .eq('payment_id', id);
  if (error) throw new Error(error.message);
}

export async function markRecurringUserPaid(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_payment_shares')
    .update({ is_paid: true })
    .eq('payment_id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function addRecurringPayment(p: Omit<RecurringPayment, 'id'>, houseId: string): Promise<string> {
  const payload: any = {
    name: p.name, due_date: p.dueDate, type: p.type, amount: p.amount,
    month: p.month, house_id: houseId,
    payment_method: p.paymentMethod ?? 'Card',
    ...(p.merchant ? { merchant: p.merchant } : {}),
  };
  let { data, error } = await supabase.from('recurring_payments').insert(payload).select('id').single();
  if (error) {
    delete payload.payment_method;
    delete payload.merchant;
    ({ data, error } = await supabase.from('recurring_payments').insert(payload).select('id').single());
  }
  if (error || !data) throw new Error(error?.message ?? 'Insert failed');
  const paymentId = data.id;
  if (p.userShares.length > 0) {
    const { error: shareErr } = await supabase.from('recurring_payment_shares').insert(
      p.userShares.map(s => ({ payment_id: paymentId, user_id: s.userId, pay: s.pay, paid: s.paid, is_paid: s.isPaid }))
    );
    if (shareErr) throw new Error(shareErr.message);
  }
  return paymentId;
}

export async function updateRecurringPayment(p: RecurringPayment): Promise<void> {
  const payload: any = {
    name: p.name, due_date: p.dueDate, type: p.type, amount: p.amount,
    payment_method: p.paymentMethod ?? 'Card',
    ...(p.merchant !== undefined ? { merchant: p.merchant || null } : {}),
  };
  let { error } = await supabase.from('recurring_payments').update(payload).eq('id', p.id);
  if (error) {
    delete payload.payment_method;
    delete payload.merchant;
    ({ error } = await supabase.from('recurring_payments').update(payload).eq('id', p.id));
  }
  if (error) throw new Error(error.message);
  await supabase.from('recurring_payment_shares').delete().eq('payment_id', p.id);
  if (p.userShares.length > 0) {
    const { error: shareErr } = await supabase.from('recurring_payment_shares').insert(
      p.userShares.map(s => ({ payment_id: p.id, user_id: s.userId, pay: s.pay, paid: s.paid, is_paid: s.isPaid }))
    );
    if (shareErr) throw new Error(shareErr.message);
  }
}

export async function deleteRecurringPayment(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_payments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function copyRecurringFromPrevMonth(fromMonth: string, toMonth: string, houseId: string): Promise<void> {
  const payments = await getRecurringPayments(fromMonth, houseId);
  if (payments.length === 0) return;
  for (const p of payments) {
    const { data, error } = await supabase.from('recurring_payments').insert({
      name: p.name, due_date: p.dueDate, type: p.type, amount: p.amount,
      month: toMonth, house_id: houseId,
      payment_method: p.paymentMethod ?? 'Card',
    }).select('id').single();
    if (error) throw new Error(error.message);
    if (p.userShares.length > 0) {
      const { error: shareErr } = await supabase.from('recurring_payment_shares').insert(
        p.userShares.map(s => ({ payment_id: data.id, user_id: s.userId, pay: s.pay, paid: 0, is_paid: false }))
      );
      if (shareErr) throw new Error(shareErr.message);
    }
  }
}

// ─── Monthly Summary ─────────────────────────────────────────────────────────

export async function getMonthlySummary(month: string, houseId: string): Promise<MonthlySummary> {
  const [rawMembers, categories, splitPcts] = await Promise.all([
    getHouseMembers(houseId),
    getCategories(houseId),
    getMemberSplitPcts(houseId, month),
  ]);
  const members = rawMembers.map((m: HouseMember) => ({ ...m, splitPct: splitPcts[m.userId] ?? null }));

  if (members.length === 0) return { categories: [], total: 0, users: [], settlement: 0 };

  const pcts = salaryPcts(members);
  const personalCats = categories.filter(c => c.split === 'Personal').map(c => c.name);

  const [txData, recData] = await Promise.all([
    supabase.from('transactions').select('category, amount, owner').eq('month', month).eq('house_id', houseId),
    supabase.from('recurring_payments')
      .select('type, recurring_payment_shares(user_id, pay, paid)')
      .eq('month', month).eq('house_id', houseId),
  ]);

  const catTotals: Record<string, number> = {};
  (txData.data ?? []).forEach((r: any) => {
    if (!personalCats.includes(r.category)) catTotals[r.category] = (catTotals[r.category] ?? 0) + r.amount;
  });

  const rec: Record<string, { pays: number[]; paids: number[] }> = {};
  (recData.data ?? []).forEach((r: any) => {
    if (!rec[r.type]) rec[r.type] = { pays: members.map(() => 0), paids: members.map(() => 0) };
    (r.recurring_payment_shares ?? []).forEach((s: any) => {
      const idx = members.findIndex(m => m.userId === s.user_id);
      if (idx !== -1) {
        rec[r.type].pays[idx]  += s.pay  ?? 0;
        rec[r.type].paids[idx] += s.paid ?? 0;
      }
    });
  });

  const rows: CatRow[] = [];
  const shareAcc: Record<string, number> = {};
  members.forEach(m => { shareAcc[m.nickname] = 0; });

  function addRow(label: string, total: number, userPayAmts: number[]) {
    if (total <= 0) return;
    rows.push({ label, total, userPays: members.map((m, i) => ({ nickname: m.nickname, amount: userPayAmts[i] ?? 0 })) });
    members.forEach((m, i) => { shareAcc[m.nickname] = (shareAcc[m.nickname] ?? 0) + (userPayAmts[i] ?? 0); });
  }

  // Recurring types that have no matching category get their own row first
  const TYPE_LABEL: Record<string, string> = { 'House Payments': 'Home / Mortgage' };
  const catNameSet = new Set(categories.filter(c => c.split !== 'Personal').map(c => c.name));
  for (const [type, entry] of Object.entries(rec)) {
    if (!catNameSet.has(type)) {
      addRow(TYPE_LABEL[type] ?? type, entry.pays.reduce((s, v) => s + v, 0), entry.pays);
    }
  }

  // Category rows — always merge recurring payments whose type matches the category name
  for (const cat of categories) {
    if (cat.split === 'Personal') continue;
    const txAmt    = catTotals[cat.name] ?? 0;
    const recEntry = rec[cat.name];
    const recPays  = recEntry?.pays ?? members.map(() => 0);
    const txUserAmts = members.map((m, i) => {
      if (cat.split === 'Full')  return i === 0 ? txAmt : 0;
      if (cat.split === 'Half')  return txAmt / members.length;
      return txAmt * (pcts[m.nickname] ?? (1 / members.length));
    });
    const userPayAmts = members.map((_, i) => (recPays[i] ?? 0) + (txUserAmts[i] ?? 0));
    addRow(cat.name, txAmt + recPays.reduce((s, v) => s + v, 0), userPayAmts);
  }

  const total = rows.reduce((s, r) => s + r.total, 0);

  const paidAcc: Record<string, number> = {};
  members.forEach(m => { paidAcc[m.nickname] = 0; });
  (txData.data ?? []).forEach((r: any) => {
    if (!personalCats.includes(r.category) && paidAcc[r.owner] !== undefined) paidAcc[r.owner] += r.amount;
  });
  const allRec = Object.values(rec);
  members.forEach((m, i) => {
    paidAcc[m.nickname] = (paidAcc[m.nickname] ?? 0) + allRec.reduce((s, r) => s + (r.paids[i] ?? 0), 0);
  });

  const users: UserSummary[] = members.map(m => ({
    nickname: m.nickname, fullName: m.fullName,
    share: shareAcc[m.nickname] ?? 0, paid: paidAcc[m.nickname] ?? 0,
  }));

  const m0Nick = members[0]?.nickname ?? '';
  const settlement = members.length >= 2 ? (paidAcc[m0Nick] ?? 0) - (shareAcc[m0Nick] ?? 0) : 0;
  return { categories: rows, total, users, settlement };
}

// ─── Personal + House Summary ────────────────────────────────────────────────

export async function getPersonalHouseSummary(month: string, houseId: string): Promise<PersonHouseSummary> {
  const [rawMembers, categories, splitPcts] = await Promise.all([
    getHouseMembers(houseId),
    getCategories(houseId),
    getMemberSplitPcts(houseId, month),
  ]);
  const members = rawMembers.map((m: HouseMember) => ({ ...m, splitPct: splitPcts[m.userId] ?? null }));
  if (members.length === 0) return { users: [] };

  const pcts = salaryPcts(members);
  const personalCats = categories.filter(c => c.split === 'Personal').map(c => c.name);
  const splitMap: Record<string, Category['split']> = {};
  categories.forEach(c => { splitMap[c.name] = c.split; });

  const u1Nick = members[0].nickname;
  const u2Nick = members[1]?.nickname ?? '';

  const [txData, recData] = await Promise.all([
    supabase.from('transactions').select('owner, category, amount, status').eq('month', month).eq('house_id', houseId),
    supabase.from('recurring_payments')
      .select('recurring_payment_shares(user_id, pay, paid)')
      .eq('month', month).eq('house_id', houseId),
  ]);

  const txRows: any[] = txData.data ?? [];
  const recRows: any[] = recData.data ?? [];

  const recShareAcc: Record<string, number> = {};
  const recPaidAcc: Record<string, number> = {};
  const userIdToNick: Record<string, string> = {};
  members.forEach(m => {
    recShareAcc[m.nickname] = 0;
    recPaidAcc[m.nickname]  = 0;
    userIdToNick[m.userId]  = m.nickname;
  });
  recRows.forEach((r: any) => {
    (r.recurring_payment_shares ?? []).forEach((s: any) => {
      const nick = userIdToNick[s.user_id];
      if (nick) {
        recShareAcc[nick] = (recShareAcc[nick] ?? 0) + (s.pay  ?? 0);
        recPaidAcc[nick]  = (recPaidAcc[nick]  ?? 0) + (s.paid ?? 0);
      }
    });
  });

  const catTotals: Record<string, number> = {};
  txRows.filter((r: any) => !personalCats.includes(r.category)).forEach((r: any) => {
    catTotals[r.category] = (catTotals[r.category] ?? 0) + r.amount;
  });

  const txShareAcc: Record<string, number> = {};
  members.forEach(m => { txShareAcc[m.nickname] = 0; });
  for (const [name, amt] of Object.entries(catTotals)) {
    const split = splitMap[name] ?? 'Half';
    if (split === 'Personal') continue;
    if (split === 'Full') {
      txShareAcc[u1Nick] += amt;
    } else if (split === 'Half') {
      txShareAcc[u1Nick] += amt / 2;
      if (u2Nick) txShareAcc[u2Nick] += amt / 2;
    } else {
      members.forEach(m => { txShareAcc[m.nickname] += amt * (pcts[m.nickname] ?? 0); });
    }
  }

  const txPaidAcc: Record<string, number> = {};
  members.forEach(m => { txPaidAcc[m.nickname] = 0; });
  txRows.filter((r: any) => !personalCats.includes(r.category)).forEach((r: any) => {
    if (txPaidAcc[r.owner] !== undefined) txPaidAcc[r.owner] += r.amount;
  });

  const personalTotalAcc: Record<string, number> = {};
  const personalPendingAcc: Record<string, number> = {};
  members.forEach(m => { personalTotalAcc[m.nickname] = 0; personalPendingAcc[m.nickname] = 0; });
  txRows.filter((r: any) => personalCats.includes(r.category)).forEach((r: any) => {
    if (personalTotalAcc[r.owner] !== undefined) personalTotalAcc[r.owner] += r.amount;
    if (r.status !== 'P' && personalPendingAcc[r.owner] !== undefined) personalPendingAcc[r.owner] += r.amount;
  });

  const users: PersonUserSummary[] = members.map(m => {
    const houseNeeds = (recShareAcc[m.nickname] ?? 0) + (txShareAcc[m.nickname] ?? 0);
    const housePaid  = (txPaidAcc[m.nickname] ?? 0) + (recPaidAcc[m.nickname] ?? 0);
    const grandTotal = (personalTotalAcc[m.nickname] ?? 0) + houseNeeds;
    return {
      userId: m.userId, nickname: m.nickname, fullName: m.fullName,
      personalTotal:   personalTotalAcc[m.nickname] ?? 0,
      personalPending: personalPendingAcc[m.nickname] ?? 0,
      houseNeeds, housePaid, housePending: houseNeeds - housePaid,
      grandTotal,
    };
  });

  return { users };
}

// ─── Yearly Summary ──────────────────────────────────────────────────────────

export async function getYearlySummary(year: string, houseId: string): Promise<YearlyRow[]> {
  const rows: YearlyRow[] = [];
  const monthNums  = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const monthNames = ['Jan','Feb','March','April','May','June','July','Aug','Sept','Oct','Nov','Dec'];

  for (let i = 0; i < 12; i++) {
    const month = `${year}-${monthNums[i]}`;
    const s = await getMonthlySummary(month, houseId);
    const findCat = (label: string) => s.categories.find(c => c.label === label)?.total ?? 0;
    rows.push({
      month: monthNames[i],
      homePay: findCat('Home / Mortgage'), carPay: findCat('Car Payments'),
      bills: findCat('Bill'), household: findCat('Household'), carExpense: findCat('Car'),
      food: findCat('Food'), subscriptions: findCat('Subscription'), fun: findCat('Fun'),
      total: s.total,
      userShares: s.users.map(u => ({ nickname: u.nickname, share: u.share })),
    });
  }
  return rows;
}

// ─── Yearly Daily Totals (for day-of-week pattern) ──────────────────────────

export async function getYearlyDailyTotals(
  year: string,
  houseId: string,
): Promise<{ date: string; total: number }[]> {
  const { data } = await supabase
    .from('transactions')
    .select('date, amount')
    .eq('house_id', houseId)
    .gte('date', `${year}-01-01`)
    .lte('date', `${year}-12-31`);
  if (!data) return [];
  const totals: Record<string, number> = {};
  (data as { date: string; amount: number }[]).forEach(r => {
    totals[r.date] = (totals[r.date] ?? 0) + r.amount;
  });
  return Object.entries(totals).map(([date, total]) => ({ date, total }));
}

// ─── Payment Method Totals ───────────────────────────────────────────────────

export interface PaymentMethodStat { total: number; due: number; }
export interface PaymentMethodTotals {
  Cash: PaymentMethodStat;
  Card: PaymentMethodStat;
  Account: PaymentMethodStat;
}

export async function getPaymentMethodTotals(month: string, houseId: string): Promise<PaymentMethodTotals> {
  const [txRes, fixedRes] = await Promise.all([
    supabase.from('transactions').select('amount, payment_method, status').eq('month', month).eq('house_id', houseId),
    supabase.from('recurring_payments')
      .select('amount, payment_method, recurring_payment_shares(paid, is_paid)')
      .eq('month', month).eq('house_id', houseId),
  ]);
  const totals: PaymentMethodTotals = {
    Cash:    { total: 0, due: 0 },
    Card:    { total: 0, due: 0 },
    Account: { total: 0, due: 0 },
  };
  (txRes.data ?? []).forEach((r: any) => {
    const m = (r.payment_method ?? 'Card') as keyof PaymentMethodTotals;
    if (m in totals) {
      totals[m].total += r.amount;
      if (r.status === 'NP') totals[m].due += r.amount;
    }
  });
  (fixedRes.data ?? []).forEach((r: any) => {
    const m = (r.payment_method ?? 'Card') as keyof PaymentMethodTotals;
    if (m in totals) {
      totals[m].total += r.amount;
      const due = (r.recurring_payment_shares ?? []).reduce(
        (s: number, sh: any) => s + (!sh.is_paid ? (sh.paid > 0 ? sh.paid : (sh.pay ?? 0)) : 0), 0
      );
      totals[m].due += due;
    }
  });
  return totals;
}

