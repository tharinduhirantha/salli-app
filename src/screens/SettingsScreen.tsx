import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { supabase } from '../lib/supabase';
import { useHouse } from '../context/HouseContext';

const MENU_ITEMS = [
  {
    screen: 'ProfileHousehold',
    icon: 'person-circle-outline' as const,
    color: Colors.th,
    title: 'Profile & Household',
    desc: 'Your profile, members and joining',
  },
  {
    screen: 'SalarySplit',
    icon: 'wallet-outline' as const,
    color: Colors.success,
    title: 'Salary Split',
    desc: 'Income-based expense splits',
  },
  {
    screen: 'Categories',
    icon: 'grid-outline' as const,
    color: Colors.ma,
    title: 'Categories',
    desc: 'Manage expense categories',
  },
];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { currentHouse } = useHouse();

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={s.content}>

        {currentHouse && (
          <View style={s.houseChip}>
            <Ionicons name="home" size={14} color={Colors.primary} />
            <Text style={s.houseChipText}>{currentHouse.name}</Text>
            <View style={[s.roleBadge, currentHouse.role === 'owner' && { backgroundColor: Colors.yellow + '30' }]}>
              <Text style={[s.roleText, currentHouse.role === 'owner' && { color: Colors.yellowDark }]}>
                {currentHouse.role === 'owner' ? 'Owner' : 'Member'}
              </Text>
            </View>
          </View>
        )}

        <View style={s.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.screen}
              style={[s.menuRow, i < MENU_ITEMS.length - 1 && s.menuBorder]}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[s.menuIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={s.menuText}>
                <Text style={s.menuTitle}>{item.title}</Text>
                <Text style={s.menuDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* How Salli Works — always last */}
        <TouchableOpacity style={s.guideBtn} onPress={() => navigation.navigate('Guide')}>
          <Ionicons name="book-outline" size={18} color={Colors.primary} />
          <Text style={s.guideBtnText}>How Salli Works</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL('mailto:contact@salli.online')}>
          <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
          <View style={{ flex: 1 }}>
            <Text style={s.contactTitle}>Contact Us</Text>
            <Text style={s.contactEmail}>contact@salli.online</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.signOutBtn} onPress={() => supabase.auth.signOut()}>
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>Salli v2.0</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  content:       { padding: 16, paddingTop: 28, paddingBottom: 60 },
  houseChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.card, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 8, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  houseChipText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  roleBadge:     { backgroundColor: Colors.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText:      { fontSize: 11, fontWeight: '700', color: Colors.primary },
  menuCard:      { backgroundColor: Colors.card, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  menuRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 14 },
  menuBorder:    { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuIcon:      { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  menuText:      { flex: 1 },
  menuTitle:     { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  menuDesc:      { fontSize: 12, color: Colors.textMuted },
  guideBtn:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: Colors.border },
  guideBtnText:  { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.primary },
  contactBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: Colors.border },
  contactTitle:  { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  contactEmail:  { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  signOutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: Colors.danger, borderRadius: 14, paddingVertical: 14, marginTop: 12 },
  signOutText:   { fontSize: 15, fontWeight: '600', color: Colors.danger },
  version:       { textAlign: 'center', fontSize: 12, color: Colors.textMuted, marginTop: 16 },
});
