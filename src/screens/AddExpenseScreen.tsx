import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { addTransaction, updateTransaction, deleteTransaction, getCategories, getHouseMembers, HouseMember, Category } from '../db/queries';
import { Transaction, Owner, PayStatus, PaymentMethod } from '../types';
import { today } from '../utils/date';
import { Colors, categoryColor } from '../utils/theme';
import DatePickerInput from '../components/DatePickerInput';
import { useUser } from '../context/UserContext';
import { useHouse } from '../context/HouseContext';

const USER_COLORS = [Colors.th, Colors.ma, Colors.user3, Colors.user4];

export default function AddExpenseScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { currentUser } = useUser();
  const { currentHouse } = useHouse();
  const { showAlert } = useAlert();
  const existing: Transaction | undefined = route.params?.transaction;
  const month: string = route.params?.month ?? '';

  const [categories, setCategories] = useState<Category[]>([]);
  const [houseMembers, setHouseMembers] = useState<HouseMember[]>([]);
  const [date, setDate] = useState(existing?.date ?? (month ? `${month}-01` : today()));
  const [category, setCategory] = useState(existing?.category ?? 'Food');
  const [owner, setOwner] = useState<Owner>(existing?.owner ?? currentUser?.nickname ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [status, setStatus] = useState<PayStatus>(existing?.status ?? 'P');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existing?.paymentMethod ?? 'Card');
  const [saving, setSaving] = useState(false);

  const isPersonal = category === 'Personal';

  useEffect(() => {
    navigation.setOptions({ title: existing ? 'Edit Expense' : 'Add Expense' });
  }, [existing, navigation]);

  useEffect(() => {
    if (!currentHouse) return;
    getCategories(currentHouse.id).then(setCategories);
    getHouseMembers(currentHouse.id).then(setHouseMembers);
  }, [currentHouse]);

  const handleDelete = () => {
    if (!existing) return;
    showAlert('Delete Expense', `Delete "${existing.description}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteTransaction(existing.id);
        navigation.goBack();
      }},
    ]);
  };

  const handleSave = async () => {
    if (!description.trim()) { showAlert('Required', 'Please enter a description.'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { showAlert('Invalid', 'Please enter a valid amount.'); return; }

    setSaving(true);
    try {
      const txMonth = date.substring(0, 7);
      if (existing) {
        await updateTransaction({ ...existing, date, owner, category, description: description.trim(), amount: amt, status, paymentMethod });
      } else {
        await addTransaction({ date, owner, category, description: description.trim(), amount: amt, status, month: txMonth, paymentMethod }, currentHouse!.id);
      }
      navigation.goBack();
    } catch (e: any) {
      showAlert('Error', e.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <DatePickerInput label="Date" value={date} onChange={setDate} />

        {/* Category — moved after Date */}
        <Label text="Category" />
        <View style={styles.catGrid}>
          {categories.map((c) => {
            const active = category === c.name;
            const chipColor = categoryColor[c.name] ?? Colors.primary;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catChip, active && { backgroundColor: chipColor, borderColor: chipColor }]}
                onPress={() => setCategory(c.name)}
              >
                <Ionicons
                  name={(c.icon ?? 'help-circle-outline') as any}
                  size={14}
                  color={active ? '#fff' : (chipColor)}
                />
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c.name}</Text>
                {c.isRecurring && (
                  <View style={[styles.catFlag, { backgroundColor: active ? 'rgba(255,255,255,0.28)' : Colors.primary + '20' }]}>
                    <Ionicons name="repeat" size={9} color={active ? '#fff' : Colors.primary} />
                  </View>
                )}
                {c.isOutOfPocket && (
                  <View style={[styles.catFlag, { backgroundColor: active ? 'rgba(255,255,255,0.28)' : '#F59E0B20' }]}>
                    <Ionicons name="person" size={9} color={active ? '#fff' : '#F59E0B'} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.catLegend}>
          <Ionicons name="repeat" size={10} color={Colors.primary} />
          <Text style={styles.catLegendText}>Recurring</Text>
          <Ionicons name="person" size={10} color="#F59E0B" style={{ marginLeft: 10 }} />
          <Text style={styles.catLegendText}>Out of pocket</Text>
        </View>

        {/* Owner — label changes based on category */}
        <Label text={isPersonal ? 'Owner' : 'Paid By'} />
        <View style={styles.segmented}>
          {houseMembers.map((m, i) => (
            <TouchableOpacity
              key={m.nickname}
              style={[styles.segment, owner === m.nickname && styles.segmentActive, owner === m.nickname && { backgroundColor: USER_COLORS[i % USER_COLORS.length] }]}
              onPress={() => setOwner(m.nickname)}
            >
              <Text style={[styles.segmentText, owner === m.nickname && styles.segmentTextActive]}>{m.nickname}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Label text="Description" />
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. HEB groceries"
          placeholderTextColor={Colors.textMuted}
        />

        {/* Amount */}
        <Label text="Amount ($)" />
        <TextInput
          style={[styles.input, styles.amountInput]}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={Colors.textMuted}
        />

        {/* Payment status */}
        <Label text="Payment Status" />
        <View style={styles.segmented}>
          {[{ label: 'Paid', value: 'P' as PayStatus }, { label: 'Not Paid', value: 'NP' as PayStatus }].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segment, status === opt.value && styles.segmentActive, status === opt.value && { backgroundColor: opt.value === 'P' ? Colors.success : Colors.danger }]}
              onPress={() => setStatus(opt.value)}
            >
              <Text style={[styles.segmentText, status === opt.value && styles.segmentTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Method */}
        <Label text="Payment Method" />
        <View style={styles.segmented}>
          {([
            { label: 'Cash',    value: 'Cash' as PaymentMethod,    icon: 'cash-outline' },
            { label: 'Card',    value: 'Card' as PaymentMethod,    icon: 'card-outline' },
            { label: 'Account', value: 'Account' as PaymentMethod, icon: 'wallet-outline' },
          ]).map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.segment, paymentMethod === opt.value && styles.segmentActive, paymentMethod === opt.value && { backgroundColor: Colors.primary }]}
              onPress={() => setPaymentMethod(opt.value)}
            >
              <Ionicons name={opt.icon as any} size={14} color={paymentMethod === opt.value ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.segmentText, paymentMethod === opt.value && styles.segmentTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>{existing ? 'Update Expense' : 'Save Expense'}</Text>
        </TouchableOpacity>

        {existing && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Delete Expense</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  amountInput: { fontSize: 22, fontWeight: '700', textAlign: 'center', paddingVertical: 16 },
  segmented: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', gap: 5 },
  segmentActive: { borderColor: 'transparent' },
  segmentText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: '#fff' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  catChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  catFlag: { width: 16, height: 16, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  catLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  catLegendText: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 28, gap: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  deleteBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
});
