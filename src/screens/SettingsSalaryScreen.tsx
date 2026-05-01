import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Switch,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import { getHouseMembers, getMemberSplitPcts, upsertMemberSplitPct, clearMemberSplitPcts, HouseMember } from '../db/queries';
import { currentMonth, monthLabel, prevMonth, nextMonth } from '../utils/date';
import { Colors } from '../utils/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { useHouse } from '../context/HouseContext';

const USER_COLORS = [Colors.th, Colors.ma, Colors.user3, Colors.user4];

export default function SettingsSalaryScreen() {
  const { currentHouse } = useHouse();
  const { showAlert } = useAlert();

  const [members, setMembers]                   = useState<HouseMember[]>([]);
  const [salarySplitEnabled, setSalarySplitEnabled] = useState(false);
  const [splitMonth, setSplitMonth]             = useState(currentMonth());
  const [splitPctInputs, setSplitPctInputs]     = useState<Record<string, string>>({});
  const [storedSplitPcts, setStoredSplitPcts]   = useState<Record<string, number | null>>({});
  const [splitSaving, setSplitSaving]           = useState(false);

  const loadData = useCallback(async () => {
    if (!currentHouse) return;
    const [m, pcts] = await Promise.all([
      getHouseMembers(currentHouse.id),
      getMemberSplitPcts(currentHouse.id, splitMonth),
    ]);
    setMembers(m);
    setStoredSplitPcts(pcts);
    const inputs: Record<string, string> = {};
    m.forEach(mem => { if (pcts[mem.userId] != null) inputs[mem.userId] = String(pcts[mem.userId]); });
    setSplitPctInputs(inputs);
    const total = m.reduce((s, mem) => s + (pcts[mem.userId] ?? 0), 0);
    setSalarySplitEnabled(m.length >= 2 && m.every(mem => pcts[mem.userId] != null) && Math.round(total) === 100);
  }, [currentHouse, splitMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggle = async (enabled: boolean) => {
    setSalarySplitEnabled(enabled);
    if (!enabled && currentHouse) {
      try {
        await clearMemberSplitPcts(currentHouse.id, splitMonth);
        setStoredSplitPcts({});
        setSplitPctInputs({});
      } catch (e: any) { showAlert('Error', e.message); }
    }
  };

  const handleSave = async () => {
    if (!currentHouse) return;
    const total = members.reduce((s, m) => s + (parseFloat(splitPctInputs[m.userId] ?? '0') || 0), 0);
    if (Math.round(total) !== 100) { showAlert('Invalid', 'Total must equal exactly 100%.'); return; }
    setSplitSaving(true);
    try {
      await Promise.all(members.map(m =>
        upsertMemberSplitPct(currentHouse.id, m.userId, parseFloat(splitPctInputs[m.userId] ?? '0') || 0, splitMonth)
      ));
      const pcts: Record<string, number | null> = {};
      members.forEach(m => { pcts[m.userId] = parseFloat(splitPctInputs[m.userId] ?? '0') || 0; });
      setStoredSplitPcts(pcts);
      showAlert('Saved', `Salary split saved for ${monthLabel(splitMonth)}.`);
    } catch (e: any) { showAlert('Error', e.message); }
    finally { setSplitSaving(false); }
  };

  return (
    <ScreenWrapper>
      <ScrollView style={s.container} contentContainerStyle={s.content}>

        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Salary Split</Text>
          <Switch
            value={salarySplitEnabled}
            onValueChange={handleToggle}
            disabled={members.length < 2}
            trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
            thumbColor={salarySplitEnabled ? Colors.primary : Colors.textMuted}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>

        {/* Month picker */}
        <View style={s.monthRow}>
          <TouchableOpacity onPress={() => setSplitMonth(prevMonth(splitMonth))} style={s.monthBtn}>
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>{monthLabel(splitMonth)}</Text>
          <TouchableOpacity onPress={() => setSplitMonth(nextMonth(splitMonth))} style={s.monthBtn}>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={s.infoBox}>
          <Text style={s.infoText}>
            When enabled, shared expenses tagged <Text style={s.infoBold}>Salary %</Text> are divided based on each member's contribution percentage instead of 50/50.
          </Text>
          <View style={s.infoExample}>
            <Text style={s.infoExampleLine}>
              <Text style={s.infoBold}>Example: </Text>
              Person A sets <Text style={{ color: Colors.th, fontWeight: '700' }}>60%</Text>, Person B sets <Text style={{ color: Colors.ma, fontWeight: '700' }}>40%</Text>
            </Text>
            <Text style={s.infoExampleLine}>
              On a $500 bill → A pays <Text style={{ color: Colors.th, fontWeight: '700' }}>$300</Text> · B pays <Text style={{ color: Colors.ma, fontWeight: '700' }}>$200</Text>
            </Text>
          </View>
        </View>

        {salarySplitEnabled && (
          <View style={s.card}>
            {members.length < 2 ? (
              <View style={s.disabledContent}>
                <Ionicons name="people-outline" size={32} color={Colors.textMuted} />
                <Text style={s.disabledTitle}>Requires 2 members</Text>
                <Text style={s.disabledText}>Invite a second person to enable salary split.</Text>
              </View>
            ) : (
              <>
                <Text style={s.hint}>Split for {monthLabel(splitMonth)} — total must equal 100%.</Text>
                {members.map((m, i) => {
                  const color = USER_COLORS[i % USER_COLORS.length];
                  return (
                    <View key={m.userId} style={[s.memberRow, i < members.length - 1 && s.memberBorder]}>
                      <View style={[s.memberBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[s.memberBadgeText, { color }]}>{m.nickname}</Text>
                      </View>
                      <Text style={[s.memberName, { flex: 1 }]}>{m.fullName}</Text>
                      <TextInput
                        style={s.pctInput}
                        value={splitPctInputs[m.userId] ?? ''}
                        onChangeText={v => setSplitPctInputs(prev => ({ ...prev, [m.userId]: v.replace(/[^0-9.]/g, '') }))}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.textMuted}
                      />
                      <Text style={s.pctSuffix}>%</Text>
                    </View>
                  );
                })}
                {(() => {
                  const total = members.reduce((s, m) => s + (parseFloat(splitPctInputs[m.userId] ?? '0') || 0), 0);
                  const isValid = Math.round(total) === 100;
                  return (
                    <View style={s.totalRow}>
                      <Text style={[s.totalText, { color: isValid ? Colors.success : Colors.danger }]}>
                        Total: {total.toFixed(1)}%{isValid ? '  ✓' : '  (must be 100%)'}
                      </Text>
                      <TouchableOpacity
                        style={[s.saveBtn, (!isValid || splitSaving) && { opacity: 0.4 }]}
                        onPress={handleSave}
                        disabled={!isValid || splitSaving}
                      >
                        <Text style={s.saveBtnText}>{splitSaving ? 'Saving…' : 'Save'}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </>
            )}
          </View>
        )}

      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  content:         { padding: 16, paddingTop: 28, paddingBottom: 60 },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionHeaderRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 },
  card:            { backgroundColor: Colors.card, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  monthRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 6, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  monthBtn:        { padding: 6 },
  monthLabel:      { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginHorizontal: 12, minWidth: 90, textAlign: 'center' },
  infoBox:         { backgroundColor: Colors.primary + '0D', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: Colors.primary + '25' },
  infoText:        { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 8 },
  infoBold:        { fontWeight: '700', color: Colors.textPrimary },
  infoExample:     { backgroundColor: Colors.card, borderRadius: 8, padding: 10, gap: 4 },
  infoExampleLine: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  hint:            { fontSize: 12, color: Colors.textMuted, marginBottom: 10 },
  memberRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  memberBorder:    { borderBottomWidth: 1, borderBottomColor: Colors.border },
  memberBadge:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  memberBadgeText: { fontSize: 13, fontWeight: '800' },
  memberName:      { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  pctInput:        { width: 60, backgroundColor: Colors.bg, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 7, fontSize: 15, color: Colors.textPrimary, textAlign: 'right' },
  pctSuffix:       { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  totalRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  totalText:       { fontSize: 13, fontWeight: '700' },
  saveBtn:         { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  disabledContent: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  disabledTitle:   { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  disabledText:    { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
