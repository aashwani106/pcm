import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';

export type FeedbackType = 'success' | 'error' | 'warning';

export interface FeedbackPopupProps {
  visible: boolean;
  type: FeedbackType;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

function getTypeConfig(type: FeedbackType) {
  if (type === 'success') {
    return {
      icon: 'checkmark-circle',
      tint: '#2E7D32',
      glow: 'rgba(76, 175, 80, 0.18)',
    } as const;
  }

  if (type === 'warning') {
    return {
      icon: 'warning',
      tint: '#ED8D0A',
      glow: 'rgba(237, 141, 10, 0.18)',
    } as const;
  }

  return {
    icon: 'close-circle',
    tint: Colors.error,
    glow: 'rgba(211, 47, 47, 0.18)',
  } as const;
}

export function FeedbackPopup({
  visible,
  type,
  title,
  message,
  buttonText = 'OK',
  onClose,
}: FeedbackPopupProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      scale.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.2)) });
    } else {
      opacity.value = withTiming(0, { duration: 120, easing: Easing.in(Easing.cubic) });
      scale.value = withTiming(0.94, { duration: 120, easing: Easing.in(Easing.cubic) });
    }
  }, [opacity, scale, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const config = getTypeConfig(type);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.cardWrapper, animatedStyle]}>
          <BlurView intensity={28} tint="light" style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: config.glow }]}>
              <Ionicons name={config.icon} size={46} color={config.tint} />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <Pressable style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>{buttonText}</Text>
            </Pressable>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
  },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: 24,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontFamily: Typography.body,
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  button: {
    minWidth: 140,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  buttonText: {
    fontFamily: Typography.heading,
    color: Colors.white,
    fontSize: 16,
  },
});
