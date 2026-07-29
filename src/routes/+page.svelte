<script lang="ts">
	import HospitalMap from '$lib/HospitalMap.svelte';
	import {
		HOSPITAL_DATA_LAST_REVIEWED,
		hospitals,
		type Hospital
	} from '$lib/hospitals';
	import {
		calculateDistances,
		calculateRoute,
		chooseResults,
		type HospitalResult,
		type Point,
		type RouteResult
	} from '$lib/routing';

	let address = $state('');
	let origin = $state.raw<Point | null>(null);
	let originLabel = $state('');
	let results = $state.raw<HospitalResult[]>([]);
	let selectedId = $state<string | null>(null);
	let route = $state.raw<RouteResult | null>(null);
	let locating = $state(false);
	let routing = $state(false);
	let error = $state('');
	let notice = $state('');
	let pickerOpen = $state(true);
	let searchController: AbortController | null = null;
	let routeController: AbortController | null = null;
	let hospitalListDialog: HTMLDialogElement | null = null;

	const selected = $derived(results.find((hospital) => hospital.id === selectedId) ?? null);
	const mapHospitals = $derived(results.length > 0 ? results : hospitals);
	const birthHospitals = hospitals.filter((hospital) => hospital.type === 'birth');
	const acuteHospitals = hospitals.filter((hospital) => hospital.type === 'acute');
	const hospitalDataLastReviewed = new Intl.DateTimeFormat('nb-NO', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(new Date(`${HOSPITAL_DATA_LAST_REVIEWED}T12:00:00`));

	function formatDistance(km: number): string {
		return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
	}

	function formatDuration(minutes: number | null): string {
		if (minutes == null) return 'tid ukjent';
		if (minutes < 60) return `ca. ${Math.round(minutes)} min`;
		const hours = Math.floor(minutes / 60);
		const rest = Math.round(minutes % 60);
		return `ca. ${hours} t${rest ? ` ${rest} min` : ''}`;
	}

	async function findHospitals(point: Point, label: string): Promise<void> {
		searchController?.abort();
		searchController = new AbortController();
		origin = point;
		originLabel = label;
		results = [];
		selectedId = null;
		route = null;
		error = '';
		notice = '';
		locating = true;

		try {
			const distances = await calculateDistances(point, hospitals, searchController.signal);
			results = chooseResults(distances);
			if (results.length > 0) pickerOpen = false;
			if (results.some((hospital) => hospital.distanceSource === 'straight')) {
				notice = 'Veiruting var ikke tilgjengelig. Avstandene vises i luftlinje.';
			}
			const firstBirth = results.find((hospital) => hospital.type === 'birth');
			if (firstBirth) await selectHospital(firstBirth);
		} catch (caught) {
			if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
				error = 'Vi klarte ikke å beregne avstander. Prøv igjen om litt.';
			}
		} finally {
			locating = false;
		}
	}

	function useGps(): void {
		error = '';
		if (!navigator.geolocation) {
			error = 'Nettleseren din støtter ikke posisjon. Søk med adresse eller postnummer.';
			return;
		}
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				void findHospitals(
					{ lat: position.coords.latitude, lon: position.coords.longitude },
					'Din posisjon'
				);
			},
			() => {
				locating = false;
				error = 'Vi fikk ikke tilgang til posisjonen din. Bruk adresse eller postnummer i stedet.';
			},
			{ enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
		);
	}

	async function searchAddress(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		const query = address.trim();
		if (!query) {
			error = 'Skriv inn en adresse eller et postnummer.';
			return;
		}
		locating = true;
		error = '';
		try {
			const params = new URLSearchParams({
				q: query,
				format: 'jsonv2',
				countrycodes: 'no',
				limit: '1',
				'accept-language': 'nb'
			});
			const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
			if (!response.ok) throw new Error('Adressetjenesten svarte ikke');
			const matches: { lat: string; lon: string; display_name: string }[] = await response.json();
			const match = matches[0];
			if (!match) {
				error = 'Fant ikke stedet. Prøv postnummer eller en mer presis adresse.';
				return;
			}
			await findHospitals(
				{ lat: Number(match.lat), lon: Number(match.lon) },
				match.display_name.split(',').slice(0, 2).join(',')
			);
		} catch {
			error = 'Adressesøket er midlertidig utilgjengelig. Prøv GPS eller søk igjen senere.';
		} finally {
			locating = false;
		}
	}

	async function selectHospital(hospital: HospitalResult): Promise<void> {
		if (!origin) return;
		selectedId = hospital.id;
		route = null;
		routing = true;
		routeController?.abort();
		routeController = new AbortController();
		try {
			route = await calculateRoute(origin, hospital, routeController.signal);
			if (route.source === 'straight') {
				notice = 'Kjøreruten kunne ikke hentes. Kartet viser en rett, stiplet linje.';
			}
		} catch (caught) {
			if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
				notice = 'Ruten kunne ikke vises akkurat nå.';
			}
		} finally {
			routing = false;
		}
	}

	function selectMapHospital(hospital: Hospital): void {
		const result = results.find((item) => item.id === hospital.id);
		if (result) void selectHospital(result);
	}

	function reopenPicker(): void {
		pickerOpen = true;
	}

	function openHospitalList(): void {
		hospitalListDialog?.showModal();
	}

	function attachHospitalListDialog(dialog: HTMLDialogElement): () => void {
		hospitalListDialog = dialog;
		return () => {
			hospitalListDialog = null;
		};
	}
