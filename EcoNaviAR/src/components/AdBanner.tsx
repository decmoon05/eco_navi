import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Dimensions, TouchableOpacity, Animated, Text } from 'react-native';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface AdBannerProps {
  ads?: Array<{
    id: string;
    image: any; // require()로 불러온 이미지 또는 URL
    url?: string; // 광고 링크 (선택사항)
  }>;
  rotationInterval?: number; // 자동 전환 간격 (밀리초)
}

const SCREEN_WIDTH = Dimensions.get('window').width;

// 광고 이미지들
// 실제 이미지 파일은 assets/ads/ 폴더에 다음 파일명으로 저장하세요:
// 1. ad_recycling.png - "작은 분리수거, 큰 변화의 시작!" (분리수거 배너)
// 2. ad_eco_transport.png - "친환경 이동, 지구를 살립니다." (친환경 이동 배너)
// 3. ad_forest.png - "우리의 선택이 숲을 지킵니다." (숲 보호 배너)

// 광고 이미지 파일 사용
const defaultAds = [
  {
    id: '1',
    // 분리수거: "작은 분리수거, 큰 변화의 시작!"
    image: require('../../assets/ads/ad1.png'),
    url: undefined,
  },
  {
    id: '2',
    // 친환경 이동: "친환경 이동, 지구를 살립니다."
    image: require('../../assets/ads/ad2.png'),
    url: undefined,
  },
  {
    id: '3',
    // 숲 보호: "우리의 선택이 숲을 지킵니다."
    image: require('../../assets/ads/ad3.png'),
    url: undefined,
  },
];

const AdBanner: React.FC<AdBannerProps> = ({ 
  ads = defaultAds, 
  rotationInterval = 12000 // 기본 12초마다 전환
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const changeAd = (newIndex: number, updateIndexImmediately: boolean = false) => {
    if (updateIndexImmediately) {
      setCurrentIndex(newIndex);
      setImageError(false); // 이미지 에러 상태 초기화
    }
    
    // 페이드 아웃
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // 페이드 아웃 완료 후 이미지 변경 (아직 변경되지 않았으면)
      if (!updateIndexImmediately) {
        setCurrentIndex(newIndex);
        setImageError(false); // 이미지 에러 상태 초기화
      }
      // 페이드 인
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  useEffect(() => {
    if (ads.length <= 1) return;

    // 자동 로테이션
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % ads.length;
        changeAd(nextIndex, false);
        return nextIndex;
      });
    }, rotationInterval);
    
    intervalRef.current = interval;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [ads.length, rotationInterval]);

  const handleAdPress = (ad: typeof ads[0]) => {
    if (ad.url) {
      // 광고 링크가 있으면 외부 브라우저로 열기
      // Linking.openURL(ad.url);
    }
  };

  const handlePrev = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const prevIndex = (currentIndex - 1 + ads.length) % ads.length;
    changeAd(prevIndex, true);
    
    // 자동 로테이션 재시작
    setTimeout(() => {
      const restartInterval = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % ads.length;
          changeAd(nextIndex, false);
          return nextIndex;
        });
      }, rotationInterval);
      intervalRef.current = restartInterval;
    }, 600); // 애니메이션 완료 후 재시작
  };

  const handleNext = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const nextIndex = (currentIndex + 1) % ads.length;
    changeAd(nextIndex, true);
    
    // 자동 로테이션 재시작
    setTimeout(() => {
      const restartInterval = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextNextIndex = (prevIndex + 1) % ads.length;
          changeAd(nextNextIndex, false);
          return nextNextIndex;
        });
      }, rotationInterval);
      intervalRef.current = restartInterval;
    }, 600); // 애니메이션 완료 후 재시작
  };

  if (ads.length === 0) return null;

  const currentAd = ads[currentIndex];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleAdPress(currentAd)}
        style={styles.imageContainer}
      >
        <Animated.View style={[styles.imageWrapper, { opacity: fadeAnim }]}>
          {!imageError ? (
            <Image
              source={currentAd.image}
              style={styles.image}
              resizeMode="cover"
              onError={() => {
                console.warn('광고 이미지 로딩 실패:', currentAd.id);
                setImageError(true);
              }}
              onLoadStart={() => setImageError(false)}
            />
          ) : (
            <View style={styles.fallbackContainer}>
              <Icon name="image-outline" size={32} color={Theme.colors.textLight} />
              <Text style={styles.fallbackText}>광고 이미지</Text>
              <Text style={styles.fallbackSubtext}>
                {currentIndex === 0 && '작은 분리수거, 큰 변화의 시작!'}
                {currentIndex === 1 && '친환경 이동, 지구를 살립니다.'}
                {currentIndex === 2 && '우리의 선택이 숲을 지킵니다.'}
              </Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* 인디케이터 */}
      {ads.length > 1 && (
        <View style={styles.indicators}>
          {ads.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.indicatorActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* 네비게이션 버튼 */}
      {ads.length > 1 && (
        <>
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={handlePrev}
            activeOpacity={0.7}
          >
            <Icon name="chevron-left" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonRight]}
            onPress={handleNext}
            activeOpacity={0.7}
          >
            <Icon name="chevron-right" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 120,
    backgroundColor: Theme.colors.surface,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    ...Theme.shadows.small,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  indicators: {
    position: 'absolute',
    bottom: Theme.spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.textLight + '80',
  },
  indicatorActive: {
    backgroundColor: Theme.colors.primary,
    width: 20,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.background + 'E6',
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.small,
  },
  navButtonLeft: {
    left: Theme.spacing.xs,
  },
  navButtonRight: {
    right: Theme.spacing.xs,
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: Theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  fallbackText: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
  fallbackSubtext: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs / 2,
    textAlign: 'center',
  },
});

export default AdBanner;
