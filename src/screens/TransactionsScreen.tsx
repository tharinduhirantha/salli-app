import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput, Platform,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getTransactions, deleteTransaction, getHouseMembers, HouseMember } from '../db/queries';
import { useHouse } from '../context/HouseContext';
import { Transaction } from '../types';
import { monthLabel, prevMonth as calcPrevMonth } from '../utils/date';
import { Colors, categoryColor, fmt, memberBadgeColor } from '../utils/theme';

const ICON_MAP: Record<string, string> = {
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

type FilterType = 'All' | 'Paid' | 'Unpaid';

function dateLabel(dateStr: string): string {
  const todayStr = new Date().toISOString().slice(0, 10);
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yesterdayStr = yest.toISOString().slice(0, 10);
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const { currentHouse, month, goToPrevMonth, goToNextMonth } = useHouse();
  const { showAlert } = useAlert();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prevMonthTotal, setPrevMonthTotal] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!currentHouse) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const [data, prevData, mems] = await Promise.all([
      getTransactions(month, currentHouse.id),
      getTransactions(calcPrevMonth(month), currentHouse.id),
      getHouseMembers(currentHouse.id),
    ]);
    setTransactions(data);
    setPrevMonthTotal(prevData.reduce((s, t) => s + t.amount, 0));
    setMembers(mems);
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }, [month, currentHouse]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (id: string) => {
    showAlert('Delete', 'Remove this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteTransaction(id); load(); } },
    ]);
  };

  const filtered = transactions.filter(t => {
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

  const totalAmt  = transactions.reduce((s, t) => s + t.amount, 0);
  const paidAmt   = transactions.filter(t => t.status === 'P').reduce((s, t) => s + t.amount, 0);
  const unpaidAmt = transactions.filter(t => t.status === 'NP').reduce((s, t) => s + t.amount, 0);

  // Group by date descending
  const dateMap: Record<string, Transaction[]> = {};
  filtered.forEach(t => {
    if (!dateMap[t.date]) dateMap[t.date] = [];
    dateMap[t.date].push(t);
  });
  const sections = Object.keys(dateMap)
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({ title: dateLabel(date), data: dateMap[date] }));

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
      {/* Summary card */}
      {transactions.length > 0 && (
        <View style={[styles.txSummaryCard, { marginHorizontal: 12, marginTop: 0, marginBottom: 8 }]}>
          <View style={styles.txSummaryHeader}>
            <View style={{ gap: 4 }}>
              <Text style={styles.txSummaryLabel}>Total Monthly</Text>
              <Text style={styles.txSummaryAmount}>{fmt(totalAmt)}</Text>
              {prevMonthTotal !== null && prevMonthTotal > 0 && (
                <View style={[
                  styles.txSummaryBadge,
                  { backgroundColor: totalAmt >= prevMonthTotal ? Colors.successLight : '#FEF2F2' },
                ]}>
                  <Ionicons
                    name={totalAmt >= prevMonthTotal ? 'arrow-up' : 'arrow-down'}
                    size={11}
                    color={totalAmt >= prevMonthTotal ? Colors.success : Colors.danger}
                  />
                  <Text style={[styles.txSummaryBadgeText, { color: totalAmt >= prevMonthTotal ? Colors.success : Colors.danger }]}>
                    {Math.abs(Math.round(((totalAmt - prevMonthTotal) / prevMonthTotal) * 1000) / 10)}%
                  </Text>
                  <Text style={styles.txSummaryBadgeVs}>vs {monthLabel(calcPrevMonth(month))}</Text>
                </View>
              )}
            </View>
            <View style={styles.txSummaryDecor}>
              <Ionicons name="receipt-outline" size={22} color={Colors.primary} style={{ opacity: 0.6 }} />
            </View>
          </View>
        </View>
      )}

      {/* Search + Filter row */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textMuted}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterRow}>
          {(['All', 'Paid', 'Unpaid'] as FilterType[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Member filter chips */}
      {members.length > 1 && (
        <View style={styles.memberChipRow}>
          {members.map(m => {
            const active = ownerFilter === m.nickname;
            const badge  = memberBadgeColor(m.nickname);
            return (
              <TouchableOpacity
                key={m.nickname}
                style={[styles.memberChip, active && { backgroundColor: badge.text, borderColor: badge.text }]}
                onPress={() => setOwnerFilter(active ? null : m.nickname)}
                activeOpacity={0.75}
              >
                <View style={[styles.memberChipDot, { backgroundColor: active ? '#fff' : badge.text }]} />
                <Text style={[styles.memberChipText, active && { color: '#fff' }]}>{m.nickname}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {/* Date-grouped sections */}
        {sections.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptyHint}>Tap + to add one</Text>
          </View>
        ) : sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.data.map((item, i) => {
                const color   = categoryColor[item.category] ?? Colors.textMuted;
                const icon    = ICON_MAP[item.category] ?? 'help-circle-outline';
                const badge   = memberBadgeColor(item.owner);
                const isLast  = i === section.data.length - 1;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.txItem, !isLast && styles.txItemBorder]}
                    onPress={() => navigation.navigate('AddExpense', { transaction: item, month })}
                    onLongPress={() => handleDelete(item.id)}
                    activeOpacity={0.7}
                  >
                    {/* Category icon */}
                    <View style={[styles.catIcon, { backgroundColor: color + '22' }]}>
                      <Ionicons name={icon as any} size={22} color={color} />
                    </View>

                    {/* Description + meta */}
                    <View style={styles.txInfo}>
                      <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
                      <View style={styles.txMeta}>
                        <Text style={styles.txCat}>{item.category}</Text>
                        <Text style={styles.txDot}> · </Text>
                        <View style={[styles.ownerBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.ownerText, { color: badge.text }]}>{item.owner}</Text>
                        </View>
                        {item.status === 'NP' && (
                          <>
                            <Text style={styles.txDot}> · </Text>
                            <Text style={styles.unpaidBadge}>Unpaid</Text>
                          </>
                        )}
                      </View>
                    </View>

                    {/* Amount + chevron */}
                    <View style={styles.txRight}>
                      <Text style={styles.txAmount}>{fmt(item.amount)}</Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense', { month })}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer:      { flex: 1 },
  topHalf:    { flex: 1, justifyContent: 'flex-end', zIndex: 2 },
  whiteHalf:  { flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 36, overflow: Platform.OS === 'web' ? 'visible' : 'hidden', zIndex: 1 },
  monthCard:  { alignSelf: 'center', width: '44%', marginTop: 6, marginBottom: -16, zIndex: 2, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navBtn:     { padding: 6 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 10 },

  searchFilterRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, marginBottom: 8, gap: 8 },
  searchWrap:  { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, minWidth: 0 },

  filterRow:          { flexDirection: 'row', gap: 6 },
  filterChip:         { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterChipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:     { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff' },

  memberChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 8 },
  memberChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  memberChipDot: { width: 7, height: 7, borderRadius: 4 },
  memberChipText:{ fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  content: { padding: 16, paddingBottom: 100 },
  txSummaryCard:      { backgroundColor: Colors.card, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  txSummaryHeader:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D6DDEF', padding: 14 },
  txSummaryLabel:     { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  txSummaryAmount:    { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  txSummaryBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  txSummaryBadgeText: { fontSize: 11, fontWeight: '700' },
  txSummaryBadgeVs:   { fontSize: 10, color: Colors.textSecondary, fontWeight: '500' },
  txSummaryDecor:     { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },

  summaryCard:    { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 16, padding: 12, marginHorizontal: 16, marginTop: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  summaryHalf:    { flex: 1 },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 10 },
  summaryLabel:   { fontSize: 10, color: Colors.textSecondary, marginBottom: 4 },
  summaryAmount:  { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  summaryMonth:   { fontSize: 9, color: Colors.textMuted },

  section:       { marginBottom: 16 },
  sectionHeader: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  sectionCard:   { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden' },

  txItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  txItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },

  catIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },

  txInfo:  { flex: 1 },
  txDesc:  { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 3 },
  txMeta:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  txCat:   { fontSize: 12, color: Colors.textSecondary },
  txDot:   { fontSize: 12, color: Colors.textMuted },
  ownerBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  ownerText:  { fontSize: 10, fontWeight: '700' },
  unpaidBadge: { fontSize: 10, fontWeight: '600', color: Colors.danger },

  txRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txAmount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: Colors.textSecondary, marginTop: 12 },
  emptyHint: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },

  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
});
