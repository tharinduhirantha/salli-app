import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Modal, TextInput, Switch,
  useWindowDimensions,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getCategories, addCategory, updateCategory, deleteCategory, Category, getHouseMembers, HouseMember } from '../db/queries';
import { Colors } from '../utils/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { useHouse } from '../context/HouseContext';

type SplitOption = 'Half' | 'Salary' | 'Personal' | 'Full';

const SPLIT_OPTIONS: { value: SplitOption; label: string; desc: string; requiresOne?: boolean; requiresTwo?: boolean }[] = [
  { value: 'Full',     label: '100%',     desc: 'All to you',            requiresOne: true  },
  { value: 'Half',     label: '50/50',    desc: 'Split equally',         requiresTwo: true  },
  { value: 'Salary',   label: 'Salary %', desc: 'Split by salary ratio', requiresTwo: true  },
  { value: 'Personal', label: 'Personal', desc: 'Your own, not shared',  requiresTwo: true  },
];

const SPLIT_COLORS: Record<SplitOption, string> = {
  Full:     Colors.navy,
  Half:     Colors.success,
  Salary:   Colors.primary,
  Personal: Colors.ma,
};

const ICON_LIST: string[] = [
  'restaurant-outline', 'home-outline', 'car-outline', 'receipt-outline',
  'heart-outline', 'construct-outline', 'ellipsis-horizontal-circle-outline', 'game-controller-outline',
  'phone-portrait-outline', 'bag-handle-outline', 'globe-outline', 'car-sport-outline',
  'medkit-outline', 'card-outline', 'wallet-outline', 'person-outline',
  'cash-outline', 'cart-outline', 'gift-outline', 'cafe-outline',
  'airplane-outline', 'fitness-outline', 'musical-notes-outline', 'film-outline',
  'book-outline', 'briefcase-outline', 'school-outline', 'paw-outline',
  'leaf-outline', 'water-outline', 'flash-outline', 'wifi-outline',
  'tv-outline', 'laptop-outline', 'headset-outline', 'shirt-outline',
  'storefront-outline', 'bus-outline', 'train-outline', 'bicycle-outline',
  'pizza-outline', 'ice-cream-outline', 'flower-outline', 'sunny-outline',
  'ribbon-outline', 'football-outline', 'color-palette-outline', 'navigate-outline',
];

interface ModalState {
  visible: boolean;
  editing: Category | null;
  name: string;
  split: SplitOption;
  icon: string;
  isRecurring: boolean;
  isOutOfPocket: boolean;
}

