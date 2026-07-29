import type { Hospital } from './hospitals';

export interface Point {
	lat: number;
	lon: number;
}

export interface HospitalResult extends Hospital {
	distanceKm: number;
	durationMinutes: number | null;
	distanceSource: 'road' | 'straight';
}

export interface RouteResult {
	coordinates: [number, number][];
	distanceKm: number;
	durationMinutes: number | null;
	source: 'road' | 'straight';
}

const OSRM_BASE = 'https://router.project-osrm.org';
const BIRTH_CANDIDATE_COUNT = 10;

export function haversineKm(a: Point, b: Point): number {
	const toRad = (degrees: number) => (degrees * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLon = toRad(b.lon - a.lon);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);
	const value =
		Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
	return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function straightLineResults(origin: Point, places: Hospital[]): HospitalResult[] {
	return places.map((hospital) => ({
		...hospital,
		distanceKm: haversineKm(origin, hospital),
		durationMinutes: null,
		distanceSource: 'straight'
	}));
}

function shortlistPlaces(origin: Point, places: Hospital[]): Hospital[] {
	const byStraightDistance = straightLineResults(origin, places);
	const birthCandidates = byStraightDistance
		.filter((hospital) => hospital.type === 'birth')
		.sort((a, b) => a.distanceKm - b.distanceKm)
		.slice(0, BIRTH_CANDIDATE_COUNT);
	const candidateRadius = birthCandidates.at(-1)?.distanceKm ?? Infinity;
	const candidateIds = new Set([
		...birthCandidates.map((hospital) => hospital.id),
		...byStraightDistance
			.filter((hospital) => hospital.type === 'acute' && hospital.distanceKm <= candidateRadius)
			.map((hospital) => hospital.id)
	]);

	return places.filter((hospital) => candidateIds.has(hospital.id));
}

export async function calculateDistances(
	origin: Point,
	places: Hospital[],
	signal?: AbortSignal
): Promise<HospitalResult[]> {
	const candidates = shortlistPlaces(origin, places);
	const coordinates = [origin, ...candidates]
		.map(({ lon, lat }) => `${lon.toFixed(5)},${lat.toFixed(5)}`)
		.join(';');

	try {
		const response = await fetch(
			`${OSRM_BASE}/table/v1/driving/${coordinates}?sources=0&annotations=distance,duration`,
			{ signal }
		);
		if (!response.ok) throw new Error('OSRM svarte ikke');
		const data: { code?: string; distances?: (number | null)[][]; durations?: (number | null)[][] } =
			await response.json();
		if (data.code !== 'Ok' || !data.distances?.[0] || !data.durations?.[0]) {
			throw new Error('Ufullstendig rutedata');
		}

		return candidates.map((hospital, index) => {
			const distance = data.distances?.[0]?.[index + 1];
			const duration = data.durations?.[0]?.[index + 1];
			if (distance == null) return straightLineResults(origin, [hospital])[0];
			return {
				...hospital,
				distanceKm: distance / 1000,
				durationMinutes: duration == null ? null : duration / 60,
				distanceSource: 'road'
			};
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') throw error;
		return straightLineResults(origin, candidates);
	}
}

export function chooseResults(results: HospitalResult[]): HospitalResult[] {
	const sortedBirth = results
		.filter((hospital) => hospital.type === 'birth')
		.sort((a, b) => a.distanceKm - b.distanceKm)
		.slice(0, 3);
	const limit = sortedBirth.at(-1)?.distanceKm ?? 0;
	const closerAcute = results.filter(
		(hospital) => hospital.type === 'acute' && hospital.distanceKm < limit
	);
	return [...sortedBirth, ...closerAcute].sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function calculateRoute(
	origin: Point,
	destination: Point,
	signal?: AbortSignal
): Promise<RouteResult> {
	try {
		const response = await fetch(
			`${OSRM_BASE}/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`,
			{ signal }
		);
		if (!response.ok) throw new Error('Ruten kunne ikke hentes');
		const data: {
			code?: string;
			routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
		} = await response.json();
		const route = data.routes?.[0];
		if (data.code !== 'Ok' || !route) throw new Error('Ingen rute');
		return {
			coordinates: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
			distanceKm: route.distance / 1000,
			durationMinutes: route.duration / 60,
			source: 'road'
		};
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') throw error;
		return {
			coordinates: [
				[origin.lat, origin.lon],
				[destination.lat, destination.lon]
			],
			distanceKm: haversineKm(origin, destination),
			durationMinutes: null,
			source: 'straight'
		};
	}
}
