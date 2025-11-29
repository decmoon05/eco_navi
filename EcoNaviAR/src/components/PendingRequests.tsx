import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Card } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getQueuedRequests, syncQueuedRequests, QueuedRequest, RequestType } from '../utils/requestQueue';
import { Theme } from '../theme';

const PendingRequests: React.FC = () => {
  const [requests, setRequests] = useState<QueuedRequest[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadRequests = async () => {
    const queued = await getQueuedRequests();
    setRequests(queued);
  };

  useEffect(() => {
    loadRequests();
    // 5초마다 업데이트
    const interval = setInterval(loadRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncQueuedRequests();
      await loadRequests();
      console.log(`[PendingRequests] 동기화 완료: 성공 ${result.synced}개, 실패 ${result.failed}개`);
    } catch (error) {
      console.error('[PendingRequests] 동기화 오류:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getRequestTypeName = (type: RequestType): string => {
    const names: Record<RequestType, string> = {
      saveTrip: '이동 기록 저장',
      updateProfile: '프로필 업데이트',
      setGoal: '목표 설정',
      updateVehicle: '차량 정보 변경',
      claimQuestReward: '퀘스트 보상 수령',
      exchangeProduct: '상품 교환',
      refreshUser: '사용자 정보 새로고침',
    };
    return names[type] || type;
  };

  const getRequestIcon = (type: RequestType): string => {
    const icons: Record<RequestType, string> = {
      saveTrip: 'map-marker-check',
      updateProfile: 'account-edit',
      setGoal: 'target',
      updateVehicle: 'car',
      claimQuestReward: 'trophy',
      exchangeProduct: 'gift',
      refreshUser: 'refresh',
    };
    return icons[type] || 'clock-outline';
  };

  // 일방향 동기화 정책: 로컬 → 클라우드 요청 큐 비활성화
  // PendingRequests 컴포넌트는 더 이상 표시하지 않음
  return null;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="clock-outline" size={24} color={Theme.colors.warning} />
            <View style={styles.headerText}>
              <Text style={styles.title}>대기 중인 작업</Text>
              <Text style={styles.subtitle}>{requests.length}개의 작업이 대기 중입니다</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
          >
            <Icon 
              name={isSyncing ? "loading" : "sync"} 
              size={20} 
              color={Theme.colors.backgroundLight} 
            />
            <Text style={styles.syncButtonText}>
              {isSyncing ? '동기화 중...' : '지금 동기화'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.requestsList} nestedScrollEnabled>
          {requests.map((request) => (
            <View key={request.id} style={styles.requestItem}>
              <Icon 
                name={getRequestIcon(request.type)} 
                size={20} 
                color={Theme.colors.textSecondary} 
              />
              <View style={styles.requestInfo}>
                <Text style={styles.requestType}>{getRequestTypeName(request.type)}</Text>
                <Text style={styles.requestDetails}>
                  재시도: {request.retryCount}/{5} • {new Date(request.timestamp).toLocaleString('ko-KR')}
                </Text>
              </View>
              {request.retryCount > 0 && (
                <View style={styles.retryBadge}>
                  <Text style={styles.retryBadgeText}>{request.retryCount}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.warning,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  title: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
  },
  subtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.warning,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
    gap: Theme.spacing.xs,
    ...Theme.shadows.small,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    ...Theme.typography.body2,
    color: Theme.colors.backgroundLight,
    fontWeight: '600',
  },
  requestsList: {
    maxHeight: 200,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  requestInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  requestType: {
    ...Theme.typography.body2,
    color: Theme.colors.text,
    fontWeight: '500',
    marginBottom: Theme.spacing.xs,
  },
  requestDetails: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  retryBadge: {
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.borderRadius.round,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBadgeText: {
    ...Theme.typography.caption,
    color: Theme.colors.backgroundLight,
    fontWeight: 'bold',
    fontSize: 10,
  },
});

export default PendingRequests;



