import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { formatEmission, formatDistance, getTransportModeInfo } from '../utils/carbonCalculator';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from '../i18n';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';

interface StatisticsProps {
  totalSavedEmission: number;
  totalDistance: number;
  mostUsedMode: string;
  history?: Array<{ date: string; savedEmission: number }>; // 선택적 히스토리 데이터
}

const Statistics: React.FC<StatisticsProps> = ({ totalSavedEmission, totalDistance, mostUsedMode, history = [] }) => {
  const navigation = useNavigation();
  const mostUsedModeInfo = getTransportModeInfo(mostUsedMode as any);
  const hasData = totalSavedEmission > 0 || totalDistance > 0;
  const screenWidth = Dimensions.get('window').width - 96; // 카드 패딩 + 외부 패딩 고려

  // 최근 7일간의 탄소 절약량 데이터 준비 (차트용)
  const chartData = React.useMemo(() => {
    if (!history || history.length === 0) return null;
    
    const last7Days = history.slice(0, 7).reverse();
    const labels = last7Days.map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date.getDate().toString();
    });
    
    const data = last7Days.map(entry => entry.savedEmission || 0);
    
    return {
      labels,
      datasets: [{
        data,
        color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`, // Theme.colors.primary
        strokeWidth: 2,
      }],
    };
  }, [history]);

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Icon name="chart-box" size={24} color={Theme.colors.primary} />
        <Text style={styles.title}>{t('statistics.title')}</Text>
      </View>
        {hasData ? (
          <>
            {/* 주요 통계 카드들 */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.emissionCard]}>
                <View style={styles.statCardHeader}>
                  <Icon name="leaf-circle" size={28} color={Theme.colors.primary} />
                  <Text style={styles.statCardTitle}>{t('statistics.totalSavedEmission')}</Text>
                </View>
                <Text style={styles.statCardValue}>{formatEmission(totalSavedEmission)}</Text>
                <View style={styles.statCardFooter}>
                  <Icon name="trending-down" size={16} color={Theme.colors.success} />
                  <Text style={styles.statCardSubtext}>{t('statistics.environmentalContribution')}</Text>
                </View>
              </View>

              <View style={[styles.statCard, styles.distanceCard]}>
                <View style={styles.statCardHeader}>
                  <Icon name="map-marker-distance" size={28} color={Theme.colors.info} />
                  <Text style={styles.statCardTitle}>{t('statistics.distance')}</Text>
                </View>
                <Text style={styles.statCardValue}>{formatDistance(totalDistance)}</Text>
                <View style={styles.statCardFooter}>
                  <Icon name="road" size={16} color={Theme.colors.info} />
                  <Text style={styles.statCardSubtext}>{t('statistics.ecoFriendlyTravel')}</Text>
                </View>
              </View>
            </View>

            {/* 이동 수단 통계 */}
            <View style={styles.modeCard}>
              <View style={styles.modeHeader}>
                <Icon name="car-multiple" size={24} color={Theme.colors.secondary} />
                <Text style={styles.modeTitle}>{t('statistics.mostUsedModeShort')}</Text>
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeIcon}>{mostUsedModeInfo.icon}</Text>
                <Text style={styles.modeName}>{mostUsedModeInfo.name}</Text>
              </View>
            </View>

            {/* 차트 (데이터가 있을 때만) */}
            {chartData && chartData.datasets[0].data.some(d => d > 0) && (
              <View style={styles.chartContainer}>
                <View style={styles.chartHeader}>
                  <Icon name="chart-line" size={20} color={Theme.colors.primary} />
                  <Text style={styles.chartTitle}>{t('statistics.recentTrend')}</Text>
                </View>
                <Text style={styles.chartDescription}>
                  {t('statistics.recentTrendDescription')}
                </Text>
                <View style={styles.chartWrapper}>
                  <LineChart
                    data={chartData}
                    width={screenWidth}
                    height={200}
                    chartConfig={{
                      backgroundColor: Theme.colors.surface,
                      backgroundGradientFrom: Theme.colors.surface,
                      backgroundGradientTo: Theme.colors.background,
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(66, 66, 66, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                      propsForDots: {
                        r: '5',
                        strokeWidth: '2',
                        stroke: Theme.colors.primary,
                      },
                      formatYLabel: (value) => {
                        const num = parseFloat(value);
                        if (num >= 1000) return `${(num / 1000).toFixed(1)}kg`;
                        return `${num.toFixed(1)}g`;
                      },
                    }}
                    bezier
                    style={styles.chart}
                    withInnerLines={true}
                    withOuterLines={true}
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    segments={4}
                    yAxisLabel=""
                    yAxisSuffix=""
                  />
                </View>
                <View style={styles.chartLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: Theme.colors.primary }]} />
                    <Text style={styles.legendText}>{t('statistics.dailySavings')}</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="chart-line" size={64} color={Theme.colors.textLight} />
            </View>
            <Text style={styles.emptyTitle}>{t('statistics.noData')}</Text>
            <Text style={styles.emptyDescription}>{t('statistics.noDataDescription')}</Text>
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={() => navigation.navigate('Main' as never)}
              activeOpacity={0.7}
            >
              <Icon name="map-search" size={20} color={Theme.colors.backgroundLight} />
              <Text style={styles.emptyActionText}>{t('statistics.goToSearch')}</Text>
            </TouchableOpacity>
          </View>
        )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.xs,
  },
  title: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    ...Theme.shadows.small,
  },
  emissionCard: {
    backgroundColor: Theme.colors.primaryLight + '20',
    borderWidth: 1,
    borderColor: Theme.colors.primaryLight,
  },
  distanceCard: {
    backgroundColor: Theme.colors.info + '20',
    borderWidth: 1,
    borderColor: Theme.colors.info + '80',
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  statCardTitle: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  statCardValue: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '700',
    marginBottom: Theme.spacing.xs,
  },
  statCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.xs,
  },
  statCardSubtext: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 11,
  },
  modeCard: {
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
  },
  modeTitle: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  modeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    paddingVertical: Theme.spacing.sm,
  },
  modeIcon: {
    fontSize: 32,
  },
  modeName: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  chartContainer: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  chartTitle: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  chartDescription: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.md,
  },
  chartWrapper: {
    overflow: 'hidden',
    borderRadius: Theme.borderRadius.medium,
    marginBottom: Theme.spacing.sm,
  },
  chart: {
    borderRadius: Theme.borderRadius.medium,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
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
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.medium,
    gap: Theme.spacing.xs,
    ...Theme.shadows.small,
  },
  emptyActionText: {
    ...Theme.typography.button,
    color: Theme.colors.backgroundLight,
    fontWeight: '600',
  },
});

export default Statistics;