export default function SettingsCategoriesScreen() {
  const { currentHouse } = useHouse();
  const { showAlert } = useAlert();
  const { height: winHeight } = useWindowDimensions();

  const [cats, setCats]       = useState<Category[]>([]);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [modal, setModal] = useState<ModalState>({
    visible: false, editing: null, name: '', split: 'Half', icon: 'help-circle-outline', isRecurring: false, isOutOfPocket: false,
  });

  const loadData = useCallback(async () => {
    if (!currentHouse) return;
    const [c, m] = await Promise.all([
      getCategories(currentHouse.id),
      getHouseMembers(currentHouse.id),
    ]);
    setCats(c);
    setMembers(m);
  }, [currentHouse]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const openAdd  = () => setModal({ visible: true, editing: null, name: '', split: members.length < 2 ? 'Full' : 'Half', icon: 'help-circle-outline', isRecurring: false, isOutOfPocket: false });
  const openEdit = (cat: Category) => setModal({ visible: true, editing: cat, name: cat.name, split: members.length < 2 ? 'Full' : cat.split, icon: cat.icon ?? 'help-circle-outline', isRecurring: cat.isRecurring ?? false, isOutOfPocket: cat.isOutOfPocket ?? false });
  const closeModal = () => setModal(prev => ({ ...prev, visible: false }));

  const handleSave = async () => {
    const name = modal.name.trim();
    if (!name) { showAlert('Required', 'Please enter a category name.'); return; }
    try {
      if (modal.editing) {
        await updateCategory({ ...modal.editing, name, split: modal.split, icon: modal.icon, isRecurring: modal.isRecurring, isOutOfPocket: modal.isOutOfPocket });
      } else {
        const maxOrder = cats.length > 0 ? Math.max(...cats.map(c => c.sortOrder)) : 0;
        await addCategory({ name, split: modal.split, sortOrder: maxOrder + 1, icon: modal.icon, isRecurring: modal.isRecurring, isOutOfPocket: modal.isOutOfPocket }, currentHouse!.id);
      }
      closeModal();
      loadData();
    } catch { showAlert('Error', 'A category with that name may already exist.'); }
  };

  const handleDelete = (cat: Category) => {
    showAlert(
      'Delete Category',
      `Delete "${cat.name}"?\n\nExisting transactions will remain but won't affect house calculations.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteCategory(cat.id); loadData(); } },
      ]
    );
  };

  const visibleCats = cats
    .filter(cat => members.length >= 2 || cat.split !== 'Personal')
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ScreenWrapper>
      <ScrollView style={s.container} contentContainerStyle={s.content}>

        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Categories</Text>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={s.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          {visibleCats.map((cat, idx, arr) => (
            <TouchableOpacity
              key={cat.id}
              style={[s.catRow, idx < arr.length - 1 && s.catRowBorder]}
              onPress={() => openEdit(cat)}
            >
              <View style={[s.catIcon, { backgroundColor: SPLIT_COLORS[cat.split] + '18' }]}>
                <Ionicons name={cat.icon as any ?? 'help-circle-outline'} size={16} color={SPLIT_COLORS[cat.split]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.catName}>{cat.name}</Text>
                {(cat.isRecurring || cat.isOutOfPocket) && (
                  <Text style={s.catTags}>
                    {[cat.isRecurring && 'recurring', cat.isOutOfPocket && 'out of pocket'].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
              <View style={[s.splitBadge, { backgroundColor: SPLIT_COLORS[cat.split] + '20' }]}>
                <Text style={[s.splitBadgeText, { color: SPLIT_COLORS[cat.split] }]}>
                  {SPLIT_OPTIONS.find(o => o.value === cat.split)?.label ?? cat.split}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
          {visibleCats.length === 0 && (
            <Text style={s.mutedText}>No categories yet. Tap Add to create one.</Text>
          )}
        </View>

      </ScrollView>

      {/* Category Modal */}
      <Modal visible={modal.visible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <View style={[s.modalCard, { maxHeight: winHeight * 0.85 }]}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{modal.editing ? 'Edit Category' : 'Add Category'}</Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                <Text style={s.modalLabel}>Name</Text>
                <TextInput
                  style={s.modalInput}
                  value={modal.name}
                  onChangeText={name => setModal(prev => ({ ...prev, name }))}
                  placeholder="e.g. Groceries"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />

                <Text style={s.modalLabel}>Split Rule</Text>
                {members.length < 2 ? (
                  <View style={s.splitLockedRow}>
                    <View style={[s.splitOption, { backgroundColor: SPLIT_COLORS['Full'], borderColor: SPLIT_COLORS['Full'], flex: 1 }]}>
                      <Text style={[s.splitOptionLabel, { color: '#fff' }]}>100%</Text>
                      <Text style={[s.splitOptionDesc, { color: '#fff' }]}>All to you</Text>
                    </View>
                    <Ionicons name="lock-closed" size={13} color={Colors.textMuted} style={{ padding: 6 }} />
                  </View>
                ) : (
                  <View style={s.splitOptions}>
                    {SPLIT_OPTIONS.filter(o => !o.requiresOne).map(opt => {
                      const isDisabled = opt.value === 'Salary' && members.length < 2;
                      const isSelected = modal.split === opt.value && !isDisabled;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          disabled={isDisabled}
                          style={[
                            s.splitOption,
                            isSelected && { backgroundColor: SPLIT_COLORS[opt.value], borderColor: SPLIT_COLORS[opt.value] },
                            isDisabled && { opacity: 0.38 },
                          ]}
                          onPress={() => setModal(prev => ({ ...prev, split: opt.value }))}
                        >
                          <Text style={[s.splitOptionLabel, isSelected && { color: '#fff' }, isDisabled && { color: Colors.textMuted }]}>{opt.label}</Text>
                          <Text style={[s.splitOptionDesc, isSelected && { color: '#fff' }, isDisabled && { color: Colors.textMuted }]}>{opt.desc}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={s.modalLabel}>Recurring Type</Text>
                <View style={s.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.toggleTitle}>Show in Recurring section</Text>
                    <Text style={s.toggleDesc}>e.g. Bill, Subscription, Installment</Text>
                  </View>
                  <Switch
                    value={modal.isRecurring}
                    onValueChange={v => setModal(prev => ({ ...prev, isRecurring: v }))}
                    trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                    thumbColor={modal.isRecurring ? Colors.primary : Colors.textMuted}
                  />
                </View>

                <Text style={s.modalLabel}>Out of Pocket</Text>
                <View style={s.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.toggleTitle}>Paying out of pocket</Text>
                    <Text style={s.toggleDesc}>Individual pays this from their own account or card.</Text>
                  </View>
                  <Switch
                    value={modal.isOutOfPocket}
                    onValueChange={v => setModal(prev => ({ ...prev, isOutOfPocket: v }))}
                    trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                    thumbColor={modal.isOutOfPocket ? Colors.primary : Colors.textMuted}
                  />
                </View>

                <Text style={s.modalLabel}>Icon</Text>
                <View style={s.iconPreviewRow}>
                  <View style={[s.iconPreviewCircle, { backgroundColor: SPLIT_COLORS[modal.split] + '18' }]}>
                    <Ionicons name={modal.icon as any} size={22} color={SPLIT_COLORS[modal.split]} />
                  </View>
                  <Text style={s.iconPreviewName}>{modal.icon}</Text>
                </View>
                <View style={s.iconGrid}>
                  {ICON_LIST.map(ico => (
                    <TouchableOpacity
                      key={ico}
                      style={[s.iconCell, modal.icon === ico && { backgroundColor: SPLIT_COLORS[modal.split], borderColor: SPLIT_COLORS[modal.split] }]}
                      onPress={() => setModal(prev => ({ ...prev, icon: ico }))}
                    >
                      <Ionicons name={ico as any} size={20} color={modal.icon === ico ? '#fff' : Colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                  <Text style={s.saveBtnText}>{modal.editing ? 'Update' : 'Add Category'}</Text>
                </TouchableOpacity>

                {modal.editing && (
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => { closeModal(); handleDelete(modal.editing!); }}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    <Text style={s.deleteBtnText}>Delete Category</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  content:         { padding: 16, paddingTop: 28, paddingBottom: 60 },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionHeaderRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  card:            { backgroundColor: Colors.card, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  addBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText:      { fontSize: 13, fontWeight: '600', color: Colors.primary },
  catRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  catRowBorder:    { borderBottomWidth: 1, borderBottomColor: Colors.border },
  catIcon:         { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catName:         { fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  catTags:         { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  splitBadge:      { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8 },
  splitBadgeText:  { fontSize: 11, fontWeight: '700' },
  mutedText:       { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', ...(Platform.OS === 'web' && { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0 }) },
  modalCard:       { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle:      { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalLabel:      { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput:      { backgroundColor: Colors.bg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  splitOptions:    { flexDirection: 'row', gap: 8, marginBottom: 4 },
  splitOption:     { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bg, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  splitOptionLabel:{ fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  splitOptionDesc: { fontSize: 10, color: Colors.textMuted, textAlign: 'center' },
  splitLockedRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  toggleRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 10 },
  toggleTitle:     { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  toggleDesc:      { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  iconPreviewRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconPreviewCircle:{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconPreviewName: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  iconGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  iconCell:        { width: 42, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  saveBtn:         { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10 },
  deleteBtnText:   { fontSize: 14, fontWeight: '600', color: Colors.danger },
});
