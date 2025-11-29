import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Card, Title, Paragraph, Button, ProgressBar } from 'react-native-paper';
import { getQuestsAPI, claimQuestRewardAPI } from '../services/api';
import { notifyQuestCompleted } from '../utils/notificationManager';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from '../i18n';
import Svg, { Circle } from 'react-native-svg';
import { useToast } from '../contexts/ToastContext';

interface Quest {
  id: string;
  name: string;
  description: string;
  bonus: number;
  target: number;
  type: string;
  progress: number;
  status: string; // 'active', 'completed', 'rewarded'
}

// 퀘스트 타입별 아이콘 매핑
const getQuestTypeIcon = (type: string): string => {
  const iconMap: { [key: string]: string } = {
    distance: 'map-marker-distance',
    emission: 'leaf-circle',
    trips: 'road-variant',
    days: 'calendar-check',
    default: 'target',
  };
  return iconMap[type.toLowerCase()] || iconMap.default;
};

// 원형 진행률 컴포넌트
const CircularProgress: React.FC<{ progress: number; size?: number; strokeWidth?: number; color?: string }> = ({
  progress,
  size = 60,
  strokeWidth = 6,
  color = Theme.colors.primary,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // progress가 0~1 사이인지 확인하고 음수 방지
  const safeProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference - (safeProgress * circumference);
  const percentage = Math.round(safeProgress * 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* 배경 원 */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Theme.colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* 진행률 원 */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[styles.circularProgressText, { width: size, height: size }]}>
        <Text style={styles.circularProgressPercent}>{percentage}%</Text>
      </View>
    </View>
  );
};

