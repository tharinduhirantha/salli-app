import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';

const splashImage  = require('./assets/splash.png');
const appIcon      = require('./assets/icon.png');

function isMobileDevice(): boolean {
  return true; // TEMP: disabled for debugging
  const ua = window.navigator.userAgent;
  const mobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const narrowScreen = window.screen.width <= 768;
  return mobileUA || narrowScreen;
}

function DesktopBlockScreen() {
  return (
    <View style={styles.block}>
      <Image source={appIcon} style={styles.blockIcon} />
      <Text style={styles.blockTitle}>Salli</Text>
      <Text style={styles.blockTagline}>Track. Review. Improve.</Text>
      <View style={styles.blockDivider} />
      <Text style={styles.blockMsg}>Salli is a mobile app.</Text>
      <Text style={styles.blockSub}>Please open this link on your phone.</Text>
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setReady(true);
    } else {
      import('./src/db/database').then(({ initDatabase }) =>
        initDatabase().then(() => setReady(true))
      );
    }
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <Image source={splashImage} style={styles.splashImage} resizeMode="cover" />
      </View>
    );
  }

  if (!isMobileDevice()) {
    return <DesktopBlockScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0D1B3E',
  },
  splashImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  block: {
    flex: 1,
    backgroundColor: '#0D1B3E',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  blockIcon: {
    width: 96,
    height: 96,
    borderRadius: 22,
    marginBottom: 20,
  },
  blockTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  blockTagline: {
    fontSize: 14,
    color: '#F5C100',
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  blockDivider: {
    width: 40,
    height: 3,
    backgroundColor: '#F5C100',
    borderRadius: 2,
    marginVertical: 32,
  },
  blockMsg: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  blockSub: {
    fontSize: 15,
    color: '#9AA5BC',
    textAlign: 'center',
    lineHeight: 22,
  },
});
