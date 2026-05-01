import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getTransactions, deleteTransaction } from '../db/queries';
import { useHouse } from '../context/HouseContext';
import { Transaction } from '../types';
import { monthLabel } from '../utils/date';
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!currentHouse) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const data = await getTransactions(month, currentHouse.id);
    setTransactions(data);
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
      t.category.toLowerCase().includes(q);
    const matchFilter =
      filter === 'All' ||
      (filter === 'Paid' && t.status === 'P') ||
      (filter === 'Unpaid' && t.status === 'NP');
    return matchSearch && matchFilter;
  });

  const totalAmt = filtered.reduce((s, t) => s + t.amount, 0);
  const paidAmt  = filtered.filter(t => t.status === 'P').reduce((s, t) => s + t.amount, 0);

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
      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
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

      {/* Filter chips */}
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

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHalf}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={[styles.summaryAmount, { color: Colors.danger }]}>-{fmt(totalAmt)}</Text>
            <Text style={styles.summaryMonth}>This Month</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryHalf}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={[styles.summaryAmount, { color: Colors.success }]}>+{fmt(paidAmt)}</Text>
            <Text style={styles.summaryMonth}>This Month</Text>
          </View>
        </View>

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
  whiteHalf:  { flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 36, overflow: 'hidden', zIndex: 1 },
  monthCard:  { alignSelf: 'center', width: '44%', marginTop: 6, marginBottom: -16, zIndex: 2, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navBtn:     { padding: 6 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 10 },

  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, marginBottom: 10, backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  filterRow:          { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  filterChip:         { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterChipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff' },

  content: { padding: 16, paddingBottom: 100 },

  summaryCard:    { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  summaryHalf:    { flex: 1 },
  summaryDivider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  summaryLabel:   { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  summaryAmount:  { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  summaryMonth:   { fontSize: 11, color: Colors.textMuted },

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
