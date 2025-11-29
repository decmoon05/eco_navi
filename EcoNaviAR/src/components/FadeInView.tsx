import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  duration?: number;
}

/**
 * 페이드인 애니메이션 래퍼 컴포넌트
 */
const FadeInView: React.FC<FadeInViewProps> = ({ 
  children, 
  style, 
  delay = 0,
  duration = 400 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default FadeInView;



