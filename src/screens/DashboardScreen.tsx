import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMonthlySummary, getCategories, MonthlySummary, CatRow } from '../db/queries';
import { supabase } from '../lib/supabase';
import { useHouse } from '../context/HouseContext';
import { monthLabel } from '../utils/date';
import { Colors, fmt } from '../utils/theme';
const USER_COLORS = [Colors.th, Colors.ma, Colors.user3, Colors.user4];
const USER_LIGHT  = [Colors.thLight, Colors.maLight, Colors.user3Light, Colors.user4Light];

interface TxRow { date: string; owner: string; category: string; description: string; amount: number; }
interface RecRow { type: string; th_paid: number; ma_paid: number; }
interface PaidGroup { label: string; total: number; }

export default function DashboardScreen() {
  const { currentHouse, month, goToPrevMonth, goToNextMonth } = useHouse();
  const [summary, setSummary]   = useState<MonthlySummary | null>(null);
  const [txns, setTxns]         = useState<TxRow[]>([]);
  const [recRows, setRecRows]   = useState<RecRow[]>([]);
  const [iconMap, setIconMap]   = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [selectedCat, setSelectedCat]   = useState<CatRow | null>(null);
  const [userPopup, setUserPopup] = useState<{
    name: string; color: string; bgColor: string; groups: PaidGroup[]; paid: number;
  } | null>(null);

  const load = useCallback(async () => {
    if (!currentHouse) return;
    setLoading(true);
    try {
      const [s, txResult, recResult, cats] = await Promise.all([
        getMonthlySummary(month, currentHouse.id),
        supabase
          .from('transactions')
          .select('date, owner, category, description, amount')
          .eq('month', month)
          .eq('house_id', currentHouse.id)
          .order('date', { ascending: true }),
        supabase
          .from('recurring_payments')
          .select('type, th_paid, ma_paid')
          .eq('month', month)
          .eq('house_id', currentHouse.id),
        getCategories(currentHouse.id),
      ]);
      setSummary(s);
      setTxns(txResult.data ?? []);
      setRecRows(recResult.data ?? []);
      const map: Record<string, string> = {};
      cats.forEach(c => { map[c.name] = c.icon; });
      setIconMap(map);
    } catch (e) {
      console.error('Dashboard load error:', e);
      setSummary({ categories: [], total: 0, users: [], settlement: 0 });
    } finally {
      setLoading(false);
    }
  }, [month, currentHouse]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !summary) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FFFFFF" /></View>;
  }

  const u1 = summary.users[0];
  const u2 = summary.users[1];
  const owesAmt  = Math.abs(summary.settlement);
  const owesFrom = summary.settlement > 0 ? u2 : u1;
  const owesTo   = summary.settlement > 0 ? u1 : u2;

  // Group transactions by category (exclude Personal)
  const txByCategory: Record<string, TxRow[]> = {};
  txns.filter(t => t.category !== 'Personal').forEach(t => {
    if (!txByCategory[t.category]) txByCategory[t.category] = [];
    txByCategory[t.category].push(t);
  });

  // Compute paid groups per user: transaction categories + recurring payment types
  const paidGroupsByUser: PaidGroup[][] = summary.users.map((u, i) => {
    const groups: PaidGroup[] = [];
    const seen: Record<string, number> = {};

    txns.filter(t => t.category !== 'Personal' && t.owner === u.nickname).forEach(t => {
      if (seen[t.category] === undefined) {
        seen[t.category] = groups.length;
        groups.push({ label: t.category, total: t.amount });
      } else {
        groups[seen[t.category]].total += t.amount;
      }
    });

    recRows.forEach(r => {
      const amt = i === 0 ? r.th_paid : r.ma_paid;
      if (amt > 0) {
        if (seen[r.type] === undefined) {
          seen[r.type] = groups.length;
          groups.push({ label: r.type, total: amt });
        } else {
          groups[seen[r.type]].total += amt;
        }
      }
    });

    return groups;
  });

  const houseName = currentHouse?.name ?? 'House';

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
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
      {/* Total expenses card */}
      <View style={[styles.card, styles.totalCard]}>
        <Text style={styles.totalLabel}>Total {houseName} Expenses</Text>
        <Text style={styles.totalAmount}>{fmt(summary.total)}</Text>
        {summary.total > 0 && summary.users.length >= 2 && (
          <>
            <View style={styles.splitBar}>
              {summary.users.map((u, i) => (
                <View key={u.nickname} style={[styles.splitSeg, { flex: u.share, backgroundColor: USER_COLORS[i] }]} />
              ))}
            </View>
            <View style={styles.splitLegend}>
              {summary.users.map((u, i) => (
                <View key={u.nickname} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: USER_COLORS[i] }]} />
                  <Text style={styles.legendText}>{u.fullName} · {fmt(u.share)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Person cards */}
      {summary.users.length === 0 ? (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
          <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
          <Text style={{ color: Colors.textMuted, marginTop: 8 }}>No household members yet</Text>
        </View>
      ) : (
        <View style={styles.row}>
          {summary.users.map((u, i) => (
            <PersonCard
              key={u.nickname}
              name={u.fullName}
              color={USER_COLORS[i]}
              bgColor={USER_LIGHT[i]}
              totalExpenses={u.share}
              paid={u.paid}
              onPress={() => setUserPopup({
                name: u.fullName,
                color: USER_COLORS[i],
                bgColor: USER_LIGHT[i],
                groups: paidGroupsByUser[i] ?? [],
                paid: u.paid,
              })}
            />
          ))}
        </View>
      )}

      {/* Settlement banner */}
      {owesAmt > 0.01 && owesFrom && owesTo && (
        <View style={[styles.settlementCard, { borderColor: USER_COLORS[summary.settlement > 0 ? 1 : 0] + '40' }]}>
          <Ionicons name="swap-horizontal" size={20} color={Colors.navy} style={{ marginRight: 8 }} />
          <Text style={styles.settlementText}>
            <Text style={[styles.settlementName, { color: USER_COLORS[summary.settlement > 0 ? 1 : 0] }]}>{owesFrom.fullName}</Text>
            <Text style={styles.settlementOwes}> owes </Text>
            <Text style={[styles.settlementName, { color: USER_COLORS[summary.settlement > 0 ? 0 : 1] }]}>{owesTo.fullName}</Text>
            <Text style={styles.settlementOwes}> · </Text>
            <Text style={[styles.settlementAmt, { color: USER_COLORS[summary.settlement > 0 ? 1 : 0] }]}>{fmt(owesAmt)}</Text>
          </Text>
        </View>
      )}

      {/* Category breakdown */}
      <Text style={styles.sectionTitle}>Category Breakdown</Text>
      <View style={styles.card}>
        {summary.categories.map((row, i) => (
          <TouchableOpacity
            key={row.label}
            style={[styles.catRow, i < summary.categories.length - 1 && styles.divider]}
            onPress={() => setSelectedCat(row)}
            activeOpacity={0.7}
          >
            <View style={styles.catIconWrap}>
              <Ionicons name={(iconMap[row.label] ?? 'help-circle-outline') as any} size={18} color={Colors.navy} />
            </View>
            <Text style={[styles.catLabel, { flex: 1 }]}>{row.label}</Text>
            <View style={styles.catRight}>
              <Text style={styles.catTotal}>{fmt(row.total)}</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginTop: 2 }} />
            </View>
          </TouchableOpacity>
        ))}
        {summary.categories.length === 0 && (
          <Text style={styles.emptyText}>No expenses this month</Text>
        )}
      </View>

      {/* Category detail popup */}
      <CategoryPopup
        row={selectedCat}
        txns={selectedCat ? (txByCategory[selectedCat.label] ?? []) : []}
        iconMap={iconMap}
        onClose={() => setSelectedCat(null)}
      />

    </ScrollView>

      {/* Paid breakdown popup */}
      <PaidGroupsPopup data={userPopup} onClose={() => setUserPopup(null)} />
      </View>
    </View>
  );
}

