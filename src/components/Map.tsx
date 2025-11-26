import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Location, Route, TransportMode } from '../types';
import styled from 'styled-components';
import { calculateTrafficAdjustedEmission, formatEmission, getTransportModeInfo } from '../utils/carbonCalculator';

interface MapProps {
  origin: Location | null;
  destination: Location | null;
  route: Route | null;
  alternatives?: Route[];
  isAcOn: boolean;
}

const MapWrapper = styled.div`
  height: 400px;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const AutoFit: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    try { map.fitBounds(points as any, { padding: [20, 20] }); } catch {}
  }, [map, points]);
  return null;
};

const segmentOptions: Record<TransportMode, { color: string; dashArray?: string; weight?: number }> = {
  walking: { color: '#6c757d', dashArray: '5, 10', weight: 3 },
  bicycle: { color: '#20c997' },
  bus: { color: '#2196F3', weight: 5 },
  subway: { color: '#4CAF50', weight: 5 },
  car: { color: '#2196F3', weight: 5 },
  electric_car: { color: '#2196F3', weight: 5 },
  hybrid: { color: '#2196F3', weight: 5 },
  hydrogen: { color: '#4CAF50', weight: 5 },
  motorcycle: { color: '#FF9800', weight: 4 },
  electric_motorcycle: { color: '#4CAF50', weight: 4 },
  vehicle: { color: '#2196F3', weight: 5 },
};

const Map: React.FC<MapProps> = ({ origin, destination, route, alternatives = [], isAcOn }) => {
  const defaultCenter: [number, number] = origin ? [origin.lat, origin.lng] : [37.5665, 126.9780];

  const originDestIcon = new Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.0/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const transferIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
    iconSize: [15, 25],
    iconAnchor: [7, 25],
    popupAnchor: [1, -24],
  });

  const hasSegments = route?.segments && route.segments.length > 0;

  const fitPoints = useMemo(() => {
    const pts: [number, number][] = [];
    if (hasSegments) {
      route.segments?.forEach(s => pts.push(...s.path));
    } else if (route?.path && route.path.length > 1) {
      pts.push(...route.path);
    } else {
      if (origin) pts.push([origin.lat, origin.lng]);
      if (destination) pts.push([destination.lat, destination.lng]);
    }
    return pts;
  }, [origin, destination, route, hasSegments]);

  const mainCo2 = route ? formatEmission(calculateTrafficAdjustedEmission(route, isAcOn).totalEmission) : null;

  return (
    <MapWrapper>
      <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoFit points={fitPoints} />

        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={originDestIcon}>
            <Popup><strong>출발지</strong><br />{origin.name}</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={originDestIcon}>
            <Popup><strong>도착지</strong><br />{destination.name}</Popup>
          </Marker>
        )}

        {alternatives.map((r, idx) => (
          r.path && r.path.length > 1 && (
            <Polyline key={`alt-${idx}`} positions={r.path} color="#9e9e9e" weight={3} opacity={0.7}>
              <Tooltip permanent direction="center">
                {r.label ? `${r.label} · ` : ''}{formatEmission(calculateTrafficAdjustedEmission(r, isAcOn).totalEmission)}
              </Tooltip>
            </Polyline>
          )
        ))}

        {hasSegments ? (
          <>
            {route.segments?.map((segment, index) => (
              <Polyline
                key={index}
                positions={segment.path}
                pathOptions={segmentOptions[segment.mode]}
              >
                <Tooltip sticky>
                  {segment.name 
                    ? `${getTransportModeInfo(segment.mode).name} (${segment.name})` 
                    : getTransportModeInfo(segment.mode).name}
                </Tooltip>
              </Polyline>
            ))}
            {route.transferPoints?.map((point, index) => (
              <Marker key={`transfer-${index}`} position={[point.lat, point.lng]} icon={transferIcon}>
                <Popup>{point.name}</Popup>
              </Marker>
            ))}
          </>
        ) : (
          route?.path && route.path.length > 1 && (
            <Polyline positions={route.path} pathOptions={segmentOptions[route.transportMode]}>
              {route?.label && (
                <Tooltip permanent direction="center">
                  {route.label}{mainCo2 ? ` · ${mainCo2}` : ''}
                </Tooltip>
              )}
            </Polyline>
          )
        )}
      </MapContainer>
    </MapWrapper>
  );
};

export default Map;