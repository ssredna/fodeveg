<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import type { Map as LeafletMap } from 'leaflet';
	import type { Attachment } from 'svelte/attachments';
	import type { Hospital } from './hospitals';
	import type { Point, RouteResult } from './routing';

	interface Props {
		origin: Point | null;
		hospitals: Hospital[];
		selectedId: string | null;
		route: RouteResult | null;
		onselect: (hospital: Hospital) => void;
	}

	let { origin, hospitals, selectedId, route, onselect }: Props = $props();
	function renderMap(
		currentOrigin: Point | null,
		currentHospitals: Hospital[],
		currentSelectedId: string | null,
		currentRoute: RouteResult | null,
		selectHospital: (hospital: Hospital) => void
	): Attachment<HTMLDivElement> {
		return (element) => {
			let map: LeafletMap | undefined;
			let cancelled = false;

			void import('leaflet').then((L) => {
				if (cancelled) return;
				map = L.map(element, { zoomControl: true, scrollWheelZoom: false });
				L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution:
						'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
					maxZoom: 19
				}).addTo(map);

				const bounds = L.latLngBounds([]);
				if (currentOrigin) {
					bounds.extend([currentOrigin.lat, currentOrigin.lon]);
					L.circleMarker([currentOrigin.lat, currentOrigin.lon], {
						radius: 8,
						color: '#fffaf3',
						weight: 3,
						fillColor: '#173f3a',
						fillOpacity: 1
					})
						.bindTooltip('Ditt startpunkt')
						.addTo(map);
				}

				for (const hospital of currentHospitals) {
					const selected = hospital.id === currentSelectedId;
					const marker = L.circleMarker([hospital.lat, hospital.lon], {
						radius: selected ? 11 : 8,
						color: '#fffaf3',
						weight: 3,
						fillColor: hospital.type === 'birth' ? '#c75b45' : '#d99a39',
						fillOpacity: 1
					})
						.bindTooltip(hospital.name)
						.addTo(map);
					marker.on('click', () => selectHospital(hospital));
					bounds.extend([hospital.lat, hospital.lon]);
				}

				if (currentRoute) {
					const line = L.polyline(currentRoute.coordinates, {
						color: currentRoute.source === 'road' ? '#173f3a' : '#9a6a56',
						weight: 5,
						dashArray: currentRoute.source === 'straight' ? '8 9' : undefined,
						opacity: 0.9
					}).addTo(map);
					map.fitBounds(line.getBounds(), { padding: [34, 34], maxZoom: 12 });
				} else if (bounds.isValid()) {
					map.fitBounds(bounds, { padding: [34, 34], maxZoom: 10 });
				} else {
					map.setView([64.5, 11], 4);
				}
			});

			return () => {
				cancelled = true;
				map?.remove();
			};
		};
	}
</script>

<div class="map-shell">
	<div
		class="map"
		{@attach renderMap(origin, hospitals, selectedId, route, onselect)}
		role="application"
		aria-label={origin
			? 'Kart med startpunkt, sykehus og valgt rute'
			: 'Kart over kuraterte fødesteder og akuttsykehus i Norge'}
	></div>
	<p class="map-key">
		<span class="birth-dot"></span> Fødested <span class="acute-dot"></span> Akuttsykehus
	</p>
</div>

<style>
	.map-shell {
		position: relative;
		height: 100%;
		min-height: 25rem;
		background: #dce8df;
	}

	.map {
		width: 100%;
		height: 100%;
		min-height: 25rem;
		z-index: 0;
	}

	.map-key {
		position: absolute;
		z-index: 500;
		bottom: 0.75rem;
		left: 0.75rem;
		margin: 0;
		padding: 0.55rem 0.7rem;
		border: 1px solid rgb(23 63 58 / 15%);
		border-radius: 999px;
		background: rgb(255 250 243 / 94%);
		box-shadow: 0 4px 20px rgb(27 49 45 / 12%);
		font-size: 0.72rem;
		font-weight: 700;
		color: #264b45;
	}

	.birth-dot,
	.acute-dot {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		margin: 0 0.2rem 0 0.35rem;
		border-radius: 50%;
	}

	.birth-dot { background: #c75b45; }
	.acute-dot { background: #d99a39; }
</style>
