# NISAR Surface Change Monitor - Technical Specification

## Project Overview

**Goal:** Build an interactive desktop application that uses radar remote sensing data from the NASA-ISRO Synthetic Aperture Radar (NISAR) mission to track and visualize surface changes in the Philippines.

**Scope:** Complete feature set for 4 surface change types across the Philippines with time-series animation capabilities.

**Note:** This spec and the app could change anytime based on teams' feedback, data availability, or new constraints discovered during development. We'll iterate quickly as more information comes in.

---

## Requirements

### Functional Requirements

#### 1. Surface Change Types

The application must visualize four types of surface changes:

- **Elevation Change:** Ground deformation from earthquakes, volcanic activity, landslides
- **Land Subsidence:** Ground sinking or uplift over time (can be combined with elevation change as one layer from same radar measurement)
- **Vegetation Change:** Radar backscatter (HH/HV) vegetation monitoring
- **Water Extent:** Flooding extent, water body changes

#### 2. Geographic Coverage

- Primary focus: Sarangani and Davao Occidental (demo region); Philippines (bounded by approximately 4°N to 21°N, 116°E to 127°E) for future expansion
- Base map: MapLibre GL JS satellite/terrain view (Esri World Imagery, no API key required)
- Custom overlay layers for NISAR data

#### 3. Data Access (Hybrid Approach)

- **Static Dataset:** Pre-processed data from public NISAR and Sentinel-1 sources via team processing scripts
- **Periodic Updates:** Future capability to download datasets from NASA/ISRO portals
- **Local Processing:** Hybrid model with custom pre-processing for advanced analysis, app for visualization

#### 4. Visualization Features

- **Time-Series Animation:** Play back changes over time with play/pause controls
- **Multi-Layer Support:** Toggle between different surface change types
- **Layer Controls:** Opacity adjustment, layer ordering
- **Comparison Tools:** Side-by-side before/after views, difference visualization
- **Interactive Exploration:** Zoom, pan, click for location information

#### 5. User Interaction

- **Deep Exploration:** Users can scrub through time, explore different regions, customize views
- **Location Search:** Search for Philippines cities/regions
- **Bookmarks:** Save and restore viewpoints
- **Export Capabilities:** Screenshot capture, data download

### Non-Functional Requirements

#### Performance

- Smooth time-series animation (minimum 24fps)
- Fast tile loading for large raster datasets
- Responsive UI (no blocking on data operations)

#### Scalability

- Support for multiple zoom levels (image pyramid tiles)
- Efficient caching to avoid repeated processing
- Handle raster datasets up to several GB in size

#### Usability

- Intuitive interface for non-technical users
- Clear visual feedback during data loading
- Accessible color schemes for data visualization

#### Maintainability

- Clean separation between frontend (React) and backend (Tauri/Rust)
- Well-documented data processing pipeline
- Modular component architecture

---

## Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Tauri Desktop App                         │
├──────────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript)                               │
│  ├── MapLibre GL JS (WebGL vector/raster renderer)           │
│  │   ├── Base map (satellite/terrain via MapLibre style)     │
│  │   ├── Custom overlay layers (NISAR data tiles)            │
│  │   └── Time-series animation controls                      │
│  ├── Visualization Components                                │
│  │   ├── LayerControlPanel (toggle data types)               │
│  │   ├── TimeSlider (scrub through dates)                    │
│  │   ├── ComparisonView (side-by-side, diff)                 │
│  │   └── StatsDashboard (change metrics)                     │
│  └── Data Management                                         │
│      ├── FileImport (GeoTIFF, GeoJSON from QGIS)             │
│      ├── LocalCache (IndexedDB)                              │
│      └── Export (screenshots, data download)                 │
├──────────────────────────────────────────────────────────────┤
│  Backend (Tauri Rust)                                        │
│  ├── File I/O Operations                                     │
│  │   ├── Read geospatial files (GDAL bindings)               │
│  │   ├── Convert formats (TIFF → XYZ tiles)                  │
│  │   └── Data preprocessing                                  │
│  ├── NISAR Data Fetcher                                      │
│  │   ├── Download from NASA/ISRO portals (future)            │
│  │   ├── Schedule periodic updates (future)                  │
│  │   └── Validate data integrity                             │
│  └── Local Storage                                           │
│      ├── SQLite database (metadata, indices)                 │
│      ├── File system cache (large rasters)                   │
│      └── Configuration management                            │
└──────────────────────────────────────────────────────────────┘

External Data Sources
├── Team Processing Scripts
│   ├── NISAR data from ASF (Alaska Satellite Facility)
│   ├── Sentinel-1 data from ESA
│   ├── InSAR deformation data → GeoTIFF
│   ├── Radar backscatter (HH/HV) → GeoTIFF
│   ├── Water extent → GeoTIFF/GeoJSON
│   └── Elevation changes → DEM difference rasters
├── NASA NISAR Mission (future)
│   ├── ASF DAAC (Alaska Satellite Facility)
│   ├── NASA Earthdata
│   └── ISRO data portals
└── MapLibre GL JS
    ├── Vector/raster tile rendering (WebGL)
    ├── Custom style JSON (basemap + overlays)
    └── 3D terrain support (future)
