import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getYearlySummary, YearlyRow, getHouseMembers } from '../db/queries';
import { useHouse } from '../context/HouseContext';
import { currentYear } from '../utils/date';
import { Colors, fmt } from '../utils/theme';
const USER_COLORS = [Colors.th, Colors.ma, Colors.user3, Colors.user4];

export default function YearlyScreen() {
  const { currentHouse } = useHouse();
  const [year, setYear]   = useState(currentYear());
  const [rows, setRows]   = useState<YearlyRow[]>([]);
  const [members, setMembers] = useState<{ nickname: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentHouse) return;
    setLoading(true);
    const [data, m] = await Promise.all([
      getYearlySummary(year, currentHouse.id),
      getHouseMembers(currentHouse.id),
    ]);
    setRows(data);
    setMembers(m);
    setLoading(false);
  }, [year, currentHouse]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const activeRows  = rows.filter(r => r.total > 0);
  const totalYear   = activeRows.reduce((s, r) => s + r.total, 0);
  const avgMonth    = activeRows.length > 0 ? totalYear / activeRows.length : 0;

  // Aggregate per-user share for year
  const userYearShares: Record<string, number> = {};
  rows.forEach(r => r.userShares.forEach(u => {
    userYearShares[u.nickname] = (userYearShares[u.nickname] ?? 0) + u.share;
  }));

  return (
    <View style={styles.outer}>
      <View style={styles.monthCard}>
          <TouchableOpacity onPress={() => setYear(String(parseInt(year) - 1))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.yearLabel}>{year}</Text>
          <TouchableOpacity onPress={() => setYear(String(parseInt(year) + 1))} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      <View style={styles.whiteHalf}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
      {/* Year totals */}
      <View style={styles.yearCards}>
        <StatCard label="Total Spent" value={fmt(totalYear)} color={Colors.textPrimary} />
        <StatCard label="Avg / Month" value={fmt(avgMonth)} color={Colors.primary} />
      </View>
      {members.length >= 2 && (
        <View style={styles.yearCards}>
          {members.slice(0, 2).map((p, i) => (
            <StatCard key={p.nickname}
              label={`${p.nickname} Total`}
              value={fmt(userYearShares[p.nickname] ?? 0)}
              color={USER_COLORS[i]}
            />
          ))}
        </View>
      )}

      {/* Monthly table */}
      <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
      <View style={styles.tableCard}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.colMonth, styles.headerText]}>Month</Text>
          <Text style={[styles.colAmt, styles.headerText]}>Total</Text>
          {members.slice(0, 2).map((p, i) => (
            <Text key={p.nickname} style={[styles.colAmt, styles.headerText, { color: USER_COLORS[i] }]}>{p.nickname}</Text>
          ))}
        </View>
        {rows.map((row, i) => {
          const prev  = i > 0 ? rows[i - 1].total : 0;
          const delta = prev > 0 ? row.total - prev : 0;
          return (
            <View key={row.month} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
              <View style={styles.colMonth}>
                <Text style={styles.monthName}>{row.month}</Text>
                {delta !== 0 && (
                  <Text style={[styles.delta, { color: delta > 0 ? Colors.danger : Colors.success }]}>
                    {delta > 0 ? '▲' : '▼'} {fmt(Math.abs(delta))}
                  </Text>
                )}
              </View>
              <Text style={[styles.colAmt, row.total === 0 && styles.zeroText]}>
                {row.total > 0 ? fmt(row.total) : '—'}
              </Text>
              {members.slice(0, 2).map((p, j) => {
                const share = row.userShares.find(u => u.nickname === p.nickname)?.share ?? 0;
                return (
                  <Text key={p.nickname} style={[styles.colAmt, { color: USER_COLORS[j] }, share === 0 && styles.zeroText]}>
                    {share > 0 ? fmt(share) : '—'}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>

      {/* Category totals for the year */}
      <Text style={styles.sectionTitle}>Category Totals ({year})</Text>
      <View style={styles.card}>
        {([
          { label: 'Home / Mortgage', key: 'homePay' },
          { label: 'Car Payments',   key: 'carPay' },
          { label: 'Bills',          key: 'bills' },
          { label: 'Household',      key: 'household' },
          { label: 'Food',           key: 'food' },
          { label: 'Car Expenses',   key: 'carExpense' },
          { label: 'Subscriptions',  key: 'subscriptions' },
          { label: 'Fun',            key: 'fun' },
        ] as { label: string; key: keyof YearlyRow }[]).map((item, i, arr) => {
          const total = rows.reduce((s, r) => s + ((r[item.key] as number) ?? 0), 0);
          if (total === 0) return null;
          return (
            <View key={item.key} style={[styles.catRow, i < arr.length - 1 && styles.divider]}>
              <Text style={styles.catLabel}>{item.label}</Text>
              <Text style={styles.catValue}>{fmt(total)}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
      </View>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer:      { flex: 1 },
  topHalf:    { flex: 1, justifyContent: 'flex-end', zIndex: 2 },
  whiteHalf:  { flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 36, overflow: 'hidden', zIndex: 1 },
  content:    { padding: 16, paddingBottom: 40 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthCard:  { alignSelf: 'center', width: '44%', marginTop: 6, marginBottom: -16, zIndex: 2, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navBtn:     { padding: 6 },
  yearLabel:  { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginHorizontal: 10 },
  yearCards:    { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard:     { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statLabel:    { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  statValue:    { fontSize: 18, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10, marginTop: 8 },
  tableCard:    { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  tableRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  tableRowAlt:  { backgroundColor: '#F8FAFC' },
  tableHeader:  { backgroundColor: Colors.bg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerText:   { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  colMonth:     { width: 64 },
  colAmt:       { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  monthName:    { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  delta:        { fontSize: 10, marginTop: 1 },
  zeroText:     { color: Colors.textMuted },
  card:         { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  catRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  divider:      { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catLabel:     { fontSize: 14, color: Colors.textSecondary },
  catValue:     { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
