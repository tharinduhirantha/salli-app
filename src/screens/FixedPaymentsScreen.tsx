import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, ScrollView, RefreshControl, Platform,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getRecurringPayments, addRecurringPayment, updateRecurringPayment,
  deleteRecurringPayment, getHouseMembers, getMemberSplitPcts, getCategories, getMerchants, HouseMember, Category, Merchant,
} from '../db/queries';
import { useHouse } from '../context/HouseContext';
import { RecurringPayment, PaymentMethod } from '../types';
import { monthLabel } from '../utils/date';
import { Colors, fmt } from '../utils/theme';
import DatePickerInput from '../components/DatePickerInput';

const TYPE_COLORS = [
  '#3B82F6', '#8B5CF6', '#F97316', '#EC4899',
  '#22C55E', '#F59E0B', '#06B6D4', '#EF4444',
];
const USER_COLORS = ['#3B82F6', '#F97316', '#22C55E', '#EC4899'];

type SplitMethod = 'Salary %' | '50/50' | 'Custom';
type MemberWithSplit = { userId: string; nickname: string; splitPct: number };

function inferSplitMethod(pays: number[], amount: number, splitPcts: number[]): SplitMethod {
  const n = pays.length;
  if (n === 0) return 'Custom';
  let salarySum = 0;
  const sMatches = pays.every((p, i) => {
    const expected = i < n - 1
      ? Math.round(amount * (splitPcts[i] / 100) * 100) / 100
      : Math.round((amount - salarySum) * 100) / 100;
    if (i < n - 1) salarySum += expected;
    return Math.abs(p - expected) <= 0.02;
  });
  if (sMatches) return 'Salary %';
  const even = Math.round(amount / n * 100) / 100;
  if (pays.every(p => Math.abs(p - even) <= 0.02)) return '50/50';
  return 'Custom';
}

function calcSalaryPays(amt: number, splitPcts: number[]): number[] {
  return splitPcts.map((pct, i) => {
    if (i < splitPcts.length - 1) return Math.round(amt * (pct / 100) * 100) / 100;
    const sum = splitPcts.slice(0, i).reduce((s, p) => s + Math.round(amt * (p / 100) * 100) / 100, 0);
    return Math.round((amt - sum) * 100) / 100;
  });
}

function calcEvenPays(amt: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    if (i < n - 1) return Math.round(amt / n * 100) / 100;
    const sum = (n - 1) * Math.round(amt / n * 100) / 100;
    return Math.round((amt - sum) * 100) / 100;
  });
}

