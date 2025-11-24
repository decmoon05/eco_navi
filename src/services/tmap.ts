import axios from 'axios';
import { Location, Route, TransportMode } from '../types';
import { fetchRoadRoute } from './routing';

const TMAP_BASE = 'https://apis.openapi.sk.com';

const getTmapKey = (): string | undefined => {
	return process.env.REACT_APP_TMAP_APP_KEY;
};

const getDailyLimit = (): number => {
	const raw = process.env.REACT_APP_TMAP_DAILY_LIMIT;
	const n = raw ? parseInt(raw, 10) : 10;
	return Number.isFinite(n) && n > 0 ? n : 10;
};

const usageKeyForToday = (): string => {
	const d = new Date();
	const mm = `${d.getMonth() + 1}`.padStart(2, '0');
	const dd = `${d.getDate()}`.padStart(2, '0');
	return `tmap_usage_${d.getFullYear()}-${mm}-${dd}`;
};

const getUsage = (): number => {
	try { return parseInt(localStorage.getItem(usageKeyForToday()) || '0', 10) || 0; } catch { return 0; }
};

const incUsage = (): void => {
	try { const n = getUsage() + 1; localStorage.setItem(usageKeyForToday(), String(n)); } catch {}
};

const withinLimit = (): boolean => getUsage() < getDailyLimit();

async function guardedCall<T>(call: () => Promise<T>, onLimit: () => Promise<T>): Promise<T> {
	if (!withinLimit()) {
		return onLimit();
	}
	try {
		const result = await call();
		incUsage();
		return result;
	} catch (err) {
		throw err;
	}
}

const tmapHeaders = () => ({
	headers: {
		appKey: getTmapKey() || '',
		Accept: 'application/json',
	},
});

export async function tmapSearchPlace(keyword: string): Promise<Location[]> {
	if (!getTmapKey()) return [];
	return guardedCall<Location[]>(async () => {
		const url = `${TMAP_BASE}/tmap/pois`;
		const { data } = await axios.get(url, {
			params: {
				version: 1,
				format: 'json',
				searchKeyword: keyword,
				resCoordType: 'WGS84GEO',
				searchType: 'all',
				count: 5,
				appKey: getTmapKey(),
			},
			...tmapHeaders(),
		});
		const pois = (data?.searchPoiInfo?.pois?.poi || []) as any[];
		return pois.map((p: any) => ({
			lat: parseFloat(p.noorLat ?? p.frontLat ?? p.lat),
			lng: parseFloat(p.noorLon ?? p.frontLon ?? p.lon),
			name: p.name,
		})).filter((l: Location) => Number.isFinite(l.lat) && Number.isFinite(l.lng));
	}, async () => Promise.resolve([]));
}

const extractGeojsonPath = (features: any[]): [number, number][] => {
	const path: [number, number][] = [];
	for (const f of features) {
		if (!f?.geometry) continue;
		const { type, coordinates } = f.geometry;
		if (type === 'LineString' && Array.isArray(coordinates)) {
			for (const [lng, lat] of coordinates) path.push([lat, lng]);
		}
		if (type === 'MultiLineString' && Array.isArray(coordinates)) {
			for (const line of coordinates) for (const [lng, lat] of line) path.push([lat, lng]);
		}
	}
	return path;
};

export async function tmapCarRoute(origin: Location, destination: Location, mode: TransportMode): Promise<Route> {
	const onLimit = () => fetchRoadRoute(origin, destination, mode);
	return guardedCall<Route>(async () => {
		const url = `${TMAP_BASE}/tmap/routes`;
		const form = new URLSearchParams();
		form.append('startX', String(origin.lng));
		form.append('startY', String(origin.lat));
		form.append('endX', String(destination.lng));
		form.append('endY', String(destination.lat));
		form.append('reqCoordType', 'WGS84GEO');
		form.append('resCoordType', 'WGS84GEO');
		form.append('trafficInfo', 'Y');
		form.append('searchOption', '0');

		const { data } = await axios.post(url, form, {
			params: { version: 1, format: 'json', appKey: getTmapKey() },
			...tmapHeaders(),
		});
		if (!data?.features) throw new Error('Tmap 자동차 경로 없음');
		const features = data.features;
		const props = features[0]?.properties || {};
		const distanceKm = (props.totalDistance ?? 0) / 1000;
		const durationMin = Math.round((props.totalTime ?? 0) / 60);
		const path = extractGeojsonPath(features);
		return { origin, destination, distance: distanceKm, duration: durationMin, transportMode: mode, path } as Route;
	}, onLimit);
}

export async function tmapPedestrianRoute(origin: Location, destination: Location, mode: TransportMode): Promise<Route> {
	const onLimit = () => fetchRoadRoute(origin, destination, mode);
	return guardedCall<Route>(async () => {
		const url = `${TMAP_BASE}/tmap/routes/pedestrian`;
		const form = new URLSearchParams();
		form.append('startX', String(origin.lng));
		form.append('startY', String(origin.lat));
		form.append('endX', String(destination.lng));
		form.append('endY', String(destination.lat));
		form.append('reqCoordType', 'WGS84GEO');
		form.append('resCoordType', 'WGS84GEO');
		form.append('startName', encodeURIComponent(origin.name || '출발'));
		form.append('endName', encodeURIComponent(destination.name || '도착'));

		const { data } = await axios.post(url, form, {
			params: { version: 1, format: 'json', appKey: getTmapKey() },
			...tmapHeaders(),
		});
		if (!data?.features) throw new Error('Tmap 보행 경로 없음');
		const features = data.features;
		const props = features[0]?.properties || {};
		const distanceKm = (props.totalDistance ?? 0) / 1000;
		const durationMin = Math.round((props.totalTime ?? 0) / 60);
		const path = extractGeojsonPath(features);
		return { origin, destination, distance: distanceKm, duration: durationMin, transportMode: mode, path } as Route;
	}, onLimit);
}

