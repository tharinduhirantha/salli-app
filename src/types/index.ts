export type SplitType = 'Half' | 'Split' | 'TH' | 'MA';
export type PayStatus = 'P' | 'NP';
export type PaidStatus = 'Paid' | 'Not Paid';
export type Owner = string; // user's 2-letter nickname
export type PaymentMethod = 'Cash' | 'Card' | 'Account';

export interface Profile {
  id: string;
  nickname: string;
  fullName: string;
  email?: string;
}

export interface Transaction {
  id: string;
  date: string;
  owner: Owner;
  category: string;
  description: string;
  amount: number;
  status: PayStatus;
  month: string;
  paymentMethod: PaymentMethod;
  merchant?: string;
}

export interface RecurringPaymentShare {
  userId: string;
  pay: number;
  paid: number;
  isPaid: boolean;
}

export interface RecurringPayment {
  id: string;
  name: string;
  dueDate: string;
  type: string;
  amount: number;
  userShares: RecurringPaymentShare[];
  month: string;
  paymentMethod: PaymentMethod;
}

export interface Settings {
  thSalary: number;
  maSalary: number;
  thName: string;
  maName: string;
}

export const EXPENSE_CATEGORIES = [
  'Food', 'Household', 'Car', 'Bill', 'Baby', 'Maintenance',
  'Other', 'Fun', 'Subscription', 'Shopping', 'Online', 'Taxi',
  'Medicine', 'Installment', 'Deposit', 'Personal',
] as const;

export const RECURRING_TYPES = [
  'House Payments', 'Car Payments', 'Bill', 'Baby', 'Subscription', 'Installment',
] as const;

export const MONTHS = [
  'Jan', 'Feb', 'March', 'April', 'May', 'June',
  'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
] as const;
