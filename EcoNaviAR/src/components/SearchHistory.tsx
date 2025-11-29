import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Card, Title, Paragraph, IconButton } from 'react-native-paper';
import { SearchHistoryEntry, deleteSearchHistory } from '../utils/searchHistoryManager';
import { getTransportModeInfo, formatDistance, formatDuration } from '../utils/carbonCalculator';
import { useAuth } from '../contexts/AuthContext';

interface SearchHistoryProps {
  history: SearchHistoryEntry[];
  onSelect: (entry: SearchHistoryEntry) => void;
  onRefresh: () => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({ history, onSelect, onRefresh }) => {
  const { user } = useAuth();
  const formatSearchTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      '검색 기록 삭제',
      '이 검색 기록을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await deleteSearchHistory(id, user?.id || null);
            onRefresh();
          },
        },
      ]
    );
  };

  const renderHistoryItem = ({ item }: { item: SearchHistoryEntry }) => {
    const modeInfo = getTransportModeInfo(item.transportMode as any);
    const currentRoute = item.routesData.eco || item.routesData.fastest || Object.values(item.routesData)[0];
    
    if (!currentRoute) return null;

    return (
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => onSelect(item)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${item.origin.name}에서 ${item.destination.name}로 검색, ${modeInfo.name}`}
        accessibilityHint="이 검색 기록을 선택하여 경로를 다시 검색합니다"
      >
        <View style={styles.historyItemContent}>
          <View style={styles.historyItemHeader}>
            <Text style={styles.routeText}>
              {item.origin.name} → {item.destination.name}
            </Text>
            <IconButton
              icon="delete-outline"
              size={20}
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(item.id);
              }}
              style={styles.deleteButton}
            />
          </View>
          <View style={styles.historyItemDetails}>
            <Text style={styles.modeText}>
              {modeInfo.icon} {modeInfo.name}
            </Text>
            <Text style={styles.timeText}>
              {formatSearchTime(item.searchTime)}
            </Text>
          </View>
          {currentRoute.route && (
            <View style={styles.routeInfo}>
              <Text style={styles.routeInfoText}>
                {formatDistance(currentRoute.route.distance)} · {formatDuration(currentRoute.route.duration)}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>검색 기록</Title>
        {history.length > 0 ? (
          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        ) : (
          <Paragraph style={styles.noHistory}>검색 기록이 없습니다.</Paragraph>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  noHistory: {
    textAlign: 'center',
    color: '#888',
    marginVertical: 20,
  },
  historyItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    margin: 0,
  },
  historyItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modeText: {
    fontSize: 14,
    color: '#666',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  routeInfo: {
    marginTop: 4,
  },
  routeInfoText: {
    fontSize: 12,
    color: '#888',
  },
});

export default SearchHistory;