const getTmapTransitKey = (): string | undefined => {
	return process.env.REACT_APP_TMAP_TRANSIT_APP_KEY;
};

export async function tmapTransitRoute(origin: Location, destination: Location, _mode: TransportMode): Promise<Route[]> {
	const appKey = getTmapTransitKey();
	if (!appKey) {
		throw new Error('Tmap 대중교통 API 키가 필요합니다. REACT_APP_TMAP_TRANSIT_APP_KEY를 설정하세요.');
	}

	const url = `${TMAP_BASE}/transit/routes`;
	const { data } = await axios.post(url, {
		startX: String(origin.lng),
		startY: String(origin.lat),
		endX: String(destination.lng),
		endY: String(destination.lat),
		count: 1, // Request only 1 alternative route
		lang: 0,
	}, {
		headers: {
			accept: 'application/json',
			'Content-Type': 'application/json',
			appKey,
		},
	});

	if (!data.metaData) {
		return [];
	}

	const itineraries = data.metaData.plan.itineraries;

	return itineraries.map((itinerary: any, index: number) => {
		const totalDuration = Math.round(itinerary.totalTime / 60);
		const totalDistance = itinerary.totalDistance / 1000;
    const transferPoints: Location[] = [];

		const segments: any[] = itinerary.legs.map((leg: any) => {
			const modeMap: Record<string, TransportMode> = {
				WALK: 'walking',
				BUS: 'bus',
				SUBWAY: 'subway',
			};
			const mode = modeMap[leg.mode] || 'walking';

      if (leg.start && (mode === 'bus' || mode === 'subway')) {
        transferPoints.push({ name: leg.start.name, lat: leg.start.lat, lng: leg.start.lon });
      }

			const duration = Math.round(leg.sectionTime / 60);
			const distance = leg.distance / 1000;
			const path = (leg.passShape?.linestring || leg.steps?.map((s: any) => s.linestring).join(" ") || '')
				.split(' ')
				.map((p: string) => p.split(',').map(Number))
				.filter((p: number[]) => p.length === 2)
				.map((p: number[]) => [p[1], p[0]]);

			return {
				mode,
				duration,
				distance,
				path,
				name: leg.route || leg.routeColor || undefined,
			};
		});

		const primaryMode = segments.find(s => s.mode === 'bus' || s.mode === 'subway')?.mode || 'bus';

		return {
			origin,
			destination,
			duration: totalDuration,
			distance: totalDistance,
			transportMode: primaryMode,
			segments,
      transferPoints,
			label: `대안 ${index + 1}`,
			tags: ['대중교통'],
		};
	});
}

export async function tmapCarAlternatives(origin: Location, destination: Location, mode: TransportMode): Promise<Route[]> {
	const options = ['0','1','4'];
	const labels: Record<string,string> = { '0': '추천', '1': '최단', '4': '일반' };
	const routes: Route[] = [];
	for (const opt of options) {
		try {
			const url = `${TMAP_BASE}/tmap/routes`;
			const form = new URLSearchParams();
			form.append('startX', String(origin.lng));
			form.append('startY', String(origin.lat));
			form.append('endX', String(destination.lng));
			form.append('endY', String(destination.lat));
			form.append('reqCoordType', 'WGS84GEO');
			form.append('resCoordType', 'WGS84GEO');
			form.append('trafficInfo', 'Y');
			form.append('searchOption', opt);
			const { data } = await axios.post(url, form, {
				params: { version: 1, format: 'json', appKey: getTmapKey() },
				...tmapHeaders(),
			});
			if (!data?.features) continue;
			const features = data.features;
			const props = features[0]?.properties || {};
			const distanceKm = (props.totalDistance ?? 0) / 1000;
			const durationMin = Math.round((props.totalTime ?? 0) / 60);
			const path = (function extract(features: any[]): [number, number][] {
				const p: [number, number][] = [];
				for (const f of features) {
					if (!f?.geometry) continue;
					const { type, coordinates } = f.geometry;
					if (type === 'LineString') for (const [lng, lat] of coordinates) p.push([lat, lng]);
					if (type === 'MultiLineString') for (const line of coordinates) for (const [lng, lat] of line) p.push([lat, lng]);
				}
				return p;
			})(features);
			routes.push({ origin, destination, distance: distanceKm, duration: durationMin, transportMode: mode, path, label: labels[opt] });
		} catch {}
	}
	return routes;
}

export async function tmapRoute(origin: Location, destination: Location, mode: TransportMode): Promise<Route[]> {
	if (!getTmapKey()) throw new Error('Tmap APP KEY 미설정');
	if (mode === 'walking' || mode === 'bicycle') {
		return [await tmapPedestrianRoute(origin, destination, mode)];
	}
	if (mode === 'bus' || mode === 'subway') {
		return tmapTransitRoute(origin, destination, mode);
	}
	return [await tmapCarRoute(origin, destination, mode)];
}

export async function resolveBestLocations(originName: string, destinationName: string): Promise<{ origin: Location; destination: Location; } | null> {
	const [os, ds] = await Promise.all([tmapSearchPlace(originName), tmapSearchPlace(destinationName)]);
	if (os.length === 0 || ds.length === 0) return null;
	return { origin: os[0], destination: ds[0] };
}