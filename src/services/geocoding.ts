import axios from 'axios';
import { Location } from '../types';

export async function searchNominatim(keyword: string, limit = 5): Promise<Location[]> {
	if (!keyword || keyword.trim().length < 2) return [];
	const { data } = await axios.get('/api/nominatim/search', {
		params: {
			format: 'json',
			q: keyword,
			limit,
			addressdetails: 1,
		},
	});
	const items = Array.isArray(data) ? data : [];
	items.sort((a: any, b: any) => (b.importance || 0) - (a.importance || 0));
	return items.slice(0, limit).map((item: any) => ({
		lat: parseFloat(item.lat),
		lng: parseFloat(item.lon),
		name: item.display_name,
	})).filter((l: Location) => Number.isFinite(l.lat) && Number.isFinite(l.lng));
}