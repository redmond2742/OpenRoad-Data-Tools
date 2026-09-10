# Changelog

All notable changes to OpenRoad Data Tools will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-09-08

### Major Changes
- **BREAKING**: Reworked from GTSS Builder, a traffic-signal configuration tool, into OpenRoad Data
  Tools, a general map-point collector
- **BREAKING**: Export format is now a single `points.csv` instead of the six-file GTSS TXT package
- **BREAKING**: The `gtss` package is now `openroad`; imports change from `from "gtss"` to
  `from "openroad"`

### Added
- Click anywhere on the map to drop a point, with a toggle to disarm it while panning
- Draggable markers that write their new coordinates back as you move them
- Compass direction per point — NB/SB/EB/WB or an exact bearing — shown as a pin that points along
  the heading, drawn at a fixed pixel size so it stays readable at every zoom
- Two-click point placement: the first map click drops the pin, the second says where traffic comes
  from and sets the bearing, with a dashed preview line while choosing (Esc or Skip to leave it unset)
- Optional description and distance (ft) fields, distance defaulting to 0
- Unique point IDs as an alternative to sequential numbering, for merging datasets from different
  people without collisions
- Sequential IDs backed by a persistent high-water mark, so a deleted number is never reused
- Lenient CSV import: alternate column names (`lat`, `lon`, `Distance (ft)`, `ID#` …) and headerless
  files in canonical column order
- Generic CSV importer with a column-mapping step: any spreadsheet can be imported by saying what each
  column means, ignoring the ones that aren't needed, or combining several into ID or Description
  (each with its own joining string), with a live preview of the first rows as they will be imported
- Direction values understood as words (`Northbound`, `west`) and intercardinals (`NE` -> 45) as well
  as codes and bearings
- Confirmation dialog for point deletion

### Removed
- Agency, signal, approach, phase, detector and basic-timing entities, and every screen that edited
  them
- Phase diagrams, free-right markings, crosswalk-length estimation and detector diagrams
- GTSS completeness scoring and the Python GTSS validator
- Server API routes, the Drizzle/Postgres storage layer and the `db:push` script — the app was already
  entirely client-side
- Electron desktop packaging (`electron/`, `electron-builder.json`, the build guide) and its two
  dependencies, which alone accounted for 272 MB of `node_modules`. The app is browser-only and
  deploys as a static site

### Changed
- `packages/openroad` is aliased to its source in Vite and TypeScript, so dev, build and type-check
  read the same files
- Unique IDs use an alphanumeric-only alphabet, since a leading `-` would trip the CSV
  formula-injection guard and change the ID on re-import
- Map markers are cached by bearing and never change on hover. Swapping a marker's icon makes Leaflet
  replace its DOM element, which swallowed the click in progress and left marker popups unopenable;
  hover highlighting is now a separate halo drawn behind the marker

## [2.0.0] - 2025-02-01

### Major Changes
- **BREAKING**: Complete architecture conversion from server-based APIs to browser localStorage
- Application now runs entirely in the browser without requiring a server or database
- All data persists locally in the user's browser across sessions

### Added
- Comprehensive localStorage service with full CRUD operations for all data types
- Custom React hooks (useAgency, useSignals, usePhases, useDetectors) replacing React Query patterns
- Browser-based data persistence with automatic JSON serialization
- Standalone operation - no server dependency for production deployment
- Client-side ZIP generation for GTSS exports
- Complete GitHub deployment documentation and setup files

### Changed
- Converted all major components to use localStorage instead of API calls
- Removed React Query dependencies throughout the application
- Updated all modal components (signal, detector, bulk signal) for localStorage integration
- Streamlined build process for static hosting deployment

### Removed
- Server dependency for production operation
- React Query and QueryClientProvider from main application
- All API request logic replaced with direct localStorage operations
- Database connection requirements

### Technical Details
- Maintained all existing functionality while eliminating server dependency
- Preserved type safety with shared Zod schemas
- Enhanced error handling for client-side operations
- Optimized for static hosting platforms (Netlify, Vercel, GitHub Pages)

## [1.0.0] - 2025-01-31

### Added
- Initial release of OpenSignal traffic signal configuration tool
- Agency management with location-based setup
- Interactive signal location management with map integration
- Visual phase editor with map-based bearing selection
- Detector configuration with smart phase dropdowns
- GTSS-compliant CSV export functionality
- Bulk signal creation with map-based placement
- Responsive design with mobile support
- Dark mode theme support

### Features
- React 18 frontend with TypeScript
- Leaflet maps with reverse geocoding
- Real-time form validation with Zod schemas
- Zustand state management
- shadcn/ui component library
- Tailwind CSS styling
- Express.js development server
- PostgreSQL database integration (development)

### Map Integration
- Interactive signal placement
- Reverse geocoding for automatic street name population
- Agency-centered map positioning
- Click-to-draw phase directions with bearing calculation
- Bulk signal creation workflow

### Data Management
- Four main entities: Agencies, Signals, Phases, Detectors
- Type-safe database operations with Drizzle ORM
- CSV export following GTSS specification
- Comprehensive form validation

### User Experience
- Tabbed interface for organized workflow
- Visual phase editor with compass bearing selection
- Inline editing capabilities in map popups
- Auto-save functionality for quick edits
- Enhanced delete confirmation for data safety
- Toast notifications for user feedback

---

## Release Notes Format

### Version Number Guidelines
- **Major (X.0.0)**: Breaking changes, major new features, architecture changes
- **Minor (X.Y.0)**: New features, significant improvements, backwards compatible
- **Patch (X.Y.Z)**: Bug fixes, minor improvements, security updates

### Change Categories
- **Added**: New features
- **Changed**: Changes in existing functionality  
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements