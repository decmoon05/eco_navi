import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal, Animated, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph } from 'react-native-paper';
import { getProductsAPI, exchangeProductAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from '../i18n';
import { useToast } from '../contexts/ToastContext';

interface Product {
  id: number;
  name: string;
  description: string;
  points_required: number;
  icon: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 16; // scrollContent padding
const GRID_PADDING = 16; // productGrid 좌우 여백
const CARD_GAP = 12; // 카드 사이 간격
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - GRID_PADDING * 2 - CARD_GAP) / 2;

const StorePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showError, showWarning } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exchangingProductId, setExchangingProductId] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successProduct, setSuccessProduct] = useState<{ name: string; points: number } | null>(null);
  
  // 애니메이션 값들
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await getProductsAPI();
      setProducts(response.data);
      // 사용자 정보는 교환 시에만 갱신 (무한 루프 방지)
    } catch (error: any) {
      console.error("Failed to fetch products:", error);
      showError(t('storePage.fetchError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  // 성공 애니메이션 시작
  const startSuccessAnimation = () => {
    // 초기화
    scaleAnim.setValue(0);
    rotateAnim.setValue(0);
    fadeAnim.setValue(0);
    confettiAnim.setValue(0);

    // 애니메이션 시퀀스
    Animated.parallel([
      // 스케일 애니메이션 (튀어나오는 효과)
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // 회전 애니메이션
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 페이드 인
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // 컨페티 효과
      Animated.timing(confettiAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleExchange = async (productId: number, productName: string, pointsRequired: number) => {
    // 포인트 부족 확인
    if (user && user.points < pointsRequired) {
      showWarning(
        t('storePage.insufficientPointsMessage', { 
          required: pointsRequired.toLocaleString(), 
          current: user.points.toLocaleString() 
        })
      );
      return;
    }

    Alert.alert(
      t('storePage.exchangeTitle'),
      t('storePage.exchangeConfirm', { productName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('storePage.exchange'),
          onPress: async () => {
            try {
              setExchangingProductId(productId);
              const response = await exchangeProductAPI(productId);
              // 사용자 포인트 정보 갱신
              await refreshUser();
              
              // 성공 모달 표시 및 애니메이션 시작
              setSuccessProduct({ name: productName, points: pointsRequired });
              setShowSuccessModal(true);
              startSuccessAnimation();
            } catch (error: any) {
              showError(error.response?.data?.message || t('storePage.exchangeError'));
            } finally {
              setExchangingProductId(null);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessProduct(null);
  };

  const canAfford = (pointsRequired: number): boolean => {
    return user ? user.points >= pointsRequired : false;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>{t('storePage.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Icon name="store" size={32} color={Theme.colors.primary} />
        <Title style={styles.headerTitle}>{t('storePage.title')}</Title>
        <Text style={styles.headerSubtitle}>{t('storePage.subtitle')}</Text>
      </View>

      {/* 내 포인트 표시 */}
      {user && (
        <Card style={styles.pointsCard}>
          <Card.Content style={styles.pointsContent}>
            <View style={styles.pointsLeft}>
              <View style={styles.pointsIconContainer}>
                <Icon name="star-circle" size={32} color={Theme.colors.warning} />
              </View>
              <View style={styles.pointsInfo}>
                <Text style={styles.pointsLabel}>{t('storePage.pointsLabel')}</Text>
                <Text style={styles.pointsValue}>{user.points.toLocaleString()} P</Text>
              </View>
            </View>
            <View style={styles.pointsRight}>
              <Icon name="wallet" size={24} color={Theme.colors.primary} />
            </View>
          </Card.Content>
        </Card>
      )}

      {/* 상품 그리드 */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Theme.colors.primary]}
            tintColor={Theme.colors.primary}
            title={t('common.loading')}
            titleColor={Theme.colors.textSecondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {products.length > 0 ? (
          <View style={styles.productGrid}>
            {products.map(product => {
              const affordable = canAfford(product.points_required);
              const isExchanging = exchangingProductId === product.id;
              const pointsShortage = user ? Math.max(0, product.points_required - user.points) : product.points_required;

              return (
                <Card
                  key={product.id}
                  style={[
                    styles.productCard,
                    !affordable && styles.productCardDisabled,
                  ]}
                >
                  <Card.Content style={styles.productCardContent}>
                    {/* 상품 아이콘 */}
                    <View style={[styles.productIconContainer, !affordable && styles.productIconContainerDisabled]}>
                      <Text style={styles.productIcon}>{product.icon}</Text>
                      {!affordable && (
                        <View style={styles.insufficientBadge}>
                          <Icon name="alert-circle" size={16} color={Theme.colors.error} />
                        </View>
                      )}
                    </View>

                    {/* 상품 정보 */}
                    <Title 
                      style={[styles.productName, !affordable && styles.productNameDisabled]}
                      numberOfLines={2}
                    >
                      {product.name}
                    </Title>
                    <Paragraph 
                      style={[styles.productDesc, !affordable && styles.productDescDisabled]}
                      numberOfLines={2}
                    >
                      {product.description}
                    </Paragraph>

                    {/* 포인트 정보 */}
                    <View style={styles.pointInfoContainer}>
                      <View style={styles.pointCostContainer}>
                        <Icon name="star" size={14} color={affordable ? Theme.colors.warning : Theme.colors.textLight} />
                        <Text style={[styles.pointCost, !affordable && styles.pointCostDisabled]}>
                          {product.points_required.toLocaleString()} P
                        </Text>
                      </View>
                      {!affordable && user && (
                        <View style={styles.shortageContainer}>
                          <Icon name="alert" size={12} color={Theme.colors.error} />
                          <Text style={styles.shortageText}>
                            {pointsShortage.toLocaleString()}P 부족
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 교환 버튼 */}
                    <TouchableOpacity
                      style={[
                        styles.exchangeButton,
                        affordable ? styles.exchangeButtonEnabled : styles.exchangeButtonDisabled,
                        isExchanging && styles.exchangeButtonLoading,
                      ]}
                      onPress={() => handleExchange(product.id, product.name, product.points_required)}
                      disabled={!affordable || isExchanging}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isExchanging 
                          ? `${product.name} 교환 중` 
                          : affordable 
                            ? `${product.name} 교환하기, ${product.points_required.toLocaleString()} 포인트 필요`
                            : `${product.name} 교환 불가, 포인트 부족`
                      }
                      accessibilityHint={
                        affordable 
                          ? `${product.name} 상품을 ${product.points_required.toLocaleString()} 포인트로 교환합니다`
                          : `포인트가 부족하여 ${product.name} 상품을 교환할 수 없습니다`
                      }
                      accessibilityState={{ disabled: !affordable || isExchanging }}
                    >
                      {isExchanging ? (
                        <>
                          <ActivityIndicator size="small" color={Theme.colors.backgroundLight} />
                          <Text style={styles.exchangeButtonText}>{t('storePage.exchanging')}</Text>
                        </>
                      ) : affordable ? (
                        <>
                          <Icon name="gift" size={16} color={Theme.colors.backgroundLight} />
                          <Text style={styles.exchangeButtonText}>{t('storePage.exchange')}</Text>
                        </>
                      ) : (
                        <>
                          <Icon name="lock" size={16} color={Theme.colors.textSecondary} />
                          <Text style={[styles.exchangeButtonText, styles.exchangeButtonTextDisabled]}>
                            포인트 부족
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="store-outline" size={64} color={Theme.colors.textLight} />
            <Text style={styles.emptyTitle}>아직 상품이 없습니다</Text>
            <Text style={styles.emptyDescription}>
              새로운 상품이 곧 추가될 예정입니다
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 교환 성공 모달 */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.successModalOverlay}>
          <Animated.View
            style={[
              styles.successModalContent,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* 컨페티 효과 */}
            <Animated.View
              style={[
                styles.confettiContainer,
                {
                  opacity: confettiAnim,
                },
              ]}
            >
              {[...Array(12)].map((_, i) => {
                const angle = (i / 12) * 2 * Math.PI;
                const radius = 60;
                const startX = Math.cos(angle) * radius;
                const startY = Math.sin(angle) * radius;
                
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.confetti,
                      {
                        backgroundColor: [
                          Theme.colors.primary,
                          Theme.colors.success,
                          Theme.colors.warning,
                          Theme.colors.info,
                        ][i % 4],
                        transform: [
                          {
                            translateY: confettiAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [startY, startY - 200],
                            }),
                          },
                          {
                            translateX: confettiAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [startX, startX + (i % 2 === 0 ? 1 : -1) * 80],
                            }),
                          },
                          {
                            rotate: confettiAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', `${360 * (i % 2 === 0 ? 1 : -1)}deg`],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                );
              })}
            </Animated.View>

            {/* 성공 아이콘 */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <Icon name="check-circle" size={80} color={Theme.colors.success} />
              </View>
            </View>

            {/* 성공 메시지 */}
            <Text style={styles.successTitle}>교환 완료!</Text>
            <Text style={styles.successProductName}>{successProduct?.name}</Text>
            
            {successProduct && (
              <View style={styles.successPointsInfo}>
                <Icon name="star" size={20} color={Theme.colors.warning} />
                <Text style={styles.successPointsText}>
                  {successProduct.points.toLocaleString()}P 차감
                </Text>
              </View>
            )}

            <Text style={styles.successMessage}>
              상품이 성공적으로 교환되었습니다!
            </Text>

            {/* 확인 버튼 */}
            <TouchableOpacity
              style={styles.successButton}
              onPress={handleCloseSuccessModal}
              activeOpacity={0.7}
            >
              <Text style={styles.successButtonText}>확인</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
  },
  loadingText: {
    ...Theme.typography.body1,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    ...Theme.shadows.small,
  },
  headerTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '700',
    marginTop: Theme.spacing.xs,
  },
  headerSubtitle: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs / 2,
  },
  pointsCard: {
    margin: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.warning + '15',
    borderWidth: 2,
    borderColor: Theme.colors.warning,
    ...Theme.shadows.medium,
  },
  pointsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  pointsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.colors.warning + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsInfo: {
    gap: Theme.spacing.xs / 2,
  },
  pointsLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  pointsValue: {
    ...Theme.typography.h3,
    color: Theme.colors.warning,
    fontWeight: '700',
  },
  pointsRight: {
    padding: Theme.spacing.sm,
    backgroundColor: Theme.colors.warning + '20',
    borderRadius: Theme.borderRadius.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.medium,
    ...Theme.shadows.small,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
  },
  productCardDisabled: {
    opacity: 0.6,
    backgroundColor: Theme.colors.background,
    borderColor: Theme.colors.border,
  },
  productCardContent: {
    padding: Theme.spacing.sm,
    alignItems: 'center',
  },
  productIconContainer: {
    width: 60,
    height: 60,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: Theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
    position: 'relative',
  },
  productIconContainerDisabled: {
    backgroundColor: Theme.colors.background,
  },
  insufficientBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.surface,
  },
  productIcon: {
    fontSize: 36,
    textAlign: 'center',
  },
  productName: {
    fontSize: 14,
    color: Theme.colors.text,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Theme.spacing.xs / 2,
    lineHeight: 18,
    minHeight: 36,
  },
  productNameDisabled: {
    color: Theme.colors.textSecondary,
  },
  productDesc: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
    lineHeight: 14,
    minHeight: 28,
  },
  productDescDisabled: {
    color: Theme.colors.textLight,
  },
  pointInfoContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  pointCostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs / 2,
  },
  pointCost: {
    fontSize: 16,
    color: Theme.colors.warning,
    fontWeight: '700',
    marginLeft: Theme.spacing.xs / 2,
  },
  pointCostDisabled: {
    color: Theme.colors.textLight,
  },
  shortageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xs,
    paddingVertical: Theme.spacing.xs / 2,
    backgroundColor: Theme.colors.errorLight,
    borderRadius: Theme.borderRadius.small,
  },
  shortageText: {
    fontSize: 9,
    color: Theme.colors.error,
    fontWeight: '600',
    marginLeft: Theme.spacing.xs / 2,
  },
  exchangeButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
    ...Theme.shadows.small,
  },
  exchangeButtonEnabled: {
    backgroundColor: Theme.colors.primary,
  },
  exchangeButtonDisabled: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  exchangeButtonLoading: {
    opacity: 0.7,
  },
  exchangeButtonText: {
    fontSize: 12,
    color: Theme.colors.backgroundLight,
    fontWeight: '700',
    marginLeft: Theme.spacing.xs / 2,
  },
  exchangeButtonTextDisabled: {
    color: Theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl * 2,
    paddingHorizontal: Theme.spacing.lg,
  },
  emptyTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '600',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '90%',
    ...Theme.shadows.large,
  },
  confettiContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 2,
    top: '50%',
    left: '50%',
  },
  successIconContainer: {
    marginBottom: Theme.spacing.lg,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Theme.colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '700',
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  successProductName: {
    ...Theme.typography.h4,
    color: Theme.colors.primary,
    fontWeight: '600',
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  successPointsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.warning + '15',
    borderRadius: Theme.borderRadius.medium,
  },
  successPointsText: {
    ...Theme.typography.body1,
    color: Theme.colors.warning,
    fontWeight: '700',
  },
  successMessage: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 20,
  },
  successButton: {
    width: '100%',
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    ...Theme.shadows.small,
  },
  successButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
    fontWeight: '700',
  },
});

export default StorePage;
