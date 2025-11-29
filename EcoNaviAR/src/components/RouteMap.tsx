import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, Callout } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Coordinate, Location, PolylineSegment, BikeStation } from '../types';

interface RouteMapProps {
  coordinates: Coordinate[];
  polylines?: PolylineSegment[];
  bikeStations?: BikeStation[];
  origin: Location;
  destination: Location;
}

const RouteMap: React.FC<RouteMapProps> = ({ coordinates, polylines, bikeStations, origin, destination }) => {
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (mapRef.current && coordinates.length > 0) {
      // 마커들을 포함하는 영역 계산
      const allCoordinates = [...coordinates];
      if (bikeStations) {
        bikeStations.forEach(s => allCoordinates.push({ latitude: s.location.lat, longitude: s.location.lng }));
      }

      mapRef.current.fitToCoordinates(allCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [coordinates, bikeStations]);

  // 화살표를 위한 마커 생성 (경로의 일부 지점에만 표시)
  const createArrowMarkers = () => {
    const arrows = [];
    // 경로의 1/4, 1/2, 3/4 지점에 화살표 표시
    const arrowIndices = [
      Math.floor(coordinates.length / 4),
      Math.floor(coordinates.length / 2),
      Math.floor(coordinates.length * 3 / 4),
    ];
    // Set을 사용하여 중복된 인덱스 제거
    const uniqueIndices = [...new Set(arrowIndices)];

    for (const index of uniqueIndices) {
      if (index > 0 && index < coordinates.length) {
        const p1 = coordinates[index - 1];
        const p2 = coordinates[index];
        const angle = Math.atan2(p2.latitude - p1.latitude, p2.longitude - p1.longitude) * 180 / Math.PI;
        
        arrows.push(
          <Marker
            key={`arrow-${index}`}
            coordinate={p1}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={angle}
            flat={true} // 지도를 회전해도 마커가 같이 회전하도록 설정 (화살표 방향 유지)
          >
            <Icon name="chevron-up" size={12} color="#FFFFFF" />
          </Marker>
        );
      }
    }
    return arrows;
  };

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      initialRegion={{
        latitude: origin.lat,
        longitude: origin.lng,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
    >
      <Marker
        coordinate={{ latitude: origin.lat, longitude: origin.lng }}
        title="출발지"
        description={origin.name}
      />
      <Marker
        coordinate={{ latitude: destination.lat, longitude: destination.lng }}
        title="도착지"
        description={destination.name}
      />
      
      {polylines && polylines.length > 0 ? (
        polylines.map((segment, index) => (
          <Polyline
            key={`poly-${index}`}
            coordinates={segment.coordinates}
            strokeColor={segment.color}
            strokeWidth={segment.dashed ? 4 : 5} // 도보는 약간 얇게
            lineDashPattern={segment.dashed ? [10, 10] : undefined}
            zIndex={segment.dashed ? 1 : 2} // 도보가 아래로
          />
        ))
      ) : (
        <Polyline
          coordinates={coordinates}
          strokeColor="#0000FF" // blue
          strokeWidth={5}
        />
      )}
      
      {createArrowMarkers()}

      {/* 공유 자전거 대여소 마커 */}
      {bikeStations && bikeStations.map((station, index) => (
        <Marker
          key={`station-${index}`}
          coordinate={{ latitude: station.location.lat, longitude: station.location.lng }}
        >
          <View style={styles.bikeMarker}>
            <Icon name="bike" size={16} color="#4CAF50" />
          </View>
          <Callout>
            <View style={{ padding: 5, alignItems: 'center' }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>{station.name}</Text>
              <Text>잔여: {station.availableCount}대</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 300,
    marginVertical: 10,
  },
  bikeMarker: {
    backgroundColor: 'white',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default RouteMap;
