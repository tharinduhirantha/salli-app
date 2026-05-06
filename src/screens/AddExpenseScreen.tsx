import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { addTransaction, updateTransaction, deleteTransaction, getCategories, getHouseMembers, getMerchants, HouseMember, Category, Merchant } from '../db/queries';
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
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [catSearch, setCatSearch] = useState('');
  const [merchantSearch, setMerchantSearch] = useState('');
  const [date, setDate] = useState(existing?.date ?? (month ? `${month}-01` : today()));
  const [category, setCategory] = useState(existing?.category ?? 'Food');
  const [owner, setOwner] = useState<Owner>(existing?.owner ?? currentUser?.nickname ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [status, setStatus] = useState<PayStatus>(existing?.status ?? 'NP');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(existing?.paymentMethod ?? 'Card');
  const [merchant, setMerchant] = useState<string>(existing?.merchant ?? '');
  const [saving, setSaving] = useState(false);
  const [catExpanded, setCatExpanded] = useState(false);
  const [merchantExpanded, setMerchantExpanded] = useState(false);

  const isPersonal = category === 'Personal';

  useEffect(() => {
    navigation.setOptions({ title: existing ? 'Edit Expense' : 'Add Expense' });
  }, [existing, navigation]);

  useEffect(() => {
    if (!currentHouse) return;
    getCategories(currentHouse.id).then(cats => setCategories(cats.filter(c => !c.isRecurring)));
    getHouseMembers(currentHouse.id).then(setHouseMembers);
    getMerchants(currentHouse.id).then(setMerchants);
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
        await updateTransaction({ ...existing, date, owner, category, description: description.trim(), amount: amt, status, paymentMethod, merchant: merchant || undefined });
      } else {
        await addTransaction({ date, owner, category, description: description.trim(), amount: amt, status, month: txMonth, paymentMethod, merchant: merchant || undefined }, currentHouse!.id);
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

        {/* Date + Category — side by side */}
        <View style={styles.inlineRow}>
          <View style={styles.inlineCol}>
            <Label text="Date" />
            <DatePickerInput value={date} onChange={setDate} />
          </View>
          <View style={styles.inlineCol}>
            <Label text="Category" />
            {(() => {
              const sel = categories.find(c => c.name === category);
              const chipColor = sel ? (categoryColor[sel.name] ?? Colors.primary) : Colors.primary;
              return (
                <TouchableOpacity
                  style={[styles.catSelector, { borderColor: catExpanded ? chipColor : Colors.border }]}
                  onPress={() => setCatExpanded(e => !e)}
                  activeOpacity={0.8}
                >
                  {sel && <Ionicons name={(sel.icon ?? 'help-circle-outline') as any} size={15} color={chipColor} />}
                  <Text style={[styles.catSelectorText, { color: chipColor }]} numberOfLines={1}>
                    {category || 'Select…'}
                  </Text>
                  <Ionicons name={catExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={Colors.textMuted} />
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>

        {/* Category picker panel */}
        {catExpanded && (
          <View style={styles.catPanel}>
            <View style={styles.catGrid}>
              {categories.slice(0, 5).map((c) => {
                const active = category === c.name;
                const chipColor = categoryColor[c.name] ?? Colors.primary;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, active && { backgroundColor: chipColor, borderColor: chipColor }]}
                    onPress={() => { setCategory(c.name); setCatSearch(''); setCatExpanded(false); }}
                  >
                    <Ionicons name={(c.icon ?? 'help-circle-outline') as any} size={13} color={active ? '#fff' : chipColor} />
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.catSearchWrap}>
              <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
              <TextInput
                style={styles.catSearchInput}
                value={catSearch}
                onChangeText={setCatSearch}
                placeholder="Search all categories…"
                placeholderTextColor={Colors.textMuted}
              />
              {!!catSearch && (
                <TouchableOpacity onPress={() => setCatSearch('')}>
                  <Ionicons name="close-circle" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {catSearch.length > 0 && (
              <View style={styles.catDropdown}>
                {categories
                  .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
                  .map((c) => {
                    const active = category === c.name;
                    const chipColor = categoryColor[c.name] ?? Colors.primary;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.catDropRow, active && { backgroundColor: chipColor + '18' }]}
                        onPress={() => { setCategory(c.name); setCatSearch(''); setCatExpanded(false); }}
                      >
                        <View style={[styles.catDropIcon, { backgroundColor: chipColor + '22' }]}>
                          <Ionicons name={(c.icon ?? 'help-circle-outline') as any} size={14} color={chipColor} />
                        </View>
                        <Text style={[styles.catDropText, active && { color: chipColor, fontWeight: '700' }]}>{c.name}</Text>
                        {active && <Ionicons name="checkmark" size={14} color={chipColor} />}
                      </TouchableOpacity>
                    );
                  })}
              </View>
            )}
          </View>
        )}

        {/* Paid By + Payment Status — side by side */}
        <View style={styles.inlineRow}>
          <View style={styles.inlineCol}>
            <Label text={isPersonal ? 'Owner' : 'Paid By'} />
            <View style={styles.segmented}>
              {houseMembers.map((m, i) => (
                <TouchableOpacity
                  key={m.nickname}
                  style={[styles.segment, owner === m.nickname && styles.segmentActive, owner === m.nickname && { backgroundColor: USER_COLORS[i % USER_COLORS.length] }]}
                  onPress={() => setOwner(m.nickname)}
                >
                  <Text style={[styles.segmentSmall, owner === m.nickname && styles.segmentTextActive]}>{m.nickname}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inlineCol}>
            <Label text="Status" />
            <View style={styles.segmented}>
              {[{ label: 'Paid', value: 'P' as PayStatus }, { label: 'Unpaid', value: 'NP' as PayStatus }].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.segment, status === opt.value && styles.segmentActive, status === opt.value && { backgroundColor: opt.value === 'P' ? Colors.success : Colors.danger }]}
                  onPress={() => setStatus(opt.value)}
                >
                  <Text style={[styles.segmentSmall, status === opt.value && styles.segmentTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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

        {/* Merchant (optional) */}
        <Label text="Merchant (optional)" />
        <TouchableOpacity
          style={[styles.catSelector, { borderColor: merchantExpanded ? Colors.primary : Colors.border }]}
          onPress={() => { setMerchantExpanded(e => !e); setMerchantSearch(''); }}
          activeOpacity={0.8}
        >
          <Ionicons name="storefront-outline" size={15} color={merchant ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.catSelectorText, { color: merchant ? Colors.textPrimary : Colors.textMuted }]} numberOfLines={1}>
            {merchant || 'Select merchant…'}
          </Text>
          {merchant ? (
            <TouchableOpacity onPress={() => { setMerchant(''); setMerchantExpanded(false); }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <Ionicons name={merchantExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={Colors.textMuted} />
          )}
        </TouchableOpacity>
        {merchantExpanded && (
          <View style={styles.catPanel}>
            <View style={styles.catSearchWrap}>
              <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
              <TextInput
                style={styles.catSearchInput}
                value={merchantSearch}
                onChangeText={setMerchantSearch}
                placeholder="Search merchants…"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              {!!merchantSearch && (
                <TouchableOpacity onPress={() => setMerchantSearch('')}>
                  <Ionicons name="close-circle" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.catDropdown}>
              {merchants
                .filter(m => !merchantSearch || m.name.toLowerCase().includes(merchantSearch.toLowerCase()))
                .map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.catDropRow, merchant === m.name && { backgroundColor: Colors.primaryLight }]}
                    onPress={() => { setMerchant(m.name); setMerchantExpanded(false); setMerchantSearch(''); }}
                  >
                    <View style={[styles.catDropIcon, { backgroundColor: Colors.primaryLight }]}>
                      <Ionicons name="storefront-outline" size={14} color={Colors.primary} />
                    </View>
                    <Text style={[styles.catDropText, merchant === m.name && { color: Colors.primary, fontWeight: '700' }]}>{m.name}</Text>
                    {merchant === m.name && <Ionicons name="checkmark" size={14} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              {merchants.filter(m => !merchantSearch || m.name.toLowerCase().includes(merchantSearch.toLowerCase())).length === 0 && (
                <View style={[styles.catDropRow, { justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 13, color: Colors.textMuted }}>No merchants found</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Amount + Payment Method */}
        <View style={styles.inlineRow}>
          <View style={styles.inlineCol}>
            <Label text="Amount ($)" />
            <TextInput
              style={[styles.input, styles.amountInput]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={styles.inlineCol}>
            <Label text="Method" />
            <View style={styles.methodRow}>
              {([
                { label: 'Cash',    value: 'Cash' as PaymentMethod,    icon: 'cash-outline' },
                { label: 'Card',    value: 'Card' as PaymentMethod,    icon: 'card-outline' },
                { label: 'Account', value: 'Account' as PaymentMethod, icon: 'wallet-outline' },
              ]).map((opt) => {
                const active = paymentMethod === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.methodBtn, active && styles.methodBtnActive]}
                    onPress={() => setPaymentMethod(opt.value)}
                  >
                    <Ionicons name={opt.icon as any} size={13} color={active ? '#fff' : Colors.textSecondary} />
                    <Text style={[styles.methodBtnText, active && styles.methodBtnTextActive]} numberOfLines={1}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
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
  label: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  amountInput: { fontSize: 14, fontWeight: '700', textAlign: 'center', paddingVertical: 9 },
  methodRow: { flexDirection: 'row', gap: 5 },
  methodBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  methodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  methodBtnText: { fontSize: 9, fontWeight: '600', color: Colors.textSecondary },
  methodBtnTextActive: { color: '#fff' },
  inlineRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  inlineCol: { flex: 1 },
  segmented: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', gap: 4 },
  segmentActive: { borderColor: 'transparent' },
  segmentText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  segmentSmall: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: '#fff' },
  catSelector: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 13 },
  catSelectorText: { flex: 1, fontSize: 13, fontWeight: '600' },
  catPanel: { backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 10, marginTop: 4 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg },
  catChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  catSearchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8 },
  catSearchInput: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  catDropdown: { backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  catDropRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  catDropIcon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  catDropText: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, marginTop: 28, gap: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: Colors.danger, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  deleteBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
});
