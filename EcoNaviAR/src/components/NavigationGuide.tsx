import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Route } from '../types';
import {
  calculateNavigationState,
  NavigationState,
  formatDistance,
} from '../utils/navigationGuide';

interface NavigationGuideProps {
  route: Route;
  onStop: () => void;
  onArrive?: () => void;
}

const NavigationGuide: React.FC<NavigationGuideProps> = ({ route, onStop, onArrive }) => {
  const [navigationState, setNavigationState] = useState<NavigationState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!route.path || route.path.length === 0) {
      Alert.alert('오류', '경로 정보가 없습니다.');
      onStop();
      return;
    }

    // GPS 추적 시작
    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        if (!isPaused) {
          const state = calculateNavigationState(route, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setNavigationState(state);

          // 목적지 도착 확인
          if (state.currentInstruction?.type === 'arrive' && onArrive) {
            onArrive();
          }
        }
      },
      (error) => {
        console.error('[Navigation Guide] GPS Error:', error);
        Alert.alert('위치 오류', 'GPS 위치를 가져올 수 없습니다.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
        distanceFilter: 5, // 5미터 이상 이동했을 때만 업데이트
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [route, isPaused, onStop, onArrive]);

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
    }
    onStop();
  };

  if (!navigationState) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>위치를 확인하는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const instruction = navigationState.currentInstruction;
  const nextInstruction = navigationState.nextInstruction;

  const getDirectionIcon = (direction?: string) => {
    switch (direction) {
      case 'left':
        return 'arrow-left';
      case 'right':
        return 'arrow-right';
      case 'slight-left':
        return 'arrow-left-bottom';
      case 'slight-right':
        return 'arrow-right-bottom';
      case 'u-turn':
        return 'arrow-u-left-top';
      default:
        return 'arrow-up';
    }
  };

  const getDirectionColor = (direction?: string) => {
    switch (direction) {
      case 'left':
      case 'slight-left':
        return '#2196F3';
      case 'right':
      case 'slight-right':
        return '#FF9800';
      case 'u-turn':
        return '#F44336';
      default:
        return '#4CAF50';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 컨트롤 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleStop} style={styles.stopButton}>
          <Icon name="close" size={24} color="#fff" />
          <Text style={styles.stopButtonText}>종료</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePause} style={styles.pauseButton}>
          <Icon name={isPaused ? 'play' : 'pause'} size={24} color="#fff" />
          <Text style={styles.pauseButtonText}>{isPaused ? '재개' : '일시정지'}</Text>
        </TouchableOpacity>
      </View>

      {/* 메인 안내 */}
      <View style={styles.mainInstruction}>
        {instruction && (
          <>
            {instruction.type === 'off-route' ? (
              <View style={styles.offRouteContainer}>
                <Icon name="alert-circle" size={64} color="#F44336" />
                <Text style={styles.offRouteText}>{instruction.description}</Text>
              </View>
            ) : instruction.type === 'arrive' ? (
              <View style={styles.arriveContainer}>
                <Icon name="check-circle" size={64} color="#4CAF50" />
                <Text style={styles.arriveText}>목적지에 도착했습니다!</Text>
              </View>
            ) : (
              <>
                <View style={[styles.directionIconContainer, { backgroundColor: getDirectionColor(instruction.direction) + '20' }]}>
                  <Icon
                    name={getDirectionIcon(instruction.direction)}
                    size={80}
                    color={getDirectionColor(instruction.direction)}
                  />
                </View>
                <Text style={styles.distanceText}>
                  {formatDistance(instruction.distance)}
                </Text>
                <Text style={styles.instructionText}>{instruction.description}</Text>
              </>
            )}
          </>
        )}
      </View>

      {/* 다음 안내 */}
      {nextInstruction && (
        <View style={styles.nextInstruction}>
          <Text style={styles.nextInstructionLabel}>다음 안내</Text>
          <Text style={styles.nextInstructionText}>{nextInstruction.description}</Text>
        </View>
      )}

      {/* 진행률 및 정보 */}
      <View style={styles.infoContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${navigationState.progress * 100}%` },
            ]}
          />
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Icon name="map-marker-distance" size={20} color="#666" />
            <Text style={styles.infoText}>
              {formatDistance(navigationState.distanceToDestination)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Icon name="clock-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {Math.round((navigationState.distanceToDestination / 1000 / 60) * 60)}분 예상
            </Text>
          </View>
        </View>
        {!navigationState.isOnRoute && (
          <View style={styles.warningContainer}>
            <Icon name="alert" size={16} color="#F44336" />
            <Text style={styles.warningText}>경로에서 이탈했습니다</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pauseButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  mainInstruction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  directionIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  distanceText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  offRouteContainer: {
    alignItems: 'center',
  },
  offRouteText: {
    fontSize: 20,
    color: '#F44336',
    marginTop: 16,
    fontWeight: '600',
  },
  arriveContainer: {
    alignItems: 'center',
  },
  arriveText: {
    fontSize: 24,
    color: '#4CAF50',
    marginTop: 16,
    fontWeight: 'bold',
  },
  nextInstruction: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  nextInstructionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  nextInstructionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  infoContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
});

export default NavigationGuide;



