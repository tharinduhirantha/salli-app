import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getPersonalHouseSummary, PersonHouseSummary, PersonUserSummary, getPaymentMethodTotals, PaymentMethodTotals, getDueRecurringPayments, getDueTransactions, DuePayment, DueUserOwes, markRecurringUserPaid, markTransactionPaid } from '../db/queries';
import { useHouse } from '../context/HouseContext';
import { monthLabel } from '../utils/date';
import { Colors, fmt, categoryColor } from '../utils/theme';
const USER_COLORS = [Colors.th, Colors.ma, Colors.user3, Colors.user4];
const USER_LIGHT  = [Colors.thLight, Colors.maLight, Colors.successLight, Colors.dangerLight];

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
  Loan:         'cash-outline',
  Rent:         'business-outline',
};

export default function StatusScreen() {
  const { currentHouse, month, goToPrevMonth, goToNextMonth } = useHouse();
  const [summary, setSummary]   = useState<PersonHouseSummary | null>(null);
  const [pmTotals, setPmTotals] = useState<PaymentMethodTotals>({
    Cash: { total: 0, due: 0 }, Card: { total: 0, due: 0 }, Account: { total: 0, due: 0 },
  });
  const [dueRec, setDueRec] = useState<DuePayment[]>([]);
  const [dueTx, setDueTx]   = useState<DuePayment[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    if (!currentHouse) return;
    setLoading(true);
    const [sum, pm, rec, tx] = await Promise.all([
      getPersonalHouseSummary(month, currentHouse.id),
      getPaymentMethodTotals(month, currentHouse.id),
      getDueRecurringPayments(month, currentHouse.id),
      getDueTransactions(month, currentHouse.id),
    ]);
    setSummary(sum);
    setPmTotals(pm);
    setDueRec(rec);
    setDueTx(tx);
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
              <PersonCard key={u.nickname} user={u} accentColor={Colors.navy} lightColor={Colors.primaryLight} />
            ))
          )}
          <SettlementCard
            totals={pmTotals}
            dueRecurring={dueRec}
            duePersonal={dueTx}
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
  { key: 'Account', label: 'Account', icon: 'wallet-outline', color: Colors.primary },
  { key: 'Card',    label: 'Card',    icon: 'card-outline',   color: Colors.ma      },
  { key: 'Cash',    label: 'Cash',    icon: 'cash-outline',   color: Colors.success },
];

