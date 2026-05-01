import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import { createHouse, requestJoinHouse } from '../db/queries';
import { useHouse } from '../context/HouseContext';
import { supabase } from '../lib/supabase';
import { Colors } from '../utils/theme';

type Mode = 'choose' | 'create' | 'join';

export default function HouseSetupScreen() {
  const { refresh, pendingRequest, cancelPending } = useHouse();
  const { showAlert } = useAlert();
  const [mode, setMode]           = useState<Mode>('choose');
  const [houseName, setHouseName] = useState('');
  const [joinCode, setJoinCode]   = useState('');
  const [loading, setLoading]     = useState(false);

  const handleCreate = async () => {
    if (!houseName.trim()) { showAlert('Required', 'Please enter a house name.'); return; }
    setLoading(true);
    try { await createHouse(houseName.trim()); await refresh(); }
    catch (e: any) { showAlert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (joinCode.trim().length !== 6) { showAlert('Invalid', 'Join code must be 6 characters.'); return; }
    setLoading(true);
    try {
      await requestJoinHouse(joinCode.trim());
      await refresh();
    }
    catch (e: any) { showAlert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleCancelRequest = () => {
    showAlert(
      'Cancel Request',
      `Cancel your join request for "${pendingRequest?.houseName}"?`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel Request', style: 'destructive', onPress: async () => { await cancelPending(); } },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={styles.header}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
            <Text style={styles.appName}>Salli</Text>
            <Text style={styles.tagline}>Track. Review. Improve.</Text>
          </View>

          <Text style={styles.title}>Set Up Your Household</Text>
          {!pendingRequest && (
            <Text style={styles.subtitle}>Create a new household or join an existing one with an invite code.</Text>
          )}

          {pendingRequest && pendingRequest.status === 'rejected' && (
            <View style={styles.rejectedCard}>
              <View style={[styles.pendingIcon, { backgroundColor: Colors.dangerLight }]}>
                <Ionicons name="close-circle-outline" size={28} color={Colors.danger} />
              </View>
              <Text style={[styles.pendingTitle, { color: Colors.danger }]}>Request Rejected</Text>
              <Text style={styles.pendingDesc}>
                The owner of{'\n'}
                <Text style={styles.pendingHouse}>{pendingRequest.houseName}</Text>
                {'\n'}declined your request.
              </Text>
              <TouchableOpacity style={styles.tryAgainBtn} onPress={cancelPending}>
                <Text style={styles.tryAgainText}>Try Another House</Text>
              </TouchableOpacity>
            </View>
          )}

          {pendingRequest && pendingRequest.status === 'pending' && (
            <View style={styles.pendingCard}>
              <View style={styles.pendingIcon}>
                <Ionicons name="time-outline" size={28} color={Colors.yellow} />
              </View>
              <Text style={styles.pendingTitle}>Request Pending</Text>
              <Text style={styles.pendingDesc}>
                Waiting for the owner of{'\n'}
                <Text style={styles.pendingHouse}>{pendingRequest.houseName}</Text>
                {'\n'}to approve your request.
              </Text>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRequest}>
                <Text style={styles.cancelBtnText}>Cancel Request</Text>
              </TouchableOpacity>
            </View>
          )}

          {!pendingRequest && mode === 'choose' && (
            <View style={styles.options}>
              <TouchableOpacity style={styles.optionCard} onPress={() => setMode('create')} activeOpacity={0.85}>
                <View style={[styles.optionIcon, { backgroundColor: Colors.yellowLight }]}>
                  <Ionicons name="home-outline" size={26} color={Colors.yellow} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Create a Household</Text>
                  <Text style={styles.optionDesc}>Start fresh and invite others to join</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionCard} onPress={() => setMode('join')} activeOpacity={0.85}>
                <View style={[styles.optionIcon, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="person-add-outline" size={26} color={Colors.navy} />
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Join a Household</Text>
                  <Text style={styles.optionDesc}>Enter a 6-character invite code</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {!pendingRequest && mode === 'create' && (
            <View style={styles.card}>
              <TouchableOpacity style={styles.backRow} onPress={() => setMode('choose')}>
                <Ionicons name="arrow-back" size={18} color={Colors.navy} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.cardTitle}>Create Household</Text>

              <View style={styles.fieldWrap}>
                <Ionicons name="home-outline" size={18} color={Colors.textMuted} style={styles.fieldIcon} />
                <TextInput
                  style={styles.fieldInput}
                  value={houseName}
                  onChangeText={setHouseName}
                  placeholder="e.g. The Smiths"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
              </View>
              <Text style={styles.hint}>An invite code is generated automatically — share it from Settings.</Text>

              <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={styles.btnText}>Create Household</Text></>
                }
              </TouchableOpacity>
            </View>
          )}

          {!pendingRequest && mode === 'join' && (
            <View style={styles.card}>
              <TouchableOpacity style={styles.backRow} onPress={() => setMode('choose')}>
                <Ionicons name="arrow-back" size={18} color={Colors.navy} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.cardTitle}>Join a Household</Text>

              <View style={[styles.fieldWrap, styles.codeWrap]}>
                <TextInput
                  style={[styles.fieldInput, styles.codeInput]}
                  value={joinCode}
                  onChangeText={t => setJoinCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  placeholder="ABC123"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  autoFocus
                />
              </View>
              <Text style={styles.hint}>Ask your household member for the 6-character code from their Settings page.</Text>

              <TouchableOpacity style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handleJoin} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="enter-outline" size={20} color="#fff" /><Text style={styles.btnText}>Join Household</Text></>
                }
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.signOutBtn} onPress={() => supabase.auth.signOut()}>
            <Ionicons name="log-out-outline" size={15} color={Colors.textMuted} />
            <Text style={styles.signOutText}>Sign out / Switch account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom wave */}
      <View style={styles.waveContainer} pointerEvents="none">
        <View style={styles.yellowStripe} />
        <View style={styles.navyWave} />
      </View>
    </View>
  );
}

const WAVE_HEIGHT = 130;

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F4F6FA' },
  inner:   { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: WAVE_HEIGHT + 32 },

  header:  { alignItems: 'center', marginBottom: 32 },
  logo:    { width: 72, height: 72, borderRadius: 16, marginBottom: 10 },
  appName: { fontSize: 28, fontWeight: '900', color: Colors.navy, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },

  title:    { fontSize: 22, fontWeight: '800', color: Colors.navy, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 24 },

  options:     { gap: 14 },
  optionCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 18, padding: 18, gap: 14, borderWidth: 1.5, borderColor: Colors.border, shadowColor: Colors.navy, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
  optionIcon:  { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionText:  { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  optionDesc:  { fontSize: 13, color: Colors.textSecondary },

  card:      { backgroundColor: Colors.card, borderRadius: 24, padding: 24, shadowColor: Colors.navy, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  backRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText:  { fontSize: 14, color: Colors.navy, fontWeight: '600' },
  cardTitle: { fontSize: 20, fontWeight: '800', color: Colors.navy, marginBottom: 20 },

  fieldWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F6FA', borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, height: 52, marginBottom: 10 },
  fieldIcon:  { marginRight: 10 },
  fieldInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  codeWrap:   { justifyContent: 'center' },
  codeInput:  { fontSize: 26, fontWeight: '800', letterSpacing: 8, textAlign: 'center' },

  hint: { fontSize: 12, color: Colors.textMuted, lineHeight: 18, marginBottom: 4 },

  btn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.navy, borderRadius: 16, height: 54, marginTop: 20, shadowColor: Colors.navy, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  btnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },

  waveContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: WAVE_HEIGHT, overflow: 'hidden' },
  yellowStripe:  { position: 'absolute', top: 0, left: 0, right: 0, height: 18, backgroundColor: Colors.yellow, borderTopLeftRadius: 60, borderTopRightRadius: 20 },
  navyWave:      { position: 'absolute', top: 14, left: 0, right: 0, bottom: 0, backgroundColor: Colors.navy, borderTopLeftRadius: 50, borderTopRightRadius: 10 },

  pendingCard:   { backgroundColor: Colors.card, borderRadius: 24, padding: 24, alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.yellow + '60', shadowColor: Colors.navy, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  pendingIcon:   { width: 60, height: 60, borderRadius: 18, backgroundColor: Colors.yellowLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  pendingTitle:  { fontSize: 18, fontWeight: '800', color: Colors.navy },
  pendingDesc:   { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  pendingHouse:  { fontWeight: '800', color: Colors.navy },
  cancelBtn:     { marginTop: 8, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.danger },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: Colors.danger },
  rejectedCard:  { backgroundColor: Colors.card, borderRadius: 24, padding: 24, alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: Colors.danger + '40', shadowColor: Colors.navy, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  tryAgainBtn:   { marginTop: 8, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14, backgroundColor: Colors.navy },
  tryAgainText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
  signOutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32 },
  signOutText:   { fontSize: 13, color: Colors.textMuted },
});
