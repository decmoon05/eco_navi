import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getCurrentSession, stopNavigationTracking } from '../utils/navigationTracker';
import { isNavigationTrackingEnabled } from '../utils/developerSettings';

const NavigationTrackingPage = () => {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [trackedLocations, setTrackedLocations] = useState<Array<{ latitude: number; longitude: number; timestamp: number }>>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    checkTrackingStatus();
    const interval = setInterval(checkTrackingStatus, 2000); // 2초마다 상태 확인
    return () => {
      clearInterval(interval);
      if (watchId !== null) {
        // @ts-ignore
        const Geolocation = require('@react-native-community/geolocation').default;
        Geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const checkTrackingStatus = async () => {
    const session = getCurrentSession();
    if (session && session.isActive) {
      setIsTracking(true);
      setTrackedLocations(session.locations);
      
      // 최신 위치로 지도 이동
      if (session.locations.length > 0) {
        const latest = session.locations[session.locations.length - 1];
        setCurrentLocation({ latitude: latest.latitude, longitude: latest.longitude });
        
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: latest.latitude,
            longitude: latest.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 500);
        }
      }
    } else {
      setIsTracking(false);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: '위치 권한 요청',
            message: 'GPS 위치 추적을 위해 위치 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '거부',
            buttonPositive: '허용',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('권한 요청 오류:', err);
        return false;
      }
    }
    return true; // iOS는 Info.plist에서 처리
  };

  const startLocationTracking = async () => {
    const enabled = await isNavigationTrackingEnabled();
    if (!enabled) {
      Alert.alert('알림', '개발자 설정에서 네비게이션 추적을 활성화해주세요.');
      return;
    }

    // 위치 권한 요청
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert('권한 필요', '위치 권한이 필요합니다. 설정에서 위치 권한을 허용해주세요.');
      return;
    }

    try {
      // @ts-ignore
      const Geolocation = require('@react-native-community/geolocation').default;
      
      const id = Geolocation.watchPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: Date.now(),
          };
          setCurrentLocation({ latitude: location.latitude, longitude: location.longitude });
          
          // 지도 이동
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 500);
          }
        },
        (error) => {
          console.error('GPS 오류:', error);
          Alert.alert('GPS 오류', '위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
          distanceFilter: 5, // 5미터 이상 이동했을 때만 업데이트
        }
      );
      
      setWatchId(id);
      setIsTracking(true);
    } catch (error) {
      console.error('위치 추적 시작 실패:', error);
      Alert.alert('오류', '위치 추적을 시작할 수 없습니다.');
    }
  };

  const stopLocationTracking = () => {
    if (watchId !== null) {
      // @ts-ignore
      const Geolocation = require('@react-native-community/geolocation').default;
      Geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GPS 위치 추적</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isTracking && styles.statusDotActive]} />
          <Text style={styles.statusText}>
            {isTracking ? '추적 중' : '대기 중'}
          </Text>
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation?.latitude || 37.5665,
          longitude: currentLocation?.longitude || 126.9780,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={isTracking}
      >
        {currentLocation && (
          <>
            <Marker
              coordinate={currentLocation}
              title="현재 위치"
              description={`위도: ${currentLocation.latitude.toFixed(6)}, 경도: ${currentLocation.longitude.toFixed(6)}`}
              pinColor="blue"
            />
            <Circle
              center={currentLocation}
              radius={50}
              strokeColor="rgba(0, 0, 255, 0.5)"
              fillColor="rgba(0, 0, 255, 0.1)"
            />
          </>
        )}
        {trackedLocations.map((loc, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
            pinColor="green"
          />
        ))}
      </MapView>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Icon name="map-marker" size={20} color="#666" />
          <Text style={styles.infoText}>
            {currentLocation 
              ? `위도: ${currentLocation.latitude.toFixed(6)}, 경도: ${currentLocation.longitude.toFixed(6)}`
              : '위치 정보 없음'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="map-marker-path" size={20} color="#666" />
          <Text style={styles.infoText}>
            추적된 위치: {trackedLocations.length}개
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {!isTracking ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={startLocationTracking}
          >
            <Icon name="play" size={24} color="white" />
            <Text style={styles.buttonText}>추적 시작</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopLocationTracking}
          >
            <Icon name="stop" size={24} color="white" />
            <Text style={styles.buttonText}>추적 중지</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default NavigationTrackingPage;

