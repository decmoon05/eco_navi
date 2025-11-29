import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Theme } from '../theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, visible, onHide, duration = 3000 }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 나타나는 애니메이션
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 자동으로 사라지는 타이머
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle',
          backgroundColor: Theme.colors.success,
          iconColor: Theme.colors.backgroundLight,
        };
      case 'error':
        return {
          icon: 'alert-circle',
          backgroundColor: Theme.colors.error,
          iconColor: Theme.colors.backgroundLight,
        };
      case 'warning':
        return {
          icon: 'alert',
          backgroundColor: Theme.colors.warning,
          iconColor: Theme.colors.backgroundLight,
        };
      case 'info':
        return {
          icon: 'information',
          backgroundColor: Theme.colors.info,
          iconColor: Theme.colors.backgroundLight,
        };
      default:
        return {
          icon: 'information',
          backgroundColor: Theme.colors.info,
          iconColor: Theme.colors.backgroundLight,
        };
    }
  };

  const config = getToastConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.toast, { backgroundColor: config.backgroundColor }]}
        onPress={hideToast}
        activeOpacity={0.8}
      >
        <Icon name={config.icon} size={24} color={config.iconColor} />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <Icon name="close" size={18} color={config.iconColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingTop: 50, // SafeArea 고려
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
    minWidth: 200,
    maxWidth: Dimensions.get('window').width - 32,
    gap: Theme.spacing.sm,
    ...Theme.shadows.large,
  },
  message: {
    flex: 1,
    ...Theme.typography.body1,
    color: Theme.colors.backgroundLight,
    fontWeight: '600',
  },
  closeButton: {
    padding: Theme.spacing.xs / 2,
  },
});

export default Toast;

