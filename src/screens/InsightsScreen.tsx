import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getYearlySummary, getYearlyDailyTotals } from '../db/queries';
import { useHouse } from '../context/HouseContext';
import { currentYear } from '../utils/date';
import { Colors, fmt } from '../utils/theme';

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function InsightsScreen() {
  const { currentHouse } = useHouse();
  const navigation        = useNavigation<any>();
  const [year, setYear]   = useState(currentYear());
  const [rows, setRows]   = useState<Awaited<ReturnType<typeof getYearlySummary>>>([]);
  const [dailyTotals, setDailyTotals] = useState<{ date: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentHouse) return;
    setLoading(true);
    const [data, daily] = await Promise.all([
      getYearlySummary(year, currentHouse.id),
      getYearlyDailyTotals(year, currentHouse.id),
    ]);
    setRows(data);
    setDailyTotals(daily);
    setLoading(false);
  }, [year, currentHouse]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <InsightsLoader />;

  const activeRows   = rows.filter(r => r.total > 0);
  const totalYear    = activeRows.reduce((sum, r) => sum + r.total, 0);

  // ── Fixed vs Variable ──
  const fixedTotal    = activeRows.reduce((sum, r) => sum + r.homePay + r.carPay, 0);
  const variableTotal = totalYear - fixedTotal;
  const fixedPct      = totalYear > 0 ? Math.round((fixedTotal / totalYear) * 100) : 0;
  const variablePct   = totalYear > 0 ? 100 - fixedPct : 0;

  // ── Saving Opportunity ──
  const savingCandidates = [
    { label: 'Food',          total: activeRows.reduce((s, r) => s + r.food, 0) },
    { label: 'Fun',           total: activeRows.reduce((s, r) => s + r.fun, 0) },
    { label: 'Subscriptions', total: activeRows.reduce((s, r) => s + r.subscriptions, 0) },
    { label: 'Car Expenses',  total: activeRows.reduce((s, r) => s + r.carExpense, 0) },
  ].filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const topSavingCat = savingCandidates[0];
  const savingOppty  = topSavingCat ? Math.round(topSavingCat.total * 0.2) : 0;

  // ── Monthly Heatmap ──
  const maxHeatTotal = Math.max(...rows.map(r => r.total), 1);

  // ── Day of Week ──
  const dowTotals = [0, 0, 0, 0, 0, 0, 0];
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  dailyTotals.forEach(({ date, total }) => {
    const jsDay = new Date(date + 'T00:00:00').getDay();
    const idx   = jsDay === 0 ? 6 : jsDay - 1;
    dowTotals[idx] += total;
    dowCounts[idx]++;
  });
  const dowAvgs        = dowTotals.map((t, i) => dowCounts[i] > 0 ? Math.round(t / dowCounts[i]) : 0);
  const maxDowAvg      = Math.max(...dowAvgs, 1);
  const topDowIdx      = dowAvgs.indexOf(Math.max(...dowAvgs));
  const isWeekendHeavy = (dowAvgs[5] + dowAvgs[6]) / 2 >
                         (dowAvgs[0] + dowAvgs[1] + dowAvgs[2] + dowAvgs[3] + dowAvgs[4]) / 5;

  const hasData = activeRows.length > 0;

  return (
    <View style={s.outer}>
      <View style={s.yearPicker}>
        <TouchableOpacity onPress={() => setYear(String(parseInt(year) - 1))} style={s.navBtn}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={s.yearLabel}>{year}</Text>
        <TouchableOpacity onPress={() => setYear(String(parseInt(year) + 1))} style={s.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={s.whiteHalf}>
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        >
          {!hasData ? (
            <View style={s.empty}>
              <Ionicons name="bulb-outline" size={48} color={Colors.textMuted} />
              <Text style={s.emptyText}>No data for {year}</Text>
              <Text style={s.emptyHint}>Add transactions to see insights</Text>
            </View>
          ) : (
            <>
              {/* Fixed vs Variable */}
              {fixedTotal > 0 && (
                <View style={s.card}>
                  <Text style={s.label}>FIXED VS VARIABLE</Text>
                  <View style={s.splitBar}>
                    <View style={[s.barFixed, { flex: fixedPct }]} />
                    <View style={[s.barVariable, { flex: variablePct }]} />
                  </View>
                  <View style={s.splitRow}>
                    <View style={s.splitItem}>
                      <View style={[s.dot, { backgroundColor: Colors.primary }]} />
                      <View>
                        <Text style={s.splitPct}>{fixedPct}%</Text>
                        <Text style={s.splitName}>Fixed</Text>
                        <Text style={s.splitAmt}>{fmt(fixedTotal)}</Text>
                      </View>
                    </View>
                    <View style={s.splitItem}>
                      <View style={[s.dot, { backgroundColor: Colors.ma }]} />
                      <View>
                        <Text style={[s.splitPct, { color: Colors.ma }]}>{variablePct}%</Text>
                        <Text style={s.splitName}>Variable</Text>
                        <Text style={s.splitAmt}>{fmt(variableTotal)}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={s.hint}>Fixed = mortgage & car loan. Variable = everything you can control.</Text>
                </View>
              )}

              {/* Saving Opportunity */}
              {topSavingCat && savingOppty > 0 && (
                <View style={[s.card, s.savingCard]}>
                  <Text style={s.label}>💡 SAVING OPPORTUNITY</Text>
                  <Text style={s.savingTitle}>
                    Cut <Text style={{ color: Colors.primary, fontWeight: '800' }}>{topSavingCat.label}</Text> by 20%
                  </Text>
                  <Text style={s.savingAmt}>{fmt(savingOppty)}</Text>
                  <Text style={s.savingSubtitle}>potential savings this year</Text>
                  <Text style={s.hint}>Your top variable expense. Small consistent cuts add up fast.</Text>
                </View>
              )}

              {/* Monthly Heatmap */}
              <View style={s.card}>
                <Text style={s.label}>MONTHLY SPENDING — {year}</Text>
                <View style={s.heatGrid}>
                  {rows.map(r => {
                    const intensity = r.total > 0 ? r.total / maxHeatTotal : 0;
                    const bg =
                      r.total === 0    ? Colors.bg :
                      intensity < 0.33 ? Colors.success + '50' :
                      intensity < 0.66 ? Colors.warning + '70' :
                                         Colors.danger  + '80';
                    return (
                      <View key={r.month} style={[s.heatCell, { backgroundColor: bg }]}>
                        <Text style={s.heatMonth}>{r.month.slice(0, 3)}</Text>
                        <Text style={[s.heatAmt, r.total === 0 && { color: Colors.textMuted }]}>
                          {r.total > 0 ? fmt(r.total) : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View style={s.heatLegend}>
                  {[
                    { color: Colors.success + '50', label: 'Low' },
                    { color: Colors.warning + '70', label: 'Mid' },
                    { color: Colors.danger  + '80', label: 'High' },
                  ].map(item => (
                    <View key={item.label} style={s.heatLegendItem}>
                      <View style={[s.heatLegendDot, { backgroundColor: item.color }]} />
                      <Text style={s.heatLegendText}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Day of Week */}
              {dailyTotals.length > 0 && (
                <View style={s.card}>
                  <View style={s.dowHeader}>
                    <View>
                      <Text style={s.label}>SPENDING BY DAY</Text>
                      <Text style={s.dowTopDay}>
                        Most on{' '}
                        <Text style={{ color: Colors.danger }}>{DOW_LABELS[topDowIdx]}s</Text>
                      </Text>
                    </View>
                    {isWeekendHeavy && (
                      <View style={s.weekendBadge}>
                        <Text style={s.weekendEmoji}>🏖️</Text>
                        <Text style={s.weekendText}>Weekend{'\n'}spender</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.dowChart}>
                    {DOW_LABELS.map((label, i) => {
                      const barH      = Math.max(4, (dowAvgs[i] / maxDowAvg) * 60);
                      const isWeekend = i >= 5;
                      const isTop     = i === topDowIdx;
                      return (
                        <View key={label} style={s.dowBarWrap}>
                          <Text style={[s.dowAvgLabel, isTop && { color: Colors.danger, fontWeight: '700' }]}>
                            {dowAvgs[i] > 0 ? fmt(dowAvgs[i]) : ''}
                          </Text>
                          <View style={[s.dowBar, {
                            height: barH,
                            backgroundColor: isTop ? Colors.danger : isWeekend ? Colors.warning : Colors.primary,
                            opacity: dowAvgs[i] === 0 ? 0.15 : 1,
                          }]} />
                          <Text style={[s.dowDayLabel, isWeekend && { color: Colors.warning, fontWeight: '700' }]}>
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Yearly Breakdown link */}
              <TouchableOpacity style={s.yearlyLink} onPress={() => navigation.navigate('Yearly')}>
                <Ionicons name="bar-chart-outline" size={20} color={Colors.primary} />
                <Text style={s.yearlyLinkText}>View Yearly Breakdown</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outer:      { flex: 1 },
  whiteHalf:  { flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 36, overflow: 'hidden', zIndex: 1 },
  content:    { padding: 16, paddingBottom: 40 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  yearPicker: { alignSelf: 'center', width: '44%', marginTop: 6, marginBottom: -16, zIndex: 2, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navBtn:     { padding: 6 },
  yearLabel:  { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginHorizontal: 10 },

  empty:      { alignItems: 'center', paddingTop: 80 },
  emptyText:  { fontSize: 16, color: Colors.textSecondary, marginTop: 12, fontWeight: '600' },
  emptyHint:  { fontSize: 13, color: Colors.textMuted, marginTop: 4 },

  card:       { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  label:      { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 12 },
  hint:       { fontSize: 12, color: Colors.textSecondary, marginTop: 10, lineHeight: 17 },

  // Split bar
  splitBar:   { flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 14 },
  barFixed:   { backgroundColor: Colors.primary },
  barVariable:{ backgroundColor: Colors.ma },
  splitRow:   { flexDirection: 'row', gap: 24 },
  splitItem:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot:        { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  splitPct:   { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  splitName:  { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  splitAmt:   { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 2 },

  // Saving
  savingCard:     { borderLeftWidth: 3, borderLeftColor: Colors.success },
  savingTitle:    { fontSize: 15, color: Colors.textSecondary, marginBottom: 8 },
  savingAmt:      { fontSize: 32, fontWeight: '900', color: Colors.success },
  savingSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Heatmap
  heatGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heatCell:       { width: '22%', borderRadius: 10, padding: 8, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  heatMonth:      { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  heatAmt:        { fontSize: 10, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  heatLegend:     { flexDirection: 'row', gap: 12, marginTop: 10 },
  heatLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatLegendDot:  { width: 10, height: 10, borderRadius: 3 },
  heatLegendText: { fontSize: 11, color: Colors.textMuted },

  // Day of week
  dowHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  dowTopDay:    { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  weekendBadge: { alignItems: 'center', backgroundColor: Colors.warning + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  weekendEmoji: { fontSize: 18 },
  weekendText:  { fontSize: 10, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  dowChart:     { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 12, height: 90 },
  dowBarWrap:   { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  dowBar:       { width: '100%', borderRadius: 4 },
  dowDayLabel:  { fontSize: 10, color: Colors.textMuted },
  dowAvgLabel:  { fontSize: 8, color: Colors.textMuted, textAlign: 'center' },

  // Yearly link
  yearlyLink:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: Colors.border },
  yearlyLinkText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.primary },
});

const INSIGHTS_MESSAGES = [
  'Analysing your spending...',
  'Finding patterns in your data...',
  'Calculating monthly trends...',
  'Mapping your day-of-week habits...',
  'Almost there...',
];

function InsightsLoader() {
  const pulse = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const fade  = useRef(new Animated.Value(1)).current;
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();

    const ripple = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      );
    ripple(ring1, 0).start();
    ripple(ring2, 800).start();

    const cycle = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      setMsgIdx(i => (i + 1) % INSIGHTS_MESSAGES.length);
    }, 2200);

    return () => clearInterval(cycle);
  }, []);

  const ringStyle = (anim: Animated.Value) => ({
    opacity:   anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.5, 0.2, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
  });

  return (
    <View style={il.container}>
      <View style={il.iconArea}>
        <Animated.View style={[il.ring, ringStyle(ring1)]} />
        <Animated.View style={[il.ring, ringStyle(ring2)]} />
        <Animated.View style={[il.iconWrap, { transform: [{ scale: pulse }] }]}>
          <Ionicons name="bulb" size={36} color="#fff" />
        </Animated.View>
      </View>
      <Text style={il.title}>Insights</Text>
      <Animated.Text style={[il.message, { opacity: fade }]}>
        {INSIGHTS_MESSAGES[msgIdx]}
      </Animated.Text>
      <Text style={il.hint}>Fetching your yearly data</Text>
    </View>
  );
}

const il = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, paddingBottom: 60 },
  iconArea:  { width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  ring:      { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#22C55E' },
  iconWrap:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center', shadowColor: '#22C55E', shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  title:     { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  message:   { fontSize: 15, color: '#22C55E', fontWeight: '600', marginBottom: 6 },
  hint:      { fontSize: 13, color: Colors.textMuted },
});
