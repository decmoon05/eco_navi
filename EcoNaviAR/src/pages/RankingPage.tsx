import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph } from 'react-native-paper';
import { getRankingAPI } from '../services/api';
import { formatEmission } from '../utils/carbonCalculator';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface RankingData {
  username: string;
  total_saved_emission: number;
}

const RankingPage: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useToast();
  const [ranking, setRanking] = useState<RankingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);

  const fetchRanking = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await getRankingAPI();
      setRanking(response.data);
      
      // 내 순위 찾기
      if (user?.username) {
        const rankIndex = response.data.findIndex((item: RankingData) => item.username === user.username);
        setMyRank(rankIndex >= 0 ? rankIndex + 1 : null);
      }
    } catch (error: any) {
      console.error("Failed to fetch ranking:", error);
      showError('랭킹을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, showError]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const onRefresh = useCallback(() => {
    fetchRanking(true);
  }, [fetchRanking]);

  const getRankBadgeIcon = (rank: number): string => {
    if (rank === 1) return 'trophy';
    if (rank === 2) return 'trophy-outline';
    if (rank === 3) return 'medal';
    return 'numeric';
  };

  const getRankBadgeColor = (rank: number): string => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return Theme.colors.primary;
  };

  const getRankBadgeBgColor = (rank: number): string => {
    if (rank === 1) return '#FFD70020';
    if (rank === 2) return '#C0C0C020';
    if (rank === 3) return '#CD7F3220';
    return Theme.colors.primaryLight + '20';
  };

  const isMyRank = (rank: number): boolean => {
    return myRank !== null && rank === myRank;
  };

  const renderRankingItem = ({ item, index }: { item: RankingData; index: number }) => {
    const rank = index + 1;
    const isMe = isMyRank(rank);
    const badgeIcon = getRankBadgeIcon(rank);
    const badgeColor = getRankBadgeColor(rank);
    const badgeBgColor = getRankBadgeBgColor(rank);

    return (
      <View
        style={[
          styles.rankingItem,
          isMe && styles.myRankingItem,
          index < ranking.length - 1 && styles.rankingItemBorder,
        ]}
        accessibilityRole="text"
        accessibilityLabel={`${rank}위, ${item.username}, ${formatEmission(item.total_saved_emission)} 절약${isMe ? ', 내 순위' : ''}`}
        accessibilityHint={isMe ? "내 랭킹 정보입니다" : `${item.username}의 랭킹 정보입니다`}
      >
        {/* 순위 배지 */}
        <View style={[styles.rankBadge, { backgroundColor: badgeBgColor }]}>
          {rank <= 3 ? (
            <Icon name={badgeIcon} size={28} color={badgeColor} />
          ) : (
            <View style={[styles.rankNumberBadge, { backgroundColor: badgeColor }]}>
              <Text style={styles.rankNumberText}>{rank}</Text>
            </View>
          )}
        </View>

        {/* 사용자 정보 */}
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={[styles.username, isMe && styles.myUsername]}>
              {item.username}
              {isMe && (
                <Text style={styles.myRankLabel}> (나)</Text>
              )}
            </Text>
            {isMe && (
              <View style={styles.myRankBadge}>
                <Icon name="account-circle" size={16} color={Theme.colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.statsRow}>
            <Icon name="leaf-circle" size={16} color={Theme.colors.success} />
            <Text style={styles.emissionText}>
              {formatEmission(item.total_saved_emission)} 절약
            </Text>
          </View>
        </View>

        {/* 순위 표시 (4위 이상) */}
        {rank > 3 && (
          <View style={styles.rankIndicator}>
            <Text style={[styles.rankIndicatorText, { color: badgeColor }]}>#{rank}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>{t('rankingPage.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Icon name="trophy" size={32} color={Theme.colors.warning} />
        <Title style={styles.headerTitle}>{t('rankingPage.hallOfFame')}</Title>
        <Text style={styles.headerSubtitle}>{t('rankingPage.subtitle')}</Text>
      </View>

      {/* 내 순위 표시 */}
      {myRank !== null && (
        <Card style={styles.myRankCard}>
          <Card.Content style={styles.myRankContent}>
            <View style={styles.myRankLeft}>
              <Icon name="account-circle" size={32} color={Theme.colors.primary} />
              <View style={styles.myRankInfo}>
                <Text style={styles.myRankLabel}>{t('rankingPage.myRank')}</Text>
                <Text style={styles.myRankValue}>{myRank}{t('rankingPage.rank')}</Text>
              </View>
            </View>
            <View style={styles.myRankRight}>
              <Icon name="trophy" size={24} color={Theme.colors.warning} />
            </View>
          </Card.Content>
        </Card>
      )}

      {/* 랭킹 리스트 */}
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
        {ranking.length > 0 ? (
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {/* 상위 3명 강조 */}
              {ranking.slice(0, 3).length > 0 && (
                <View style={styles.topThreeContainer}>
                  {ranking.slice(0, 3).map((item, index) => {
                    const rank = index + 1;
                    const badgeColor = getRankBadgeColor(rank);
                    const badgeIcon = getRankBadgeIcon(rank);
                    const isMe = isMyRank(rank);

                    return (
                      <View
                        key={index}
                        style={[
                          styles.topThreeItem,
                          rank === 1 && styles.firstPlace,
                          rank === 2 && styles.secondPlace,
                          rank === 3 && styles.thirdPlace,
                        ]}
                      >
                        <View style={[styles.topThreeBadge, { backgroundColor: badgeColor + '30' }]}>
                          <Icon name={badgeIcon} size={32} color={badgeColor} />
                        </View>
                        <Text style={styles.topThreeRank}>#{rank}</Text>
                        <Text style={[styles.topThreeName, isMe && styles.topThreeNameMe]}>
                          {item.username}
                          {isMe && t('rankingPage.me')}
                        </Text>
                        <Text style={styles.topThreeEmission}>
                          {formatEmission(item.total_saved_emission)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* 나머지 랭킹 */}
              {ranking.length > 3 && (
                <View style={styles.restRanking}>
                  <View style={styles.restRankingHeader}>
                    <Icon name="format-list-numbered" size={20} color={Theme.colors.textSecondary} />
                    <Text style={styles.restRankingTitle}>{t('rankingPage.totalRankings')}</Text>
                  </View>
                  <FlatList
                    data={ranking.slice(3)}
                    renderItem={({ item, index }) => renderRankingItem({ item, index: index + 3 })}
                    keyExtractor={(item, index) => `rank-${index + 4}`}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {/* 3명 이하일 때 */}
              {ranking.length <= 3 && ranking.length > 0 && (
                <View style={styles.restRanking}>
                  <FlatList
                    data={ranking}
                    renderItem={renderRankingItem}
                    keyExtractor={(item, index) => `rank-${index + 1}`}
                    scrollEnabled={false}
                  />
                </View>
              )}
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="trophy-outline" size={64} color={Theme.colors.textLight} />
            <Text style={styles.emptyTitle}>{t('rankingPage.noData')}</Text>
            <Text style={styles.emptyDescription}>{t('rankingPage.noDataDescription')}</Text>
          </View>
        )}
      </ScrollView>
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
  myRankCard: {
    margin: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.primary + '15',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    ...Theme.shadows.medium,
  },
  myRankContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  myRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  myRankInfo: {
    gap: Theme.spacing.xs / 2,
  },
  myRankLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  myRankValue: {
    ...Theme.typography.h3,
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  myRankRight: {
    padding: Theme.spacing.sm,
    backgroundColor: Theme.colors.primary + '20',
    borderRadius: Theme.borderRadius.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.medium,
    ...Theme.shadows.small,
  },
  cardContent: {
    padding: Theme.spacing.md,
  },
  topThreeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Theme.spacing.lg,
    paddingBottom: Theme.spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: Theme.colors.border,
  },
  topThreeItem: {
    alignItems: 'center',
    flex: 1,
    gap: Theme.spacing.xs,
  },
  firstPlace: {
    marginTop: -Theme.spacing.md,
  },
  secondPlace: {
    marginTop: Theme.spacing.sm,
  },
  thirdPlace: {
    marginTop: Theme.spacing.md,
  },
  topThreeBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  topThreeRank: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  topThreeName: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  topThreeNameMe: {
    color: Theme.colors.primary,
  },
  topThreeEmission: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  restRanking: {
    marginTop: Theme.spacing.md,
  },
  restRankingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  restRankingTitle: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
    gap: Theme.spacing.md,
  },
  myRankingItem: {
    backgroundColor: Theme.colors.primary + '10',
    borderRadius: Theme.borderRadius.medium,
    marginVertical: Theme.spacing.xs,
    paddingVertical: Theme.spacing.md,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
  },
  rankingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumberText: {
    ...Theme.typography.body1,
    color: Theme.colors.backgroundLight,
    fontWeight: '700',
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xs / 2,
  },
  username: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  myUsername: {
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  myRankLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  myRankBadge: {
    padding: Theme.spacing.xs / 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  emissionText: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
  },
  rankIndicator: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.small,
  },
  rankIndicatorText: {
    ...Theme.typography.caption,
    fontWeight: '700',
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
});

export default RankingPage;
