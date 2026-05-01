import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';
import { navigationRef } from '../navigation/navigationRef';

const logoImage = require('../../assets/icon.png');

interface Props {
  title: string;
  subtitle?: string;
}

export default function AppHeader({ title, subtitle }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.inner}>
        <TouchableOpacity
          style={styles.hamburger}
          onPress={() => navigationRef.isReady() && navigationRef.navigate('SettingsHome')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="menu-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.left}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.logoRow}>
          <Image source={logoImage} style={styles.logoIcon} resizeMode="contain" />
          <Text style={styles.logoText}>Salli</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.navy,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburger: {
    padding: 2,
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  logoText: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.yellow,
    letterSpacing: -0.5,
  },
});
