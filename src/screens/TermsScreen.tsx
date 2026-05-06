import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Linking, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

const EFFECTIVE_DATE = 'May 3, 2025';
const CONTACT_EMAIL  = 'contact@salli.online';

type Section = { title: string; body: string };

const SECTIONS: Section[] = [
  {
    title: '1. Acceptance of Terms',
    body:
      'By creating an account or using Salli, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the application.',
  },
  {
    title: '2. Description of Service',
    body:
      'Salli is a personal household budget-tracking application that helps users record transactions, manage recurring payments, track personal expenses, and review spending trends. Salli is designed for personal, non-commercial use by households of up to four members.',
  },
  {
    title: '3. User Accounts',
    body:
      'You must provide a valid email address and create a password to use Salli. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must notify us immediately at ' +
      CONTACT_EMAIL +
      ' if you suspect unauthorised access to your account. We reserve the right to suspend or terminate accounts that violate these terms.',
  },
  {
    title: '4. Household Data & Sharing',
    body:
      'Salli allows you to create or join a shared household. When you join a household, other members of that household can view shared transaction records, recurring payments, and budget summaries. You acknowledge that financial information entered into a shared household is visible to all members of that household. Do not enter sensitive information you do not wish to share with household members.',
  },
  {
    title: '5. Data Storage & Security',
    body:
      'Your data is stored on secure cloud servers provided by Supabase. We implement reasonable technical and organisational measures to protect your data. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security. By using Salli, you accept this inherent risk.',
  },
  {
    title: '6. Privacy',
    body:
      'We collect and store the information you provide, including your name, email address, nickname, and financial records you enter into the app. We do not sell, rent, or share your personal data with third parties for marketing purposes. We may use anonymised, aggregated data to improve the application. Your use of Salli constitutes acceptance of our data practices as described in this section.',
  },
  {
    title: '7. No Financial Advice',
    body:
      'Salli is a budgeting tool only. Nothing in the app constitutes financial, investment, tax, or legal advice. Any calculations or summaries displayed are based solely on the data you enter and are for informational purposes only. Always consult a qualified financial professional for advice specific to your situation.',
  },
  {
    title: '8. Acceptable Use',
    body:
      'You agree not to use Salli for any unlawful purpose, to attempt to gain unauthorised access to the system or other users\' data, to upload malicious code or content, or to interfere with the normal operation of the service. Violation of these rules may result in immediate account termination.',
  },
  {
    title: '9. Intellectual Property',
    body:
      'All content, design, code, and branding within Salli — including the name "Salli," its logo, and its interface — are the intellectual property of the Salli development team. You may not copy, distribute, or create derivative works without prior written consent.',
  },
  {
    title: '10. Limitation of Liability',
    body:
      'To the fullest extent permitted by law, Salli and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or goodwill, arising out of or related to your use of the app, even if advised of the possibility of such damages. Our total liability to you for any claim shall not exceed the amount you paid (if any) for the service in the twelve months preceding the claim.',
  },
  {
    title: '11. Service Availability',
    body:
      'We strive to keep Salli available at all times but do not guarantee uninterrupted access. We may modify, suspend, or discontinue the service at any time without notice. We are not liable for any loss resulting from service downtime or discontinuation.',
  },
  {
    title: '12. Changes to Terms',
    body:
      'We may update these Terms and Conditions from time to time. We will notify you of material changes by updating the "Effective Date" at the top of this page. Continued use of Salli after changes are posted constitutes your acceptance of the revised terms.',
  },
  {
    title: '13. Governing Law',
    body:
      'These Terms are governed by and construed in accordance with the laws of the State of Texas, United States, without regard to its conflict of law provisions.',
  },
  {
    title: '14. Contact',
    body:
      'If you have any questions or concerns about these Terms and Conditions, please contact us at ' + CONTACT_EMAIL + '.',
  },
];

export default function TermsScreen() {
  const navigation = useNavigation();

  return (
    <View style={s.root}>
      {/* Custom header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms &amp; Conditions</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <Ionicons name="document-text" size={28} color={Colors.navy} />
          </View>
          <Text style={s.heroTitle}>Terms &amp; Conditions</Text>
          <Text style={s.heroSub}>Effective date: {EFFECTIVE_DATE}</Text>
          <Text style={s.heroBody}>
            Please read these terms carefully before using Salli. They describe your rights and
            responsibilities as a user of the service.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map(sec => (
          <View key={sec.title} style={s.section}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            <Text style={s.sectionBody}>{sec.body}</Text>
          </View>
        ))}

        {/* Contact footer */}
        <TouchableOpacity
          style={s.contactRow}
          onPress={() => Linking.openURL('mailto:' + CONTACT_EMAIL)}
          activeOpacity={0.7}
        >
          <Ionicons name="mail-outline" size={18} color={Colors.navy} />
          <Text style={s.contactText}>{CONTACT_EMAIL}</Text>
          <Ionicons name="open-outline" size={14} color={Colors.textMuted} />
        </TouchableOpacity>

        <Text style={s.footerNote}>Salli — Track. Review. Improve.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn:     { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF18' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  content: { padding: 16, paddingBottom: 48 },

  // Hero
  heroCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  heroIcon:  { width: 60, height: 60, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: Colors.navy, marginBottom: 4 },
  heroSub:   { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  heroBody:  { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Sections
  section: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy, marginBottom: 8 },
  sectionBody:  { fontSize: 13, color: Colors.textSecondary, lineHeight: 21 },

  // Contact
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  contactText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.navy },

  footerNote: { textAlign: 'center', fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
});
