# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenRoad Data Tools is a web application for collecting map points. Users drop pins anywhere on a
map and record an ID, coordinates, an approach direction, an optional description and an optional
distance, then export the whole set as a single CSV. Everything runs in the browser — points live in
localStorage and nothing is sent to a server.

Repository: https://github.com/redmond2742/OpenRoad-Data-Tools

## Build & Development Commands

```bash
npm run dev          # Start development server (port 5001)
npm run build        # Build for production (outputs to dist/)
npm run start        # Run production build
npm run check        # TypeScript type checking
```

## Architecture

### Data Flow

Everything is client-side. The Express server in `server/` exists only to serve Vite in development
and static files in production — it has no API routes and no database.

### Key Directories

- `client/src/` - React frontend application
  - `components/openroad/` - Domain components (points-table, points-map, point-modal,
    direction-input, import-panel, export-panel, settings-panel, file-viewer)
  - `components/ui/` - shadcn/ui base components, plus `map-tile-layers` (OSM + optional Mapbox)
  - `pages/openroad-builder.tsx` - The whole app: sidebar navigation over Points / Settings /
    Import / Export
- `server/` - Express server (serves Vite in dev, static files in prod)
- `packages/openroad/` - Shared data layer, published as the `openroad` package
  - `schema/schema.ts` - The single `Point` entity (Drizzle schema + Zod insert schema)
  - `localStorage.ts` - Point CRUD, ID assignment, and all CSV export/import
  - `store/openroad-store.ts` - Zustand state
  - `utils.ts` - `cn`, direction helpers, great-circle projection for the map

`packages/openroad` is aliased to its **source** in both `vite.config.ts` and `tsconfig.json`, so dev,
build and type-check all read the same files. `packages/openroad/dist` is only built for publishing.

### Data Model

One entity, `Point`:

| Field | Notes |
|---|---|
| `id` | Internal row key (nanoid). Never exported. |
| `pointId` | The exported ID#. Sequential (`1, 2, 3…`) or a 10-char unique ID. |
| `latitude` / `longitude` | Required. |
| `direction` | Optional. `"NB"`/`"SB"`/`"EB"`/`"WB"` or `"0".."359"`, stored as the exact CSV token so files round-trip unchanged. |
| `description` | Optional free text. |
| `distanceFt` | Optional, defaults to `0`. |

**Point IDs.** Sequential numbering uses a high-water mark persisted at `openroad_id_counter`, not
the count of points, so a deleted ID is never handed to a different location later. Unique IDs use an
alphanumeric-only nanoid alphabet — `-` and `_` are excluded because a leading `-` would trip the CSV
formula-injection guard and come back altered on re-import.

**Direction semantics.** The stored value is the heading of *travel*: northbound traffic heads 0° and
therefore arrives from 180°. A point with a direction is drawn as a marker whose nose points along
that bearing — the arrow lives on the icon (`markerSvg` in `points-map.tsx`), sized in pixels, so it
stays constant at every zoom rather than growing with the map. `distanceFt` does not affect it.

**Two-phase map clicks.** `points-table.tsx` holds `directionPendingId`. The first map click creates a
point and makes it pending; the next click is consumed by `MapClicks` in `points-map.tsx` to set the
direction via `bearingBetween(clickLat, clickLng, point.latitude, point.longitude)` — the click says
where traffic comes *from*, so the bearing runs from there back to the pin. Esc, the Skip button, or
opening the point form clears the pending state and leaves the point without a direction. The pending
point is derived from the points array by id, so deleting it clears the state for free. A dashed
polyline previews the heading from the cursor to the pin while the second click is pending; it is the
only direction geometry drawn on the map itself.

**Marker icons must not change on hover.** `pointIcon()` is cached by bearing alone. Passing
react-leaflet a different icon makes it call `setIcon`, which replaces the marker's DOM element — and
an element replaced under the cursor swallows the click in progress, so hover highlighting once made
marker popups impossible to open. Highlighting is therefore a separate non-interactive `CircleMarker`
halo drawn behind the marker.

### Export Format

A single `points.csv`, downloadable on its own or inside a ZIP:

```
id,latitude,longitude,direction,description,distance_ft
1,37.7749,-122.4194,NB,Stop bar,150
2,37.7762,-122.418,135,Camera pole,0
```

Import accepts `.csv`, `.txt` and `.zip`, via upload, drag-and-drop or paste, and runs in replace or
merge mode (merge de-duplicates on `pointId`).

**Import is a three-step pipeline** so the UI can put a human in the middle:

```
inspectCSV      raw text        -> rows + a guess at whether row 1 is a header
suggestMapping  headers         -> proposed source-column -> field mapping
buildPointsFromCSV  rows+mapping -> validated points
```

`parsePointsCSV` chains all three with the suggested mapping, for callers that don't need review.
`ColumnMapping` is `{ fields: Record<PointField, number[]>, separators: Record<PointField, string> }` —
a field can draw on several columns when `POINT_FIELDS` marks it `combinable` (`id` and `description`),
and each field carries its own joining string because the right joiner differs per field. The UI for
this is `client/src/components/openroad/column-mapper.tsx`.

Header names are matched leniently (`lat`, `lon`, `Distance (ft)`, `ID#`, `Y`/`X`, `Heading` …) and a
file with no header row is read in canonical column order. Direction *values* are normalised by
`normalizeDirection` in `utils.ts`, which accepts words (`Northbound`, `west`), the intercardinals
(`NE` -> `45`), codes and bearings — while passing canonical values through untouched so an exported
file round-trips byte-for-byte.

### Path Aliases

```
@/        -> client/src/
openroad  -> packages/openroad/index.ts
```

### UI Framework

- React 18 with TypeScript
- Tailwind CSS with shadcn/ui components
- Leaflet for interactive maps
- Zustand for state
