import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Route, CarbonEmission } from '../types';
import { formatDistance, formatDuration, formatEmission, getTransportModeInfo } from '../utils/carbonCalculator';
import { Theme } from '../theme';

interface RouteResultProps {
  route: Route | null;
  emission: CarbonEmission | null;
}

const RouteResult: React.FC<RouteResultProps> = ({ route, emission }) => {
  if (!route || !emission) {
    return null;
  }

  const transportModeInfo = getTransportModeInfo(route.transportMode);

  return (
    <View style={styles.card}>
      {/* 출발지 및 도착지 */}
      <View style={styles.locationContainer}>
        <View style={styles.locationRow}>
          <View style={styles.locationIconContainer}>
            <Icon name="flag-outline" size={24} color={Theme.colors.primary} />
          </View>
          <Text style={styles.locationText}>{route.origin.name}</Text>
        </View>
        <View style={styles.connectorLine}>
          <View style={styles.connectorDot} />
          <View style={styles.connectorLineInner} />
          <View style={styles.connectorDot} />
        </View>
        <View style={styles.locationRow}>
          <View style={[styles.locationIconContainer, styles.destinationIcon]}>
            <Icon name="flag-checkered" size={24} color={Theme.colors.error} />
          </View>
          <Text style={styles.locationText}>{route.destination.name}</Text>
        </View>
      </View>

      {/* 이동 수단 표시 */}
      <View style={styles.modeContainer}>
        <View style={styles.modeBadge}>
          <Icon name={transportModeInfo.icon} size={20} color={Theme.colors.primary} />
          <Text style={styles.modeText}>{transportModeInfo.name}</Text>
        </View>
      </View>

      {/* 핵심 정보: 거리와 시간 */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <View style={[styles.infoIconContainer, { backgroundColor: Theme.colors.info + '20' }]}>
            <Icon name="road-variant" size={24} color={Theme.colors.info} />
          </View>
          <Text style={styles.infoValue}>{formatDistance(route.distance)}</Text>
          <Text style={styles.infoLabel}>거리</Text>
        </View>
        <View style={styles.infoItem}>
          <View style={[styles.infoIconContainer, { backgroundColor: Theme.colors.warning + '20' }]}>
            <Icon name="clock-outline" size={24} color={Theme.colors.warning} />
          </View>
          <Text style={styles.infoValue}>{formatDuration(route.duration)}</Text>
          <Text style={styles.infoLabel}>예상 시간</Text>
        </View>
      </View>

      {/* 상세 경로 안내 (대중교통용) */}
      {route.segments && route.segments.length > 0 && (
        <View style={styles.segmentsContainer}>
          <Text style={styles.segmentsTitle}>상세 경로</Text>
          {route.segments.map((segment, index) => {
            let displayText = '';
            let iconName = '';

            if (segment.mode === 'walking') {
              // 앞뒤가 대중교통이면 '환승 이동'으로 표시
              const prevMode = index > 0 ? route.segments![index - 1].mode : null;
              const nextMode = index < route.segments!.length - 1 ? route.segments![index + 1].mode : null;
              const isTransfer = (prevMode === 'bus' || prevMode === 'subway') && (nextMode === 'bus' || nextMode === 'subway');
              
              displayText = isTransfer ? '환승 이동' : '도보 이동';
              iconName = 'walk';
            } else if (segment.mode === 'bus') {
              displayText = `${segment.name || '버스'} 탑승`;
              iconName = 'bus';
            } else if (segment.mode === 'subway') {
              displayText = `${segment.name || '지하철'} 탑승`;
              iconName = 'subway';
            } else if (segment.mode === 'train') {
              displayText = `${segment.name || '기차'} 탑승`;
              iconName = 'train';
            } else {
              displayText = `${segment.name || segment.mode} 탑승`;
              iconName = 'bus';
            }

            return (
              <View key={index} style={styles.segmentRow}>
                <View style={styles.segmentIconContainer}>
                  <Icon name={iconName} size={20} color={Theme.colors.primary} />
                </View>
                <View style={styles.segmentContent}>
                  <Text style={styles.segmentText}>{displayText}</Text>
                  <Text style={styles.segmentDetails}>
                    {segment.distance.toFixed(1)}km
                    {segment.duration ? ` • ${segment.duration}분` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.lg,
  },
  locationContainer: {
    marginBottom: Theme.spacing.lg,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  destinationIcon: {
    backgroundColor: Theme.colors.error + '15',
  },
  locationText: {
    ...Theme.typography.body1,
    flex: 1,
    color: Theme.colors.text,
    fontWeight: '500',
  },
  connectorLine: {
    alignItems: 'center',
    marginVertical: Theme.spacing.xs,
    height: 24,
    justifyContent: 'space-between',
  },
  connectorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.border,
  },
  connectorLineInner: {
    width: 2,
    flex: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 2,
  },
  modeContainer: {
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary + '15',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.round,
    gap: Theme.spacing.xs,
  },
  modeText: {
    ...Theme.typography.body2,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.divider,
    paddingTop: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  infoValue: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginTop: Theme.spacing.xs,
  },
  infoLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
  },
  segmentsContainer: {
    marginTop: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.divider,
    paddingTop: Theme.spacing.lg,
  },
  segmentsTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs,
  },
  segmentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  segmentContent: {
    flex: 1,
  },
  segmentText: {
    ...Theme.typography.body2,
    color: Theme.colors.text,
    fontWeight: '500',
    marginBottom: Theme.spacing.xs,
  },
  segmentDetails: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
});

export default RouteResult;