import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CarbonEmission, Route, TransportMode } from '../types';
import { calculateTrafficAdjustedEmission, formatEmission, formatDuration, getTransportModeInfo } from '../utils/carbonCalculator';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n';

interface ModeComparisonProps {
  currentRoute: Route | null;
  carReferenceRoute?: Route | null;
  publicTransitReferenceRoute?: Route | null;
}

const ModeComparison: React.FC<ModeComparisonProps> = ({ currentRoute, carReferenceRoute, publicTransitReferenceRoute }) => {
  const { user } = useAuth();
  if (!currentRoute) {
    return null;
  }

  const userVehicleType = user?.vehicle_type || 'car';
  const comparisonResults: { mode: TransportMode; emission: CarbonEmission; duration: number; displayName?: string }[] = [];

  // 1. 사용자 차량 (실제 차량 타입)
  if (carReferenceRoute) {
    const userVehicleRoute: Route = {
      ...carReferenceRoute,
      transportMode: userVehicleType,
      duration: carReferenceRoute.duration,
    };
    const emission = calculateTrafficAdjustedEmission(userVehicleRoute);
    comparisonResults.push({ 
      mode: userVehicleType, 
      emission, 
      duration: carReferenceRoute.duration,
      displayName: `내 차량(${getTransportModeInfo(userVehicleType).name.replace('내 차량(', '').replace(')', '')})`
    });
  }

  // 2. 일반 내연 차량 (비교용)
  if (carReferenceRoute && userVehicleType !== 'car') {
    const carRoute: Route = {
      ...carReferenceRoute,
      transportMode: 'car',
      duration: carReferenceRoute.duration,
    };
    const emission = calculateTrafficAdjustedEmission(carRoute);
    comparisonResults.push({ 
      mode: 'car', 
      emission, 
      duration: carReferenceRoute.duration,
      displayName: '일반 내연 차량'
    });
  }

  // 3. 대중교통
  if (publicTransitReferenceRoute) {
    const transitRoute = publicTransitReferenceRoute;
    // 대중교통 타입 확인 (segments에서 확인)
    const transitTypes = new Set<string>();
    if (transitRoute.segments) {
      transitRoute.segments.forEach(seg => {
        if (seg.mode === 'bus') transitTypes.add('bus');
        else if (seg.mode === 'subway') transitTypes.add('subway');
        else if (seg.mode === 'train') transitTypes.add('train');
      });
    }
    
    // 대중교통 표시명 결정
    let transitDisplayName = '대중교통';
    if (transitTypes.size === 1) {
      const type = Array.from(transitTypes)[0];
      if (type === 'bus') transitDisplayName = '버스(대중교통)';
      else if (type === 'subway') transitDisplayName = '지하철(대중교통)';
      else if (type === 'train') transitDisplayName = '기차(대중교통)';
    } else if (transitTypes.size > 1) {
      transitDisplayName = '대중교통';
    }

    const emission = calculateTrafficAdjustedEmission(transitRoute);
    comparisonResults.push({ 
      mode: transitRoute.transportMode, 
      emission, 
      duration: transitRoute.duration,
      displayName: transitDisplayName
    });
  }

  // 4. 자전거
  const bicycleRoute: Route = {
    ...currentRoute,
    transportMode: 'bicycle',
    duration: Math.round((currentRoute.distance / 15) * 60),
    segments: undefined,
    polylines: undefined,
    bikeStations: undefined,
  };
  const bicycleEmission = calculateTrafficAdjustedEmission(bicycleRoute);
  comparisonResults.push({ 
    mode: 'bicycle', 
    emission: bicycleEmission, 
    duration: bicycleRoute.duration 
  });

  // 5. 도보
  const walkingRoute: Route = {
    ...currentRoute,
    transportMode: 'walking',
    duration: Math.round((currentRoute.distance / 4) * 60),
    segments: undefined,
    polylines: undefined,
    bikeStations: undefined,
  };
  const walkingEmission = calculateTrafficAdjustedEmission(walkingRoute);
  comparisonResults.push({ 
    mode: 'walking', 
    emission: walkingEmission, 
    duration: walkingRoute.duration 
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('modeComparison.title')}</Text>
      {comparisonResults.map((result, index) => {
        const modeInfo = getTransportModeInfo(result.mode);
        const displayName = result.displayName || modeInfo.name;
        return (
          <View key={index} style={styles.row}>
            <View style={styles.modeInfo}>
              <Text style={styles.modeLabel}>{modeInfo.icon} {displayName}</Text>
              <Text style={styles.durationText}>{formatDuration(result.duration)}</Text>
            </View>
            <Text style={styles.emissionValue}>{formatEmission(result.emission.totalEmission)}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modeInfo: {
    flexDirection: 'column',
  },
  modeLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  durationText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  emissionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
});

export default ModeComparison;