export default function FixedPaymentsScreen() {
  const { currentHouse, month, goToPrevMonth, goToNextMonth } = useHouse();
  const { showAlert } = useAlert();
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [membersWithSplit, setMembersWithSplit] = useState<MemberWithSplit[]>([]);
  const [recurringCats, setRecurringCats] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [salaryEnabled, setSalaryEnabled] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<RecurringPayment | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!currentHouse) return;
    setLoading(true);
    const [data, m, splitPcts, cats, mercs] = await Promise.all([
      getRecurringPayments(month, currentHouse.id),
      getHouseMembers(currentHouse.id),
      getMemberSplitPcts(currentHouse.id, month),
      getCategories(currentHouse.id),
      getMerchants(currentHouse.id),
    ]);
    setMembers(m);
    const mws: MemberWithSplit[] = m.map(mem => ({
      userId:   mem.userId,
      nickname: mem.nickname,
      splitPct: splitPcts[mem.userId] ?? (100 / (m.length || 1)),
    }));
    setSalaryEnabled(m.length >= 2);
    setMembersWithSplit(mws);
    setRecurringCats(cats.filter(c => c.isRecurring));
    setMerchants(mercs);
    setPayments(data);
    setLoading(false);
  }, [month, currentHouse]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleCollapsed = (type: string) =>
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));

  const handleDelete = (id: string) => {
    showAlert('Delete', 'Remove this payment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRecurringPayment(id); load(); } },
    ]);
  };

  const getUserPay  = (p: RecurringPayment, userId: string) => p.userShares.find(s => s.userId === userId)?.pay  ?? 0;
  const getUserPaid = (p: RecurringPayment, userId: string) => p.userShares.find(s => s.userId === userId)?.paid ?? 0;

  const totals = payments.reduce(
    (acc, p) => ({
      amount: acc.amount + p.amount,
      userTotals: acc.userTotals.map((t, i) => t + getUserPay(p, membersWithSplit[i]?.userId ?? '')),
    }),
    { amount: 0, userTotals: membersWithSplit.map(() => 0) }
  );

  const recurringTypeNames = recurringCats.map(c => c.name);
  const allTypes = [
    ...recurringTypeNames,
    ...payments.map(p => p.type).filter(t => !recurringTypeNames.includes(t)),
  ].filter((t, i, arr) => arr.indexOf(t) === i);

  const grouped = allTypes.reduce((acc, type) => {
    acc[type] = payments.filter((p) => p.type === type);
    return acc;
  }, {} as Record<string, RecurringPayment[]>);

  return (
    <View style={styles.outer}>
      <View style={styles.monthCard}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      <View style={styles.whiteHalf}>
      <FlatList
        data={Object.entries(grouped).filter(([, items]) => items.length > 0)}
        keyExtractor={([type]) => type}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No recurring payments</Text>
          </View>
        }
        renderItem={({ item: [type, items] }) => {
          const isCollapsed = collapsed[type] ?? true;
          const color = TYPE_COLORS[allTypes.indexOf(type) % TYPE_COLORS.length];
          const groupTotal = items.reduce((s, p) => s + p.amount, 0);

          return (
            <View style={styles.group}>
              {/* Collapsible header */}
              <TouchableOpacity
                style={[styles.groupHeader, { borderLeftColor: color }]}
                onPress={() => toggleCollapsed(type)}
                activeOpacity={0.7}
              >
                <View style={styles.groupHeaderLeft}>
                  <View style={[styles.groupDot, { backgroundColor: color }]} />
                  <Text style={styles.groupTitle}>{type}</Text>
                  <View style={[styles.groupCountBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.groupCount, { color }]}>{items.length}</Text>
                  </View>
                </View>
                <View style={styles.groupHeaderRight}>
                  <Text style={styles.groupTotal}>{fmt(groupTotal)}</Text>
                  <Ionicons
                    name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={16}
                    color={Colors.textMuted}
                    style={{ marginLeft: 8 }}
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded rows */}
              {!isCollapsed && items.map((p) => {
                const userPays   = membersWithSplit.map(m => getUserPay(p, m.userId));
                const userPaid   = membersWithSplit.map(m => getUserPaid(p, m.userId));
                const userIsPaid = membersWithSplit.map(m => p.userShares.find(s => s.userId === m.userId)?.isPaid ?? false);
                const anyNotPaid = membersWithSplit.some((m, i) => !userIsPaid[i] && userPaid[i] > 0);
                const anyPaidBadge = membersWithSplit.some((m, i) => userIsPaid[i] && userPaid[i] > 0);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.payRow}
                    onPress={() => { setEditing(p); setModalVisible(true); }}
                    onLongPress={() => handleDelete(p.id)}
                  >
                    {/* Line 1: name + total */}
                    <View style={styles.payRowTop}>
                      <Text style={styles.payName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.payTotal}>{fmt(p.amount)}</Text>
                    </View>
                    {/* Line 2: date + per-user shares */}
                    <View style={styles.payRowMid}>
                      <Text style={styles.payDate}>{p.dueDate}</Text>
                      <View style={styles.payShares}>
                        {membersWithSplit.map((m, i) => (
                          <Text key={m.nickname} style={[styles.payShare, { color: USER_COLORS[i] ?? Colors.primary }]}>
                            {m.nickname} Owns {fmt(userPays[i] ?? 0)}
                          </Text>
                        ))}
                      </View>
                    </View>
                    {/* Line 3: payment status row */}
                    {(anyNotPaid || anyPaidBadge) && (
                      <View style={styles.paidRow}>
                        {membersWithSplit.map((m, i) => (
                          userIsPaid[i] && userPaid[i] > 0 ? (
                            <View key={m.nickname} style={[styles.paidBadge, { backgroundColor: Colors.successLight }]}>
                              <Text style={[styles.paidText, { color: Colors.success }]}>{m.nickname} ✓</Text>
                            </View>
                          ) : null
                        ))}
                        {anyNotPaid && (
                          <View style={[styles.paidBadge, { backgroundColor: Colors.dangerLight }]}>
                            <Text style={[styles.paidText, { color: Colors.danger }]}>Due</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => { setEditing(null); setModalVisible(true); }}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <PaymentModal
        visible={modalVisible}
        payment={editing}
        month={month}
        houseId={currentHouse?.id ?? ''}
        members={membersWithSplit}
        recurringCats={recurringCats}
        merchants={merchants}
        salaryEnabled={salaryEnabled}
        onClose={() => setModalVisible(false)}
        onSave={() => { setModalVisible(false); load(); }}
        onDelete={editing ? (id: string) => {
          setModalVisible(false);
          showAlert('Delete Payment', `Delete "${editing.name}"? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await deleteRecurringPayment(id); load(); } },
          ]);
        } : undefined}
      />
      </View>
    </View>
  );
}

function SumChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.sumChip}>
      <Text style={[styles.sumChipLabel, { color: Colors.textMuted }]}>{label}</Text>
      <Text style={[styles.sumChipValue, { color }]}>{value}</Text>
    </View>
  );
}

function PaymentModal({
  visible, payment, month, houseId, members, recurringCats, merchants, salaryEnabled, onClose, onSave, onDelete,
}: {
  visible: boolean;
  payment: RecurringPayment | null;
  month: string;
  houseId: string;
  members: MemberWithSplit[];
  recurringCats: Category[];
  merchants: Merchant[];
  salaryEnabled: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete?: (id: string) => void;
}) {
  const { showAlert } = useAlert();
  const [name, setName] = useState('');
  const [merchant, setMerchant] = useState('');
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantExpanded, setMerchantExpanded] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState('');
  const [amount, setAmount] = useState('');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('Salary %');
  const [payCustom, setPayCustom] = useState<string[]>([]);
  const [paidAmounts, setPaidAmounts] = useState<string[]>([]);
  const [paidFlags,   setPaidFlags]   = useState<boolean[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');

  useEffect(() => {
    if (payment) {
      setName(payment.name);
      setMerchant(payment.merchant ?? '');
      setDueDate(payment.dueDate);
      setType(payment.type);
      setAmount(String(payment.amount));
      const pays  = members.map(m => payment.userShares.find(s => s.userId === m.userId)?.pay  ?? 0);
      const paids = members.map(m => payment.userShares.find(s => s.userId === m.userId)?.paid ?? 0);
      const splitPcts = members.map(m => m.splitPct);
      setSplitMethod(inferSplitMethod(pays, payment.amount, splitPcts));
      setPayCustom(pays.map(String));
      setPaidAmounts(members.map((_, i) => String(paids[i] > 0 ? paids[i] : pays[i])));
      setPaidFlags(members.map(m => payment.userShares.find(s => s.userId === m.userId)?.isPaid ?? false));
      setPaymentMethod(payment.paymentMethod ?? 'Card');
    } else {
      setName(''); setMerchant(''); setMerchantSearch(''); setMerchantExpanded(false);
      setDueDate(''); setType(recurringCats[0]?.name ?? '');
      setAmount(''); setSplitMethod(salaryEnabled ? 'Salary %' : '50/50');
      setPayCustom(members.map(() => ''));
      setPaidAmounts(members.map(() => ''));
      setPaidFlags(members.map(() => false));
      setPaymentMethod('Card');
    }
  }, [payment, visible]);

  const amt = parseFloat(amount) || 0;
  const splitPcts = members.map(m => m.splitPct);
  const salaryPays = calcSalaryPays(amt, splitPcts);
  const evenPays = calcEvenPays(amt, members.length || 1);

  const payValues = members.map((_, i) => {
    if (splitMethod === 'Salary %') return salaryPays[i] ?? 0;
    if (splitMethod === '50/50') return evenPays[i] ?? 0;
    return parseFloat(payCustom[i] ?? '0') || 0;
  });

  // For new payments, keep paidAmounts in sync with payValues
  const payValuesKey = payValues.join(',');
  React.useEffect(() => {
    if (!payment && amt > 0) setPaidAmounts(payValues.map(v => String(v)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payValuesKey, payment]);

  const handleSplitMethodChange = (m: SplitMethod) => {
    const newCustom = splitMethod === 'Salary %' ? salaryPays.map(String) : evenPays.map(String);
    if (m === 'Custom') setPayCustom(newCustom);
    setSplitMethod(m);
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const a = parseFloat(val) || 0;
    if (splitMethod === 'Custom') setPayCustom(calcEvenPays(a, members.length || 1).map(String));
  };

  const handleSave = async () => {
    if (!name.trim() || amt <= 0) { showAlert('Required', 'Name and amount are required.'); return; }
    const splitTotal = Math.round(payValues.reduce((s, v) => s + v, 0) * 100) / 100;
    if (Math.abs(splitTotal - amt) > 0.005) {
      const parts = members.map((m, i) => `${m.nickname} ${fmt(payValues[i] ?? 0)}`).join(' + ');
      showAlert('Invalid Split', `${parts} = ${fmt(splitTotal)}, but total is ${fmt(amt)}. Split must equal total.`);
      return;
    }
    const rawVals = members.map((_, i) => parseFloat(paidAmounts[i] ?? '0') || 0);
    const paidTotal = Math.round(rawVals.reduce((s, v) => s + v, 0) * 100) / 100;
    if (Math.abs(paidTotal - amt) > 0.005) {
      const parts = members.map((m, i) => `${m.nickname} ${fmt(rawVals[i] ?? 0)}`).join(' + ');
      showAlert('Invalid Paid Amount', `${parts} = ${fmt(paidTotal)}, but total is ${fmt(amt)}. Paid amounts must equal the total.`);
      return;
    }
    const p = {
      name: name.trim(), merchant: merchant.trim() || undefined,
      dueDate, type, amount: amt,
      userShares: members.map((m, i) => ({ userId: m.userId, pay: payValues[i] ?? 0, paid: rawVals[i] ?? 0, isPaid: paidFlags[i] ?? false })),
      month, paymentMethod,
    };
    try {
      if (payment) {
        await updateRecurringPayment({ ...p, id: payment.id });
      } else {
        await addRecurringPayment(p, houseId);
      }
      onSave();
    } catch (e: any) {
      showAlert('Error', e.message ?? 'Failed to save. Please try again.');
    }
  };

  const isAuto = splitMethod !== 'Custom';

  const splitHint =
    splitMethod === 'Salary %'
      ? `Salary ratio · ${members.map(m => `${m.nickname} ${Math.round(m.splitPct)}%`).join(' / ')}`
      : splitMethod === '50/50'
      ? `Split equally across ${members.length} people`
      : 'Enter custom amounts for each person';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
      <View style={styles.modalHeader}>
        <TouchableOpacity onPress={onClose}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
        <Text style={styles.modalTitle}>{payment ? 'Edit Payment' : 'Add Recurring Payment'}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        <MLabel text="Name" />
        <TextInput style={styles.mInput} value={name} onChangeText={setName} placeholder="e.g. House Mortgage" placeholderTextColor={Colors.textMuted} />

        <MLabel text="Merchant (optional)" />
        <TouchableOpacity
          style={[styles.merchantSelector, { borderColor: merchantExpanded ? Colors.primary : Colors.border }]}
          onPress={() => { setMerchantExpanded(e => !e); setMerchantSearch(''); }}
          activeOpacity={0.8}
        >
          <Ionicons name="storefront-outline" size={15} color={merchant ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.merchantSelectorText, { color: merchant ? Colors.textPrimary : Colors.textMuted }]} numberOfLines={1}>
            {merchant || 'Select merchant…'}
          </Text>
          {merchant ? (
            <TouchableOpacity onPress={() => { setMerchant(''); setMerchantExpanded(false); }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Ionicons name={merchantExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={Colors.textMuted} />
          )}
        </TouchableOpacity>
        {merchantExpanded && (
          <View style={styles.merchantPanel}>
            <View style={styles.merchantSearchWrap}>
              <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
              <TextInput
                style={styles.merchantSearchInput}
                value={merchantSearch}
                onChangeText={setMerchantSearch}
                placeholder="Search merchants…"
                placeholderTextColor={Colors.textMuted}
              />
              {!!merchantSearch && (
                <TouchableOpacity onPress={() => setMerchantSearch('')}>
                  <Ionicons name="close-circle" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.merchantDropdown}>
              {merchants
                .filter(m => !merchantSearch || m.name.toLowerCase().includes(merchantSearch.toLowerCase()))
                .map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.merchantDropRow, merchant === m.name && { backgroundColor: Colors.primaryLight }]}
                    onPress={() => { setMerchant(m.name); setMerchantExpanded(false); setMerchantSearch(''); }}
                  >
                    <View style={[styles.merchantDropIcon, { backgroundColor: Colors.primaryLight }]}>
                      <Ionicons name="storefront-outline" size={14} color={Colors.primary} />
                    </View>
                    <Text style={[styles.merchantDropText, merchant === m.name && { color: Colors.primary, fontWeight: '700' }]}>{m.name}</Text>
                    {merchant === m.name && <Ionicons name="checkmark" size={14} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              {merchants.filter(m => !merchantSearch || m.name.toLowerCase().includes(merchantSearch.toLowerCase())).length === 0 && (
                <View style={[styles.merchantDropRow, { justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 13, color: Colors.textMuted }}>No merchants found</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Due Date + Payment Method */}
        <View style={styles.inlineRow}>
          <View style={[styles.inlineCol, { flex: 0.5 }]}>
            <MLabel text="Due Date" />
            <TextInput style={styles.mInput} value={dueDate} onChangeText={setDueDate} placeholder="e.g. 2nd" placeholderTextColor={Colors.textMuted} />
          </View>
          <View style={styles.inlineCol}>
            <MLabel text="Payment Method" />
            <View style={styles.splitMethodRow}>
              {([
                { label: 'Cash',    value: 'Cash' as PaymentMethod,    icon: 'cash-outline' },
                { label: 'Card',    value: 'Card' as PaymentMethod,    icon: 'card-outline' },
                { label: 'Account', value: 'Account' as PaymentMethod, icon: 'wallet-outline' },
              ]).map((opt) => {
                const active = paymentMethod === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.splitMethodBtn, active && styles.splitMethodBtnActive]}
                    onPress={() => setPaymentMethod(opt.value)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={opt.icon as any} size={12} color={active ? '#fff' : Colors.textSecondary} />
                    <Text style={[styles.splitMethodTextSm, active && styles.splitMethodTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <MLabel text="Type" />
        {recurringCats.length === 0 ? (
          <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 8 }}>
            No recurring categories set up. Go to Settings → Categories and enable the Recurring toggle.
          </Text>
        ) : (
          <View style={styles.typeGrid}>
            {recurringCats.map((c, i) => {
              const color = TYPE_COLORS[i % TYPE_COLORS.length];
              const active = type === c.name;
              return (
                <TouchableOpacity
                  key={c.name}
                  style={[styles.typeChip, active && { backgroundColor: color, borderColor: 'transparent' }]}
                  onPress={() => setType(c.name)}
                >
                  <Text style={[styles.typeChipText, active && { color: '#fff' }]}>{c.name}</Text>
                  {c.isOutOfPocket && (
                    <View style={[styles.typeFlag, { backgroundColor: active ? 'rgba(255,255,255,0.28)' : '#F59E0B20' }]}>
                      <Ionicons name="person" size={9} color={active ? '#fff' : '#F59E0B'} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Amount + Split Method */}
        <View style={styles.inlineRow}>
          <View style={[styles.inlineCol, { flex: 0.5 }]}>
            <MLabel text="Amount ($)" />
            <TextInput
              style={[styles.mInput, { textAlign: 'center', fontSize: 16, fontWeight: '700' }]}
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.inlineCol}>
            <MLabel text="Split Method" />
            <View style={styles.splitMethodRow}>
              {(['Salary %', '50/50', 'Custom'] as SplitMethod[]).map((m) => {
                const active = splitMethod === m;
                const disabled = m === 'Salary %' && !salaryEnabled;
                const icon = m === 'Salary %' ? 'analytics-outline' : m === '50/50' ? 'git-branch-outline' : 'create-outline';
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.splitMethodBtn, active && styles.splitMethodBtnActive, disabled && { opacity: 0.35 }]}
                    onPress={() => !disabled && handleSplitMethodChange(m)}
                    activeOpacity={disabled ? 1 : 0.75}
                  >
                    <Ionicons name={icon} size={12} color={active ? '#fff' : Colors.textSecondary} />
                    <Text style={[styles.splitMethodTextSm, active && styles.splitMethodTextActive]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
        <Text style={styles.splitHint}>{splitHint}</Text>

        {/* Per-member owns fields */}
        <View style={styles.splitPayRow}>
          {members.map((m, i) => (
            <React.Fragment key={m.nickname}>
              {i > 0 && <View style={styles.splitPayDivider} />}
              <View style={styles.splitPayField}>
                <Text style={[styles.splitPayLabel, { color: USER_COLORS[i] ?? Colors.primary }]}>{m.nickname} Owns</Text>
                <TextInput
                  style={[
                    styles.splitPayInput,
                    { borderColor: isAuto ? 'transparent' : (USER_COLORS[i] ?? Colors.primary) + '80' },
                    isAuto && styles.splitPayInputDisabled,
                  ]}
                  value={isAuto ? fmt(payValues[i] ?? 0) : (payCustom[i] ?? '')}
                  onChangeText={val => {
                    const next = [...payCustom];
                    next[i] = val;
                    setPayCustom(next);
                  }}
                  keyboardType="decimal-pad"
                  editable={!isAuto}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Payment Status */}
        <MLabel text="Payment Status" />
        <View style={styles.payStatusCard}>
          {members.map((m, i) => {
            const paidAmt = paidAmounts[i] ?? '';
            const isPaid  = paidFlags[i] ?? false;
            const color   = USER_COLORS[i] ?? Colors.primary;
            return (
              <React.Fragment key={m.nickname}>
                {i > 0 && <View style={styles.payStatusDivider} />}
                <View style={styles.payStatusBlock}>
                  {/* Row 1: badge + amount input */}
                  <View style={styles.payStatusRow}>
                    <View style={[styles.payStatusBadge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.payStatusNick, { color }]}>{m.nickname}</Text>
                    </View>
                    <TextInput
                      style={[styles.payStatusInput, !amt && styles.payStatusInputDisabled]}
                      value={paidAmt}
                      onChangeText={val => { const next = [...paidAmounts]; next[i] = val; setPaidAmounts(next); }}
                      keyboardType="decimal-pad"
                      placeholder="Paid amount"
                      placeholderTextColor={Colors.textMuted}
                      editable={amt > 0}
                    />
                  </View>
                  {/* Row 2: Not Paid / Paid toggle */}
                  <View style={styles.payStatusToggleRow}>
                    <TouchableOpacity
                      style={[styles.payStatusToggleBtn, {
                        borderColor: Colors.danger,
                        backgroundColor: !isPaid ? Colors.danger : 'transparent',
                      }]}
                      onPress={() => { const n = [...paidFlags]; n[i] = false; setPaidFlags(n); }}
                      disabled={amt <= 0}
                    >
                      <Ionicons name="close-circle-outline" size={13} color={!isPaid ? '#fff' : Colors.danger} />
                      <Text style={[styles.payStatusToggleBtnText, { color: !isPaid ? '#fff' : Colors.danger }]}>Not Paid</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.payStatusToggleBtn, {
                        borderColor: Colors.success,
                        backgroundColor: isPaid ? Colors.success : 'transparent',
                      }]}
                      onPress={() => { const n = [...paidFlags]; n[i] = true; setPaidFlags(n); }}
                      disabled={amt <= 0}
                    >
                      <Ionicons name="checkmark-circle-outline" size={13} color={isPaid ? '#fff' : Colors.success} />
                      <Text style={[styles.payStatusToggleBtnText, { color: isPaid ? '#fff' : Colors.success }]}>Paid</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.modalSaveBtnText}>{payment ? 'Update Payment' : 'Save Payment'}</Text>
        </TouchableOpacity>

        {payment && onDelete && (
          <TouchableOpacity style={styles.modalDeleteBtn} onPress={() => onDelete(payment.id)}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.modalDeleteBtnText}>Delete Payment</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
      </View>
    </Modal>
  );
}

function MLabel({ text }: { text: string }) {
  return <Text style={styles.mLabel}>{text}</Text>;
}

const styles = StyleSheet.create({
  outer:     { flex: 1 },
  topHalf:   { flex: 1, justifyContent: 'flex-end', zIndex: 2 },
  whiteHalf: { flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 36, overflow: Platform.OS === 'web' ? 'visible' : 'hidden', zIndex: 1 },
  monthCard: { alignSelf: 'center', width: '44%', marginTop: 6, marginBottom: -16, zIndex: 2, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 10 },
  summaryRow: { flexDirection: 'row', padding: 12, gap: 8 },
  sumChip: { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  sumChipLabel: { fontSize: 11, marginBottom: 2 },
  sumChipValue: { fontSize: 14, fontWeight: '700' },
  list: { paddingHorizontal: 12, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12, marginBottom: 16 },
  group: { marginBottom: 12, backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 20, borderLeftWidth: 4, backgroundColor: '#F8FAFC' },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  groupCountBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  groupCount: { fontSize: 11, fontWeight: '700' },
  groupTotal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  payRow: { paddingVertical: 14, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: Colors.border },
  payRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  payRowMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  payName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 12 },
  payDate: { fontSize: 12, color: Colors.textMuted },
  payTotal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  payShares: { flexDirection: 'row', gap: 12 },
  payShare: { fontSize: 12, fontWeight: '600' },
  paidRow: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', alignItems: 'center' },
  paidByLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginRight: 2 },
  paidBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  paidText: { fontSize: 12, fontWeight: '700' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.card },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  modalCancel: { fontSize: 16, color: Colors.danger, width: 60 },
  modalContent: { flex: 1, backgroundColor: Colors.bg, padding: 16 },
  modalSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 28, gap: 8 },
  modalSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  modalDeleteBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
  mLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  payStatusCard:          { backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginTop: 4 },
  payStatusDivider:       { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  payStatusBlock:         { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, gap: 8 },
  payStatusRow:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payStatusBadge:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, minWidth: 46, alignItems: 'center' },
  payStatusNick:          { fontSize: 13, fontWeight: '800' },
  payStatusInput:         { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', paddingVertical: 7, paddingHorizontal: 10, backgroundColor: Colors.bg, borderRadius: 9, borderWidth: 1, borderColor: Colors.border },
  payStatusInputDisabled: { opacity: 0.4 },
  payStatusToggleRow:     { flexDirection: 'row', gap: 8 },
  payStatusToggleBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  payStatusToggleBtnText: { fontSize: 13, fontWeight: '700' },
  mInput: { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  merchantSelector:    { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 13 },
  merchantSelectorText: { flex: 1, fontSize: 13, fontWeight: '600' },
  merchantPanel:       { backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 10, marginTop: 4 },
  merchantSearchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8 },
  merchantSearchInput: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  merchantDropdown:    { backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  merchantDropRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  merchantDropIcon:    { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  merchantDropText:    { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  typeChipText: { fontSize: 13, color: Colors.textSecondary },
  typeFlag: { width: 16, height: 16, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  inlineRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  inlineCol: { flex: 1 },
  // Split method
  splitMethodRow: { flexDirection: 'row', gap: 5 },
  splitMethodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  splitMethodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  splitMethodText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  splitMethodTextSm: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  splitMethodTextActive: { color: '#fff' },
  splitHint: { fontSize: 11, color: Colors.textMuted, marginTop: 6, marginBottom: 4, textAlign: 'center' },
  // Split pay fields
  splitPayRow: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginTop: 8 },
  splitPayField: { flex: 1, padding: 14, alignItems: 'center' },
  splitPayDivider: { width: 1, backgroundColor: Colors.border },
  splitPayLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  splitPayInput: { width: '100%', borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 7, fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', backgroundColor: 'transparent' },
  splitPayInputDisabled: { borderWidth: 0, color: Colors.textPrimary },
});