function PersonCard({ name, color, bgColor, totalExpenses, paid, onPress }: {
  name: string; color: string; bgColor: string;
  totalExpenses: number; paid: number; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.personCard, { borderTopColor: color }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.personName, { color }]} numberOfLines={1}>{name}</Text>

      <View style={[styles.pill, { backgroundColor: bgColor }]}>
        <Text style={[styles.pillLabel, { color }]}>Total Expenses</Text>
        <Text style={[styles.pillValue, { color }]}>{fmt(totalExpenses)}</Text>
      </View>

      <View style={styles.miniRow}>
        <Text style={styles.miniLabel}>Paid</Text>
        <View style={styles.miniRowRight}>
          <Text style={[styles.miniValue, styles.green]}>{fmt(paid)}</Text>
          <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} style={{ marginLeft: 4 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PaidGroupsPopup({ data, onClose }: {
  data: { name: string; color: string; bgColor: string; groups: PaidGroup[]; paid: number } | null;
  onClose: () => void;
}) {
  if (!data) return null;
  const { name, color, bgColor, groups, paid } = data;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.popupOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.paidPopupCard} onPress={() => {}}>
          {/* Header */}
          <View style={[styles.paidPopupHeader, { borderBottomColor: color }]}>
            <View style={[styles.paidPopupBadge, { backgroundColor: bgColor }]}>
              <Text style={[styles.paidPopupName, { color }]}>{name}</Text>
            </View>
            <Text style={styles.paidPopupTitle}>Paid Breakdown</Text>
            <TouchableOpacity onPress={onClose} style={styles.paidPopupClose}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Category rows */}
          <ScrollView style={styles.paidPopupScroll} showsVerticalScrollIndicator={false}>
            {groups.length === 0 ? (
              <Text style={styles.paidPopupEmpty}>No payments recorded</Text>
            ) : (
              groups.map((g, i) => (
                <View key={g.label} style={[styles.paidGroupRow, i < groups.length - 1 && styles.paidGroupBorder]}>
                  <Text style={styles.paidGroupLabel}>{g.label}</Text>
                  <Text style={[styles.paidGroupAmt, { color }]}>{fmt(g.total)}</Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Total */}
          <View style={[styles.paidPopupFooter, { backgroundColor: bgColor }]}>
            <Text style={[styles.paidPopupFooterLabel, { color }]}>Total Paid</Text>
            <Text style={[styles.paidPopupFooterAmt, { color }]}>{fmt(paid)}</Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function CategoryPopup({ row, txns, iconMap, onClose }: {
  row: CatRow | null;
  txns: TxRow[];
  iconMap: Record<string, string>;
  onClose: () => void;
}) {
  if (!row) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.popupOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.popupCard} onPress={() => {}}>
          {/* Header */}
          <View style={styles.popupHeader}>
            <View style={styles.catIconWrap}>
              <Ionicons name={(iconMap[row.label] ?? 'help-circle-outline') as any} size={18} color={Colors.navy} />
            </View>
            <Text style={styles.popupTitle}>{row.label}</Text>
            <Text style={styles.popupTotal}>{fmt(row.total)}</Text>
          </View>

          {/* Per-user shares */}
          <View style={styles.popupShares}>
            {row.userPays.map((up, j) => (
              <View key={up.nickname} style={[styles.popupShareChip, { backgroundColor: USER_COLORS[j] + '18' }]}>
                <Text style={[styles.popupShareNick, { color: USER_COLORS[j] }]}>{up.nickname} Owns</Text>
                <Text style={[styles.popupShareAmt, { color: USER_COLORS[j] }]}>{fmt(up.amount)}</Text>
              </View>
            ))}
          </View>

          {/* Transactions */}
          {txns.length > 0 && (
            <>
              <View style={styles.popupDivider} />
              {txns.map((t, i) => (
                <View key={i} style={styles.popupTxRow}>
                  <Text style={styles.popupTxDate}>{t.date.slice(5)}</Text>
                  <Text style={styles.popupTxDesc} numberOfLines={1}>{t.description}</Text>
                  <Text style={styles.popupTxAmt}>{fmt(t.amount)}</Text>
                  <Text style={styles.popupTxOwner}>{t.owner}</Text>
                </View>
              ))}
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  outer:        { flex: 1 },
  topHalf:      { flex: 1, justifyContent: 'flex-end', zIndex: 2 },
  whiteHalf:    { flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, overflow: 'hidden', zIndex: 1 },
  content:      { padding: 16, paddingBottom: 32 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  monthCard:    { alignSelf: 'center', width: '44%', marginTop: 6, marginBottom: -16, zIndex: 2, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navBtn:       { padding: 6 },
  monthLabel:   { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 10 },

  card:         { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  totalCard:    { alignItems: 'center' },
  totalLabel:   { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  totalAmount:  { fontSize: 36, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12 },
  splitBar:     { flexDirection: 'row', height: 6, borderRadius: 4, overflow: 'hidden', width: '100%', marginBottom: 8 },
  splitSeg:     { height: 6 },
  splitLegend:  { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  legendText:   { fontSize: 12, color: Colors.textSecondary },

  row:          { flexDirection: 'row', gap: 12, marginBottom: 16 },
  personCard:   { flex: 1, backgroundColor: Colors.card, borderRadius: 16, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  personName:   { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  pill:         { borderRadius: 10, padding: 8, marginBottom: 8, alignItems: 'center' },
  pillLabel:    { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  pillValue:    { fontSize: 15, fontWeight: '800' },
  miniRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  miniRowRight: { flexDirection: 'row', alignItems: 'center' },
  miniLabel:    { fontSize: 11, color: Colors.textSecondary },
  miniValue:    { fontSize: 11, fontWeight: '600' },
  green:        { color: Colors.success },
  paidTxRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingLeft: 4 },
  paidTxDesc:   { fontSize: 10, color: Colors.textSecondary, flex: 1, marginRight: 6 },
  paidTxAmt:    { fontSize: 10, fontWeight: '600', color: Colors.textPrimary },

  settlementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1.5 },
  settlementText: { flex: 1, flexWrap: 'wrap' },
  settlementName: { fontSize: 14, fontWeight: '800' },
  settlementOwes: { fontSize: 14, color: Colors.textSecondary },
  settlementAmt:  { fontSize: 14, fontWeight: '800' },

  sectionTitle:   { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },

  catIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  divider:   { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  catRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catLabel:  { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  catTotal:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  emptyText: { color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },

  popupOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  popupCard:       { width: '100%', backgroundColor: Colors.card, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  popupHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  popupTitle:      { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  popupTotal:      { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  popupShares:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  popupShareChip:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  popupShareNick:  { fontSize: 12, fontWeight: '700' },
  popupShareAmt:   { fontSize: 13, fontWeight: '800' },
  popupDivider:    { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  popupTxRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: 8 },
  popupTxDate:     { fontSize: 10, color: Colors.textMuted, width: 30 },
  popupTxDesc:     { flex: 1, fontSize: 12, color: Colors.textSecondary },
  popupTxAmt:      { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  popupTxOwner:    { fontSize: 10, color: Colors.textMuted, width: 28, textAlign: 'right' },

  paidPopupCard:        { width: '100%', backgroundColor: Colors.card, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  paidPopupHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 2 },
  paidPopupBadge:       { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  paidPopupName:        { fontSize: 13, fontWeight: '800' },
  paidPopupTitle:       { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  paidPopupClose:       { padding: 4 },
  paidPopupScroll:      { maxHeight: 320, paddingHorizontal: 16 },
  paidPopupEmpty:       { textAlign: 'center', color: Colors.textMuted, paddingVertical: 24, fontSize: 13 },
  paidGroupRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
  paidGroupBorder:      { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  paidGroupLabel:       { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  paidGroupAmt:         { fontSize: 14, fontWeight: '700' },
  paidPopupFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  paidPopupFooterLabel: { fontSize: 13, fontWeight: '600' },
  paidPopupFooterAmt:   { fontSize: 16, fontWeight: '800' },
});
