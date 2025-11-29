import React, { useRef } from 'react';
import { Pressable, PressableProps, Animated, StyleSheet, View, Platform } from 'react-native';
import { Theme } from '../theme';

interface PressableButtonProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
  style?: any;
  disabled?: boolean;
}

/**
 * 향상된 터치 피드백을 제공하는 버튼 컴포넌트
 * - Android: Ripple 효과 (기본 제공)
 * - iOS: 하이라이트 애니메이션
 */
const PressableButton: React.FC<PressableButtonProps> = ({
  children,
  variant = 'default',
  style,
  disabled,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(highlightAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(highlightAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const getRippleColor = () => {
    switch (variant) {
      case 'primary':
        return Theme.colors.primary + '40';
      case 'secondary':
        return Theme.colors.secondary + '40';
      case 'outline':
        return Theme.colors.primary + '20';
      default:
        return Theme.colors.text + '20';
    }
  };

  const getHighlightColor = () => {
    switch (variant) {
      case 'primary':
        return Theme.colors.primary + '20';
      case 'secondary':
        return Theme.colors.secondary + '20';
      case 'outline':
        return Theme.colors.primary + '10';
      default:
        return Theme.colors.text + '10';
    }
  };

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{
        color: getRippleColor(),
        borderless: false,
        radius: 200, // 더 넓은 ripple 효과
      }}
      style={({ pressed }) => [
        style,
        disabled && styles.disabled,
        Platform.OS === 'ios' && pressed && styles.iosPressed,
      ]}
    >
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {Platform.OS === 'ios' && (
          <Animated.View
            style={[
              styles.highlightOverlay,
              {
                backgroundColor: getHighlightColor(),
                opacity: highlightAnim,
              },
            ]}
            pointerEvents="none"
          />
        )}
        {children}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Theme.borderRadius.medium,
  },
  disabled: {
    opacity: 0.5,
  },
  iosPressed: {
    opacity: 0.8,
  },
});

export default PressableButton;

