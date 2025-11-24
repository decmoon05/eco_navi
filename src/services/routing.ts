import axios from 'axios';
import { Location, Route, TransportMode } from '../types';

const OSRM_BASE = 'https://router.project-osrm.org';

type OsrmProfile = 'driving' | 'walking' | 'cycling';

const mapTransportToProfile = (mode: TransportMode): OsrmProfile => {
	if (mode === 'walking') return 'walking';
	if (mode === 'bicycle') return 'cycling';
	// 대중교통/전기차/버스는 도로망 자동차 경로로 대체
	return 'driving';
};

export async function fetchRoadRoute(origin: Location, destination: Location, mode: TransportMode): Promise<Route> {
	const profile = mapTransportToProfile(mode);
	const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
	const url = `${OSRM_BASE}/route/v1/${profile}/${coords}`;

	const { data } = await axios.get(url, {
		params: {
			overview: 'full',
			geometries: 'geojson',
			alternatives: false,
			steps: false,
		},
	});

	if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
		throw new Error('경로를 찾지 못했습니다.');
	}

	const best = data.routes[0];
	const distanceKm = best.distance / 1000; // meters -> km
	const durationMin = Math.round(best.duration / 60); // seconds -> minutes
	const path: [number, number][] = best.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);

	return {
		origin,
		destination,
		distance: distanceKm,
		duration: durationMin,
		transportMode: mode,
		path,
	};
}

export async function fetchRoadAlternatives(origin: Location, destination: Location, mode: TransportMode, max = 3): Promise<Route[]> {
	const profile = mapTransportToProfile(mode);
	const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
	const url = `${OSRM_BASE}/route/v1/${profile}/${coords}`;
	const { data } = await axios.get(url, {
		params: {
			overview: 'full',
			geometries: 'geojson',
			alternatives: true,
			steps: false,
		},
	});
	if (!data || data.code !== 'Ok' || !Array.isArray(data.routes)) return [];
	return (data.routes as any[]).slice(0, max).map((r) => ({
		origin,
		destination,
		distance: r.distance / 1000,
		duration: Math.round(r.duration / 60),
		transportMode: mode,
		path: r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
	}));
}