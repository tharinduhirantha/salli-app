import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

interface GuideItem {
  icon: string;
  title: string;
  color: string;
  sections: { heading: string; body: string }[];
}

const GUIDE: GuideItem[] = [
  {
    icon: 'home-outline',
    title: 'Dashboard',
    color: Colors.primary,
    sections: [
      {
        heading: 'What it shows',
        body: 'A monthly overview of all house expenses broken down by category. Each category row shows the total spent and how much each member owes.',
      },
      {
        heading: 'Category popup',
        body: 'Tap any category row to open a popup showing the per-member breakdown ("Name Owes $200") and the individual transactions inside it.',
      },
      {
        heading: 'Month navigation',
        body: 'Use the ← → arrows at the top to switch months. The selected month applies to every screen in the app — you only need to change it once.',
      },
    ],
  },
  {
    icon: 'receipt-outline',
    title: 'Expenses',
    color: '#8B5CF6',
    sections: [
      {
        heading: 'Adding an expense',
        body: 'Tap the + button to add a new expense. Fill in the date, category, description, amount, payment method and who paid (owner).',
      },
      {
        heading: 'Categories & split',
        body: 'Each category has a split rule set in Settings. "House" categories split the cost between members according to salary ratio or 50/50. "Personal" categories belong to the owner alone.',
      },
      {
        heading: 'Payment status',
        body: '"P" (Paid) means the expense has been settled. "NP" (Not Paid) means it is still outstanding and will appear in the due total.',
      },
      {
        heading: 'Payment methods',
        body: 'Cash, Card and Account. These are used to group totals in the Status → Due Payments section so you know which method still has outstanding balances.',
      },
    ],
  },
  {
    icon: 'card-outline',
    title: 'Recurring Payments',
    color: '#F97316',
    sections: [
      {
        heading: 'What are recurring payments?',
        body: 'Fixed monthly costs like rent, loan instalments, subscriptions and bills. They are separate from day-to-day expenses and tracked by month.',
      },
      {
        heading: 'Split methods',
        body: '"Salary %" splits the total proportionally based on each member\'s salary ratio set in Settings.\n"50/50" divides equally.\n"Custom" lets you enter exact amounts per person.',
      },
      {
        heading: 'Payment status (Paid / Not Paid)',
        body: 'For each member, enter the amount they paid and toggle Paid or Not Paid.\n• Paid → that amount is recorded as settled.\n• Not Paid → recorded as unpaid regardless of the amount shown.\nThe sum of all entered amounts must equal the total before saving.',
      },
      {
        heading: 'Paid By badges',
        body: 'In the payment list, each row shows a green "Name ✓" badge for members who are marked Paid, and a red "Due" badge if any member is still unpaid.',
      },
      {
        heading: 'Copying from previous month',
        body: 'In Settings you can copy last month\'s recurring payments into the current month. Paid amounts are reset to zero so you start fresh each month.',
      },
    ],
  },
  {
    icon: 'stats-chart-outline',
    title: 'Status',
    color: Colors.ma,
    sections: [
      {
        heading: 'Personal cards',
        body: 'Each household member gets a card showing their House Expenses total, Personal Expenses total, and a Grand Total combining both.',
      },
      {
        heading: 'Due Payments (Settlement)',
        body: 'Lists all recurring payments that have at least one member marked Not Paid. Grouped by payment method (Card, Account, Cash).',
      },
      {
        heading: 'Mark Paid button',
        body: 'Tap a "Name Mark Paid" button to instantly mark that member as paid for that recurring payment. A green "Name Paid" badge appears once settled.',
      },
      {
        heading: 'Due logic',
        body: '• All members Not Paid → shows "Due" only.\n• Some paid, some not → shows paid badges + "Due".\n• All paid → not listed (fully settled).',
      },
    ],
  },
  {
    icon: 'bar-chart-outline',
    title: 'Yearly',
    color: '#22C55E',
    sections: [
      {
        heading: 'Annual overview',
        body: 'See totals across all 12 months for the current year — useful for spotting spending trends and comparing months at a glance.',
      },
    ],
  },
  {
    icon: 'settings-outline',
    title: 'Settings',
    color: '#6B7A99',
    sections: [
      {
        heading: 'Household members',
        body: 'Add members, set their full name, nickname and salary. The salary is used for the "Salary %" split calculation in recurring payments and expense splits.',
      },
      {
        heading: 'Categories',
        body: 'Create and manage expense categories. Each category has a split type (House or Personal) and can be marked as Recurring to appear in the recurring payment type picker.',
      },
      {
        heading: 'Copy recurring payments',
        body: 'Copies all recurring payments from the previous month into the current month with paid amounts reset to zero. Use this at the start of each month.',
      },
      {
        heading: 'House join code',
        body: 'Share the house join code with another person so they can join your household and see shared expenses.',
      },
    ],
  },
  {
    icon: 'bulb-outline',
    title: 'Tips & Key Concepts',
    color: '#F59E0B',
    sections: [
      {
        heading: 'Global month selector',
        body: 'The month shown at the top of any screen is shared across the entire app. Change it on Dashboard, Expenses, Recurring or Status — they all stay in sync.',
      },
      {
        heading: 'Recurring vs Expenses',
        body: 'Use Recurring for fixed predictable costs (rent, loans, subscriptions). Use Expenses for variable day-to-day spending (groceries, fuel, dining).',
      },
      {
        heading: 'Paid amount vs Paid status',
        body: 'In Recurring payments, the amount field and the Paid/Not Paid toggle are independent. You can enter a full amount but mark it Not Paid — this records the allocation without settling it.',
      },
      {
        heading: 'One person pays everything',
        body: 'If one member pays the full recurring amount on behalf of everyone, enter the full total in their field and mark them Paid. The other member\'s field can be 0. The due section will show the correct outstanding balance.',
      },
      {
        heading: 'Long press to delete',
        body: 'Long press any expense or recurring payment row to delete it.',
      },
    ],
  },
];

