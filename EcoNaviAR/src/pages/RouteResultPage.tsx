import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share, Platform, ActivityIndicator, Animated, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import RouteResult from '../components/RouteResult';
import ModeComparison from '../components/ModeComparison';
import RouteMap from '../components/RouteMap';
import AnimatedCard from '../components/AnimatedCard';
import FadeInView from '../components/FadeInView';
import { RouteData, Route } from '../types';
import { saveTrip } from '../utils/historyManager';
import { saveTripWithSync } from '../utils/syncManager';
import { formatEmission, calculateTrafficAdjustedEmission, getTransportModeInfo } from '../utils/carbonCalculator';
import { useAuth } from '../contexts/AuthContext';
import { notifyTripSaved, notifyAchievementUnlocked } from '../utils/notificationManager';
import { startNavigationTracking } from '../utils/navigationTracker';
import { isNavigationTrackingEnabled } from '../utils/developerSettings';
import NavigationGuide from '../components/NavigationGuide';
import RealtimeTrafficInfo from '../components/RealtimeTrafficInfo';
import { Theme } from '../theme';
import { t } from '../i18n';

const RouteResultPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { routesData: initialRoutesData } = route.params as { routesData: { [key: string]: RouteData } };

  const [routesData, setRoutesData] = useState(initialRoutesData);
  const [selectedRouteType, setSelectedRouteType] = useState<'eco' | 'fastest' | 'free'>('eco');
  const [isSaving, setIsSaving] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // 애니메이션 값
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const routeOptionAnims = useRef<{ [key: string]: Animated.Value }>({
    eco: new Animated.Value(1),
    fastest: new Animated.Value(1),
    free: new Animated.Value(1),
  }).current;

  const currentRouteData = routesData[selectedRouteType];
  
  // 경로 타입 변경 시 애니메이션
  useEffect(() => {
    // 페이드 아웃 → 페이드 인
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // 스케일 애니메이션
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedRouteType]);
  // const fastestRouteData = routesData['fastest']; // 더 이상 사용하지 않음

  if (!currentRouteData) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={Theme.colors.error} />
          <Text style={styles.errorText}>경로 정보를 불러올 수 없습니다.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 절약량 계산: 이동수단별 비교 중 가장 큰 배출량에서 현재 수단을 뺀 값
  const allEmissions: number[] = [];
  
  // 1. 현재 경로의 배출량
  allEmissions.push(currentRouteData.emission.totalEmission);
  
  // 2. 일반 내연 차량 배출량 (비교용 - 항상 계산)
  // carReference가 있으면 그 경로를 사용, 없으면 현재 경로를 기반으로 계산
  const referenceRoute = routesData.carReference?.route || currentRouteData.route;
  const carRoute: Route = {
    ...referenceRoute,
    transportMode: 'car',
    duration: referenceRoute.duration,
  };
  const carEmission = calculateTrafficAdjustedEmission(carRoute);
  allEmissions.push(carEmission.totalEmission);
  
  // 3. 대중교통 배출량
  if (routesData.publicTransitReference?.emission) {
    allEmissions.push(routesData.publicTransitReference.emission.totalEmission);
  }
  
  // 4. 자전거와 도보 배출량도 계산 (비교용)
  const bicycleRoute = { ...currentRouteData.route, transportMode: 'bicycle' as const };
  const walkingRoute = { ...currentRouteData.route, transportMode: 'walking' as const };
  const bicycleEmission = calculateTrafficAdjustedEmission(bicycleRoute).totalEmission;
  const walkingEmission = calculateTrafficAdjustedEmission(walkingRoute).totalEmission;
  
  allEmissions.push(bicycleEmission, walkingEmission);
  
  // 5. 사용자 차량 타입 배출량도 포함 (일반 내연과 다를 수 있음)
  if (routesData.carReference?.route && user?.vehicle_type && user.vehicle_type !== 'car') {
    const userVehicleRoute: Route = {
      ...routesData.carReference.route,
      transportMode: user.vehicle_type,
      duration: routesData.carReference.route.duration,
    };
    const userVehicleEmission = calculateTrafficAdjustedEmission(userVehicleRoute);
    allEmissions.push(userVehicleEmission.totalEmission);
  }
  
  // 최대 배출량 계산 (배열이 비어있지 않은 경우)
  const maxEmission = allEmissions.length > 0 ? Math.max(...allEmissions) : currentRouteData.emission.totalEmission;
  const savedCarbon = Math.max(0, maxEmission - currentRouteData.emission.totalEmission);

  // RouteResult에 전달할 때는 '가장 큰 배출량 대비 절약량'을 savedEmission으로 설정
  const displayEmission = {
    ...currentRouteData.emission,
    savedEmission: savedCarbon
  };

  const handleShareRoute = async () => {
    try {
      const route = currentRouteData.route;
      const emission = displayEmission;
      const modeInfo = getTransportModeInfo(route.transportMode);
      
      const shareMessage = `🌱 EcoNaviAR 경로 공유\n\n` +
        `📍 출발지: ${route.origin.name}\n` +
        `📍 도착지: ${route.destination.name}\n\n` +
        `🚗 이동 수단: ${modeInfo.icon} ${modeInfo.name}\n` +
        `📏 거리: ${route.distance.toFixed(1)}km\n` +
        `⏱️ 소요 시간: ${route.duration}분\n\n` +
        `🌿 탄소 배출량: ${formatEmission(emission.totalEmission)}\n` +
        `💚 절약량: ${formatEmission(emission.savedEmission)}\n\n` +
        `EcoNaviAR로 친환경 이동을 시작해보세요! 🌍`;

      const result = await Share.share({
        message: shareMessage,
        title: 'EcoNaviAR 경로 공유',
        ...(Platform.OS === 'android' && { subject: 'EcoNaviAR 경로 공유' }),
      });

      if (result.action === Share.sharedAction) {
        console.log('경로가 공유되었습니다.');
      }
    } catch (error: any) {
      Alert.alert('공유 오류', error.message || '경로 공유 중 오류가 발생했습니다.');
    }
  };

  const handleStartNavigation = () => {
    Alert.alert(
      t('routeResult.startNavigation'),
      t('routeResult.internalNavigation') + '/' + t('routeResult.externalNavigation'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('routeResult.internalNavigation'),
          onPress: () => setIsNavigating(true),
        },
        {
          text: t('routeResult.externalNavigation'),
          onPress: () => handleOpenExternalNavigation(),
        },
      ]
    );
  };

  const handleOpenExternalNavigation = async () => {
    const route = currentRouteData.route;
    const origin = route.origin;
    const destination = route.destination;

    // 안드로이드: 구글맵 또는 카카오맵 열기
    if (Platform.OS === 'android') {
      // 구글맵으로 경로 안내
      const googleMapsUrl = `google.navigation:q=${destination.lat},${destination.lng}`;
      const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
      
      // 카카오맵으로 경로 안내 (대안)
      const kakaoMapUrl = `kakaomap://route?sp=${origin.lat},${origin.lng}&ep=${destination.lat},${destination.lng}&by=CAR`;
      const kakaoMapWebUrl = `https://map.kakao.com/link/to/${destination.name},${destination.lat},${destination.lng}`;

      try {
        // 구글맵 앱 설치 확인 후 열기
        const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsUrl);
        if (canOpenGoogleMaps) {
          await Linking.openURL(googleMapsUrl);
        } else {
          // 구글맵 앱이 없으면 웹 버전 또는 카카오맵 시도
          const canOpenKakaoMap = await Linking.canOpenURL(kakaoMapUrl);
          if (canOpenKakaoMap) {
            await Linking.openURL(kakaoMapUrl);
          } else {
            // 둘 다 없으면 웹 링크 열기
            await Linking.openURL(googleMapsWebUrl);
          }
        }
      } catch (error: any) {
        console.error('외부 네비게이션 앱 열기 실패:', error);
        Alert.alert('오류', '네비게이션 앱을 열 수 없습니다. 구글맵 또는 카카오맵을 설치해주세요.');
      }
    } else {
      // iOS: 애플맵 또는 구글맵
      const appleMapsUrl = `http://maps.apple.com/?daddr=${destination.lat},${destination.lng}`;
      const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
      
      try {
        await Linking.openURL(appleMapsUrl);
      } catch (error: any) {
        console.error('외부 네비게이션 앱 열기 실패:', error);
        await Linking.openURL(googleMapsWebUrl);
      }
    }
  };

  const handleSaveTrip = async () => {
    setIsSaving(true);
    try {
      // 네비게이션 추적이 활성화되어 있으면 추적 시작
      const trackingEnabled = await isNavigationTrackingEnabled();
      if (trackingEnabled) {
        const trackingStarted = await startNavigationTracking(currentRouteData.route);
        if (trackingStarted) {
          console.log('[RouteResultPage] Navigation tracking started');
        }
      }

      // 오프라인 지원 저장 (서버 실패 시 자동으로 오프라인 큐에 추가)
      const result = await saveTripWithSync(currentRouteData.route, currentRouteData.emission);
      
      // 로컬에도 항상 저장 (오프라인에서도 확인 가능)
      await saveTrip(currentRouteData.route, currentRouteData.emission, user?.id || null);

      if (result.success) {
        // 알림 표시는 notifyTripSaved 함수가 내부에서 처리
        // 업적 알림은 saveTripWithSync에서 이미 처리됨
        
        Alert.alert(t('routeResult.saveSuccess'), result.message, [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      } else {
        // 오프라인 모드로 저장된 경우
        Alert.alert(
          '오프라인 저장',
          result.message,
          [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (error: any) {
      console.error('기록 저장 오류:', error);
      Alert.alert('저장 실패', error.response?.data?.message || error.message || '기록 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 네비게이션 모드
  if (isNavigating) {
    return (
      <NavigationGuide
        route={currentRouteData.route}
        onStop={() => setIsNavigating(false)}
        onArrive={() => {
          Alert.alert('도착', '목적지에 도착했습니다!', [
            { text: '확인', onPress: () => setIsNavigating(false) },
          ]);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView delay={100}>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('Main' as never);
              }}
              style={styles.headerActionButton}
              activeOpacity={0.7}
            >
              <Icon name="refresh" size={20} color={Theme.colors.primary} />
              <Text style={styles.headerActionButtonText}>{t('routeResult.backToSearch')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShareRoute}
              style={[styles.headerActionButton, styles.shareButtonTouchable]}
              activeOpacity={0.7}
            >
              <Icon name="share-variant" size={20} color={Theme.colors.info} />
              <Text style={[styles.headerActionButtonText, styles.shareButtonText]}>{t('routeResult.share')}</Text>
            </TouchableOpacity>
          </View>
        </FadeInView>
        
        <Animated.View 
          style={[
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
          ]}
        >
          <AnimatedCard>
            <RouteResult route={currentRouteData.route} emission={displayEmission} />
          </AnimatedCard>
        </Animated.View>
        
        {/* 탄소 배출량과 절약량을 큰 카드로 분리 표시 */}
        <FadeInView delay={200}>
          <View style={styles.emissionCardsContainer}>
            {/* 탄소 배출량 카드 */}
            <AnimatedCard style={styles.emissionCard}>
              <View style={styles.emissionCardContent}>
                <View style={[styles.emissionIconContainer, { backgroundColor: Theme.colors.error + '20' }]}>
                  <Icon name="smog" size={40} color={Theme.colors.error} />
                </View>
                <View style={styles.emissionInfoContainer}>
                  <Text style={styles.emissionLabel}>{t('routeResult.carbonEmission')}</Text>
                  <Text style={styles.emissionValue}>{formatEmission(currentRouteData.emission.totalEmission)}</Text>
                </View>
              </View>
            </AnimatedCard>
            
            {/* 탄소 절약량 카드 */}
            {savedCarbon > 0 && (
              <AnimatedCard style={[styles.emissionCard, styles.savedEmissionCard] as any}>
                <View style={styles.emissionCardContent}>
                  <View style={[styles.emissionIconContainer, { backgroundColor: Theme.colors.success + '20' }]}>
                    <Icon name="leaf-circle" size={40} color={Theme.colors.success} />
                  </View>
                  <View style={styles.emissionInfoContainer}>
                    <Text style={styles.emissionLabel}>{t('routeResult.savedEmission')}</Text>
                    <Text style={[styles.emissionValue, styles.savedEmissionValue]}>
                      {formatEmission(savedCarbon)}
                    </Text>
                    {/* 내연기관차량 대비 절약량 표시 */}
                    {carEmission && carEmission.totalEmission > currentRouteData.emission.totalEmission && (
                      <Text style={styles.comparisonText}>
                        {t('routeResult.comparedToCar', { amount: formatEmission(Math.max(0, carEmission.totalEmission - currentRouteData.emission.totalEmission)) })}
                      </Text>
                    )}
                  </View>
                </View>
              </AnimatedCard>
            )}
          </View>
        </FadeInView>

        <Animated.View 
          style={[
            { opacity: fadeAnim }
          ]}
        >
          <AnimatedCard style={styles.mapCard}>
            <RouteMap
              coordinates={currentRouteData.coordinates}
              polylines={currentRouteData.route.polylines}
              bikeStations={currentRouteData.route.bikeStations}
              origin={currentRouteData.route.origin}
              destination={currentRouteData.route.destination}
            />
          </AnimatedCard>
        </Animated.View>
        
        <FadeInView delay={300}>
          <View style={styles.routeOptionsContainer}>
        {routesData.eco && (
          <Animated.View style={{ transform: [{ scale: routeOptionAnims.eco }] }}>
            <TouchableOpacity 
              style={[styles.optionButton, selectedRouteType === 'eco' && styles.selectedOptionButton]} 
              onPress={() => {
                // 버튼 클릭 애니메이션
                Animated.sequence([
                  Animated.timing(routeOptionAnims.eco, {
                    toValue: 0.9,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                  Animated.spring(routeOptionAnims.eco, {
                    toValue: 1,
                    tension: 200,
                    friction: 4,
                    useNativeDriver: true,
                  }),
                ]).start();
                setSelectedRouteType('eco');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.optionButtonLeft}>
                <Icon 
                  name={selectedRouteType === 'eco' ? "check-circle" : "map-marker"} 
                  size={24} 
                  color={selectedRouteType === 'eco' ? Theme.colors.primary : Theme.colors.primary} 
                />
                <View style={styles.optionButtonTextContainer}>
                  <Text style={styles.optionButtonLabel}>{t('routeResult.routeType')}</Text>
                  <Text style={[styles.optionButtonText, selectedRouteType === 'eco' && styles.selectedOptionButtonText]}>{t('routeResult.ecoRecommended')}</Text>
                </View>
              </View>
              <View style={styles.optionButtonRight}>
                <Text style={[styles.emissionText, selectedRouteType === 'eco' && styles.selectedEmissionText]}>
                  {formatEmission(routesData.eco.emission.totalEmission)}
                </Text>
                <Icon name="chevron-right" size={20} color={Theme.colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
        {routesData.fastest && (
          <Animated.View style={{ transform: [{ scale: routeOptionAnims.fastest }] }}>
            <TouchableOpacity 
              style={[styles.optionButton, selectedRouteType === 'fastest' && styles.selectedOptionButton]} 
              onPress={() => {
                Animated.sequence([
                  Animated.timing(routeOptionAnims.fastest, {
                    toValue: 0.9,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                  Animated.spring(routeOptionAnims.fastest, {
                    toValue: 1,
                    tension: 200,
                    friction: 4,
                    useNativeDriver: true,
                  }),
                ]).start();
                setSelectedRouteType('fastest');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.optionButtonLeft}>
                <Icon 
                  name={selectedRouteType === 'fastest' ? "check-circle" : "map-marker"} 
                  size={24} 
                  color={selectedRouteType === 'fastest' ? Theme.colors.primary : Theme.colors.info} 
                />
                <View style={styles.optionButtonTextContainer}>
                  <Text style={styles.optionButtonLabel}>{t('routeResult.routeType')}</Text>
                  <Text style={[styles.optionButtonText, selectedRouteType === 'fastest' && styles.selectedOptionButtonText]}>{t('routeResult.shortestTime')}</Text>
                </View>
              </View>
              <View style={styles.optionButtonRight}>
                <Text style={[styles.emissionText, selectedRouteType === 'fastest' && styles.selectedEmissionText]}>
                  {formatEmission(routesData.fastest.emission.totalEmission)}
                </Text>
                <Icon name="chevron-right" size={20} color={Theme.colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
        {routesData.free && (
          <Animated.View style={{ transform: [{ scale: routeOptionAnims.free }] }}>
            <TouchableOpacity 
              style={[styles.optionButton, selectedRouteType === 'free' && styles.selectedOptionButton]} 
              onPress={() => {
                Animated.sequence([
                  Animated.timing(routeOptionAnims.free, {
                    toValue: 0.9,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                  Animated.spring(routeOptionAnims.free, {
                    toValue: 1,
                    tension: 200,
                    friction: 4,
                    useNativeDriver: true,
                  }),
                ]).start();
                setSelectedRouteType('free');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.optionButtonLeft}>
                <Icon 
                  name={selectedRouteType === 'free' ? "check-circle" : "map-marker"} 
                  size={24} 
                  color={selectedRouteType === 'free' ? Theme.colors.primary : Theme.colors.secondary} 
                />
                <View style={styles.optionButtonTextContainer}>
                  <Text style={styles.optionButtonLabel}>경로 타입</Text>
                  <Text style={[styles.optionButtonText, selectedRouteType === 'free' && styles.selectedOptionButtonText]}>{t('routeResult.freeRoads')}</Text>
                </View>
              </View>
              <View style={styles.optionButtonRight}>
                <Text style={[styles.emissionText, selectedRouteType === 'free' && styles.selectedEmissionText]}>
                  {formatEmission(routesData.free.emission.totalEmission)}
                </Text>
                <Icon name="chevron-right" size={20} color={Theme.colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </Animated.View>
          )}
          </View>
        </FadeInView>

        <FadeInView delay={350}>
          <AnimatedCard>
            <ModeComparison 
              currentRoute={currentRouteData.route} 
              carReferenceRoute={routesData.carReference?.route}
              publicTransitReferenceRoute={routesData.publicTransitReference?.route}
            />
          </AnimatedCard>
        </FadeInView>

        <FadeInView delay={400}>
          <AnimatedCard>
            <RealtimeTrafficInfo route={currentRouteData.route} />
          </AnimatedCard>
        </FadeInView>

        <FadeInView delay={450}>
          <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={handleStartNavigation}
          style={[styles.actionButton, styles.navigateButton]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('routeResult.startNavigation')}
          accessibilityHint={t('routeResult.startNavigationHint')}
        >
          <View style={styles.actionButtonContent}>
            <Icon name="navigation" size={22} color={Theme.colors.backgroundLight} />
            <Text style={styles.actionButtonText}>{t('routeResult.startNavigation')}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSaveTrip}
          disabled={isSaving}
          style={[
            styles.actionButton, 
            styles.saveButton,
            isSaving && styles.actionButtonDisabled
          ]}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isSaving ? t('routeResult.saving') : t('routeResult.completeAndSave')}
          accessibilityHint={t('routeResult.completeAndSaveHint')}
          accessibilityState={{ disabled: isSaving }}
        >
          <View style={styles.actionButtonContent}>
            {isSaving ? (
              <>
                <ActivityIndicator size="small" color={Theme.colors.backgroundLight} />
                <Text style={styles.actionButtonText}>{t('routeResult.saving')}</Text>
              </>
            ) : (
              <>
                <Icon name="content-save" size={22} color={Theme.colors.backgroundLight} />
                <Text style={styles.actionButtonText}>{t('routeResult.completeAndSave')}</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
          </View>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  headerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    gap: Theme.spacing.xs,
    minHeight: 48,
    ...Theme.shadows.small,
  },
  shareButtonTouchable: {
    borderColor: Theme.colors.info,
  },
  headerActionButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  shareButtonText: {
    color: Theme.colors.info,
  },
  emissionCardsContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginVertical: Theme.spacing.md,
  },
  emissionCard: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.lg,
  },
  savedEmissionCard: {
    backgroundColor: Theme.colors.success + '10',
    borderColor: Theme.colors.success,
  },
  emissionCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emissionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  emissionInfoContainer: {
    alignItems: 'center',
  },
  emissionLabel: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    fontSize: 14,
  },
  emissionValue: {
    ...Theme.typography.h2,
    color: Theme.colors.text,
    fontWeight: '700',
    fontSize: 28,
  },
  savedEmissionValue: {
    color: Theme.colors.success,
  },
  comparisonText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
    fontSize: 12,
    textAlign: 'center',
  },
  mapCard: {
    padding: 0,
    overflow: 'hidden',
  },
  routeOptionsContainer: {
    flexDirection: 'column',
    marginVertical: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.sm,
    ...Theme.shadows.small,
  },
  selectedOptionButton: {
    backgroundColor: Theme.colors.backgroundLight,
    borderColor: Theme.colors.primary,
    borderWidth: 1.5,
    ...Theme.shadows.medium,
  },
  optionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Theme.spacing.md,
  },
  optionButtonTextContainer: {
    flex: 1,
  },
  optionButtonLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  optionButtonText: {
    ...Theme.typography.body1,
    fontWeight: '700',
    color: Theme.colors.text,
    fontSize: 16,
  },
  selectedOptionButtonText: {
    color: Theme.colors.text,
  },
  optionButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  emissionText: {
    ...Theme.typography.body2,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  selectedEmissionText: {
    color: Theme.colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    minHeight: 56,
    justifyContent: 'center',
    ...Theme.shadows.medium,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  navigateButton: {
    backgroundColor: Theme.colors.primary,
  },
  saveButton: {
    backgroundColor: Theme.colors.info,
  },
  actionButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
    fontWeight: '600',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  errorText: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    marginTop: Theme.spacing.md,
    textAlign: 'center',
  },
});

export default RouteResultPage;
