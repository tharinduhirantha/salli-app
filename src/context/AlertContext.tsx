import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../utils/theme';

// On web, use a DOM portal so the alert renders above all React Native Modals
const webPortal: ((node: React.ReactNode, container: Element) => React.ReactPortal) | null =
  Platform.OS === 'web' ? require('react-dom').createPortal : null;

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertConfig {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertCtx = createContext<AlertContextType>({ showAlert: () => {} });

export function useAlert() {
  return useContext(AlertCtx);
}

function getIconConfig(title: string): { icon: string; color: string } {
  const t = title.toLowerCase();
  if (t.includes('delete') || t.includes('remove')) return { icon: 'trash-outline',            color: Colors.danger };
  if (t.includes('leave'))                           return { icon: 'log-out-outline',           color: Colors.danger };
  if (t.includes('error') || t.includes('failed'))   return { icon: 'alert-circle-outline',      color: Colors.danger };
  if (t.includes('invalid') || t.includes('required') ||
      t.includes('mismatch') || t.includes('weak'))  return { icon: 'warning-outline',           color: Colors.ma };
  if (t.includes('copied') || t.includes('sent') ||
      t.includes('saved') || t.includes('success'))  return { icon: 'checkmark-circle-outline',  color: Colors.success };
  return                                                     { icon: 'information-circle-outline', color: Colors.primary };
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const showAlert = useCallback((
    title: string,
    message?: string,
    buttons?: AlertButton[],
  ) => {
    setConfig({ title, message, buttons: buttons ?? [{ text: 'OK' }] });
  }, []);

  const dismiss = () => setConfig(null);

  const { icon, color } = config
    ? getIconConfig(config.title)
    : { icon: 'information-circle-outline', color: Colors.primary };

  const alertUI = (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.iconCircle, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon as any} size={30} color={color} />
        </View>
        <Text style={styles.title}>{config?.title}</Text>
        {!!config?.message && (
          <Text style={styles.message}>{config.message}</Text>
        )}
        <View style={[
          styles.btnRow,
          (config?.buttons.length ?? 0) === 1 && { justifyContent: 'center' },
        ]}>
          {config?.buttons.map((btn, i) => {
            const isCancel      = btn.style === 'cancel';
            const isDestructive = btn.style === 'destructive';
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.btn,
                  (config!.buttons.length > 1) && { flex: 1 },
                  isCancel      && styles.btnCancel,
                  isDestructive && styles.btnDestructive,
                  !isCancel && !isDestructive && styles.btnPrimary,
                ]}
                onPress={() => { dismiss(); btn.onPress?.(); }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.btnText,
                  isCancel && styles.btnTextCancel,
                  (isDestructive || (!isCancel && !isDestructive)) && styles.btnTextFilled,
                ]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  return (
    <AlertCtx.Provider value={{ showAlert }}>
      {children}
      {Platform.OS === 'web'
        ? (config && webPortal ? webPortal(alertUI, document.body) : null)
        : (
          <Modal
            visible={!!config}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={dismiss}
          >
            {alertUI}
          </Modal>
        )
      }
    </AlertCtx.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13,27,62,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    ...(Platform.OS === 'web' && { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }),
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  btnPrimary:     { backgroundColor: Colors.primary },
  btnDestructive: { backgroundColor: Colors.danger },
  btnCancel:      { backgroundColor: Colors.bg, borderWidth: 1.5, borderColor: Colors.border },
  btnText:        { fontSize: 15, fontWeight: '700' },
  btnTextFilled:  { color: '#fff' },
  btnTextCancel:  { color: Colors.textSecondary },
});