</script>

<svelte:head>
	<title>Fødeveg – finn nærmeste fødested</title>
	<meta
		name="description"
		content="Finn nærmeste sykehus med fødetilbud og se beregnet kjørevei i Norge."
	/>
</svelte:head>

<main>
	<section class="tool" aria-label="Finn nærmeste fødested">
		<div class="side-pane">
			{#if pickerOpen || results.length === 0}
				<section class="location-picker" aria-labelledby="picker-title">
					<h1 id="picker-title">Velg startsted</h1>
					<p>Bruk posisjon eller søk med adresse.</p>
					<div class="search-panel">
						<button class="gps-button" type="button" onclick={useGps} disabled={locating}>
							<span aria-hidden="true">⌖</span>
							{locating ? 'Finner og beregner …' : 'Bruk posisjonen min'}
						</button>
						<div class="divider"><span>eller</span></div>
						<form onsubmit={searchAddress}>
							<label for="address">Adresse eller postnummer</label>
							<div class="input-row">
								<input
									id="address"
									name="address"
									type="search"
									placeholder="f.eks. 5003 Bergen"
									autocomplete="street-address"
									bind:value={address}
								/>
								<button type="submit" disabled={locating}>Finn</button>
							</div>
						</form>
					</div>
					<div class="status-region" aria-live="polite">
						{#if error}<p class="message error"><strong>Feil:</strong> {error}</p>{/if}
					</div>
				</section>
			{/if}

			{#if notice}
				<div class="status-region" aria-live="polite"><p class="message notice">{notice}</p></div>
			{/if}

			{#if locating && results.length === 0}
				<div class="loading" aria-label="Laster resultater">
					<div class="pulse" aria-hidden="true"></div>
					<p><strong>Beregner veien …</strong><br />Dette kan ta noen sekunder.</p>
				</div>
			{:else if origin && results.length > 0}
				<section class="results" aria-labelledby="results-title">
					<div class="results-heading">
						<div>
							<h2 id="results-title">Nærmeste alternativer</h2>
							<p>Fra {originLabel}</p>
						</div>
						<span>Tre nærmeste fødesteder, med eventuelle nærmere akuttsykehus.</span>
					</div>
					<ol class="hospital-list">
						{#each results as hospital, index (hospital.id)}
							<li>
								<button
									class={hospital.id === selectedId ? 'active' : ''}
									type="button"
									onclick={() => void selectHospital(hospital)}
									aria-pressed={hospital.id === selectedId}
								>
									<span class="rank">{index + 1}</span>
									<span class="hospital-copy">
										<span class={`type-pill${hospital.type === 'acute' ? ' acute' : ''}`}>
											{hospital.type === 'birth' ? 'Fødested' : 'Akutt – ikke fødested'}
										</span>
										<strong>{hospital.name}</strong>
										<span>{hospital.city}</span>
									</span>
									<span class="travel">
										<strong>{formatDuration(hospital.durationMinutes)}</strong>
										<span>{formatDistance(hospital.distanceKm)}</span>
									</span>
								</button>
							</li>
						{/each}
					</ol>
				</section>
			{/if}
		</div>

		<div class="map-panel">
			<div class="map-wrap">
				<HospitalMap
					{origin}
					hospitals={mapHospitals}
					{selectedId}
					{route}
					onselect={selectMapHospital}
				/>
				<div class="route-caption" aria-live="polite">
					{#if routing}
						<span>Henter valgt rute …</span>
					{:else if selected}
						<strong>{selected.name}</strong>
						<span>
							{route?.source === 'road' ? 'Beregnet kjørevei' : 'Omtrentlig luftlinje'} ·
							{formatDistance(route?.distanceKm ?? selected.distanceKm)}
						</span>
					{:else}
						<strong>Sykehusoversikt</strong>
						<span>Kuraterte fødesteder og akuttsykehus i Norge</span>
					{/if}
				</div>
			</div>
			<div class="map-actions">
				{#if results.length > 0}
					<button type="button" onclick={reopenPicker}>Endre startsted</button>
				{/if}
				<button type="button" onclick={openHospitalList}>Se sykehuslisten</button>
			</div>
		</div>
	</section>
</main>

<dialog
	class="hospital-dialog"
	aria-labelledby="hospital-list-title"
	{@attach attachHospitalListDialog}
>
	<div class="dialog-shell">
		<header class="dialog-header">
			<div>
				<p class="dialog-eyebrow">Datagrunnlag</p>
				<h2 id="hospital-list-title">Sykehuslisten</h2>
			</div>
			<form method="dialog">
				<button class="dialog-close" type="submit" aria-label="Lukk sykehuslisten">Lukk</button>
			</form>
		</header>

		<div class="dialog-scroll">
			<p class="dataset-summary">
				<strong>{hospitals.length} sykehus totalt</strong>
				<span>{birthHospitals.length} med fødeavdeling · {acuteHospitals.length} akuttsykehus uten fødeavdeling</span>
				<span>Sist gjennomgått {hospitalDataLastReviewed}</span>
			</p>

			<p class="dataset-note">
				Dette er en kuratert planleggingsliste, ikke en offisiell eller løpende oppdatert oversikt.
				Tilbud kan endres. Kontroller alltid opplysningene med sykehuset før de brukes til å
				planlegge en reise.
			</p>

			<section class="dataset-group" aria-labelledby="birth-hospitals-title">
				<h3 id="birth-hospitals-title">Sykehus med fødeavdeling ({birthHospitals.length})</h3>
				<ul>
					{#each birthHospitals as hospital (hospital.id)}
						<li><strong>{hospital.name}</strong><span>{hospital.city}</span></li>
					{/each}
				</ul>
			</section>

			<section class="dataset-group" aria-labelledby="acute-hospitals-title">
				<h3 id="acute-hospitals-title">
					Akuttsykehus uten fødeavdeling ({acuteHospitals.length})
				</h3>
				<ul>
					{#each acuteHospitals as hospital (hospital.id)}
						<li><strong>{hospital.name}</strong><span>{hospital.city}</span></li>
					{/each}
				</ul>
			</section>

			<p class="official-source">
				Se også
				<a href="https://www.helsenorge.no/fodsel/fodested/">Helsenorges oversikt over fødesteder og fødetilbud</a>.
			</p>
		</div>
	</div>
</dialog>

<style>
	:global(*) { box-sizing: border-box; }
	:global(body) {
		margin: 0;
		background: #f7f8f6;
		color: #173f3a;
		font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
	}
	:global(button), :global(input) { font: inherit; }
	:global(button:focus-visible), :global(input:focus-visible), :global(a:focus-visible) {
		outline: 3px solid #efb35a;
		outline-offset: 3px;
	}

	.tool {
		display: grid;
		grid-template-columns: minmax(22rem, 30rem) minmax(0, 1fr);
		min-height: 100dvh;
		background: white;
	}
	.side-pane { display: flex; min-height: 0; flex-direction: column; border-right: 1px solid #d9dfda; }
	h1, h2, p { text-wrap: pretty; }
	.location-picker { padding: 1.25rem 1.5rem 1rem; border-bottom: 1px solid #e0e5e1; }
	.location-picker h1 { margin: 0; font-size: 1.25rem; letter-spacing: -0.025em; line-height: 1.2; }
	.location-picker > p { margin: 0.3rem 0 0.9rem; color: #5b6d68; font-size: 0.82rem; }
	.search-panel { padding: 0.85rem; border: 1px solid #d9dfda; border-radius: 0.7rem; background: #fafbf9; }
	.gps-button { width: 100%; padding: 0.8rem; border: 0; border-radius: 0.55rem; background: #173f3a; color: white; cursor: pointer; font-weight: 800; }
	.gps-button span { margin-right: 0.5rem; font-size: 1.2rem; }
	button:disabled { cursor: wait; opacity: 0.66; }
	.divider { display: flex; align-items: center; gap: 0.8rem; margin: 0.55rem 0; color: #82908c; font-size: 0.72rem; }
	.divider::before, .divider::after { content: ''; height: 1px; flex: 1; background: #eee7df; }
	.search-panel label { display: block; margin: 0.2rem 0 0.4rem; font-size: 0.76rem; font-weight: 800; }
	.input-row { display: grid; grid-template-columns: 1fr auto; gap: 0.45rem; }
	.input-row input { min-width: 0; padding: 0.75rem 0.8rem; border: 1px solid #cbd3cd; border-radius: 0.5rem; background: white; color: #173f3a; }
	.input-row button { padding: 0 1rem; border: 0; border-radius: 0.5rem; background: #e4a64b; color: #173f3a; cursor: pointer; font-weight: 850; }

	.status-region { padding: 0.75rem 1.5rem 0; }
	.location-picker .status-region { padding: 0.75rem 0 0; }
	.message { margin: 0; padding: 0.7rem 0.8rem; border-radius: 0.5rem; font-size: 0.82rem; line-height: 1.4; }
	.error { background: #fae0d9; color: #722e25; }
	.notice { background: #fff0ce; color: #684713; }
	.loading { display: flex; align-items: center; gap: 0.9rem; padding: 1.5rem; color: #526a66; font-size: 0.86rem; }
	.loading p { margin: 0; }
	.pulse { width: 1.8rem; height: 1.8rem; flex: 0 0 auto; border: 3px solid #e8c6b8; border-top-color: #c75b45; border-radius: 50%; animation: spin 0.9s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	.results { min-height: 0; }
	.results-heading { display: flex; justify-content: space-between; gap: 1rem; padding: 0.75rem 1.5rem; border-block: 1px solid #e0e5e1; background: #f4f6f3; }
	.results-heading h2 { margin: 0; font-size: 1rem; }
	.results-heading p { margin: 0.15rem 0 0; color: #657570; font-size: 0.75rem; }
	.results-heading > span { max-width: 13rem; color: #657570; font-size: 0.68rem; line-height: 1.35; text-align: right; }
	.hospital-list { margin: 0; padding: 0; list-style: none; }
	.hospital-list button { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.75rem; width: 100%; padding: 0.85rem 1rem; border: 0; border-bottom: 1px solid #e6e7df; background: transparent; color: #173f3a; text-align: left; cursor: pointer; }
	.hospital-list button:hover, .hospital-list button.active { background: #fff1e8; }
	.hospital-list button.active { box-shadow: inset 4px 0 #c75b45; }
	.rank { display: grid; place-items: center; width: 1.7rem; height: 1.7rem; border-radius: 50%; background: #e4ebe3; font-size: 0.72rem; font-weight: 850; }
	.hospital-copy { display: flex; min-width: 0; flex-direction: column; gap: 0.18rem; }
	.hospital-copy strong { font-size: 0.86rem; line-height: 1.25; }
	.hospital-copy > span:last-child { color: #71807d; font-size: 0.82rem; }
	.type-pill { width: fit-content; padding: 0.2rem 0.45rem; border-radius: 999px; background: #f6dcd1; color: #964333; font-size: 0.62rem; font-weight: 850; letter-spacing: 0.04em; text-transform: uppercase; }
	.type-pill.acute { background: #ffebbf; color: #755015; }
	.travel { display: flex; flex-direction: column; align-items: end; white-space: nowrap; }
	.travel strong { font-size: 0.88rem; }
	.travel span { color: #6c7b77; font-size: 0.78rem; }
	.map-panel { display: flex; min-width: 0; min-height: 36rem; flex-direction: column; }
	.map-wrap { position: relative; min-height: 32rem; flex: 1; }
	.route-caption { position: absolute; z-index: 500; top: 1rem; right: 1rem; display: flex; width: max-content; max-width: min(22rem, calc(100% - 2rem)); flex-direction: column; padding: 0.75rem 0.9rem; border-radius: 0.8rem; background: rgb(255 250 243 / 95%); box-shadow: 0 8px 25px rgb(28 55 48 / 15%); font-size: 0.78rem; }
	.route-caption span { color: #61736f; }
	.map-actions { display: flex; align-self: center; flex-wrap: wrap; justify-content: center; gap: 0.4rem; margin: 0.65rem; }
	.map-actions button, .dialog-close { padding: 0.5rem 0.75rem; border: 1px solid #b9c5c1; border-radius: 0.5rem; background: white; color: #173f3a; cursor: pointer; font-size: 0.78rem; font-weight: 750; }
	.map-actions button:hover, .dialog-close:hover { background: #f4f6f3; }

	.hospital-dialog { width: min(42rem, calc(100vw - 2rem)); max-width: none; height: min(46rem, calc(100dvh - 2rem)); max-height: none; padding: 0; border: 1px solid #cbd3cd; border-radius: 0.8rem; background: white; color: #173f3a; box-shadow: 0 24px 70px rgb(22 45 40 / 28%); }
	.hospital-dialog::backdrop { background: rgb(23 43 39 / 48%); }
	.dialog-shell { display: flex; height: 100%; min-height: 0; flex-direction: column; }
	.dialog-header { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.9rem 1rem; border-bottom: 1px solid #dfe4e0; }
	.dialog-header h2 { margin: 0; font-size: 1.15rem; }
	.dialog-eyebrow { margin: 0 0 0.12rem; color: #6c7b77; font-size: 0.67rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
	.dialog-scroll { min-height: 0; padding: 1rem; overflow-y: auto; overscroll-behavior: contain; }
	.dataset-summary { display: flex; flex-direction: column; gap: 0.18rem; margin: 0; font-size: 0.82rem; }
	.dataset-summary strong { font-size: 0.95rem; }
	.dataset-summary span { color: #60716d; }
	.dataset-note { margin: 0.9rem 0 1.15rem; padding: 0.75rem 0.85rem; border-left: 3px solid #95aaa4; background: #f4f6f3; font-size: 0.8rem; line-height: 1.5; }
	.dataset-group + .dataset-group { margin-top: 1.25rem; }
	.dataset-group h3 { margin: 0 0 0.45rem; font-size: 0.9rem; }
	.dataset-group ul { margin: 0; padding: 0; border-top: 1px solid #e0e5e1; list-style: none; }
	.dataset-group li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1rem; padding: 0.48rem 0.15rem; border-bottom: 1px solid #e8ebe8; font-size: 0.79rem; line-height: 1.35; }
	.dataset-group li span { color: #697975; text-align: right; }
	.official-source { margin: 1.15rem 0 0; font-size: 0.8rem; }
	.official-source a { color: #175e55; font-weight: 750; text-underline-offset: 0.15em; }

	@media (max-width: 850px) {
		.tool { grid-template-columns: 1fr; }
		.side-pane { border-right: 0; }
		.map-panel { min-height: 28rem; border-top: 1px solid #d9dfda; }
		.map-wrap { min-height: 25rem; }
	}

	@media (max-width: 560px) {
		.hospital-dialog { width: calc(100vw - 1rem); height: calc(100dvh - 1rem); }
		.dialog-header, .dialog-scroll { padding: 0.8rem; }
		.dataset-group li { gap: 0.6rem; }
		.input-row { grid-template-columns: 1fr; }
		.input-row button { min-height: 3rem; }
		.results-heading { align-items: center; gap: 0.35rem; padding: 0.4rem 0.65rem; }
		.results-heading h2 { font-size: 0.9rem; line-height: 1.15; }
		.results-heading p {
			max-width: calc(100vw - 1.3rem);
			margin-top: 0.08rem;
			overflow: hidden;
			font-size: 0.68rem;
			line-height: 1.15;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.results-heading > span { display: none; }
		.hospital-list button {
			grid-template-columns: auto minmax(0, 1fr) auto;
			min-height: 3rem;
			gap: 0.4rem;
			padding: 0.38rem 0.65rem;
		}
		.rank { width: 1.35rem; height: 1.35rem; font-size: 0.64rem; }
		.hospital-copy {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: center;
			gap: 0.05rem 0.35rem;
		}
		.hospital-copy strong {
			grid-column: 1;
			grid-row: 1;
			font-size: 0.78rem;
			line-height: 1.15;
		}
		.hospital-copy > span:last-child {
			grid-column: 1;
			grid-row: 2;
			font-size: 0.69rem;
			line-height: 1.15;
		}
		.type-pill {
			grid-column: 2;
			grid-row: 1 / span 2;
			padding: 0.1rem 0.3rem;
			font-size: 0.54rem;
			line-height: 1.2;
			white-space: nowrap;
		}
		.travel { grid-column: 3; gap: 0; line-height: 1.1; }
		.travel strong { font-size: 0.78rem; }
		.travel span { font-size: 0.68rem; }
	}

	@media (prefers-reduced-motion: reduce) {
		.pulse { animation: none; }
	}
</style>
