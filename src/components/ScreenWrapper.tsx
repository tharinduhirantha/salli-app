import React from 'react';
import { View, StyleSheet, ViewStyle, Platform, useWindowDimensions } from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';
import { Colors } from '../utils/theme';

interface Props {
  children: React.ReactNode;
  innerStyle?: ViewStyle;
}

export default function ScreenWrapper({ children, innerStyle }: Props) {
  const headerHeight = React.useContext(HeaderHeightContext) ?? 56;
  const { height } = useWindowDimensions();

  return (
    <View style={styles.outer}>
      <View style={[
        styles.inner,
        Platform.OS === 'web' && { height: height - headerHeight },
        innerStyle,
      ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: Platform.OS === 'web' ? 0 : -24,
    overflow: 'hidden',
  },
});