```

### Technology Stack

#### Frontend

- **Framework:** React 18+ with TypeScript
- **Desktop Wrapper:** Tauri v2
- **Mapping:** MapLibre GL JS (primary), OpenLayers (fallback for advanced geospatial ops)
- **State Management:** React Query (TanStack Query) for data fetching
- **UI Components:** shadcn/ui or Chakra UI
- **Charts:** d3.js or Chart.js for time-series visualization
- **File Operations:** file-saver-js for exports

#### Backend (Tauri)

- **Language:** Rust
- **Geospatial Processing:** GDAL-rs (GDAL bindings)
- **Serialization:** serde
- **Async Runtime:** tokio
- **Database:** sqlx with SQLite
- **HTTP Client:** reqwest for future API integration

#### Data Processing Pipeline

1. Team uses custom processing scripts on public NISAR and Sentinel-1 data
2. Export to standard formats (GeoTIFF for rasters, GeoJSON for vectors)
3. Tauri backend converts rasters to XYZ tiles for efficient map rendering
4. Frontend renders tiles as custom MapLibre GL JS overlay layers
5. Time-series data indexed by date/time for animation

---

## Data Specifications

### Input Data Format (from QGIS)

#### Raster Data (GeoTIFF)

- **Format:** GeoTIFF (.tif)
- **Coordinate Reference System:** EPSG:4326 (WGS84) for simplicity
- **Compression:** LZW or DEFLATE to reduce file size
- **Naming Convention:**
  - `{change_type}_{date}.tif`
  - Examples: `elevation_2024-01-15.tif`, `vegetation_2024-06-20.tif`
- **Metadata (embedded or sidecar):**
  - Date of observation
  - Change type (elevation, subsidence, vegetation, water)
  - Units (meters, backscatter intensity, etc.)
  - Data source (NISAR/Sentinel-1, team processing from ASF)
  - Spatial bounds

#### Vector Data (GeoJSON)

- **Format:** GeoJSON (.geojson)
- **Coordinate Reference System:** EPSG:4326
- **Features:** Polygons for water extent, regions of interest
- **Properties:** Date, change type, area (sq km), relevant metrics

### Tile Generation

#### XYZ Tile Format

- **Format:** PNG images (256x256 pixels)
- **Zoom Levels:** 0-15 ( Philippines needs high zoom)
- **Directory Structure:**
  ```
  tiles/{change_type}/{z}/{x}/{y}.png
  ```
- **Color Scales:**
  - Elevation: Red (uplift) to Blue (subsidence)
  - Vegetation: Green (high backscatter) to Brown (low backscatter)
  - Water: Blue (water) to Transparent (land)
  - Subsidence: Purple (high subsidence) to White (stable)

## UI/UX Design

### Main Interface Layout

![NISAR Philippines Surface Change Dashboard](../public/images/NISAR%20Philippines%20Surface%20Change%20Dashboard.png)

### Component Specifications

#### Map Component

- Full-height map container
- MapLibre GL JS satellite/terrain basemap
- Custom overlay layers for each change type
- Zoom controls (+/-)
- Layer opacity sliders
- Click to show location info popup

#### Layer Control Panel

- Checkbox toggles for each change type
- Color legend for each layer
- Opacity slider (0-100%)
- Layer ordering (drag to reorder)
- Visibility date range filter

#### Time Series Controls

- Horizontal slider (scrub through dates)
- Play/Pause button
- Speed control (0.5x, 1x, 2x, 4x)
- Date display (current selected date)
- Progress bar showing time position
- Timeline starts from June 2026 (public NISAR data availability)

#### Comparison View

- Split-screen view (before/after)
- Slider to compare two dates
- Difference overlay (color-coded change)
- Synchronized zoom/pan

#### Stats Dashboard

- Total area changed (sq km)
- Maximum displacement (meters)
- Average change rate
- Number of data points
- Time range covered

---

## Implementation Phases

### Phase 1: Foundation

**Goal:** Working Tauri + React app with MapLibre GL JS

- [ ] Set up Tauri v2 project with React + TypeScript
- [ ] Configure MapLibre GL JS with basemap style
- [ ] Implement base map component with Philippines bounds
- [ ] Create basic UI shell (sidebar, map container)
- [ ] Add zoom controls and map interaction
- [ ] Test build process for desktop app

**Deliverable:** Desktop app that displays MapLibre GL JS satellite view of Philippines

### Phase 2: Data Layer

**Goal:** File import and tile generation pipeline

- [ ] Implement Rust GDAL bindings for reading GeoTIFF
- [ ] Create tile generation command (TIFF → XYZ tiles)
- [ ] Set up SQLite database with schema
- [ ] Implement file import Tauri command
- [ ] Create image pyramid generation (multiple zoom levels)
- [ ] Test with sample GeoTIFF from team processing

**Deliverable:** Can import GeoTIFF and generate map tiles

### Phase 3: Single Layer Visualization

**Goal:** Display one change type with time slider

- [ ] Implement custom tile overlay on MapLibre GL JS
- [ ] Create time slider component
- [ ] Add date-based tile loading
- [ ] Implement color legend
- [ ] Add basic statistics display
- [ ] Test animation smoothness

**Deliverable:** Can view elevation changes over time with animation

### Phase 4: Multi-Layer System

**Goal:** Support all 4 change types with layer controls

- [ ] Add layer control panel with toggles
- [ ] Implement opacity controls per layer
- [ ] Add layer ordering
- [ ] Create color legends for each layer type
- [ ] Implement layer visibility filtering
- [ ] Test with multiple datasets

**Deliverable:** Can toggle and control all 4 change types

### Phase 5: Advanced Features

**Goal:** Comparison tools and enhanced UX

- [ ] Implement side-by-side comparison view
- [ ] Add difference overlay (before/after)
- [ ] Create bookmark/save viewpoint feature
- [ ] Add location search (Philippines cities)
- [ ] Implement screenshot export
- [ ] Add data download capability

**Deliverable:** Full exploration and comparison features

### Phase 6: Polish & Testing

**Goal:** Production-ready demo

- [ ] Optimize tile loading performance
- [ ] Add loading spinners and error handling
- [ ] Implement caching to speed up repeated views
- [ ] Create sample dataset for demo
- [ ] Test on sample data from team processing
- [ ] Document setup and usage
- [ ] Prepare demo script

**Deliverable:** Complete, polished submission

---

## Success Criteria

### Must-Have

- [ ] Interactive map with MapLibre GL JS basemap
- [ ] At least 2 surface change types visualized
- [ ] Time-series animation (play/pause/scrub)
- [ ] Layer toggle controls
- [ ] Working desktop app (Tauri)
- [ ] Demo with real or realistic sample data

### Should-Have (High Priority)

- [ ] All 4 surface change types
- [ ] Side-by-side comparison view
- [ ] Statistics dashboard
- [ ] Location search
- [ ] Bookmark functionality
- [ ] Export capabilities

### Nice-to-Have (If Time Permits)

- [ ] Difference overlay visualization
- [ ] 3D terrain view
- [ ] Custom map styling
- [ ] Data download in multiple formats
- [ ] Real-time data fetching (NASA APIs)

---

## Risk Mitigation

### Technical Risks

**Risk 1: GDAL Integration Complexity**

- **Mitigation:** Start with simpler approach - use GeoTIFF.js on frontend instead of Rust GDAL
- **Fallback:** Pre-generate tiles in QGIS and skip runtime tile generation

**Risk 2: Basemap Tile Provider Limits/Costs**

- **Mitigation:** Use Esri World Imagery (confirmed to work without API key in existing MVP)
- **Fallback:** OpenStreetMap or self-host tiles

**Risk 3: Large Dataset Performance**

- **Mitigation:** Limit demo to small region (e.g., Luzon) with lower resolution
- **Fallback:** Use image overlays instead of tile pyramid

**Risk 4: Time Constraints**

- **Mitigation:** Prioritize features - focus on 1-2 change types with excellent animation
- **Fallback:** Simplify to static time slices without smooth animation

### Data Risks

**Risk 5: No Sample Data Available**

- **Mitigation:** Use publicly available DEM data (SRTM) to generate synthetic elevation changes
- **Fallback:** Create mock GeoTIFF with visual patterns for demo

**Risk 6: Data Format Incompatibility**

- **Mitigation:** Agree on exact format before development (EPSG:4326 GeoTIFF)
- **Fallback:** Build flexible format detection and conversion tools

---

## Future Enhancements

### Roadmap

1. **Real Data Integration:** Connect to NASA NISAR data feeds
2. **Web Version:** Deploy as web app using same React frontend
3. **Advanced Analysis:** Add statistical tools, trend detection
4. **Alerting:** Notifications for significant surface changes
5. **Mobile App:** React Native version for field use
6. **3D Visualization:** CesiumJS integration for terrain flyover
7. **Machine Learning:** Predictive modeling for surface changes

---

## Appendix

### A. MapLibre GL JS Setup

1. Choose basemap style (OpenStreetMap, Esri World Imagery, or custom style JSON)
2. Configure style in MapLibre GL JS (`maplibregl.Map` with style URL or inline style)
3. For satellite/terrain: use Esri World Imagery (confirmed to work without API key)
4. Basemap tested and working in existing MVP

### B. Sample Data Format Specification

Data to be provided by team processing:

- 3-5 GeoTIFF files showing elevation changes over time
- EPSG:4326 coordinate system
- Region: Sarangani and Davao Occidental
- One file per layer per date (GeoTIFF, EPSG:4326)
- Exact NISAR and Sentinel-1 dates (public data starting June 2026)
- Metadata with dates, change type, units, and color schemes
- File format documentation to build against with placeholders

### C. References

- [NISAR Mission](https://nisar.jpl.nasa.gov/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [Tauri Documentation](https://tauri.app/)
- [GDAL Documentation](https://gdal.org/)
- [QGIS Documentation](https://docs.qgis.org/)

---