function SettlementCard({ totals, dueRecurring, duePersonal, onMarkUserPaid }: {
  totals: PaymentMethodTotals;
  dueRecurring: DuePayment[];
  duePersonal: DuePayment[];
  onMarkUserPaid: (id: string, user: string, source: DuePayment['source']) => Promise<void>;
}) {
  const grandTotal = dueRecurring.reduce((s, p) => s + p.totalOwed, 0)
                   + duePersonal.reduce((s, p) => s + p.totalOwed, 0);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  // Group by payment method → user → { rec, per }
  const pmGroups = PM_CONFIG.map(pm => {
    const rec = dueRecurring.filter(p => p.paymentMethod === pm.key);
    const per = duePersonal.filter(p => p.paymentMethod === pm.key);

    // Collect unique users by nickname (consistent across both sources)
    const userMap: Record<string, { nickname: string; fullName: string; userKey: string }> = {};
    rec.forEach(p => p.userOwes.forEach(u => {
      if (!u.isPaid) userMap[u.nickname] = { nickname: u.nickname, fullName: u.fullName, userKey: u.userKey };
    }));
    per.forEach(p => p.userOwes.forEach(u => {
      userMap[u.nickname] = { nickname: u.nickname, fullName: u.fullName, userKey: u.userKey };
    }));

    const users = Object.values(userMap).map(user => {
      const userRec = rec.filter(p => p.userOwes.some(u => u.nickname === user.nickname && !u.isPaid));
      const userPer = per.filter(p => p.userOwes.some(u => u.nickname === user.nickname));
      const recTotal = userRec.reduce((sum, p) => {
        const share = p.userOwes.find(u => u.nickname === user.nickname);
        return sum + (share?.owes ?? 0);
      }, 0);
      const perTotal = userPer.reduce((sum, p) => sum + p.totalOwed, 0);
      return { ...user, userRec, userPer, recTotal, perTotal, userTotal: recTotal + perTotal };
    }).filter(u => u.userTotal > 0);

    const pmTotal = users.reduce((sum, u) => sum + u.userTotal, 0);
    return { ...pm, users, pmTotal };
  }).filter(g => g.pmTotal > 0);

  return (
    <>
      {/* Section label */}
      <Text style={s.settlementTitle}>Settlement</Text>
      <Text style={s.settlementDesc}>Outstanding amounts grouped by payment method and member. Tap Mark Paid to settle each item.</Text>

      {grandTotal === 0 ? (
        <View style={s.settlementAllSettled}>
          <Ionicons name="checkmark-circle-outline" size={22} color={Colors.success} />
          <Text style={s.settlementEmptyText}>All settled</Text>
        </View>
      ) : (
        pmGroups.map(g => (
          <View key={g.key} style={s.pmCard}>
            {/* Payment method header */}
            <View style={s.pmHeader}>
              <View style={s.pmIcon}>
                <Ionicons name={g.icon as any} size={17} color={Colors.navy} />
              </View>
              <Text style={s.pmLabel}>{g.label}</Text>
              <Text style={s.pmTotal}>{fmt(g.pmTotal)}</Text>
            </View>

            {/* Per-user rows */}
            {g.users.map((user, ui) => {
              const colKey = `${g.key}_${user.nickname}`;
              const isOpen = collapsed[colKey] === true;
              return (
              <View key={user.nickname} style={[s.userBlock, ui < g.users.length - 1 && s.userBlockBorder]}>
                {/* User header */}
                <TouchableOpacity style={s.userHeader} onPress={() => toggle(colKey)} activeOpacity={0.7}>
                  <View style={s.userIconBox}>
                    <Ionicons name="person" size={14} color={Colors.primary} />
                  </View>
                  <Text style={s.userHeaderName}>{user.fullName}</Text>
                  <Text style={s.userHeaderTotal}>{fmt(user.userTotal)}</Text>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} style={{ marginLeft: 6 }} />
                </TouchableOpacity>

                {/* Due Payments */}
                {isOpen && user.userRec.length > 0 && (
                  <View style={s.subBlock}>
                    <View style={s.subHeader}>
                      <View style={[s.subChip, { backgroundColor: Colors.primary + '15' }]}>
                        <Ionicons name="swap-horizontal-outline" size={13} color={Colors.primary} />
                        <Text style={[s.subChipText, { color: Colors.primary }]}>Due Payments</Text>
                      </View>
                      <Text style={s.subTotal}>{fmt(user.recTotal)}</Text>
                    </View>
                    {user.userRec.map((p, i) => {
                      const share    = p.userOwes.find(u => u.nickname === user.nickname)!;
                      const catColor = categoryColor[p.type] ?? Colors.textMuted;
                      const catIcon  = ICON_MAP[p.type] ?? 'help-circle-outline';
                      return (
                        <View key={p.id} style={[s.itemRow, s.itemIndent, i < user.userRec.length - 1 && s.itemBorder]}>
                          <View style={[s.catIconBox, { backgroundColor: catColor + '20' }]}>
                            <Ionicons name={catIcon as any} size={15} color={catColor} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.itemName}>{p.name}</Text>
                            <Text style={s.itemType}>{p.type}</Text>
                          </View>
                          <View style={s.itemRight}>
                            <Text style={[s.itemAmt, { color: '#4B5563' }]}>{fmt(share.owes)}</Text>
                            <TouchableOpacity
                              style={[s.settlementPaidBtn, { backgroundColor: Colors.navy }]}
                              onPress={() => onMarkUserPaid(p.id, share.userKey, p.source)}
                            >
                              <Ionicons name="checkmark-circle" size={12} color="#fff" />
                              <Text style={s.settlementPaidBtnText}>Mark Paid</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Personal */}
                {isOpen && user.userPer.length > 0 && (
                  <View style={[s.subBlock, user.userRec.length > 0 && s.subBlockDivider]}>
                    <View style={s.subHeader}>
                      <View style={[s.subChip, { backgroundColor: Colors.primary + '15' }]}>
                        <Ionicons name="person-outline" size={13} color={Colors.primary} />
                        <Text style={[s.subChipText, { color: Colors.primary }]}>Personal</Text>
                      </View>
                      <Text style={s.subTotal}>{fmt(user.perTotal)}</Text>
                    </View>
                    {user.userPer.map((p, i) => {
                      const catColor = categoryColor[p.type] ?? Colors.textMuted;
                      const catIcon  = ICON_MAP[p.type] ?? 'help-circle-outline';
                      return (
                        <View key={p.id} style={[s.itemRow, s.itemIndent, i < user.userPer.length - 1 && s.itemBorder]}>
                          <View style={[s.catIconBox, { backgroundColor: catColor + '20' }]}>
                            <Ionicons name={catIcon as any} size={15} color={catColor} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.itemName}>{p.name}</Text>
                            <Text style={s.itemType}>{p.type}</Text>
                          </View>
                          <View style={s.itemRight}>
                            <Text style={[s.itemAmt, { color: '#4B5563' }]}>{fmt(p.totalOwed)}</Text>
                            <TouchableOpacity
                              style={[s.settlementPaidBtn, { backgroundColor: Colors.navy }]}
                              onPress={() => onMarkUserPaid(p.id, p.userOwes[0].userKey, p.source)}
                            >
                              <Ionicons name="checkmark-circle" size={12} color="#fff" />
                              <Text style={s.settlementPaidBtnText}>Mark Paid</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
              );
            })}
          </View>
        ))
      )}
    </>
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

  settlementTitle:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  settlementDesc:        { fontSize: 12, color: Colors.textMuted, lineHeight: 18, marginBottom: 10 },
  settlementValue:       { fontSize: 15, fontWeight: '800' },
  settlementPaidBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  settlementPaidBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  settlementPaidBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  settlementAllSettled:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 },
  settlementEmptyText:   { fontSize: 14, fontWeight: '600', color: Colors.success },

  pmCard:   { borderRadius: 16, backgroundColor: Colors.card, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  pmHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: Colors.yellow },
  pmIcon:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
  pmLabel:  { flex: 1, fontSize: 14, fontWeight: '800', color: Colors.navy },
  pmTotal:  { fontSize: 14, fontWeight: '800', color: Colors.navy },

  subBlock:        { },
  subBlockDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  subHeader:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  subChip:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, flex: 1 },
  subChipText:     { fontSize: 13, fontWeight: '700' },
  subTotal:        { fontSize: 14, fontWeight: '800', color: Colors.navy },

  itemRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  itemIndent: { paddingLeft: 28 },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  itemName:   { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  itemType:   { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  itemRight:  { alignItems: 'flex-end', gap: 5 },
  itemAmt:    { fontSize: 12, fontWeight: '700' },
  btnRow:     { flexDirection: 'row', gap: 5 },
  catIconBox: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  subEmpty:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  subEmptyText:{ fontSize: 12, color: Colors.success, fontWeight: '600' },

  userBlock:       { backgroundColor: Colors.card },
  userBlockBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  userHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  userIconBox:     { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  userHeaderName:  { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  userHeaderTotal: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
});