const QuestPage: React.FC = () => {
  const navigation = useNavigation();
  const { showError, showSuccess } = useToast();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuests = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await getQuestsAPI();
      setQuests(response.data);
    } catch (error: any) {
      console.error("Failed to fetch quests:", error);
      showError(error.response?.data?.message || t('questPage.fetchError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  const onRefresh = useCallback(() => {
    fetchQuests(true);
  }, [fetchQuests]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const handleClaimReward = async (questId: string, questName: string, questBonus: number) => {
    Alert.alert(
      t('questPage.claimReward'),
      t('questPage.claimRewardConfirm', { questName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('questPage.claimReward'),
          onPress: async () => {
            try {
              const response = await claimQuestRewardAPI(questId);
              // 알림 표시
              notifyQuestCompleted(questName, questBonus);
              showSuccess(response.data.message);
              fetchQuests(); // 퀘스트 목록 새로고침
            } catch (error: any) {
              showError(error.response?.data?.message || t('questPage.claimError'));
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>{t('questPage.loading')}</Text>
      </SafeAreaView>
    );
  }

  const progressPercentage = (progress: number, target: number) => {
    if (target <= 0) return 0;
    // 음수 진행률은 0으로 처리
    const safeProgress = Math.max(0, progress);
    const percentage = Math.round((safeProgress / target) * 100);
    // 0~100 사이로 제한
    return Math.min(100, Math.max(0, percentage));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Theme.colors.success;
      case 'rewarded':
        return Theme.colors.textSecondary;
      default:
        return Theme.colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Icon name="target" size={28} color={Theme.colors.primary} />
        <Title style={styles.headerTitle}>{t('questPage.title')}</Title>
      </View>
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
        <View style={styles.questList}>
          {quests.map((quest, index) => {
            // 진행률 계산: 0~1 사이로 제한 (음수 방지)
            const rawProgress = quest.target > 0 ? quest.progress / quest.target : 0;
            const progress = Math.min(1, Math.max(0, rawProgress));
            const percentage = progressPercentage(quest.progress, quest.target);
            const statusColor = getStatusColor(quest.status);
            const questIcon = getQuestTypeIcon(quest.type);

            return (
              <Card
                key={quest.id}
                style={[
                  styles.questCard,
                  quest.status === 'rewarded' && styles.rewardedCard,
                  quest.status === 'completed' && styles.completedCard,
                ]}
              >
                <Card.Content style={styles.cardContent}>
                  {/* 헤더: 아이콘, 제목, 보상 */}
                  <View style={styles.questHeader}>
                    <View style={styles.questHeaderLeft}>
                      <View style={[styles.iconContainer, { backgroundColor: statusColor + '20' }]}>
                        <Icon name={questIcon} size={24} color={statusColor} />
                      </View>
                      <View style={styles.questTitleContainer}>
                        <Title style={styles.questName}>{quest.name}</Title>
                        <Text style={styles.questType}>{quest.type}</Text>
                      </View>
                    </View>
                    <View style={styles.bonusContainer}>
                      <Icon name="star" size={18} color={Theme.colors.warning} />
                      <Text style={styles.questBonus}>+{quest.bonus}P</Text>
                    </View>
                  </View>

                  {/* 설명 */}
                  <Paragraph style={styles.questDesc}>{quest.description}</Paragraph>

                  {/* 진행률 섹션 */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressLeft}>
                      <CircularProgress
                        progress={progress}
                        size={70}
                        strokeWidth={6}
                        color={statusColor}
                      />
                    </View>
                    <View style={styles.progressRight}>
                      <View style={styles.progressBarContainer}>
                        <ProgressBar
                          progress={progress}
                          color={statusColor}
                          style={styles.progressBar}
                        />
                        <View style={styles.progressTextContainer}>
                          <Text style={styles.progressText}>
                            {Math.max(0, quest.progress)} / {quest.target}
                          </Text>
                          <Text style={[styles.progressPercent, { color: statusColor }]}>
                            {percentage}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 상태별 버튼 */}
                  {quest.status === 'completed' && (
                    <TouchableOpacity
                      style={[styles.rewardButton, { backgroundColor: Theme.colors.success }]}
                      onPress={() => handleClaimReward(quest.id, quest.name, quest.bonus)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${quest.name} 퀘스트 보상 받기`}
                      accessibilityHint={`${quest.name} 퀘스트를 완료하여 ${quest.bonus} 포인트를 받습니다`}
                    >
                      <Icon name="gift" size={20} color={Theme.colors.backgroundLight} />
                      <Text style={styles.rewardButtonText}>{t('questPage.claimReward')}</Text>
                    </TouchableOpacity>
                  )}
                  {quest.status === 'rewarded' && (
                    <View 
                      style={styles.rewardedButton}
                      accessibilityRole="text"
                      accessibilityLabel={`${quest.name} 퀘스트 보상 완료`}
                    >
                      <Icon name="check-circle" size={20} color={Theme.colors.textSecondary} />
                      <Text style={styles.rewardedButtonText}>{t('questPage.rewardClaimed')}</Text>
                    </View>
                  )}
                  {quest.status === 'active' && (
                    <View 
                      style={styles.activeBadge}
                      accessibilityRole="text"
                      accessibilityLabel={`${quest.name} 퀘스트 진행 중`}
                    >
                      <Icon name="clock-outline" size={16} color={Theme.colors.primary} />
                      <Text style={styles.activeBadgeText}>{t('questPage.inProgress')}</Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </View>
        {quests.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="target-variant" size={64} color={Theme.colors.textLight} />
            </View>
            <Text style={styles.emptyTitle}>{t('questPage.noQuests')}</Text>
            <Text style={styles.emptyDescription}>{t('questPage.noQuestsDescription')}</Text>
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={() => navigation.navigate('Main' as never)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="경로 검색하기"
              accessibilityHint="경로 검색 페이지로 이동하여 친환경 이동을 시작합니다"
            >
              <Icon name="map" size={20} color={Theme.colors.primary} />
              <Text style={styles.emptyActionText}>경로 검색하기</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    gap: Theme.spacing.xs,
    backgroundColor: Theme.colors.surface,
    ...Theme.shadows.small,
  },
  headerTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.md,
  },
  questList: {
    gap: Theme.spacing.md,
  },
  questCard: {
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.medium,
    ...Theme.shadows.small,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  rewardedCard: {
    opacity: 0.6,
    backgroundColor: Theme.colors.background,
  },
  completedCard: {
    borderWidth: 2,
    borderColor: Theme.colors.success,
  },
  cardContent: {
    padding: Theme.spacing.md,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  questHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Theme.spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questTitleContainer: {
    flex: 1,
  },
  questName: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '700',
    marginBottom: Theme.spacing.xs / 2,
  },
  questType: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: Theme.colors.warning + '20',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.small,
  },
  questBonus: {
    ...Theme.typography.body1,
    fontWeight: '700',
    color: Theme.colors.warning,
  },
  questDesc: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.md,
    lineHeight: 20,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  progressLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressPercent: {
    ...Theme.typography.body2,
    fontWeight: '700',
    color: Theme.colors.text,
    fontSize: 12,
  },
  progressRight: {
    flex: 1,
  },
  progressBarContainer: {
    marginBottom: Theme.spacing.xs,
  },
  progressBar: {
    height: 10,
    borderRadius: Theme.borderRadius.small,
    backgroundColor: Theme.colors.border,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  progressPercent: {
    ...Theme.typography.body2,
    fontWeight: '700',
    fontSize: 13,
  },
  rewardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    gap: Theme.spacing.xs,
    ...Theme.shadows.small,
  },
  rewardButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
    fontWeight: '700',
  },
  rewardedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: Theme.spacing.xs,
  },
  rewardedButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: Theme.colors.primary + '15',
    gap: Theme.spacing.xs,
    alignSelf: 'flex-start',
  },
  activeBadgeText: {
    ...Theme.typography.caption,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl * 2,
    paddingHorizontal: Theme.spacing.lg,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Theme.colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Theme.colors.border,
  },
  emptyTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.lg,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: Theme.colors.primary + '15',
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
    gap: Theme.spacing.xs,
    ...Theme.shadows.small,
  },
  emptyActionText: {
    ...Theme.typography.button,
    color: Theme.colors.primary,
    fontWeight: '700',
  },
});

export default QuestPage;
