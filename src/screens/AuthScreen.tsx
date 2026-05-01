import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Dimensions, Image,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { upsertProfile } from '../db/queries';
import { Colors } from '../utils/theme';

const { width, height } = Dimensions.get('window');

// Set to true to re-enable email OTP verification on signup
const EMAIL_VERIFICATION_ENABLED = true;

type Step = 'signin' | 'signup' | 'verify';

export default function AuthScreen() {
  const { showAlert } = useAlert();
  const [step, setStep]         = useState<Step>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [pendingEmail, setPendingEmail]       = useState('');
  const [pendingFullName, setPendingFullName] = useState('');
  const [pendingNickname, setPendingNickname] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      showAlert('Required', 'Please enter email and password.'); return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    });
    setLoading(false);
    if (error) showAlert('Sign In Failed', error.message);
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password || !fullName.trim() || !nickname.trim()) {
      showAlert('Required', 'Please fill in all fields.'); return;
    }
    if (nickname.trim().length !== 2) {
      showAlert('Invalid', 'Nickname must be exactly 2 letters.'); return;
    }
    if (password !== confirm) {
      showAlert('Mismatch', 'Passwords do not match.'); return;
    }
    if (password.length < 6) {
      showAlert('Weak password', 'Password must be at least 6 characters.'); return;
    }
    const nick = nickname.trim().toUpperCase();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim(), nickname: nick } },
    });
    setLoading(false);
    if (error) { showAlert('Sign Up Failed', error.message); return; }
    if (!EMAIL_VERIFICATION_ENABLED) {
      if (data.user) {
        try { await upsertProfile({ id: data.user.id, nickname: nick, fullName: fullName.trim() }); } catch {}
      }
      return;
    }
    if (data.session && data.user) {
      try { await upsertProfile({ id: data.user.id, nickname: nick, fullName: fullName.trim() }); } catch {}
      return;
    }
    setPendingEmail(email.trim().toLowerCase());
    setPendingFullName(fullName.trim());
    setPendingNickname(nick);
    setStep('verify');
  };

  const handleVerify = async () => {
    if (!otp.trim()) { showAlert('Required', 'Please enter the confirmation code.'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: pendingEmail, token: otp.trim(), type: 'signup',
    });
    if (error) { setLoading(false); showAlert('Verification Failed', error.message); return; }
    if (data.user) {
      try {
        await upsertProfile({ id: data.user.id, nickname: pendingNickname, fullName: pendingFullName });
      } catch {}
    }
    setLoading(false);
  };

  const resendOtp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
    setLoading(false);
    if (error) showAlert('Error', error.message);
    else showAlert('Sent', 'A new code has been sent to your email.');
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header illustration area ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {step === 'signin' && (
                <>
                  <Text style={styles.greeting}>Welcome back! 👋</Text>
                  <Text style={styles.subGreeting}>Sign in to continue to Salli</Text>
                </>
              )}
              {step === 'signup' && (
                <>
                  <Text style={styles.greeting}>Create account 🎉</Text>
                  <Text style={styles.subGreeting}>Set up your Salli profile</Text>
                </>
              )}
              {step === 'verify' && (
                <>
                  <Text style={styles.greeting}>Check email 📬</Text>
                  <Text style={styles.subGreeting}>Enter the code we sent you</Text>
                </>
              )}
            </View>
            <View style={styles.illustration}>
              <Image source={require('../../assets/icon.png')} style={styles.illustrationImg} />
            </View>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>
            {step === 'signin' && (
              <>
                <IconField
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <IconField
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry={!showPass}
                  rightIcon={showPass ? 'eye-off-outline' : 'eye-outline'}
                  onRightIcon={() => setShowPass(p => !p)}
                />
                <TouchableOpacity style={styles.forgotRow}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
                <PrimaryBtn label="Sign In" loading={loading} onPress={handleSignIn} />
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity style={styles.switchRow} onPress={() => setStep('signup')}>
                  <Text style={styles.switchText}>
                    Don't have an account?{'  '}
                    <Text style={styles.switchLink}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'signup' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setStep('signin')}>
                  <Ionicons name="arrow-back" size={18} color={Colors.navy} />
                  <Text style={styles.backText}>Back to Sign In</Text>
                </TouchableOpacity>
                <IconField
                  icon="person-outline"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full name"
                  autoCapitalize="words"
                />
                <IconField
                  icon="at-outline"
                  value={nickname}
                  onChangeText={t => setNickname(t.toUpperCase().slice(0, 2))}
                  placeholder="2-letter nickname (e.g. AB)"
                  autoCapitalize="characters"
                  maxLength={2}
                />
                <Text style={styles.hint}>This tag identifies you in shared expenses</Text>
                <IconField
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <IconField
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password (min. 6 characters)"
                  secureTextEntry={!showPass}
                  rightIcon={showPass ? 'eye-off-outline' : 'eye-outline'}
                  onRightIcon={() => setShowPass(p => !p)}
                />
                <IconField
                  icon="shield-checkmark-outline"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Confirm password"
                  secureTextEntry={!showConfirm}
                  rightIcon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  onRightIcon={() => setShowConfirm(p => !p)}
                />
                <PrimaryBtn label="Create Account" loading={loading} onPress={handleSignUp} />
              </>
            )}

            {step === 'verify' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setStep('signup')}>
                  <Ionicons name="arrow-back" size={18} color={Colors.navy} />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.verifyDesc}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={styles.verifyEmail}>{pendingEmail}</Text>
                </Text>
                <IconField
                  icon="keypad-outline"
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter 6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <PrimaryBtn label="Verify & Continue" loading={loading} onPress={handleVerify} />
                <TouchableOpacity style={styles.switchRow} onPress={resendOtp}>
                  <Text style={styles.switchText}>
                    Didn't receive it?{'  '}
                    <Text style={styles.switchLink}>Resend code</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ── Bottom tagline ── */}
          <Text style={styles.tagline}>Track. Review. Improve.</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Bottom wave decoration ── */}
      <View style={styles.waveContainer} pointerEvents="none">
        <View style={styles.yellowStripe} />
        <View style={styles.navyWave} />
      </View>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function IconField({
  icon, value, onChangeText, placeholder, secureTextEntry,
  keyboardType, autoCapitalize, maxLength, rightIcon, onRightIcon,
}: {
  icon: any; value: string; onChangeText: (t: string) => void;
  placeholder?: string; secureTextEntry?: boolean;
  keyboardType?: any; autoCapitalize?: any; maxLength?: number;
  rightIcon?: any; onRightIcon?: () => void;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Ionicons name={icon} size={18} color={Colors.textMuted} style={fieldStyles.leadIcon} />
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        maxLength={maxLength}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIcon} style={fieldStyles.rightBtn}>
          <Ionicons name={rightIcon} size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function PrimaryBtn({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[btnStyles.btn, loading && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={btnStyles.label}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const WAVE_HEIGHT = 160;

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#F4F6FA' },
  scroll:     { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: WAVE_HEIGHT + 32 },

  header:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 28 },
  headerLeft: { flex: 1 },
  greeting:   { fontSize: 26, fontWeight: '800', color: Colors.navy, lineHeight: 34 },
  subGreeting:{ fontSize: 14, color: Colors.textSecondary, marginTop: 6 },

  illustration:    { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  illustrationImg: { width: 80, height: 80, borderRadius: 16 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.navy,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  forgotRow:  { alignSelf: 'flex-end', marginTop: 6, marginBottom: 4 },
  forgotText: { fontSize: 13, color: Colors.navy, fontWeight: '600' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine:{ flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText:{ fontSize: 13, color: Colors.textMuted, fontWeight: '500' },

  switchRow:  { alignItems: 'center', marginTop: 12 },
  switchText: { fontSize: 13, color: Colors.textMuted },
  switchLink: { color: Colors.primary, fontWeight: '700' },

  backRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText:   { fontSize: 14, color: Colors.navy, fontWeight: '600' },

  hint: { fontSize: 11, color: Colors.textMuted, marginTop: -4, marginBottom: 12, marginLeft: 4 },

  verifyDesc:  { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: 16 },
  verifyEmail: { fontWeight: '700', color: Colors.navy },

  tagline: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 24,
  },

  // Bottom wave
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: WAVE_HEIGHT,
    overflow: 'hidden',
  },
  yellowStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: Colors.yellow,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 20,
  },
  navyWave: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.navy,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 10,
  },
});

const fieldStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6FA',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 52,
  },
  leadIcon: { marginRight: 10 },
  input:    { flex: 1, fontSize: 15, color: Colors.textPrimary },
  rightBtn: { padding: 4, marginLeft: 6 },
});

const btnStyles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.navy,
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.navy,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