export default function GuideScreen() {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const toggle = (i: number) =>
    setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <View style={s.outer}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Ionicons name="book-outline" size={32} color={Colors.primary} />
          <Text style={s.heroTitle}>How Salli Works</Text>
          <Text style={s.heroSub}>Everything you need to know to manage your household budget.</Text>
        </View>

        {GUIDE.map((item, i) => {
          const open = expanded[i] ?? false;
          return (
            <View key={item.title} style={s.card}>
              <TouchableOpacity style={s.cardHeader} onPress={() => toggle(i)} activeOpacity={0.75}>
                <View style={[s.iconBox, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>

              {open && (
                <View style={s.cardBody}>
                  {item.sections.map((sec, si) => (
                    <View key={si} style={[s.section, si < item.sections.length - 1 && s.sectionBorder]}>
                      <View style={[s.sectionDot, { backgroundColor: item.color }]} />
                      <View style={s.sectionText}>
                        <Text style={[s.sectionHeading, { color: item.color }]}>{sec.heading}</Text>
                        <Text style={s.sectionBody}>{sec.body}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={s.footer}>
          <Ionicons name="heart-outline" size={16} color={Colors.textMuted} />
          <Text style={s.footerText}>Salli — your household budget companion</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  outer:   { flex: 1 },
  content: { padding: 16, paddingTop: 28, paddingBottom: 48, gap: 12 },

  hero:      { alignItems: 'center', paddingVertical: 24, gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  heroSub:   { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },

  card:       { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  iconBox:    { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle:  { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  cardBody:      { paddingHorizontal: 16, paddingBottom: 8 },
  section:       { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  sectionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  sectionDot:    { width: 4, borderRadius: 2, marginTop: 4, alignSelf: 'flex-start', minHeight: 14 },
  sectionText:   { flex: 1, gap: 4 },
  sectionHeading:{ fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBody:   { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },

  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  footerText: { fontSize: 12, color: Colors.textMuted },
});
