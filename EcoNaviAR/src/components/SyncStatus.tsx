import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getPendingTripsCount, syncPendingTrips } from '../utils/syncManager';
import { notifySyncCompleted } from '../utils/notificationManager';
import { Theme } from '../theme';

interface SyncStatusProps {
  onSyncComplete?: (synced: number, failed: number) => void;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ onSyncComplete }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await getPendingTripsCount();
      setPendingCount(count);
    };

    updatePendingCount();
    // 5초마다 대기 중인 기록 개수 확인
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncPendingTrips();
      setPendingCount(await getPendingTripsCount());
      
      // 동기화 완료 알림 표시
      if (result.synced > 0 || result.failed > 0) {
        notifySyncCompleted(result.synced, result.failed);
      }
      
      if (onSyncComplete) {
        onSyncComplete(result.synced, result.failed);
      }
    } catch (error) {
      console.error('동기화 오류:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // 일방향 동기화 정책: 로컬 → 클라우드 동기화 비활성화
  // SyncStatus 컴포넌트는 더 이상 표시하지 않음
  return null;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.container}>
          <View style={styles.infoContainer}>
            <Icon name="cloud-upload" size={24} color="#FF9800" />
            <View style={styles.textContainer}>
              <Text style={styles.title}>동기화 대기 중</Text>
              <Text style={styles.description}>
                {pendingCount}개의 이동 기록이 서버에 동기화되기를 기다리고 있습니다.
              </Text>
            </View>
          </View>
          <Button
            mode="contained"
            onPress={handleManualSync}
            loading={isSyncing}
            disabled={isSyncing}
            style={styles.syncButton}
            labelStyle={styles.buttonLabel}
            icon="sync"
          >
            {isSyncing ? '동기화 중...' : '지금 동기화'}
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Theme.spacing.md,
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    borderRadius: Theme.borderRadius.medium,
    ...Theme.shadows.small,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#666',
  },
  syncButton: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  buttonLabel: {
    fontSize: 12,
  },
});

export default SyncStatus;
