import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated,
  TouchableOpacity, RefreshControl, Platform,
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
  const [rows, setRows]       = useState<YearlyRow[]>([]);
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

  if (loading) return <YearlyLoader />;

  const activeRows  = rows.filter(r => r.total > 0);
  const totalYear   = activeRows.reduce((s, r) => s + r.total, 0);
  const avgMonth    = activeRows.length > 0 ? totalYear / activeRows.length : 0;

  const lastRow = activeRows[activeRows.length - 1];
  const prevRow = activeRows[activeRows.length - 2];

  const CAT_ITEMS = [
    { label: 'Home / Mortgage', key: 'homePay' as keyof YearlyRow },
    { label: 'Car Payments',    key: 'carPay' as keyof YearlyRow },
    { label: 'Bills',           key: 'bills' as keyof YearlyRow },
    { label: 'Household',       key: 'household' as keyof YearlyRow },
    { label: 'Food',            key: 'food' as keyof YearlyRow },
    { label: 'Car Expenses',    key: 'carExpense' as keyof YearlyRow },
    { label: 'Subscriptions',   key: 'subscriptions' as keyof YearlyRow },
    { label: 'Fun',             key: 'fun' as keyof YearlyRow },
  ];

  // ── Insight 1: Essential vs Discretionary ──
  const essentialTotal     = activeRows.reduce((s, r) => s + r.homePay + r.carPay + r.bills + r.household, 0);
  const discretionaryTotal = activeRows.reduce((s, r) => s + r.food + r.carExpense + r.subscriptions + r.fun, 0);
  const splitBase          = essentialTotal + discretionaryTotal;
  const essentialPct       = splitBase > 0 ? Math.round((essentialTotal / splitBase) * 100) : 0;
  const discretionaryPct   = splitBase > 0 ? 100 - essentialPct : 0;

  // ── Insight 2: 3-month rolling trend ──
  const last3          = activeRows.slice(-3);
  const prev3          = activeRows.slice(-6, -3);
  const last3Avg       = last3.length > 0 ? last3.reduce((s, r) => s + r.total, 0) / last3.length : 0;
  const prev3Avg       = prev3.length > 0 ? prev3.reduce((s, r) => s + r.total, 0) / prev3.length : 0;
  const trendDiff      = last3Avg - prev3Avg;
  const trendPct       = prev3Avg > 0 ? Math.round((trendDiff / prev3Avg) * 100) : 0;
  const trendMonths    = activeRows.slice(-6);
  const maxMonthTotal  = Math.max(...trendMonths.map(r => r.total), 1);

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

      {/* ── Spending Insights ── */}
      {activeRows.length >= 2 && (
        <>
          <Text style={[styles.sectionTitle, { marginBottom: 10, marginTop: 4 }]}>Spending Insights</Text>

          {/* 1. Essential vs Discretionary split */}
          {splitBase > 0 && (
            <View style={[styles.card, { marginBottom: 12 }]}>
              <Text style={styles.insightLabel}>SPENDING SPLIT</Text>
              <View style={styles.splitBar}>
                <View style={[styles.splitBarEss, { flex: essentialPct }]} />
                <View style={[styles.splitBarDisc, { flex: discretionaryPct }]} />
              </View>
              <View style={styles.splitLegend}>
                <View style={styles.splitLegendItem}>
                  <View style={[styles.splitDot, { backgroundColor: Colors.primary }]} />
                  <View>
                    <Text style={styles.splitPct}>{essentialPct}%</Text>
                    <Text style={styles.splitLegendLabel}>Essential</Text>
                    <Text style={styles.splitAmt}>{fmt(essentialTotal)}</Text>
                  </View>
                </View>
                <View style={styles.splitLegendItem}>
                  <View style={[styles.splitDot, { backgroundColor: Colors.warning }]} />
                  <View>
                    <Text style={[styles.splitPct, { color: discretionaryPct > 45 ? Colors.danger : discretionaryPct > 30 ? Colors.warning : Colors.success }]}>
                      {discretionaryPct}%
                    </Text>
                    <Text style={styles.splitLegendLabel}>Discretionary</Text>
                    <Text style={styles.splitAmt}>{fmt(discretionaryTotal)}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.insightHint}>
                {discretionaryPct <= 25 ? '✓ Excellent — very controlled discretionary spending'
                  : discretionaryPct <= 35 ? '✓ Good — healthy spending balance'
                  : discretionaryPct <= 45 ? '⚠ Discretionary spend is getting high'
                  : '⚠ Discretionary exceeds essential — review habits'}
              </Text>
            </View>
          )}

          {/* 2. 3-month rolling trend */}
          {last3.length >= 2 && (
            <View style={[styles.card, { marginBottom: 12 }]}>
              <View style={styles.trendHeader}>
                <View>
                  <Text style={styles.insightLabel}>3-MONTH TREND</Text>
                  <Text style={styles.trendAvg}>
                    {fmt(last3Avg)}{' '}
                    <Text style={styles.trendAvgLabel}>avg / month</Text>
                  </Text>
                </View>
                {prev3.length > 0 && (
                  <View style={[styles.trendBadge, { backgroundColor: trendDiff > 0 ? Colors.danger + '18' : Colors.success + '18' }]}>
                    <Text style={[styles.trendBadgeText, { color: trendDiff > 0 ? Colors.danger : Colors.success }]}>
                      {trendDiff > 0 ? '↑' : '↓'} {Math.abs(trendPct)}%
                    </Text>
                    <Text style={styles.trendBadgeHint}>vs prev 3 mo</Text>
                  </View>
                )}
              </View>
              {trendMonths.length >= 2 && (
                <View style={styles.miniChart}>
                  {trendMonths.map((r, i) => {
                    const isRecent = i >= trendMonths.length - 3;
                    return (
                      <View key={r.month} style={styles.miniBarWrap}>
                        <View style={[styles.miniBar, {
                          height: Math.max(4, (r.total / maxMonthTotal) * 44),
                          backgroundColor: isRecent ? Colors.primary : Colors.navyLight,
                          opacity: isRecent ? 1 : 0.5,
                        }]} />
                        <Text style={styles.miniBarLabel}>{r.month.slice(0, 1)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </>
      )}

      {/* Monthly table */}
      <Text style={[styles.sectionTitle, { marginBottom: 10, marginTop: 8 }]}>Monthly Breakdown</Text>
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
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Category Totals ({year})</Text>
        {lastRow && prevRow && (
          <Text style={styles.deltaHint}>vs {prevRow.month} → {lastRow.month}</Text>
        )}
      </View>
      <View style={styles.card}>
        {CAT_ITEMS.map((item, i, arr) => {
          const total   = rows.reduce((s, r) => s + ((r[item.key] as number) ?? 0), 0);
          if (total === 0) return null;
          const pct     = totalYear > 0 ? Math.round((total / totalYear) * 100) : 0;
          const lastVal = lastRow ? ((lastRow[item.key] as number) ?? 0) : 0;
          const prevVal = prevRow ? ((prevRow[item.key] as number) ?? 0) : 0;
          const delta   = lastRow ? lastVal - prevVal : 0;
          return (
            <View key={item.key} style={[styles.catRow, i < arr.length - 1 && styles.divider]}>
              <View style={styles.catLabelWrap}>
                <Text style={styles.catLabel}>{item.label}</Text>
                <View style={styles.catBarTrack}>
                  <View style={[styles.catBarFill, { width: `${pct}%` as any }]} />
                </View>
              </View>
              <View style={styles.catRight}>
                <View style={styles.catValueRow}>
                  <Text style={styles.catValue}>{fmt(total)}</Text>
                  <View style={styles.catPctBadge}>
                    <Text style={styles.catPctText}>{pct}%</Text>
                  </View>
                </View>
                {delta !== 0 && (
                  <Text style={[styles.catDelta, { color: delta > 0 ? Colors.danger : Colors.success }]}>
                    {delta > 0 ? '▲' : '▼'} {fmt(Math.abs(delta))}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
      </View>
    </View>
  );
}

const LOADER_MESSAGES = [
  'Crunching your numbers...',
  'Building your yearly report...',
  'Analysing spending patterns...',
  'Calculating category totals...',
  'Almost there...',
];

function YearlyLoader() {
  const pulse  = useRef(new Animated.Value(1)).current;
  const ring1  = useRef(new Animated.Value(0)).current;
  const ring2  = useRef(new Animated.Value(0)).current;
  const fade   = useRef(new Animated.Value(1)).current;
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    // Icon pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // Ripple rings
    const ripple = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
          ]),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    ripple(ring1, 0).start();
    ripple(ring2, 800).start();

    // Cycle messages with fade
    const cycle = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      setMsgIdx(i => (i + 1) % LOADER_MESSAGES.length);
    }, 2200);

    return () => clearInterval(cycle);
  }, []);

  const ringStyle = (anim: Animated.Value) => ({
    opacity:    anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.2, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
  });

  return (
    <View style={ls.container}>
      <View style={ls.iconArea}>
        <Animated.View style={[ls.ring, ringStyle(ring1)]} />
        <Animated.View style={[ls.ring, ringStyle(ring2)]} />
        <Animated.View style={[ls.iconWrap, { transform: [{ scale: pulse }] }]}>
          <Ionicons name="bar-chart" size={36} color="#fff" />
        </Animated.View>
      </View>
      <Text style={ls.title}>Yearly Breakdown</Text>
      <Animated.Text style={[ls.message, { opacity: fade }]}>
        {LOADER_MESSAGES[msgIdx]}
      </Animated.Text>
      <Text style={ls.hint}>Fetching 12 months of data</Text>
    </View>
  );
}

const ls = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, paddingBottom: 60 },
  iconArea:  { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  ring:      { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary },
  iconWrap:  { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  title:     { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  message:   { fontSize: 15, color: Colors.primary, fontWeight: '600', marginBottom: 6 },
  hint:      { fontSize: 12, color: Colors.textMuted },
});

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
  whiteHalf:  { flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 36, overflow: Platform.OS === 'web' ? 'visible' : 'hidden', zIndex: 1 },
  content:    { padding: 16, paddingBottom: 40 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  monthCard:  { alignSelf: 'center', width: '44%', marginTop: 6, marginBottom: -16, zIndex: 2, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navBtn:     { padding: 6 },
  yearLabel:  { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginHorizontal: 10 },
  yearCards:    { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard:     { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statLabel:    { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  statValue:    { fontSize: 18, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
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
  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, marginTop: 8 },
  deltaHint:    { fontSize: 11, color: Colors.textMuted },

  // Insight cards
  insightLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 10 },
  insightHint:  { fontSize: 12, color: Colors.textSecondary, marginTop: 10, lineHeight: 17 },

  // Split bar
  splitBar:         { flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 14 },
  splitBarEss:      { backgroundColor: Colors.primary },
  splitBarDisc:     { backgroundColor: Colors.warning },
  splitLegend:      { flexDirection: 'row', gap: 24 },
  splitLegendItem:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  splitDot:         { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  splitPct:         { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  splitLegendLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  splitAmt:         { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 2 },

  // Trend card
  trendHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  trendAvg:         { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  trendAvgLabel:    { fontSize: 13, fontWeight: '400', color: Colors.textMuted },
  trendBadge:       { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  trendBadgeText:   { fontSize: 18, fontWeight: '800' },
  trendBadgeHint:   { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  miniChart:        { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 60 },
  miniBarWrap:      { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  miniBar:          { width: '100%', borderRadius: 3 },
  miniBarLabel:     { fontSize: 10, color: Colors.textMuted },

  // Saving opportunity
  savingTitle:    { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  savingAmount:   { fontSize: 30, fontWeight: '900', color: Colors.success, marginTop: 8 },
  savingSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2, marginBottom: 4 },

  // Heatmap
  heatGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  heatCell:       { width: '22%', borderRadius: 10, padding: 8, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  heatMonth:      { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  heatAmt:        { fontSize: 10, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  heatLegend:     { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  heatLegendDot:  { width: 10, height: 10, borderRadius: 3 },
  heatLegendText: { fontSize: 11, color: Colors.textMuted, marginLeft: 4 },

  // Day of week
  dowTopDay:    { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  dowChart:     { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 12, height: 90 },
  dowBarWrap:   { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  dowBar:       { width: '100%', borderRadius: 4, minHeight: 4 },
  dowLabel:     { fontSize: 10, color: Colors.textMuted },
  dowAvg:       { fontSize: 8, color: Colors.textMuted, textAlign: 'center' },

  // Category rows
  catRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  divider:      { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catLabelWrap: { flex: 1, marginRight: 12 },
  catLabel:     { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  catBarTrack:  { height: 3, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  catBarFill:   { height: 3, backgroundColor: Colors.primary + '60', borderRadius: 2 },
  catRight:     { alignItems: 'flex-end' },
  catValueRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catValue:     { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  catPctBadge:  { backgroundColor: Colors.border, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  catPctText:   { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  catDelta:     { fontSize: 11, marginTop: 3 },
});
