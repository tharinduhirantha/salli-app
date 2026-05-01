import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../utils/theme';

interface Props {
  children: React.ReactNode;
  innerStyle?: ViewStyle;
}

export default function ScreenWrapper({ children, innerStyle }: Props) {
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, innerStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  inner: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    overflow: 'hidden',
  },
});
