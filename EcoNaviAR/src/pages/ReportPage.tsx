import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph, ProgressBar } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { getReportAPI } from '../services/api';
import { formatEmission, formatDistance, getTransportModeInfo } from '../utils/carbonCalculator';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from '../i18n';
import FadeInView from '../components/FadeInView';
import AnimatedCard from '../components/AnimatedCard';
import { useToast } from '../contexts/ToastContext';

interface ReportData {
  totalTrips: number;
  totalDistance: number;
  averageDistance: number;
  totalSavedEmission?: number;
  modeCounts: { [key: string]: number };
  bestDay: { date: string | null; savings: number };
  percentile: number;
  message?: string;
}

const screenWidth = Dimensions.get('window').width;

const ReportPage: React.FC = () => {
  const { showError } = useToast();
  const [date, setDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await getReportAPI(date.year, date.month);
      setReport(response.data);
    } catch (error: any) {
      console.error("Failed to fetch report:", error);
      showError(error.response?.data?.message || t('reportPage.noData'));
      setReport(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date, showError]);

  const onRefresh = useCallback(() => {
    fetchReport(true);
  }, [fetchReport]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDateChange = (name: string, value: number) => {
    setDate(prev => ({ ...prev, [name]: value }));
  };

  const years = [2024, 2025];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // PieChart 데이터
  const pieChartData = report?.modeCounts ?
    Object.entries(report.modeCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([mode, count]) => ({
        name: getTransportModeInfo(mode as any).name,
        population: count as number,
        color: getTransportModeInfo(mode as any).color || Theme.colors.primary,
        legendFontColor: Theme.colors.text,
        legendFontSize: 12,
      })) : [];

  // BarChart 데이터
  const barChartData = report?.modeCounts ? {
    labels: Object.entries(report.modeCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([mode]) => getTransportModeInfo(mode as any).name.substring(0, 4)),
    datasets: [{
      data: Object.entries(report.modeCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([, count]) => count as number),
    }],
  } : null;

  const chartConfig = {
    backgroundColor: Theme.colors.surface,
    backgroundGradientFrom: Theme.colors.surface,
    backgroundGradientTo: Theme.colors.background,
    decimalPlaces: 0,
    color: (opacity = 1) => Theme.colors.primary + Math.floor(opacity * 255).toString(16).padStart(2, '0'),
    labelColor: (opacity = 1) => Theme.colors.text + Math.floor(opacity * 255).toString(16).padStart(2, '0'),
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: Theme.colors.border,
      strokeWidth: 1,
    },
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        <FadeInView delay={100}>
          <View style={styles.header}>
            <Icon name="chart-box" size={32} color={Theme.colors.primary} />
            <Text style={styles.headerTitle}>{t('reportPage.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('reportPage.subtitle', { year: date.year, month: date.month })}
            </Text>
          </View>
        </FadeInView>
        
        <FadeInView delay={150}>
          <View style={styles.controls}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={date.year}
                onValueChange={(itemValue) => handleDateChange('year', itemValue)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {years.map(y => <Picker.Item key={y} label={`${y}${t('common.year')}`} value={y} />)}
              </Picker>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={date.month}
                onValueChange={(itemValue) => handleDateChange('month', itemValue)}
                style={styles.picker}
                itemStyle={styles.pickerItem}
              >
                {months.map(m => <Picker.Item key={m} label={`${m}${t('common.month')}`} value={m} />)}
              </Picker>
            </View>
          </View>
        </FadeInView>

        {loading ? (
          <FadeInView delay={200}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
            </View>
          </FadeInView>
        ) : report && !report.message ? (
          <>
            <FadeInView delay={200}>
              <AnimatedCard>
                <View style={styles.cardHeader}>
                  <Icon name="chart-line" size={24} color={Theme.colors.primary} />
                  <Text style={styles.cardTitle}>{t('reportPage.overallStats')}</Text>
                </View>
                <View style={styles.statGrid}>
                  <View style={styles.statCard}>
                    <View style={[styles.statIconContainer, { backgroundColor: Theme.colors.primary + '20' }]}>
                      <Icon name="road-variant" size={24} color={Theme.colors.primary} />
                    </View>
                    <Text style={styles.statValue}>{report.totalTrips}</Text>
                    <Text style={styles.statLabel}>{t('reportPage.totalTrips')}</Text>
                    <Text style={styles.statUnit}>{t('reportPage.times')}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <View style={[styles.statIconContainer, { backgroundColor: Theme.colors.info + '20' }]}>
                      <Icon name="map-marker-distance" size={24} color={Theme.colors.info} />
                    </View>
                    <Text style={styles.statValue}>{formatDistance(report.totalDistance)}</Text>
                    <Text style={styles.statLabel}>{t('reportPage.totalDistance')}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <View style={[styles.statIconContainer, { backgroundColor: Theme.colors.success + '20' }]}>
                      <Icon name="speedometer" size={24} color={Theme.colors.success} />
                    </View>
                    <Text style={styles.statValue}>{formatDistance(report.averageDistance)}</Text>
                    <Text style={styles.statLabel}>{t('reportPage.averageDistance')}</Text>
                  </View>
                </View>
              </AnimatedCard>
            </FadeInView>

            <FadeInView delay={250}>
              <AnimatedCard>
                <View style={styles.cardHeader}>
                  <Icon name="car-multiple" size={24} color={Theme.colors.secondary} />
                  <Text style={styles.cardTitle}>{t('reportPage.transportUsage')}</Text>
                </View>
                {pieChartData.length > 0 ? (
                  <View style={styles.chartContainer}>
                    <PieChart
                      data={pieChartData}
                      width={screenWidth - 80}
                      height={220}
                      chartConfig={chartConfig}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"15"}
                      center={[10, 0]}
                      absolute
                    />
                    {/* BarChart 추가 */}
                    {barChartData && (
                      <View style={styles.barChartContainer}>
                        <Text style={styles.barChartTitle}>{t('reportPage.usageCount')}</Text>
                        <BarChart
                          data={barChartData}
                          width={screenWidth - 80}
                          height={200}
                          chartConfig={chartConfig}
                          verticalLabelRotation={0}
                          fromZero
                          showValuesOnTopOfBars
                          style={styles.barChart}
                        />
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.emptyChartState}>
                    <Icon name="chart-pie" size={48} color={Theme.colors.textLight} />
                    <Text style={styles.noDataText}>{t('reportPage.noTransportData')}</Text>
                  </View>
                )}
              </AnimatedCard>
            </FadeInView>

            <FadeInView delay={300}>
              <AnimatedCard>
                <View style={styles.cardHeader}>
                  <Icon name="trophy" size={24} color={Theme.colors.warning} />
                  <Text style={styles.cardTitle}>{t('reportPage.myAchievements')}</Text>
                </View>
                <View style={styles.achievementGrid}>
                  <View style={styles.achievementCard}>
                    <View style={[styles.achievementIconContainer, { backgroundColor: Theme.colors.warning + '20' }]}>
                      <Icon name="calendar-star" size={28} color={Theme.colors.warning} />
                    </View>
                    <Text style={styles.achievementLabel}>{t('reportPage.bestDay')}</Text>
                    <Text style={styles.achievementValue}>
                      {report.bestDay.date ? new Date(report.bestDay.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.achievementCard}>
                    <View style={[styles.achievementIconContainer, { backgroundColor: Theme.colors.success + '20' }]}>
                      <Icon name="leaf-circle" size={28} color={Theme.colors.success} />
                    </View>
                    <Text style={styles.achievementLabel}>{t('reportPage.bestSavings')}</Text>
                    <Text style={styles.achievementValue}>{formatEmission(report.bestDay.savings)}</Text>
                  </View>
                </View>
                
                {/* 백분위 시각화 */}
                <View style={styles.percentileContainer}>
                  <View style={styles.percentileHeader}>
                    <Icon name="chart-timeline-variant" size={20} color={Theme.colors.primary} />
                    <Text style={styles.percentileLabel}>{t('reportPage.myPercentile')}</Text>
                    <Text style={styles.percentileValue}>{t('reportPage.topPercent', { percent: report.percentile.toFixed(1) })}</Text>
                  </View>
                  <View style={styles.percentileBarContainer}>
                    <ProgressBar
                      progress={report.percentile / 100}
                      color={getPercentileColor(report.percentile)}
                      style={styles.percentileBar}
                    />
                    <View style={styles.percentileMarkers}>
                      <Text style={styles.percentileMarker}>0%</Text>
                      <Text style={styles.percentileMarker}>50%</Text>
                      <Text style={styles.percentileMarker}>100%</Text>
                    </View>
                  </View>
                  <Text style={styles.percentileDescription}>
                    {getPercentileMessage(report.percentile)}
                  </Text>
                </View>
                
                {/* 나무 심기 메시지 - 항상 표시 */}
                <View style={styles.treePlantingContainer}>
                  <View style={styles.treePlantingHeader}>
                    <Icon name="tree" size={24} color={Theme.colors.success} />
                    <Text style={styles.treePlantingTitle}>{t('reportPage.environmentalContribution')}</Text>
                  </View>
                  <View style={styles.treePlantingContent}>
                    <Text style={styles.treePlantingText}>
                      {t('reportPage.treesPlanted', { count: Math.floor((report.totalSavedEmission || 0) / 300000) || 0 })}
                    </Text>
                    <Text style={styles.treePlantingSubtext}>
                      {t('reportPage.treeFormula')}
                    </Text>
                    {(report.totalSavedEmission || 0) > 0 && (
                      <Text style={styles.treePlantingSubtext}>
                        {t('reportPage.totalCarbonSaved', { amount: formatEmission(report.totalSavedEmission || 0) })}
                      </Text>
                    )}
                  </View>
                  {Math.floor((report.totalSavedEmission || 0) / 300000) > 0 && (
                    <View style={styles.treeIconContainer}>
                      {Array.from({ length: Math.min(Math.floor((report.totalSavedEmission || 0) / 300000), 10) }).map((_, index) => (
                        <Icon key={index} name="tree" size={32} color={Theme.colors.success} />
                      ))}
                      {Math.floor((report.totalSavedEmission || 0) / 300000) > 10 && (
                        <Text style={styles.treeCountText}>+{Math.floor((report.totalSavedEmission || 0) / 300000) - 10}</Text>
                      )}
                    </View>
                  )}
                  
                  {/* 비교 문구 */}
                  {(report.totalSavedEmission || 0) > 0 && (() => {
                    const comparisonMessages = getEnvironmentalImpactMessages(report.totalSavedEmission || 0);
                    if (comparisonMessages.length > 0) {
                      return (
                        <View style={styles.comparisonContainer}>
                          <Text style={styles.comparisonTitle}>{t('reportPage.comparisonTitle')}</Text>
                          {comparisonMessages.map((message, index) => (
                            <View key={index} style={styles.comparisonItem}>
                              <Icon name="check-circle" size={16} color={Theme.colors.success} />
                              <Text style={styles.comparisonText}>{message}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    }
                    return null;
                  })()}
                </View>
              </AnimatedCard>
            </FadeInView>
          </>
        ) : (
          <FadeInView delay={200}>
            <AnimatedCard>
              <View style={styles.emptyState}>
                <Icon name="chart-box-outline" size={64} color={Theme.colors.textLight} />
                <Text style={styles.emptyTitle}>
                  {report?.message || t('reportPage.noData')}
                </Text>
                <Text style={styles.emptyDescription}>
                  {report?.message 
                    ? t('reportPage.noDataDescription')
                    : t('reportPage.loadingFailed')}
                </Text>
              </View>
            </AnimatedCard>
          </FadeInView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// 백분위에 따른 색상 반환
const getPercentileColor = (percentile: number): string => {
  if (percentile >= 80) return Theme.colors.success;
  if (percentile >= 50) return Theme.colors.primary;
  if (percentile >= 20) return Theme.colors.warning;
  return Theme.colors.error;
};

// 백분위에 따른 메시지 반환
const getPercentileMessage = (percentile: number): string => {
  if (percentile >= 90) return `🏆 ${t('reportPage.excellent')}`;
  if (percentile >= 70) return `✨ ${t('reportPage.veryGood')}`;
  if (percentile >= 50) return `👍 ${t('reportPage.good')}`;
  if (percentile >= 30) return `💪 ${t('reportPage.keepGoing')}`;
  return `🌱 ${t('reportPage.startNow')}`;
};

// 환경 기여도 비교 문구 생성
const getEnvironmentalImpactMessages = (totalSavedEmission: number): string[] => {
  const savedKg = totalSavedEmission / 1000; // 그램을 kg으로 변환
  const messages: string[] = [];

  // 300kg당 기준으로 계산
  const per300kg = savedKg / 300;

  // 일상 용품형
  if (per300kg >= 0.1) {
    const plasticBags = Math.floor(per300kg * 140);
    if (plasticBags > 0) {
      messages.push(t('reportPage.plasticBagsEffect', { count: plasticBags.toLocaleString() }));
    }

    const paperCups = Math.floor(per300kg * 600);
    if (paperCups > 0) {
      messages.push(t('reportPage.paperCupsEffect', { count: paperCups.toLocaleString() }));
    }

    const waterBottles = Math.floor(per300kg * 80);
    if (waterBottles > 0) {
      messages.push(t('reportPage.waterBottlesEffect', { count: waterBottles.toLocaleString() }));
    }
  }

  // 이동/에너지형
  if (per300kg >= 0.1) {
    const carKm = Math.floor(per300kg * 35);
    if (carKm > 0) {
      messages.push(t('reportPage.carKmEffect', { km: carKm }));
    }
  }

  // 시각적 부피형 (이산화탄소 1kg ≈ 500리터 부피)
  if (savedKg >= 1) {
    const bottles = Math.floor((savedKg * 500) / 1.5);
    if (bottles >= 100) {
      messages.push(t('reportPage.bottlesExhaustEffect', { count: Math.floor(bottles / 100) * 100 }));
    }
  }

  return messages.slice(0, 3); // 최대 3개만 표시
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
    paddingTop: Theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.xs,
  },
  headerTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: Theme.spacing.xl,
    alignItems: 'center',
  },
  controls: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  pickerContainer: {
    flex: 1,
    maxWidth: 150,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
    ...Theme.shadows.small,
  },
  picker: { 
    width: '100%',
    height: 50,
    color: Theme.colors.text,
  },
  pickerItem: {
    fontSize: 16,
    height: 50,
    color: Theme.colors.text,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
  },
  cardTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: Theme.spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    ...Theme.shadows.small,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  statValue: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '700',
    marginBottom: Theme.spacing.xs / 2,
  },
  statLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  statUnit: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    fontSize: 10,
    marginTop: 2,
  },
  chartContainer: {
    alignItems: 'center',
  },
  barChartContainer: {
    marginTop: Theme.spacing.lg,
    width: '100%',
  },
  barChartTitle: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  barChart: {
    marginVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.medium,
  },
  emptyChartState: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  achievementGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  achievementCard: {
    flex: 1,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    ...Theme.shadows.small,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  achievementIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  achievementLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  achievementValue: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  percentileContainer: {
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  percentileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
  },
  percentileLabel: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
    flex: 1,
  },
  percentileValue: {
    ...Theme.typography.h4,
    color: Theme.colors.primary,
    fontWeight: '700',
  },
  percentileBarContainer: {
    marginBottom: Theme.spacing.sm,
  },
  percentileBar: {
    height: 12,
    borderRadius: Theme.borderRadius.small,
    backgroundColor: Theme.colors.border,
    marginBottom: Theme.spacing.xs,
  },
  percentileMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  percentileMarker: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    fontSize: 10,
  },
  percentileDescription: {
    ...Theme.typography.body2,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.spacing.xs,
  },
  treePlantingContainer: {
    marginTop: Theme.spacing.lg,
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.success + '15',
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.success + '40',
  },
  treePlantingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.md,
  },
  treePlantingTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '700',
  },
  treePlantingContent: {
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  treePlantingText: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  treePlantingSubtext: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 11,
  },
  treeIconContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  treeCountText: {
    ...Theme.typography.h4,
    color: Theme.colors.success,
    fontWeight: '700',
  },
  comparisonContainer: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  comparisonTitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
    fontWeight: '600',
  },
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  comparisonText: {
    ...Theme.typography.body2,
    color: Theme.colors.text,
    flex: 1,
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
  noDataText: {
    textAlign: 'center',
    paddingVertical: Theme.spacing.lg,
    ...Theme.typography.body1,
    color: Theme.colors.textSecondary,
  },
});

export default ReportPage;