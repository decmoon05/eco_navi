import React, { useRef } from 'react';
import { Pressable, PressableProps, Animated, StyleSheet, Platform } from 'react-native';
import { Theme } from '../theme';

interface PressableCardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: any;
  disabled?: boolean;
}

/**
 * 카드 형태의 인터랙티브 요소에 사용하는 Pressable 컴포넌트
 * - Android: Ripple 효과
 * - iOS: 하이라이트 애니메이션
 */
const PressableCard: React.FC<PressableCardProps> = ({
  children,
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
        toValue: 0.98,
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

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{
        color: Theme.colors.primary + '20',
        borderless: false,
        radius: 200,
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
                backgroundColor: Theme.colors.primary + '10',
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
    overflow: 'hidden',
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  disabled: {
    opacity: 0.5,
  },
  iosPressed: {
    opacity: 0.95,
  },
});

export default PressableCard;

