import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HistoryEntry } from '../utils/historyManager';
import { formatEmission, formatDistance, formatDuration, getTransportModeInfo } from '../utils/carbonCalculator';
import { RouteData } from '../types';
import { Theme } from '../theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from '../i18n';

interface HistoryProps {
  history: HistoryEntry[];
}

const History: React.FC<HistoryProps> = ({ history }) => {
  const navigation = useNavigation();

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    const currentLang = require('../i18n').getCurrentLanguage();
    if (diffDays === 0) {
      return currentLang === 'ko' ? '오늘' : 'Today';
    } else if (diffDays === 1) {
      return currentLang === 'ko' ? '어제' : 'Yesterday';
    } else if (diffDays < 7) {
      return currentLang === 'ko' ? `${diffDays}일 전` : `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString(currentLang === 'ko' ? 'ko-KR' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const handleHistoryItemPress = (item: HistoryEntry) => {
    // path 배열이 너무 크면 샘플링 (최대 500개 좌표만 사용)
    const maxCoordinates = 500;
    let coordinates: { latitude: number; longitude: number }[] = [];
    
    if (item.route.path && item.route.path.length > 0) {
      const path = item.route.path;
      
      // path가 maxCoordinates보다 작으면 모두 사용
      if (path.length <= maxCoordinates) {
        coordinates = path.map(p => ({ latitude: p[0], longitude: p[1] }));
      } else {
        // 샘플링: 균등하게 분포된 좌표 선택
        const step = Math.ceil(path.length / maxCoordinates);
        for (let i = 0; i < path.length; i += step) {
          coordinates.push({ latitude: path[i][0], longitude: path[i][1] });
        }
        // 마지막 좌표는 항상 포함
        const lastIndex = path.length - 1;
        if (coordinates[coordinates.length - 1]?.latitude !== path[lastIndex][0]) {
          coordinates.push({ latitude: path[lastIndex][0], longitude: path[lastIndex][1] });
        }
      }
    }
    
    // 실제 이동 기록을 RouteResultPage로 전달
    const routesData: { [key: string]: RouteData } = {
      eco: {
        route: item.route,
        emission: item.emission,
        coordinates: coordinates,
      },
    };
    
    navigation.navigate('RouteResultPage' as never, { routesData } as never);
  };

  const renderHistoryItem = ({ item }: { item: HistoryEntry }) => {
    const transportModeInfo = getTransportModeInfo(item.route.transportMode);
    return (
      <TouchableOpacity 
        onPress={() => handleHistoryItemPress(item)}
        activeOpacity={0.7}
        style={styles.historyCard}
      >
        <View style={styles.historyCardContent}>
          <View style={styles.historyCardLeft}>
            <View style={[styles.transportIconContainer, { backgroundColor: Theme.colors.primary + '15' }]}>
              <Text style={styles.transportIcon}>{transportModeInfo.icon}</Text>
            </View>
            <View style={styles.historyInfo}>
              <Text style={styles.historyTitle} numberOfLines={1}>
                {item.originName} → {item.destinationName}
              </Text>
              <View style={styles.historyMeta}>
                <View style={styles.metaItem}>
                  <Icon name="road" size={14} color={Theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{formatDistance(item.route.distance)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="clock-outline" size={14} color={Theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{formatDuration(item.route.duration)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="calendar" size={14} color={Theme.colors.textSecondary} />
                  <Text style={styles.metaText}>{formatDate(item.date)}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.historyCardRight}>
            <View style={styles.emissionBadge}>
              <Icon name="leaf" size={16} color={Theme.colors.success} />
              <Text style={styles.savedEmissionText}>{formatEmission(item.emission.savedEmission)}</Text>
            </View>
            <Text style={styles.totalEmissionText}>절약</Text>
            <Icon name="chevron-right" size={20} color={Theme.colors.textLight} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Icon name="history" size={24} color={Theme.colors.primary} />
        <Text style={styles.title}>{t('history.title')}</Text>
      </View>
      {history.length > 0 ? (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Icon name="map-marker-outline" size={64} color={Theme.colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>{t('history.empty')}</Text>
          <Text style={styles.emptyDescription}>{t('history.emptyDescription')}</Text>
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => navigation.navigate('Main' as never)}
            activeOpacity={0.7}
          >
            <Icon name="map-search" size={20} color={Theme.colors.primary} />
            <Text style={styles.emptyActionText}>{t('history.goToSearch')}</Text>
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
  historyCard: {
    marginBottom: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.small,
    overflow: 'hidden',
  },
  historyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
  },
  historyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  transportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Theme.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  transportIcon: {
    fontSize: 24,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    ...Theme.typography.body1,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  historyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs / 2,
  },
  metaText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 11,
  },
  historyCardRight: {
    alignItems: 'flex-end',
    gap: Theme.spacing.xs / 2,
  },
  emissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.success + '15',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs / 2,
    borderRadius: Theme.borderRadius.small,
    gap: Theme.spacing.xs / 2,
  },
  savedEmissionText: {
    ...Theme.typography.body2,
    color: Theme.colors.success,
    fontWeight: '700',
    fontSize: 13,
  },
  totalEmissionText: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 10,
  },
});

export default History;
