import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Route } from '../types';
import { Theme } from '../theme';
import { 
  getBusArrivalInfo, 
  getSubwayArrivalInfo, 
  formatArrivalTime,
  BusArrivalInfo,
  SubwayArrivalInfo 
} from '../utils/realtimeTraffic';

interface RealtimeTrafficInfoProps {
  route: Route;
}

const RealtimeTrafficInfo: React.FC<RealtimeTrafficInfoProps> = ({ route }) => {
  const [busInfo, setBusInfo] = useState<BusArrivalInfo[]>([]);
  const [subwayInfo, setSubwayInfo] = useState<SubwayArrivalInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 대중교통 경로가 아니면 표시하지 않음
  if (route.transportMode !== 'bus' && route.transportMode !== 'subway' && route.transportMode !== 'train') {
    return null;
  }

  useEffect(() => {
    if (autoRefresh) {
      fetchRealtimeInfo();
      const interval = setInterval(fetchRealtimeInfo, 30000); // 30초마다 갱신
      return () => clearInterval(interval);
    }
  }, [autoRefresh, route]);

  const fetchRealtimeInfo = async () => {
    if (!route.segments) return;

    setLoading(true);
    setError(null);

    try {
      const busInfos: BusArrivalInfo[] = [];
      const subwayInfos: SubwayArrivalInfo[] = [];

      for (const segment of route.segments) {
        console.log('[RealtimeTraffic] Segment 확인:', {
          mode: segment.mode,
          stationName: segment.stationName,
          stationId: segment.stationId,
          routeId: segment.routeId,
        });

        if (segment.mode === 'bus' && (segment.stationName || segment.stationId)) {
          try {
            let stationId: string | undefined = undefined;
            
            // ODsay의 stationId는 TAGO API 형식과 다를 수 있으므로,
            // stationName이 있으면 항상 이름으로 검색하여 올바른 nodeId를 찾음
            if (segment.stationName) {
              console.log('[RealtimeTraffic] 버스 정류소 검색:', segment.stationName);
              // 여러 도시 코드로 시도 (서울, 부산, 대구, 인천, 광주, 대전, 울산)
              const cityCodes = ['11', '26', '27', '28', '29', '30', '31'];
              
              for (const cityCode of cityCodes) {
                try {
                  const stations = await getBusStationInfo(segment.stationName, cityCode);
                  if (stations.length > 0 && stations[0].nodeid) {
                    stationId = stations[0].nodeid;
                    console.log('[RealtimeTraffic] 버스 정류소 ID 찾음:', stationId, '(도시코드:', cityCode, ')');
                    break;
                  }
                } catch (e) {
                  // 다음 도시 코드 시도
                  console.log('[RealtimeTraffic] 도시코드', cityCode, '정류소 검색 실패, 다음 시도');
                }
              }
            } else if (segment.stationId) {
              // stationName이 없고 stationId만 있는 경우, 직접 사용 시도
              stationId = segment.stationId;
              console.log('[RealtimeTraffic] ODsay stationId 직접 사용:', stationId);
            }
            
            if (stationId) {
              console.log('[RealtimeTraffic] 버스 도착 정보 조회:', stationId, segment.routeId);
              // 여러 도시 코드로 시도 (서울, 부산, 대구, 인천, 광주, 대전, 울산)
              const cityCodes = ['11', '26', '27', '28', '29', '30', '31'];
              let found = false;
              
              for (const cityCode of cityCodes) {
                try {
                  const info = await getBusArrivalInfo(stationId, segment.routeId, cityCode);
                  if (info.length > 0) {
                    console.log('[RealtimeTraffic] 버스 도착 정보 결과:', info.length, '개 (도시코드:', cityCode, ')');
                    busInfos.push(...info);
                    found = true;
                    break;
                  }
                } catch (e) {
                  // 다음 도시 코드 시도
                  console.log('[RealtimeTraffic] 도시코드', cityCode, '도착정보 조회 실패, 다음 시도');
                }
              }
              
              if (!found) {
                console.warn('[RealtimeTraffic] 모든 도시 코드에서 버스 정보를 찾을 수 없음 (정류소:', segment.stationName || stationId, ')');
              }
            } else {
              console.warn('[RealtimeTraffic] 버스 정류소 ID를 찾을 수 없음 (정류소명:', segment.stationName, ')');
            }
          } catch (e) {
            console.error('[RealtimeTraffic] 버스 정보 조회 실패:', e);
          }
        } else if (segment.mode === 'train' && (segment.stationName || segment.stationId)) {
          // 기차 실시간 정보는 TAGO 열차정보 API 사용
          try {
            console.log('[RealtimeTraffic] 기차 역 정보:', segment.stationName);
            // 기차는 실시간 도착 정보가 제한적이므로, 일단 역 정보만 표시
            // TODO: TAGO 열차정보 API로 실시간 정보 조회 구현 필요
            console.log('[RealtimeTraffic] 기차 실시간 정보는 현재 지원되지 않습니다');
          } catch (e) {
            console.error('[RealtimeTraffic] 기차 정보 조회 실패:', e);
          }
        } else if (segment.mode === 'subway' && (segment.stationName || segment.stationId)) {
          try {
            let stationId = segment.stationId;
            let routeId = segment.routeId || segment.name || '';
            
            // stationName이 있으면 역 정보를 먼저 조회
            if (!stationId && segment.stationName) {
              console.log('[RealtimeTraffic] 지하철 역 검색:', segment.stationName);
              const stations = await getSubwayStationInfo(segment.stationName);
              
              if (stations.length > 0) {
                stationId = stations[0].subwayStationId;
                routeId = stations[0].subwayRouteId || routeId;
                console.log('[RealtimeTraffic] 지하철 역 ID 찾음:', stationId, routeId);
              }
            }
            
            if (stationId) {
              console.log('[RealtimeTraffic] 지하철 도착 정보 조회:', stationId, routeId);
              const { getSubwayArrivalInfo: getTagoSubwayArrival } = await import('../utils/tagoApi');
              const info = await getTagoSubwayArrival(stationId, routeId);
              console.log('[RealtimeTraffic] 지하철 도착 정보 결과:', info.length, '개');
              if (info.length > 0) {
                subwayInfos.push(...info);
              }
            } else {
              console.warn('[RealtimeTraffic] 지하철 역 ID를 찾을 수 없음');
            }
          } catch (e) {
            console.error('[RealtimeTraffic] 지하철 정보 조회 실패:', e);
          }
        }
      }
      
      console.log('[RealtimeTraffic] 최종 결과:', {
        busInfos: busInfos.length,
        subwayInfos: subwayInfos.length,
      });

      setBusInfo(busInfos);
      setSubwayInfo(subwayInfos);
    } catch (err: any) {
      setError('실시간 정보를 불러올 수 없습니다.');
      console.error('실시간 교통 정보 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  if (error && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Icon name="information-outline" size={20} color={Theme.colors.textSecondary} />
          <Text style={styles.headerText}>실시간 교통 정보</Text>
          <TouchableOpacity onPress={() => setAutoRefresh(!autoRefresh)} style={styles.refreshButton}>
            <Icon 
              name={autoRefresh ? "refresh" : "refresh-off"} 
              size={20} 
              color={autoRefresh ? Theme.colors.info : Theme.colors.textLight} 
            />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchRealtimeInfo} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="clock-fast" size={20} color={Theme.colors.info} />
        <Text style={styles.headerText}>실시간 교통 정보</Text>
        {loading && <ActivityIndicator size="small" color={Theme.colors.info} style={{ marginLeft: 8 }} />}
        <TouchableOpacity onPress={() => setAutoRefresh(!autoRefresh)} style={styles.refreshButton}>
          <Icon 
            name={autoRefresh ? "refresh" : "refresh-off"} 
            size={20} 
            color={autoRefresh ? Theme.colors.info : Theme.colors.textLight} 
          />
        </TouchableOpacity>
      </View>

      {busInfo.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚌 버스 도착 정보</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {busInfo.map((info, index) => (
              <View key={index} style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Icon name="bus" size={24} color={Theme.colors.warning} />
                  <Text style={styles.routeName}>{info.routeName}</Text>
                </View>
                <Text style={styles.stationName}>{info.stationName}</Text>
                <View style={styles.arrivalInfo}>
                  <Icon name="clock-outline" size={16} color={Theme.colors.textSecondary} />
                  <Text style={styles.arrivalTime}>
                    {info.arrivalTime > 0 
                      ? formatArrivalTime(info.arrivalTime)
                      : '도착 정보 없음'}
                  </Text>
                </View>
                {info.remainingStations > 0 && (
                  <Text style={styles.remainingStations}>
                    {info.remainingStations}개 정류장 전
                  </Text>
                )}
                {info.isLowFloor && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>저상버스</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {subwayInfo.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚇 지하철 도착 정보</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {subwayInfo.map((info, index) => (
              <View key={index} style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <Icon name="subway" size={24} color={Theme.colors.info} />
                  <Text style={styles.routeName}>{info.lineName}</Text>
                </View>
                <Text style={styles.stationName}>{info.stationName}</Text>
                <View style={styles.arrivalInfo}>
                  <Icon name="clock-outline" size={16} color={Theme.colors.textSecondary} />
                  <Text style={styles.arrivalTime}>
                    {info.arrivalTime > 0 
                      ? formatArrivalTime(info.arrivalTime)
                      : '도착 정보 없음'}
                  </Text>
                </View>
                {info.remainingStations > 0 && (
                  <Text style={styles.remainingStations}>
                    {info.remainingStations}개 역 전
                  </Text>
                )}
                <Text style={styles.direction}>{info.direction}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {!loading && busInfo.length === 0 && subwayInfo.length === 0 && !error && (
        <View style={styles.emptyContainer}>
          <Icon name="information-outline" size={48} color={Theme.colors.textLight} />
          <Text style={styles.emptyText}>실시간 정보를 사용할 수 없습니다</Text>
          <Text style={styles.emptySubText}>
            {route.segments && route.segments.length > 0 
              ? '버스/지하철 구간의 정류장/역 정보가 없거나 실시간 데이터를 조회할 수 없습니다'
              : '대중교통 구간이 없습니다'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 8,
    padding: 16,
    marginVertical: 10,
    shadowColor: Theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginLeft: 8,
    flex: 1,
  },
  refreshButton: {
    padding: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: Theme.colors.backgroundDark,
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 180,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginLeft: 8,
  },
  stationName: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginBottom: 8,
  },
  arrivalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  arrivalTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.info,
    marginLeft: 4,
  },
  remainingStations: {
    fontSize: 12,
    color: Theme.colors.textLight,
    marginTop: 4,
  },
  direction: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 4,
  },
  badge: {
    backgroundColor: Theme.colors.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    color: Theme.colors.backgroundLight,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: Theme.colors.textLight,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 12,
    color: Theme.colors.textLight,
    marginTop: 4,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: Theme.colors.error,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: Theme.colors.info,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Theme.colors.backgroundLight,
    fontWeight: '600',
  },
});

export default RealtimeTrafficInfo;

