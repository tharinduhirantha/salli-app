import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Image, StyleSheet, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { UserProvider } from '../context/UserContext';
import { HouseProvider, useHouse } from '../context/HouseContext';
import { AlertProvider } from '../context/AlertContext';
import { navigationRef } from './navigationRef';

import AuthScreen from '../screens/AuthScreen';
import HouseSetupScreen from '../screens/HouseSetupScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import FixedPaymentsScreen from '../screens/FixedPaymentsScreen';
import YearlyScreen from '../screens/YearlyScreen';
import InsightsScreen from '../screens/InsightsScreen';
import PersonalExpensesScreen from '../screens/PersonalExpensesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SettingsProfileScreen from '../screens/SettingsProfileScreen';
import SettingsSalaryScreen from '../screens/SettingsSalaryScreen';
import SettingsCategoriesScreen from '../screens/SettingsCategoriesScreen';
import SettingsMerchantsScreen from '../screens/SettingsMerchantsScreen';
import GuideScreen from '../screens/GuideScreen';
import TermsScreen from '../screens/TermsScreen';
import AppHeader from '../components/AppHeader';
import { Colors } from '../utils/theme';

const SCREEN_SUBTITLES: Record<string, string> = {
  Dashboard:    'Your household overview',
  Transactions: 'Track your spending',
  Recurring:    'Manage your recurring payments',
  Status:       'Personal expense tracker',
  Insights:     'Your financial health',
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const SETTINGS_HEADER_OPTS = {
  headerStyle: { backgroundColor: Colors.navy },
  headerTintColor: '#FFFFFF' as const,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 17, color: '#FFFFFF' as const },
  headerBackTitleVisible: false,
  cardStyle: {
    backgroundColor: Colors.navy,
    // On web, CardContent switches to minHeight:'100%' when body fills the screen,
    // expecting body-level scroll. That breaks inner ScrollViews.
    // Forcing overflow:'hidden' makes flex children shrink-to-fit, restoring scroll.
    ...(Platform.OS === 'web' && { flex: 1, overflow: 'hidden' as const }),
  },
};

function TransactionsStack() {
  return (
    <Stack.Navigator screenOptions={SETTINGS_HEADER_OPTS}>
      <Stack.Screen
        name="TransactionsList"
        component={TransactionsScreen}
        options={{ header: () => <AppHeader title="Expenses" subtitle={SCREEN_SUBTITLES.Transactions} /> }}
      />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense' }} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, any> = {
            Dashboard:    focused ? 'home'        : 'home-outline',
            Transactions: focused ? 'receipt'     : 'receipt-outline',
            Recurring:    focused ? 'card'        : 'card-outline',
            Status:       focused ? 'stats-chart' : 'stats-chart-outline',
            Insights:     focused ? 'bulb'         : 'bulb-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
        tabBarActiveTintColor:   '#FFFFFF',
        tabBarInactiveTintColor: '#6B7A99',
        tabBarStyle: {
          backgroundColor: Colors.navy,
          borderTopColor: Colors.navyLight,
          paddingBottom: Platform.OS === 'ios' ? 20 : 6,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: Colors.navy },
        header: ({ route: r }) => (
          <AppHeader
            title={r.name === 'Transactions' ? 'Expenses' : r.name}
            subtitle={SCREEN_SUBTITLES[r.name]}
          />
        ),
      })}
    >
      <Tab.Screen name="Dashboard"    component={DashboardScreen}        options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Transactions" component={TransactionsStack}      options={{ headerShown: false }} />
      <Tab.Screen name="Recurring"    component={FixedPaymentsScreen}    options={{ title: 'Recurring' }} />
      <Tab.Screen name="Status"       component={PersonalExpensesScreen} options={{ title: 'Status' }} />
      <Tab.Screen name="Insights"      component={InsightsScreen}         options={{ title: 'Insights' }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { currentHouse, refresh } = useHouse();
  const prevHouseRef = useRef<typeof currentHouse>(null);

  useEffect(() => {
    if (prevHouseRef.current === null && currentHouse !== null) {
      const key = `@salli/guideSeen_${currentHouse.id}`;
      AsyncStorage.getItem(key).then(seen => {
        if (!seen) {
          AsyncStorage.setItem(key, '1');
          setTimeout(() => {
            if (navigationRef.isReady()) navigationRef.navigate('Guide' as never);
          }, 400);
        }
      });
    }
    prevHouseRef.current = currentHouse;
  }, [currentHouse]);

  useEffect(() => {
    if (!currentHouse) return;
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { count } = await supabase
        .from('house_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('house_id', currentHouse.id);
      if (count === 0) refresh();
    }, 8000);
    return () => clearInterval(interval);
  }, [currentHouse?.id, refresh]);

  return (
    <Stack.Navigator screenOptions={SETTINGS_HEADER_OPTS}>
      {currentHouse ? (
        <>
          <Stack.Screen name="Main"             component={MainTabs}                 options={{ headerShown: false }} />
          <Stack.Screen name="SettingsHome"     component={SettingsScreen}           options={{ title: 'Settings' }} />
          <Stack.Screen name="ProfileHousehold" component={SettingsProfileScreen}    options={{ title: 'Profile & Household' }} />
          <Stack.Screen name="SalarySplit"      component={SettingsSalaryScreen}     options={{ title: 'Salary Split' }} />
          <Stack.Screen name="Categories"       component={SettingsCategoriesScreen} options={{ title: 'Categories' }} />
          <Stack.Screen name="Merchants"        component={SettingsMerchantsScreen}  options={{ title: 'Merchant / Expense' }} />
          <Stack.Screen name="Yearly"           component={YearlyScreen}             options={{ title: 'Yearly Breakdown' }} />
          <Stack.Screen name="Guide"            component={GuideScreen}              options={{ headerShown: false }} />
          <Stack.Screen name="Terms"            component={TermsScreen}              options={{ headerShown: false }} />
        </>
      ) : (
        <Stack.Screen name="HouseSetup" component={HouseSetupScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

const splashImage = require('../../assets/splash.png');

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <Image source={splashImage} style={styles.splashImage} resizeMode="cover" />
    </View>
  );
}

function AppContent() {
  const { isLoading } = useHouse();
  if (isLoading) return <SplashScreen />;
  return <RootNavigator />;
}

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  const verifySession = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      await supabase.auth.signOut();
      setSession(null);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    verifySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setSession(newSession);
        return;
      }
      if (_event === 'USER_UPDATED' || _event === 'SIGNED_OUT') {
        setIsRecovery(false);
      }
      setSession(newSession);
    });

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        // Use local session check only — avoids false logouts from network errors.
        // autoRefreshToken + onAuthStateChange handle token renewal automatically.
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (!s) setSession(null);
        });
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSub.remove();
    };
  }, [verifySession]);

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer ref={navigationRef}>
      <AlertProvider>
        {session && !isRecovery ? (
          <UserProvider>
            <HouseProvider>
              <AppContent />
            </HouseProvider>
          </UserProvider>
        ) : (
          <AuthScreen key={isRecovery ? 'recovery' : 'normal'} initialStep={isRecovery ? 'reset' : 'signin'} />
        )}
      </AlertProvider>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash:      { flex: 1, backgroundColor: '#0D1B3E' },
  splashImage: { flex: 1, width: '100%', height: '100%' },
});
