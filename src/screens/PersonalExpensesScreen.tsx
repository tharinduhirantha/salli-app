import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPersonalHouseSummary, PersonHouseSummary, PersonUserSummary, getPaymentMethodTotals, PaymentMethodTotals, getDueRecurringPayments, getDueTransactions, DuePayment, DueUserOwes, markRecurringUserPaid, markTransactionPaid } from '../db/queries';
import { useHouse } from '../context/HouseContext';
import { monthLabel } from '../utils/date';
import { Colors, fmt } from '../utils/theme';
const USER_COLORS = [Colors.th, Colors.ma, Colors.user3, Colors.user4];
const USER_LIGHT  = [Colors.thLight, Colors.maLight, Colors.successLight, Colors.dangerLight];

export default function StatusScreen() {
  const { currentHouse, month, goToPrevMonth, goToNextMonth } = useHouse();
  const [summary, setSummary]   = useState<PersonHouseSummary | null>(null);
  const [pmTotals, setPmTotals] = useState<PaymentMethodTotals>({
    Cash: { total: 0, due: 0 }, Card: { total: 0, due: 0 }, Account: { total: 0, due: 0 },
  });
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!currentHouse) return;
    setLoading(true);
    const [sum, pm, dueRec, dueTx] = await Promise.all([
      getPersonalHouseSummary(month, currentHouse.id),
      getPaymentMethodTotals(month, currentHouse.id),
      getDueRecurringPayments(month, currentHouse.id),
      getDueTransactions(month, currentHouse.id),
    ]);
    setSummary(sum);
    setPmTotals(pm);
    setDuePayments([...dueRec, ...dueTx]);
    setLoading(false);
  }, [month, currentHouse]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!summary) return null;

  return (
    <View style={s.outer}>
      <View style={s.monthCard}>
          <TouchableOpacity onPress={goToPrevMonth} style={s.navBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{monthLabel(month)}</Text>
          <TouchableOpacity onPress={goToNextMonth} style={s.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      <View style={s.whiteHalf}>
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {summary.users.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, marginTop: 12 }}>No household members yet</Text>
            </View>
          ) : (
            summary.users.map((u, i) => (
              <PersonCard key={u.nickname} user={u} accentColor={USER_COLORS[i] ?? Colors.primary} lightColor={USER_LIGHT[i] ?? Colors.successLight} />
            ))
          )}
          <SettlementCard
            totals={pmTotals}
            duePayments={duePayments}
            onMarkUserPaid={async (id, user, source) => {
              if (source === 'transaction') await markTransactionPaid(id);
              else await markRecurringUserPaid(id, user);
              load();
            }}
          />
        </ScrollView>
      </View>
    </View>
  );
}

function PersonCard({ user, accentColor, lightColor }: {
  user: PersonUserSummary; accentColor: string; lightColor: string;
}) {
  return (
    <View style={s.card}>
      <View style={[s.cardHeader, { backgroundColor: accentColor }]}>
        <View style={s.cardBadge}>
          <Text style={s.cardBadgeText}>{user.nickname}</Text>
        </View>
        <Text style={s.cardName}>{user.fullName}</Text>
      </View>

      <View style={s.cardBody}>
        <SectionLabel text="HOUSE EXPENSES" color={accentColor} />
        <StatPair total={user.houseNeeds} pending={user.housePending} accentColor={accentColor} />

        <View style={s.divider} />

        <SectionLabel text="PERSONAL EXPENSES" color={accentColor} />
        <StatPair total={user.personalTotal} pending={user.personalPending} accentColor={accentColor} />

        <View style={s.divider} />

        <View style={[s.grandBlock, { backgroundColor: lightColor }]}>
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>Grand Total</Text>
            <Text style={[s.grandValue, { color: accentColor }]}>{fmt(user.grandTotal)}</Text>
          </View>
          <Text style={s.grandHint}>Personal + House Share</Text>
        </View>
      </View>
    </View>
  );
}

function SectionLabel({ text, color }: { text: string; color: string }) {
  return <Text style={[s.sectionLabel, { color }]}>{text}</Text>;
}

const PM_CONFIG: { key: string; label: string; icon: string; color: string }[] = [
  { key: 'Account', label: 'Account', icon: 'wallet-outline',  color: Colors.primary },
  { key: 'Card',    label: 'Card',    icon: 'card-outline',    color: Colors.ma      },
  { key: 'Cash',    label: 'Cash',    icon: 'cash-outline',    color: Colors.success },
];

