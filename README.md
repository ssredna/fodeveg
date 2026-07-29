# Fodeveg

Fodeveg is a small SvelteKit utility for comparing Norwegian hospitals by estimated driving distance from a browser-provided location. It is intended for personal, short-term use rather than as a maintained public service.

## Technical overview

- SvelteKit 2 and Svelte 5 with TypeScript
- Leaflet for the interactive map
- OpenStreetMap raster tiles
- Nominatim for optional address geocoding
- OSRM for driving-distance tables and route geometry
- A versioned, local TypeScript dataset for hospital locations and capabilities
- No application backend, database, API keys, accounts, analytics, or persistent client state

Leaflet is loaded dynamically in `HospitalMap.svelte`, keeping browser-only map code out of server-side rendering. All location and routing requests are made directly from the browser to the external services.

## Request flow

1. The origin comes from the browser Geolocation API or a user-submitted Nominatim search.
2. Haversine distance is calculated locally for every hospital.
3. The candidate set is reduced to the ten closest maternity hospitals by straight-line distance, plus acute hospitals within the same radius.
4. One OSRM table request calculates driving distance and duration from the origin to those candidates.
5. Results are sorted by driving distance. The nearest three maternity hospitals are retained, together with acute hospitals closer than the third maternity hospital.
6. Selecting a result sends one OSRM route request and renders the returned geometry on the map.
7. OSRM failures fall back to straight-line distance and geometry.

The preselection in step 3 reduces a typical routing request from 52 destinations to roughly 12-20 while retaining a buffer for indirect Norwegian roads and fjords.

## Project structure

- `src/routes/+page.svelte`: location input, request state, result selection, dataset dialog, and page layout
- `src/lib/HospitalMap.svelte`: Leaflet lifecycle, markers, viewport fitting, and route rendering
- `src/lib/hospitals.ts`: typed, curated hospital dataset and review metadata
- `src/lib/routing.ts`: Haversine calculation, candidate selection, OSRM integration, fallback behavior, and final ranking
- `src/app.html`: document shell and Norwegian language metadata

## Hospital data

`src/lib/hospitals.ts` currently contains:

- 40 hospital-based planned birth locations
- 12 selected acute hospitals without maternity departments
- approximate coordinates suitable for route ranking
- `needs-verification` status on every record
- a global review date in `HOSPITAL_DATA_LAST_REVIEWED`

The dataset was assembled using [Helsenorge's birth-location overview](https://www.helsenorge.no/fodsel/fodested/), regional health trusts, hospital websites, and public map data. It is not synchronized with a supported live API and does not represent temporary closures, capacity, or admission status.

Birth centres outside hospitals, including Alta, Bronnoysund, Finnsnes, Sonjatun, and Valdres, are not currently modeled as a separate category. The acute-hospital subset is intentionally useful rather than nationally exhaustive.

To revise the dataset:

1. Verify active maternity services, names, and campuses against each hospital's website.
2. Check temporary, seasonal, and planned closures.
3. Verify coordinates and routing entrances against Kartverket or OpenStreetMap.
4. Update `HOSPITAL_DATA_LAST_REVIEWED`.

## External services

### OpenStreetMap tiles

The map uses `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with visible attribution. Normal interactive browser use and browser caching conform to the [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/). The service has no availability guarantee and does not permit bulk or offline tile downloads.

### Nominatim

Address lookup uses the public [Nominatim service](https://operations.osmfoundation.org/policies/nominatim/). Requests occur only on explicit form submission; there is no autocomplete, background lookup, or bulk geocoding. The public service is limited to one request per second per application and has no availability guarantee.

### OSRM

Driving distances and route geometry use the public OSRM demonstration server at `router.project-osrm.org`. It has no SLA. The candidate-reduction step limits request size, and routing failures degrade to local straight-line calculations. Estimates do not account reliably for traffic, weather, ferry schedules, or temporary road closures.

## Development

```sh
npm install
npm run dev -- --open
npm run check
npm run build
```

No environment variables are required.

## Deployment

The project uses `@sveltejs/adapter-auto`, which detects Vercel during deployment. Browser geolocation requires HTTPS; Vercel provides it by default.
