---
title: Glossary
description: Remote sensing and project terms used across the app and these docs.
---

**AOI (area of interest).** Sarangani and Davao Occidental: 5,268.4 km², bounds
124.357–125.715 °E, 5.365–6.633 °N.

**Backscatter.** The fraction of a radar pulse returned to the sensor, in decibels (dB). It
rises with surface roughness, vegetation structure and moisture. It is not a measure of height.

**COG.** Cloud-Optimized GeoTIFF: a tiled GeoTIFF with internal overviews.

**dB change.** The difference in backscatter between two dates. Negative (brown) values usually
mean drying or loss; positive (teal) values mean wetting or gain.

**Domain.** The value range a layer's colour ramp spans, stored in the manifest.

**EPSG:32651.** WGS 84 / UTM zone 51N, the native CRS of the release (30 m grid).

**EPSG:3857.** Web Mercator, the projection of the map tiles.

**EVI.** Enhanced Vegetation Index, a greenness index that saturates less than NDVI over dense
canopy.

**Family.** A group of related layers (`radar`, `vegetation`, `landcover`, `earthquake`,
`climate`, `outlook`, `terrain`).

**GCOV.** The NISAR Level-2 geocoded polarimetric covariance product: calibrated backscatter.

**GUNW.** The NISAR geocoded unwrapped interferogram: the product needed for ground
deformation (uplift and subsidence). It is **not** in the release.

**HH / HV.** Radar polarisations. HH is horizontal transmit and receive. HV is horizontal
transmit and vertical receive (cross-pol), and is more sensitive to vegetation volume.

**HLS.** Harmonized Landsat Sentinel-2, a surface reflectance product (L30 v2.0 here).

**InSAR.** Interferometric SAR: measuring ground movement from phase differences between passes.

**Layer-date.** One layer at one period, and one manifest entry. There are 318.

**LST.** Land surface temperature (MODIS MOD11A2, daytime).

**Manifest.** `public/data/manifest.json`, the generated contract between the pipeline and the
app.

**NBR.** Normalized Burn Ratio, sensitive to vegetation loss and disturbance.

**NDMI.** Normalized Difference Moisture Index: plant water content.

**NDVI.** Normalized Difference Vegetation Index: greenness.

**NDWI.** Normalized Difference Water Index: surface water.

**NISAR.** The NASA-ISRO Synthetic Aperture Radar mission (L- and S-band). This release uses
L-band.

**ONI.** Oceanic Niño Index, the standard El Niño measure. Outlook sensitivities are per +1 °C
of ONI.

**Period.** A label on the time axis: `2026-10`, `2025-Q3`, `2026-06-28`,
`2026-10 (vs 2026-09)`, `pre-quake 2026`, `static`.

**Same-track pair.** A change product between two passes over the same orbit track and frame,
so the viewing geometries match.

**Snapping.** Showing a layer's nearest available period when the global date is not one of its
own.

**SRTM.** Shuttle Radar Topography Mission elevation (SRTMGL1, 30 m).

**Swath.** The ground strip one radar pass images. By-date layers cover only their swath.
