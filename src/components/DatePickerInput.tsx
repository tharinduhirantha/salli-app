import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

interface Props {
  value: string; // ISO date string YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function DatePickerInput({ value, onChange, label }: Props) {
  const [show, setShow] = useState(false);
  const date = parseDate(value || toISO(new Date()));

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) onChange(toISO(selected));
  };

  // Web: use native HTML date input
  if (Platform.OS === 'web') {
    return (
      <View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View style={styles.trigger}>
          <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
          {/* @ts-ignore — web-only input element */}
          <input
            type="date"
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              fontSize: 15, color: Colors.textPrimary, fontWeight: '500',
              outline: 'none', cursor: 'pointer', width: '100%',
            }}
          />
        </View>
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TouchableOpacity style={styles.trigger} onPress={() => setShow(true)} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
          <Text style={styles.triggerText}>{formatDisplay(value)}</Text>
          <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
        </TouchableOpacity>
        <Modal visible={show} transparent animationType="fade">
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShow(false)}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.doneBtn}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleChange}
                style={{ width: '100%' }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // Android
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.trigger} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
        <Text style={styles.triggerText}>{formatDisplay(value)}</Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.primary + '60',
    paddingHorizontal: 14, paddingVertical: 13,
  },
  triggerText: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  doneBtn: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});
