import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, Modal, Platform,
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

interface TxRow    { date: string; owner: string; category: string; description: string; amount: number; status: string; }
interface RecRow   { name: string; type: string; amount: number; dueDate: string; }
interface PaidGroup { label: string; total: number; }
interface WeekStat { label: string; dateRange: string; total: number; txns: TxRow[]; }

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

// Donut chart using half-disc rotation (no SVG required)
// pct = percentage of color1 (0–100)
function DonutChart({ size = 90, pct, color1, color2, bgColor, thickness = 14 }: {
  size?: number; pct: number; color1: string; color2: string; bgColor: string; thickness?: number;
}) {
  const p = Math.max(0, Math.min(100, pct));

  // Right D-shape handles 0–50%: starts at 180° (hidden), ends at 0° (half visible)
  const rightAngle = 180 - Math.min(p, 50) * 3.6;

  // Left C-shape handles 50–100%: starts at 180° (hidden), ends at 0° (half visible)
  const leftAngle = p > 50 ? 180 - (p - 50) * 3.6 : 180;

  const inner = size - 2 * thickness;

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      {/* Background ring color */}
      <View style={{
        position: 'absolute', top: 0, left: 0,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color2,
      }} />

      {/* Right clip (D-shape): 0–50% */}
      <View style={{
        position: 'absolute', top: 0, left: size / 2,
        width: size / 2, height: size, overflow: 'hidden',
      }}>
        <View style={{
          position: 'absolute', top: 0, left: 0,
          width: size / 2, height: size,
          borderTopRightRadius: size / 2,
          borderBottomRightRadius: size / 2,
          backgroundColor: color1,
          transform: [
            { translateX: -(size / 4) },
            { rotate: `${rightAngle}deg` },
            { translateX: size / 4 },
          ],
        }} />
      </View>

      {/* Left clip (C-shape): 50–100% */}
      {p > 50 && (
        <View style={{
          position: 'absolute', top: 0, left: 0,
          width: size / 2, height: size, overflow: 'hidden',
        }}>
          <View style={{
            position: 'absolute', top: 0, left: 0,
            width: size / 2, height: size,
            borderTopLeftRadius: size / 2,
            borderBottomLeftRadius: size / 2,
            backgroundColor: color1,
            transform: [
              { translateX: size / 4 },
              { rotate: `${leftAngle}deg` },
              { translateX: -(size / 4) },
            ],
          }} />
        </View>
      )}

      {/* Inner hole */}
      <View style={{
        position: 'absolute', top: thickness, left: thickness,
        width: inner, height: inner, borderRadius: inner / 2,
        backgroundColor: bgColor,
      }} />
    </View>
  );
}