function SettlementCard({ totals, duePayments, onMarkUserPaid }: {
  totals: PaymentMethodTotals;
  duePayments: DuePayment[];
  onMarkUserPaid: (id: string, user: string, source: DuePayment['source']) => Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = PM_CONFIG
    .map(pm => {
      const items = duePayments.filter(p => p.paymentMethod === pm.key);
      return {
        ...pm,
        items,
        due: items.reduce((sum, p) => sum + p.totalOwed, 0),
      };
    })
    .filter(g => g.items.length > 0);

  const toggle = (key: string) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <View style={s.settlementCard}>
      <View style={s.settlementHeader}>
        <Ionicons name="swap-horizontal-outline" size={18} color={Colors.primary} />
        <Text style={s.settlementTitle}>Due Payments</Text>
      </View>
      {groups.length === 0 ? (
        <View style={s.settlementEmpty}>
          <Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />
          <Text style={s.settlementEmptyText}>All settled</Text>
        </View>
      ) : (
        groups.map((g, gi) => {
          const isCollapsed = collapsed[g.key] !== false; // default collapsed
          return (
            <View key={g.key} style={gi < groups.length - 1 && s.settlementGroupBorder}>
              {/* Group header */}
              <TouchableOpacity
                style={s.settlementGroupHeader}
                onPress={() => toggle(g.key)}
                activeOpacity={0.7}
              >
                <View style={[s.settlementIcon, { backgroundColor: g.color + '18' }]}>
                  <Ionicons name={g.icon as any} size={18} color={g.color} />
                </View>
                <Text style={[s.settlementLabel, { flex: 1 }]}>{g.label}</Text>
                <Text style={[s.settlementValue, { color: Colors.danger, marginRight: 8 }]}>{fmt(g.due)}</Text>
                <Ionicons
                  name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>

              {/* Expanded items */}
              {!isCollapsed && g.items.map((p, i) => (
                <View key={p.id} style={[s.settlementRow, s.settlementItemIndent, i < g.items.length - 1 && s.settlementRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.settlementItemName}>{p.name}</Text>
                    <Text style={s.settlementItemType}>{p.type}</Text>
                  </View>
                  <View style={s.settlementBtnCol}>
                    <Text style={[s.settlementValue, { color: Colors.danger, textAlign: 'right', marginBottom: 6 }]}>{fmt(p.totalOwed)}</Text>
                    <View style={s.settlementUserBtns}>
                      {p.userOwes.map((u, ui) => (
                        u.isPaid ? (
                          <View key={u.userKey} style={[s.settlementPaidBadge, { backgroundColor: Colors.successLight }]}>
                            <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                            <Text style={[s.settlementPaidBtnText, { color: Colors.success }]}>{u.nickname} Paid</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            key={u.userKey}
                            style={[s.settlementPaidBtn, { backgroundColor: USER_COLORS[ui] ?? Colors.primary }]}
                            onPress={() => onMarkUserPaid(p.id, u.userKey, p.source)}
                          >
                            <Ionicons name="checkmark-circle" size={12} color="#fff" />
                            <Text style={s.settlementPaidBtnText}>{u.nickname} Mark Paid</Text>
                          </TouchableOpacity>
                        )
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          );
        })
      )}
    </View>
  );
}

function StatPair({ total, pending, accentColor }: { total: number; pending: number; accentColor: string }) {
  return (
    <View style={s.statRow}>
      <View style={s.statItem}>
        <Text style={s.statLabel}>Total</Text>
        <Text style={[s.statValue, { color: accentColor }]}>{fmt(total)}</Text>
      </View>
      <View style={s.statDivider} />
      <View style={s.statItem}>
        <Text style={s.statLabel}>Pending</Text>
        <Text style={[s.statValue, { color: pending > 0 ? Colors.ma : Colors.success }]}>{fmt(Math.max(pending, 0))}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outer:      { flex: 1 },
  topHalf:    { flex: 1, justifyContent: 'flex-end', zIndex: 2 },
  whiteHalf:  { flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 36, overflow: 'hidden', zIndex: 1 },
  monthCard:  { alignSelf: 'center', width: '44%', marginTop: 6, marginBottom: -16, zIndex: 2, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navBtn:     { padding: 6 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 10 },
  content:    { padding: 12, paddingBottom: 40, gap: 12 },
  card:            { borderRadius: 20, backgroundColor: Colors.card, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  cardHeader:      { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardBadge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.25)' },
  cardBadgeText:   { fontSize: 11, fontWeight: '800', color: '#fff' },
  cardName:        { fontSize: 15, fontWeight: '800', color: '#fff' },
  cardHeaderRight: { alignItems: 'flex-end' },
  salaryLabel:     { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginBottom: 1 },
  salaryValue:     { fontSize: 13, fontWeight: '700', color: '#fff' },
  cardBody:        { padding: 12, gap: 2 },
  sectionLabel:    { fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4, marginTop: 2 },
  statRow:         { flexDirection: 'row', backgroundColor: Colors.bg, borderRadius: 10, overflow: 'hidden', marginBottom: 2 },
  statItem:        { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statDivider:     { width: 1, backgroundColor: Colors.border },
  statLabel:       { fontSize: 9, color: Colors.textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue:       { fontSize: 14, fontWeight: '800' },
  divider:         { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  grandBlock:      { borderRadius: 10, padding: 10, marginTop: 2 },
  grandRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandLabel:      { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  grandValue:      { fontSize: 15, fontWeight: '800' },
  grandHint:       { fontSize: 9, color: Colors.textMuted, marginTop: 1 },

  settlementCard:       { borderRadius: 20, backgroundColor: Colors.card, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  settlementHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  settlementTitle:      { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  settlementRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  settlementRowBorder:  { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  settlementIcon:       { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  settlementLabel:      { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  settlementValue:        { fontSize: 15, fontWeight: '800' },
  settlementGroupHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settlementGroupBorder:  { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  settlementItemIndent:   { paddingLeft: 28, backgroundColor: Colors.bg },
  settlementItemName:     { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  settlementItemType:     { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  settlementBtnCol:       { alignItems: 'flex-end' },
  settlementUserBtns:     { flexDirection: 'row', gap: 6 },
  settlementPaidBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  settlementPaidBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  settlementPaidBtnText:  { fontSize: 11, fontWeight: '700', color: '#fff' },
  settlementOwes:         { flexDirection: 'row', gap: 10, marginTop: 3 },
  settlementOwesText:     { fontSize: 12, fontWeight: '600' },
  settlementEmpty:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  settlementEmptyText:    { fontSize: 14, fontWeight: '600', color: Colors.success },
});
