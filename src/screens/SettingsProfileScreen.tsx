import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  upsertProfile, getHouseMembers, HouseMember, createHouse, requestJoinHouse,
  removeMemberFromHouse, getPendingJoinRequests, approveJoinRequest, rejectJoinRequest, JoinRequest,
} from '../db/queries';
import { Colors } from '../utils/theme';
import ScreenWrapper from '../components/ScreenWrapper';
import { useUser } from '../context/UserContext';
import { useHouse } from '../context/HouseContext';
import * as Clipboard from 'expo-clipboard';

const USER_COLORS = [Colors.th, Colors.ma, Colors.user3, Colors.user4];

export default function SettingsProfileScreen() {
  const { currentUser, allProfiles, refresh: refreshUsers, userEmail } = useUser();
  const { currentHouse, userHouses, switchHouse, refresh: refreshHouse } = useHouse();
  const { showAlert } = useAlert();

  const [members, setMembers]           = useState<HouseMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [newHouseName, setNewHouseName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [houseLoading, setHouseLoading] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName]             = useState('');
  const [editNickname, setEditNickname]     = useState('');
  const [profileSaving, setProfileSaving]   = useState(false);

  const loadData = useCallback(async () => {
    if (!currentHouse) return;
    const isOwner = currentHouse.role === 'owner';
    const [m, reqs] = await Promise.all([
      getHouseMembers(currentHouse.id),
      isOwner ? getPendingJoinRequests(currentHouse.id) : Promise.resolve([]),
    ]);
    setMembers(m);
    setJoinRequests(reqs);
  }, [currentHouse]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const name = editName.trim();
    const nick = editNickname.trim().toUpperCase();
    if (!name) { showAlert('Required', 'Please enter your name.'); return; }
    if (!nick || nick.length < 1 || nick.length > 4) { showAlert('Invalid', 'Nickname must be 1–4 characters.'); return; }
    if (currentHouse && nick !== currentUser.nickname) {
      const taken = members.filter(m => m.userId !== currentUser.id).map(m => m.nickname.toUpperCase());
      if (taken.includes(nick)) { showAlert('Nickname taken', `"${nick}" is already used by another member.`); return; }
    }
    setProfileSaving(true);
    try {
      await upsertProfile({ ...currentUser, fullName: name, nickname: nick });
      await refreshUsers();
      setEditingProfile(false);
    } catch (e: any) { showAlert('Error', e.message); }
    finally { setProfileSaving(false); }
  };

  const handleCreateHouse = async () => {
    if (!newHouseName.trim()) { showAlert('Required', 'Enter a house name.'); return; }
    setHouseLoading(true);
    try { await createHouse(newHouseName.trim()); setNewHouseName(''); await refreshHouse(); }
    catch (e: any) { showAlert('Error', e.message); }
    finally { setHouseLoading(false); }
  };

  const handleJoinHouse = async () => {
    if (joinCodeInput.trim().length !== 6) { showAlert('Invalid', 'Enter the 6-character invite code.'); return; }
    setHouseLoading(true);
    try {
      const { houseName: hn } = await requestJoinHouse(joinCodeInput.trim());
      setJoinCodeInput('');
      showAlert('Request Sent', `Your request to join "${hn}" has been sent. The owner will review it.`);
    } catch (e: any) { showAlert('Error', e.message); }
    finally { setHouseLoading(false); }
  };

  const handleRemoveMember = (member: HouseMember) => {
    const isSelf = member.userId === currentUser?.id;
    showAlert(
      isSelf ? 'Leave Household' : `Remove ${member.nickname}`,
      isSelf ? 'Leave this household?' : `Remove ${member.fullName} from this household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isSelf ? 'Leave' : 'Remove', style: 'destructive',
          onPress: async () => {
            try { await removeMemberFromHouse(currentHouse!.id, member.userId); await refreshHouse(); loadData(); }
            catch (e: any) { showAlert('Error', e.message); }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* My Profile */}
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>My Profile</Text>
            {currentUser && !editingProfile && (
              <TouchableOpacity onPress={() => { setEditName(currentUser.fullName); setEditNickname(currentUser.nickname); setEditingProfile(true); }}>
                <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={s.card}>
            {currentUser ? (
              editingProfile ? (
                <>
                  <Text style={s.fieldLabel}>FULL NAME</Text>
                  <TextInput style={s.input} value={editName} onChangeText={setEditName} placeholder="Your name" placeholderTextColor={Colors.textMuted} autoFocus />
                  <Text style={s.fieldLabel}>NICKNAME (1–4 chars)</Text>
                  <TextInput style={s.input} value={editNickname} onChangeText={t => setEditNickname(t.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))} placeholder="e.g. AB" placeholderTextColor={Colors.textMuted} autoCapitalize="characters" maxLength={4} />
                  <Text style={[s.fieldLabel, { marginTop: 8 }]}>EMAIL</Text>
                  <Text style={[s.input, { color: Colors.textMuted, paddingTop: 12 }]}>{userEmail ?? '—'}</Text>
                  <View style={s.profileEditBtns}>
                    <TouchableOpacity style={[s.inlineBtn, { flex: 1, backgroundColor: Colors.success }]} onPress={handleSaveProfile} disabled={profileSaving}>
                      <Text style={s.inlineBtnText}>{profileSaving ? 'Saving…' : 'Save'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.inlineBtn, { flex: 1, backgroundColor: Colors.border }]} onPress={() => setEditingProfile(false)}>
                      <Text style={[s.inlineBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={s.profileRow}>
                  <View style={[s.nickBadge, { backgroundColor: Colors.primary }]}>
                    <Text style={s.nickText}>{currentUser.nickname}</Text>
                  </View>
                  <View style={s.profileInfo}>
                    <Text style={s.profileName}>{currentUser.fullName}</Text>
                    <Text style={s.profileEmail}>{userEmail ?? 'No email'}</Text>
                  </View>
                </View>
              )
            ) : (
              <Text style={s.mutedText}>Loading profile...</Text>
            )}
          </View>

          {/* Current Household */}
          {currentHouse && (
            <>
              <Text style={s.sectionTitle}>Current Household</Text>
              <View style={s.card}>
                <View style={s.houseHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.houseName}>{currentHouse.name}</Text>
                    <Text style={s.houseRole}>{currentHouse.role === 'owner' ? 'Owner' : 'Member'}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.codeBox}
                    onPress={async () => {
                      try {
                        await (Clipboard as any).setStringAsync(currentHouse.joinCode);
                        showAlert('Copied!', `Invite code ${currentHouse.joinCode} copied.`);
                      } catch { showAlert('Invite Code', currentHouse.joinCode); }
                    }}
                  >
                    <Text style={s.codeLabel}>INVITE CODE</Text>
                    <Text style={s.codeValue}>{currentHouse.joinCode}</Text>
                    <Ionicons name="copy-outline" size={12} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                <Text style={[s.fieldLabel, { marginTop: 16 }]}>Members</Text>
                {members.map((m, i) => {
                  const isCurrentUser = m.userId === currentUser?.id;
                  const canRemove = currentHouse.role === 'owner' || isCurrentUser;
                  return (
                    <View key={m.userId} style={[s.memberRow, i < members.length - 1 && s.memberBorder]}>
                      <View style={[s.memberBadge, { backgroundColor: USER_COLORS[i % USER_COLORS.length] + '20' }]}>
                        <Text style={[s.memberBadgeText, { color: USER_COLORS[i % USER_COLORS.length] }]}>{m.nickname}</Text>
                      </View>
                      <View style={s.memberInfo}>
                        <Text style={s.memberName}>{m.fullName}{isCurrentUser ? ' (you)' : ''}</Text>
                        <Text style={s.memberRole}>{m.role === 'owner' ? 'Owner' : 'Member'}</Text>
                      </View>
                      {canRemove && (
                        <TouchableOpacity onPress={() => handleRemoveMember(m)} style={s.removeBtn}>
                          <Ionicons name="person-remove-outline" size={18} color={Colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Pending join requests (owner only) */}
          {currentHouse?.role === 'owner' && joinRequests.length > 0 && (
            <>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionTitle}>Join Requests</Text>
                <View style={s.reqBadge}>
                  <Text style={s.reqBadgeText}>{joinRequests.length}</Text>
                </View>
              </View>
              <View style={s.card}>
                {joinRequests.map((req, i) => (
                  <View key={req.id} style={[s.memberRow, i < joinRequests.length - 1 && s.memberBorder]}>
                    <View style={[s.memberBadge, { backgroundColor: Colors.primary + '20' }]}>
                      <Text style={[s.memberBadgeText, { color: Colors.primary }]}>{req.nickname}</Text>
                    </View>
                    <View style={s.memberInfo}>
                      <Text style={s.memberName}>{req.fullName || req.nickname}</Text>
                      <Text style={s.memberRole}>Requested {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[s.reqBtn, { backgroundColor: Colors.success }]}
                        onPress={async () => {
                          try { await approveJoinRequest(req.id, currentHouse.id, req.userId); await refreshHouse(); loadData(); }
                          catch (e: any) { showAlert('Error', e.message); }
                        }}
                      >
                        <Ionicons name="checkmark" size={13} color="#fff" />
                        <Text style={s.reqBtnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.reqBtn, { backgroundColor: Colors.danger }]}
                        onPress={() => showAlert('Reject Request', `Reject ${req.fullName}'s request?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Reject', style: 'destructive', onPress: async () => {
                            try { await rejectJoinRequest(req.id); loadData(); }
                            catch (e: any) { showAlert('Error', e.message); }
                          }},
                        ])}
                      >
                        <Ionicons name="close" size={13} color="#fff" />
                        <Text style={s.reqBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Switch household */}
          {userHouses.length > 1 && (
            <>
              <Text style={s.sectionTitle}>My Households</Text>
              <View style={s.card}>
                {userHouses.map((h, i) => (
                  <TouchableOpacity
                    key={h.id}
                    style={[s.houseRow, i < userHouses.length - 1 && s.memberBorder]}
                    onPress={() => switchHouse(h.id)}
                  >
                    <Ionicons name={h.id === currentHouse?.id ? 'home' : 'home-outline'} size={20} color={h.id === currentHouse?.id ? Colors.primary : Colors.textMuted} />
                    <Text style={[s.houseRowName, h.id === currentHouse?.id && { color: Colors.primary, fontWeight: '700' }]}>{h.name}</Text>
                    {h.id === currentHouse?.id && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Add Household */}
          <Text style={s.sectionTitle}>Add Household</Text>
          <View style={s.card}>
            <Text style={s.fieldLabel}>CREATE NEW HOUSEHOLD</Text>
            <View style={s.inlineRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={newHouseName} onChangeText={setNewHouseName} placeholder="Household name" placeholderTextColor={Colors.textMuted} />
              <TouchableOpacity style={s.inlineBtn} onPress={handleCreateHouse} disabled={houseLoading}>
                <Text style={s.inlineBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
            <Text style={[s.fieldLabel, { marginTop: 16 }]}>JOIN WITH INVITE CODE</Text>
            <View style={s.inlineRow}>
              <TextInput
                style={[s.input, s.codeInputSmall, { flex: 1 }]}
                value={joinCodeInput}
                onChangeText={t => setJoinCodeInput(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="ABC123"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                maxLength={6}
              />
              <TouchableOpacity style={[s.inlineBtn, { backgroundColor: Colors.success }]} onPress={handleJoinHouse} disabled={houseLoading}>
                <Text style={s.inlineBtnText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  content:         { padding: 16, paddingTop: 28, paddingBottom: 60 },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionHeaderRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  card:            { backgroundColor: Colors.card, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  fieldLabel:      { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 6, marginTop: 12 },
  input:           { backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: Colors.textPrimary },
  profileRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nickBadge:       { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nickText:        { fontSize: 16, fontWeight: '900', color: '#fff' },
  profileInfo:     { flex: 1 },
  profileName:     { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  profileEmail:    { fontSize: 12, color: Colors.textMuted },
  profileEditBtns: { flexDirection: 'row', gap: 8, marginTop: 16 },
  houseHeaderRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  houseName:       { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  houseRole:       { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  codeBox:         { alignItems: 'center', backgroundColor: Colors.primary + '12', borderRadius: 12, padding: 10, gap: 2 },
  codeLabel:       { fontSize: 9, fontWeight: '700', color: Colors.primary, letterSpacing: 0.8 },
  codeValue:       { fontSize: 18, fontWeight: '900', color: Colors.primary, letterSpacing: 3 },
  memberRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  memberBorder:    { borderBottomWidth: 1, borderBottomColor: Colors.border },
  memberBadge:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  memberBadgeText: { fontSize: 13, fontWeight: '800' },
  memberInfo:      { flex: 1 },
  memberName:      { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  memberRole:      { fontSize: 12, color: Colors.textMuted },
  removeBtn:       { padding: 4 },
  houseRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  houseRowName:    { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  inlineRow:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inlineBtn:       { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  inlineBtnText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  codeInputSmall:  { fontSize: 18, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
  mutedText:       { fontSize: 14, color: Colors.textMuted },
  reqBadge:        { backgroundColor: Colors.danger, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  reqBadgeText:    { fontSize: 11, fontWeight: '800', color: '#fff' },
  reqBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  reqBtnText:      { fontSize: 12, fontWeight: '700', color: '#fff' },
});