export default function DashboardScreen() {
  const { currentHouse, month, goToPrevMonth, goToNextMonth } = useHouse();
  const [summary, setSummary]     = useState<MonthlySummary | null>(null);
  const [prevTotal, setPrevTotal] = useState<number | null>(null);
  const [txns, setTxns]           = useState<TxRow[]>([]);
  const [recRows, setRecRows]     = useState<RecRow[]>([]);
  const [iconMap, setIconMap]     = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const [selectedCat, setSelectedCat] = useState<CatRow | null>(null);
  const [userPopup, setUserPopup] = useState<{
    name: string; color: string; bgColor: string; groups: PaidGroup[]; paid: number;
  } | null>(null);
  const [weekModal, setWeekModal] = useState<WeekStat | null>(null);

  const load = useCallback(async () => {
    if (!currentHouse) return;
    setLoading(true);
    try {
      const pm = prevMonth(month);
      const [s, prevS, txResult, recResult, cats] = await Promise.all([
        getMonthlySummary(month, currentHouse.id),
        getMonthlySummary(pm, currentHouse.id),
        supabase
          .from('transactions')
          .select('date, owner, category, description, amount, status')
          .eq('month', month)
          .eq('house_id', currentHouse.id)
          .order('date', { ascending: true }),
        supabase
          .from('recurring_payments')
          .select('name, type, amount, due_date')
          .eq('month', month)
          .eq('house_id', currentHouse.id),
        getCategories(currentHouse.id),
      ]);
      setSummary(s);
      setPrevTotal(prevS.total);
      setTxns(txResult.data ?? []);
      setRecRows((recResult.data ?? []).map((r: any) => ({ name: r.name, type: r.type, amount: r.amount, dueDate: r.due_date })));
      const map: Record<string, string> = {};
      cats.forEach(c => { map[c.name] = c.icon; });
      setIconMap(map);
    } catch (e) {
      console.error('Dashboard load error:', e);
      setSummary({ categories: [], total: 0, users: [], settlement: 0 });
      setPrevTotal(null);
    } finally {
      setLoading(false);
    }
  }, [month, currentHouse]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !summary) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  const u1 = summary.users[0];
  const u2 = summary.users[1];
  const owesAmt  = Math.abs(summary.settlement);
  const owesFrom = summary.settlement > 0 ? u2 : u1;
  const owesTo   = summary.settlement > 0 ? u1 : u2;

  const pctChange = (prevTotal != null && prevTotal > 0)
    ? ((summary.total - prevTotal) / prevTotal * 100)
    : null;

  // Group transactions by category (exclude Personal)
  const txByCategory: Record<string, TxRow[]> = {};
  txns.filter(t => t.category !== 'Personal').forEach(t => {
    if (!txByCategory[t.category]) txByCategory[t.category] = [];
    txByCategory[t.category].push(t);
  });

  // Group recurring by type/category
  const recByCategory: Record<string, RecRow[]> = {};
  recRows.forEach(r => {
    if (!recByCategory[r.type]) recByCategory[r.type] = [];
    recByCategory[r.type].push(r);
  });

  // Paid groups per user
  const paidGroupsByUser: PaidGroup[][] = summary.users.map((u) => {
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
      const share = r.amount / Math.max(summary.users.length, 1);
      if (seen[r.type] === undefined) {
        seen[r.type] = groups.length;
        groups.push({ label: r.type, total: share });
      } else {
        groups[seen[r.type]].total += share;
      }
    });
    return groups;
  });

  const u1Pct = (summary.total > 0 && u1) ? Math.round(u1.share / summary.total * 100) : 50;
  const u2Pct = 100 - u1Pct;
  const hasTwoUsers = summary.users.length === 2;

  // Expenses paid/unpaid
  const txPaid   = txns.filter(t => t.status === 'P').reduce((s, t) => s + t.amount, 0);
  const txUnpaid = txns.filter(t => t.status === 'NP').reduce((s, t) => s + t.amount, 0);

  // Recurring totals
  const recTotal  = recRows.reduce((s, r) => s + r.amount, 0);
  const recUnpaid = recTotal; // treat all recurring as unpaid for the summary card

  // ── Weekly breakdown ──
  const [cy, cm] = month.split('-').map(Number);
  const daysInMonth = new Date(cy, cm, 0).getDate();
  const weeks: WeekStat[] = [];
  for (let start = 1; start <= daysInMonth; start += 7) {
    const end = Math.min(start + 6, daysInMonth);
    const wTxns = txns.filter(t => {
      const d = parseInt(t.date.slice(8, 10), 10);
      return d >= start && d <= end;
    });
    weeks.push({
      label: `Wk ${weeks.length + 1}`,
      dateRange: `${start}–${end}`,
      total: wTxns.reduce((s, t) => s + t.amount, 0),
      txns: wTxns,
    });
  }
  const maxWeekTotal = Math.max(...weeks.map(w => w.total), 1);

  // Most frequent category
  const countByCat: Record<string, number> = {};
  txns.forEach(t => { countByCat[t.category] = (countByCat[t.category] ?? 0) + 1; });
  const topFreqEntry = Object.entries(countByCat).sort((a, b) => b[1] - a[1])[0] ?? null;
  const topFreq = topFreqEntry ? { category: topFreqEntry[0], count: topFreqEntry[1] } : null;

  return (
    <View style={styles.outer}>
      {/* Floating month picker */}
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
          {/* ── Total Expenses card ── */}
          <View style={[styles.darkCard, { alignItems: 'center' }]}>
            <Text style={styles.darkLabel}>TOTAL EXPENSES</Text>
            <Text style={styles.darkAmount}>{fmt(summary.total)}</Text>
            {pctChange !== null && (
              <View style={[styles.changeBadge, {
                backgroundColor: pctChange <= 0 ? Colors.success + '25' : Colors.danger + '25',
              }]}>
                <Ionicons
                  name={pctChange <= 0 ? 'trending-down' : 'trending-up'}
                  size={13}
                  color={pctChange <= 0 ? Colors.success : Colors.danger}
                />
                <Text style={[styles.changeText, { color: pctChange <= 0 ? Colors.success : Colors.danger }]}>
                  {Math.abs(pctChange).toFixed(0)}% {pctChange <= 0 ? 'less' : 'more'} than last month
                </Text>
              </View>
            )}
          </View>

          {/* ── Expense Split card ── */}
          {summary.users.length > 0 && (
            <View style={styles.darkCard}>
              <Text style={styles.darkLabel}>EXPENSE SPLIT</Text>

              {hasTwoUsers ? (
                <View style={styles.donutRow}>
                  {/* User 1 */}
                  <TouchableOpacity
                    style={styles.userSide}
                    onPress={() => setUserPopup({ name: u1.fullName, color: USER_COLORS[0], bgColor: USER_LIGHT[0], groups: paidGroupsByUser[0] ?? [], paid: u1.paid })}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.userName, { color: USER_COLORS[0] }]} numberOfLines={1}>{u1.fullName}</Text>
                    <Text style={styles.userAmount}>{fmt(u1.share)}</Text>
                    <Text style={[styles.userPct, { color: USER_COLORS[0] }]}>{u1Pct}%</Text>
                  </TouchableOpacity>

                  <DonutChart
                    size={88}
                    pct={u1Pct}
                    color1={USER_COLORS[0]}
                    color2={USER_COLORS[1]}
                    bgColor={Colors.navyLight}
                    thickness={13}
                  />

                  {/* User 2 */}
                  <TouchableOpacity
                    style={[styles.userSide, styles.userSideRight]}
                    onPress={() => setUserPopup({ name: u2.fullName, color: USER_COLORS[1], bgColor: USER_LIGHT[1], groups: paidGroupsByUser[1] ?? [], paid: u2.paid })}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.userName, { color: USER_COLORS[1] }]} numberOfLines={1}>{u2.fullName}</Text>
                    <Text style={styles.userAmount}>{fmt(u2.share)}</Text>
                    <Text style={[styles.userPct, { color: USER_COLORS[1] }]}>{u2Pct}%</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* 3+ users: vertical list with mini bars */
                <View style={styles.multiGrid}>
                  {summary.users.map((u, i) => {
                    const pct = summary.total > 0 ? Math.round(u.share / summary.total * 100) : 0;
                    return (
                      <TouchableOpacity
                        key={u.nickname}
                        style={styles.multiRow}
                        onPress={() => setUserPopup({ name: u.fullName, color: USER_COLORS[i], bgColor: USER_LIGHT[i], groups: paidGroupsByUser[i] ?? [], paid: u.paid })}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.multiDot, { backgroundColor: USER_COLORS[i] }]} />
                        <Text style={[styles.multiName, { color: USER_COLORS[i] }]}>{u.fullName}</Text>
                        <View style={styles.multiBarWrap}>
                          <View style={[styles.multiBar, { width: `${pct}%` as any, backgroundColor: USER_COLORS[i] }]} />
                        </View>
                        <Text style={styles.multiAmt}>{fmt(u.share)}</Text>
                        <Text style={[styles.multiPct, { color: USER_COLORS[i] }]}>{pct}%</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* ── Balance to Settle card ── */}
          {owesAmt > 0.01 && owesFrom && owesTo && (
            <View style={[styles.darkCard, { padding: 14 }]}>
              <Text style={styles.darkLabel}>BALANCE TO SETTLE</Text>
              <View style={styles.settleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settleWho}>
                    <Text style={{ color: USER_COLORS[summary.settlement > 0 ? 1 : 0], fontWeight: '800' }}>
                      {owesFrom.fullName}
                    </Text>
                    <Text style={styles.settleOwesWord}> owes </Text>
                    <Text style={{ color: USER_COLORS[summary.settlement > 0 ? 0 : 1], fontWeight: '800' }}>
                      {owesTo.fullName}
                    </Text>
                  </Text>
                  <Text style={styles.settleAmt}>{fmt(owesAmt)}</Text>
                </View>
                <View style={styles.settleIcon}>
                  <Ionicons name="swap-horizontal" size={22} color="#fff" />
                </View>
              </View>
            </View>
          )}

          {/* ── Expenses summary ── */}
          {txns.length > 0 && (
            <View style={styles.miniRow}>
              <View style={styles.miniCard}>
                <Ionicons name="receipt-outline" size={15} color={Colors.textMuted} />
                <Text style={styles.miniCardLabel}>Expenses</Text>
                <View style={styles.miniStats}>
                  <View style={styles.miniStat}>
                    <Text style={styles.miniStatLabel}>Total</Text>
                    <Text style={styles.miniStatVal}>{fmt(txPaid + txUnpaid)}</Text>
                  </View>
                  <View style={styles.miniDivider} />
                  <View style={styles.miniStat}>
                    <Text style={styles.miniStatLabel}>Unpaid</Text>
                    <Text style={[styles.miniStatVal, { color: Colors.danger }]}>{fmt(txUnpaid)}</Text>
                  </View>
                </View>
              </View>

              {recTotal > 0 && (
                <View style={styles.miniCard}>
                  <Ionicons name="card-outline" size={15} color={Colors.textMuted} />
                  <Text style={styles.miniCardLabel}>Recurring</Text>
                  <View style={styles.miniStats}>
                    <View style={styles.miniStat}>
                      <Text style={styles.miniStatLabel}>Total</Text>
                      <Text style={styles.miniStatVal}>{fmt(recTotal)}</Text>
                    </View>
                    <View style={styles.miniDivider} />
                    <View style={styles.miniStat}>
                      <Text style={styles.miniStatLabel}>Unpaid</Text>
                      <Text style={[styles.miniStatVal, { color: Colors.danger }]}>{fmt(recUnpaid)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Weekly Spending + Most Frequent ── */}
          {txns.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Weekly Spending</Text>

              {/* Weekly bar chart */}
              <View style={styles.weekCard}>
                <View style={styles.weekChart}>
                  {weeks.map((w) => {
                    const barH = Math.max(6, (w.total / maxWeekTotal) * 72);
                    const isEmpty = w.total === 0;
                    return (
                      <TouchableOpacity
                        key={w.label}
                        style={styles.weekCol}
                        onPress={() => !isEmpty && setWeekModal(w)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.weekBarAmt} numberOfLines={1}>
                          {w.total > 0 ? fmt(w.total) : ''}
                        </Text>
                        <View style={[
                          styles.weekBar,
                          { height: barH, backgroundColor: isEmpty ? Colors.border : Colors.primary },
                        ]} />
                        <Text style={styles.weekLabel}>{w.label}</Text>
                        <Text style={styles.weekRange}>{w.dateRange}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.weekHint}>Tap a week to see breakdown</Text>
              </View>

              {/* Most Frequent */}
              {topFreq && (
                <View style={styles.insightGrid}>
                  <View style={[styles.insightCard, { flex: 1 }]}>
                    <View style={[styles.insightIcon, { backgroundColor: Colors.success + '18' }]}>
                      <Ionicons name="repeat-outline" size={16} color={Colors.success} />
                    </View>
                    <Text style={styles.insightTitle}>Most frequent</Text>
                    <Text style={styles.insightVal} numberOfLines={1}>{topFreq.category}</Text>
                    <Text style={styles.insightSub}>{topFreq.count} transactions</Text>
                  </View>
                </View>
              )}
            </>
          )}

          <WeekDetailModal week={weekModal} iconMap={iconMap} onClose={() => setWeekModal(null)} />

          {/* ── Category breakdown ── */}
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

          <CategoryPopup
            row={selectedCat}
            txns={selectedCat ? (txByCategory[selectedCat.label] ?? []) : []}
            recRows={selectedCat ? (recByCategory[selectedCat.label] ?? []) : []}
            iconMap={iconMap}
            onClose={() => setSelectedCat(null)}
          />
        </ScrollView>

        <PaidGroupsPopup data={userPopup} onClose={() => setUserPopup(null)} />
      </View>
    </View>
  );
}

function WeekDetailModal({ week, iconMap, onClose }: {
  week: WeekStat | null; iconMap: Record<string, string>; onClose: () => void;
}) {
  if (!week) return null;

  const sorted = [...week.txns].sort((a, b) => a.date.localeCompare(b.date));

  const catTotals: Record<string, number> = {};
  week.txns.forEach(t => { catTotals[t.category] = (catTotals[t.category] ?? 0) + t.amount; });
  const topCatEntry = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.wdOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.wdSheet} onPress={() => {}}>

          {/* Header */}
          <View style={styles.wdHeader}>
            <View style={styles.wdHeaderText}>
              <Text style={styles.wdTitle}>{week.label} · {week.dateRange}</Text>
              <Text style={styles.wdSub}>{week.txns.length} transaction{week.txns.length !== 1 ? 's' : ''}</Text>
            </View>
            <TouchableOpacity style={styles.wdClose} onPress={onClose}>
              <Ionicons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={styles.wdStats}>
            <View style={styles.wdStat}>
              <Text style={styles.wdStatVal}>{fmt(week.total)}</Text>
              <Text style={styles.wdStatLabel}>Total</Text>
            </View>
            {topCatEntry && (
              <View style={styles.wdStat}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name={(iconMap[topCatEntry[0]] ?? 'help-circle-outline') as any} size={13} color={Colors.primary} />
                  <Text style={styles.wdStatVal} numberOfLines={1}>{topCatEntry[0]}</Text>
                </View>
                <Text style={styles.wdStatLabel}>Top category</Text>
              </View>
            )}
            <View style={styles.wdStat}>
              <Text style={[styles.wdStatVal, { color: Colors.danger }]}>
                {fmt(week.txns.filter(t => t.status === 'NP').reduce((s, t) => s + t.amount, 0))}
              </Text>
              <Text style={styles.wdStatLabel}>Unpaid</Text>
            </View>
          </View>

          {/* Transaction list */}
          <ScrollView style={styles.wdScroll} showsVerticalScrollIndicator={false}>
            {sorted.length === 0 ? (
              <Text style={styles.wdEmpty}>No transactions this week</Text>
            ) : sorted.map((t, i) => (
              <View key={i} style={[styles.wdTxRow, i < sorted.length - 1 && styles.wdTxBorder]}>
                <Text style={styles.wdTxDate}>{t.date.slice(5)}</Text>
                <Text style={styles.wdTxDesc} numberOfLines={1}>{t.description}</Text>
                <Text style={styles.wdTxOwner}>{t.owner}</Text>
                <Text style={[styles.wdTxAmt, t.status === 'NP' && { color: Colors.danger }]}>{fmt(t.amount)}</Text>
              </View>
            ))}
          </ScrollView>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
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
          <View style={[styles.paidPopupHeader, { borderBottomColor: color }]}>
            <View style={[styles.paidPopupBadge, { backgroundColor: bgColor }]}>
              <Text style={[styles.paidPopupName, { color }]}>{name}</Text>
            </View>
            <Text style={styles.paidPopupTitle}>Paid Breakdown</Text>
            <TouchableOpacity onPress={onClose} style={styles.paidPopupClose}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
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
          <View style={[styles.paidPopupFooter, { backgroundColor: bgColor }]}>
            <Text style={[styles.paidPopupFooterLabel, { color }]}>Total Paid</Text>
            <Text style={[styles.paidPopupFooterAmt, { color }]}>{fmt(paid)}</Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function CategoryPopup({ row, txns, recRows, iconMap, onClose }: {
  row: CatRow | null; txns: TxRow[]; recRows: RecRow[]; iconMap: Record<string, string>; onClose: () => void;
}) {
  if (!row) return null;
  const hasItems = txns.length > 0 || recRows.length > 0;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.popupOverlay, Platform.OS === 'web' && { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }]} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.popupCard} onPress={() => {}}>
          <View style={styles.popupHeader}>
            <View style={styles.catIconWrap}>
              <Ionicons name={(iconMap[row.label] ?? 'help-circle-outline') as any} size={18} color={Colors.navy} />
            </View>
            <Text style={styles.popupTitle}>{row.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.popupTotal}>{fmt(row.total)}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.popupShares}>
            {row.userPays.map((up, j) => (
              <View key={up.nickname} style={[styles.popupShareChip, { backgroundColor: USER_COLORS[j] + '18' }]}>
                <Text style={[styles.popupShareNick, { color: USER_COLORS[j] }]}>{up.nickname} Owns</Text>
                <Text style={[styles.popupShareAmt, { color: USER_COLORS[j] }]}>{fmt(up.amount)}</Text>
              </View>
            ))}
          </View>
          {hasItems && <View style={styles.popupDivider} />}
          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {recRows.length > 0 && (
              <>
                <Text style={styles.popupSectionLabel}>RECURRING</Text>
                {recRows.map((r, i) => (
                  <View key={i} style={[styles.popupTxRow, i < recRows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }]}>
                    <Ionicons name="card-outline" size={13} color={Colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.popupTxDesc, { flex: 1 }]} numberOfLines={1}>{r.name}</Text>
                    <Text style={styles.popupTxDate}>{r.dueDate}</Text>
                    <Text style={[styles.popupTxAmt, { color: Colors.primary }]}>{fmt(r.amount)}</Text>
                  </View>
                ))}
              </>
            )}
            {txns.length > 0 && (
              <>
                {recRows.length > 0 && <View style={styles.popupDivider} />}
                <Text style={styles.popupSectionLabel}>TRANSACTIONS</Text>
                {txns.map((t, i) => (
                  <View key={i} style={[styles.popupTxRow, i < txns.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }]}>
                    <Text style={styles.popupTxDate}>{t.date.slice(5)}</Text>
                    <Text style={styles.popupTxDesc} numberOfLines={1}>{t.description}</Text>
                    <Text style={styles.popupTxAmt}>{fmt(t.amount)}</Text>
                    <Text style={styles.popupTxOwner}>{t.owner}</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  outer:      { flex: 1 },
  whiteHalf:  { flex: 1, backgroundColor: Colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, overflow: Platform.OS === 'web' ? 'visible' : 'hidden', zIndex: 1 },
  content:    { padding: 16, paddingBottom: 36 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },

  monthCard:  { alignSelf: 'center', width: '44%', marginTop: 6, marginBottom: -16, zIndex: 2, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 },
  navBtn:     { padding: 6 },
  monthLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 10 },

  // ── Dark feature cards ──
  darkCard:    { backgroundColor: Colors.navyLight, borderRadius: 20, padding: 18, marginBottom: 14 },
  darkLabel:   { fontSize: 11, fontWeight: '700', color: '#8899CC', letterSpacing: 0.9, marginBottom: 6 },
  darkAmount:  { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  changeText:  { fontSize: 12, fontWeight: '700' },

  // ── 2-user donut layout ──
  donutRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
  userSide:     { flex: 1, alignItems: 'flex-start', gap: 4 },
  userSideRight:{ alignItems: 'flex-end' },
  userName:     { fontSize: 13, fontWeight: '700', maxWidth: 90 },
  userAmount:   { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  userPct:      { fontSize: 13, fontWeight: '600' },

  // ── 3+ user list layout ──
  multiGrid:    { gap: 10, paddingTop: 8 },
  multiRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  multiDot:     { width: 8, height: 8, borderRadius: 4 },
  multiName:    { fontSize: 13, fontWeight: '700', width: 80 },
  multiBarWrap: { flex: 1, height: 5, backgroundColor: Colors.navyMid, borderRadius: 3, overflow: 'hidden' },
  multiBar:     { height: 5, borderRadius: 3 },
  multiAmt:     { fontSize: 12, fontWeight: '700', color: '#FFFFFF', width: 72, textAlign: 'right' },
  multiPct:     { fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },

  // ── Settlement card ──
  settleRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 },
  settleWho:      { fontSize: 12, flexWrap: 'wrap', color: '#A0B4D4' },
  settleOwesWord: { fontWeight: '400', color: '#8899CC' },
  settleAmt:      { fontSize: 20, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
  settleIcon:     { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.navyMid, alignItems: 'center', justifyContent: 'center' },

  // ── Mini summary row ──
  miniRow:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  miniCard:      { flex: 1, backgroundColor: Colors.card, borderRadius: 14, padding: 12, gap: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  miniCardLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5 },
  miniStats:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  miniStat:      { gap: 2 },
  miniStatLabel: { fontSize: 10, color: Colors.textMuted },
  miniStatVal:   { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  miniDivider:   { width: 1, height: 24, backgroundColor: Colors.border },

  // ── Month insights ──
  // ── Weekly chart ──
  weekCard:     { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  weekChart:    { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 8 },
  weekCol:      { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  weekBarAmt:   { fontSize: 9, fontWeight: '700', color: Colors.primary, textAlign: 'center' },
  weekBar:      { width: '100%', borderRadius: 6 },
  weekLabel:    { fontSize: 11, fontWeight: '700', color: Colors.textPrimary },
  weekRange:    { fontSize: 9, color: Colors.textMuted },
  weekHint:     { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 10 },

  // ── Insight cards ──
  insightGrid:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  insightCard:  { backgroundColor: Colors.card, borderRadius: 14, padding: 12, gap: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  insightIcon:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  insightTitle: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  insightVal:   { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 1 },
  insightSub:   { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  // ── Week detail modal ──
  wdOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  wdSheet:      { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  wdHeader:     { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: Colors.border },
  wdHeaderText: { flex: 1 },
  wdTitle:      { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  wdSub:        { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  wdClose:      { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  wdStats:      { flexDirection: 'row', padding: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  wdStat:       { flex: 1, backgroundColor: Colors.bg, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
  wdStatVal:    { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  wdStatLabel:  { fontSize: 10, color: Colors.textMuted },
  wdScroll:     { paddingHorizontal: 16, paddingBottom: 32 },
  wdTxRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 },
  wdTxBorder:   { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  wdTxDate:     { fontSize: 11, color: Colors.textMuted, width: 36 },
  wdTxDesc:     { flex: 1, fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  wdTxOwner:    { fontSize: 11, color: Colors.textMuted, width: 28, textAlign: 'right' },
  wdTxAmt:      { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  wdEmpty:      { textAlign: 'center', color: Colors.textMuted, paddingVertical: 32, fontSize: 13 },

  // ── Category breakdown ──
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  card:         { backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  catIconWrap:  { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  divider:      { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  catRight:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catLabel:     { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  catTotal:     { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  emptyText:    { color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },

  // ── Popups ──
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
  popupSectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.6, marginBottom: 4, marginTop: 4 },

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
