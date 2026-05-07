import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getExpenseNames, addExpenseName, deleteExpenseName, ExpenseName } from '../db/queries';
import { Colors } from '../utils/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { useHouse } from '../context/HouseContext';

export default function SettingsExpenseNamesScreen() {
  const { currentHouse } = useHouse();
  const { showAlert } = useAlert();
  const [expenseNames, setExpenseNames] = useState<ExpenseName[]>([]);
  const [newName, setNewName] = useState('');
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    if (!currentHouse) return;
    setExpenseNames(await getExpenseNames(currentHouse.id));
  }, [currentHouse]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) { inputRef.current?.focus(); return; }
    if (expenseNames.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      showAlert('Already exists', `"${name}" is already in your list.`);
      return;
    }
    setSaving(true);
    try {
      await addExpenseName(currentHouse!.id, name);
      setNewName('');
      inputRef.current?.focus();
      await load();
    } catch (e: any) {
      showAlert('Error', e.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: ExpenseName) => {
    showAlert('Remove Expense Name', `Remove "${item.name}" from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await deleteExpenseName(item.id);
        load();
      }},
    ]);
  };

  const canAdd = newName.trim().length > 0 && !saving;

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <View style={s.addSection}>
          <Text style={s.addLabel}>Add new expense name</Text>
          <View style={[s.addRow, focused && s.addRowFocused]}>
            <Ionicons name="pricetag-outline" size={18} color={focused ? Colors.primary : Colors.textMuted} style={{ marginLeft: 14 }} />
            <TextInput
              ref={inputRef}
              style={s.addInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Weekly groceries, Petrol, Rent"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
              autoCapitalize="words"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {newName.length > 0 && (
              <TouchableOpacity onPress={() => setNewName('')} style={{ paddingHorizontal: 8 }}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[s.addBtn, !canAdd && s.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!canAdd}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={s.addBtnText}>{saving ? 'Saving…' : 'Add Expense Name'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          {expenseNames.length > 0 && (
            <View style={s.listHeader}>
              <Text style={s.listTitle}>Your Expense Names</Text>
              <View style={s.countBadge}>
                <Text style={s.countText}>{expenseNames.length}</Text>
              </View>
            </View>
          )}

          {expenseNames.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="pricetag-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={s.emptyTitle}>No expense names yet</Text>
              <Text style={s.emptyHint}>Add predefined names above to quickly{'\n'}fill in your expense descriptions</Text>
            </View>
          ) : (
            <View style={s.listCard}>
              {expenseNames.map((item, i) => (
                <View key={item.id} style={[s.row, i < expenseNames.length - 1 && s.rowBorder]}>
                  <View style={s.rowIcon}>
                    <Ionicons name="pricetag-outline" size={16} color={Colors.primary} />
                  </View>
                  <Text style={s.rowName}>{item.name}</Text>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  addSection:    { backgroundColor: Colors.card, marginHorizontal: 16, marginTop: 32, marginBottom: 8, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  addLabel:      { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  addRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 12 },
  addRowFocused: { borderColor: Colors.primary },
  addInput:      { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary },
  addBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13 },
  addBtnDisabled:{ opacity: 0.35 },
  addBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },

  content:       { padding: 16, paddingBottom: 60 },

  listHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  listTitle:     { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  countBadge:    { backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText:     { fontSize: 12, fontWeight: '700', color: Colors.primary },

  listCard:      { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  row:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowBorder:     { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  rowIcon:       { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowName:       { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  deleteBtn:     { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.danger + '12', alignItems: 'center', justifyContent: 'center' },

  empty:         { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyIcon:     { width: 72, height: 72, borderRadius: 22, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:    { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptyHint:     { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
