// Projects the app's real GeoJSON (province boundaries + landslide polygons)
// into SVG coordinates so the video draws the actual study area.
// Run with `pnpm --filter video geo`; writes src/data/geo.json.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../../web/public/data');
const outFile = resolve(here, '../src/data/geo.json');

const boundary = JSON.parse(readFileSync(resolve(dataDir, 'boundary.geojson'), 'utf8'));
const landslides = JSON.parse(readFileSync(resolve(dataDir, 'landslides.geojson'), 'utf8'));

// Study-area bounds (matches manifest.json "bounds"), padded slightly.
const [W, S, E, N] = [124.30, 5.31, 125.77, 6.69];
const EPICENTRE = [125.056, 5.599]; // M7.8, 8 Jun 2026, off Maasim (locations.ts)
const HEIGHT = 1000;
const kx = Math.cos(((S + N) / 2) * (Math.PI / 180));
const scale = HEIGHT / (N - S);
const WIDTH = Math.round((E - W) * kx * scale);

const project = ([lon, lat]) => [
  Math.round((lon - W) * kx * scale * 10) / 10,
  Math.round((N - lat) * scale * 10) / 10,
];

// Drop vertices closer than `tol` SVG units to the last kept one.
const ringToPath = (ring, tol = 1.2) => {
  const pts = ring.map(project);
  const kept = [pts[0]];
  for (const p of pts.slice(1)) {
    const q = kept[kept.length - 1];
    if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= tol) kept.push(p);
  }
  if (kept.length < 3) return '';
  return `M${kept.map((p) => p.join(' ')).join('L')}Z`;
};

const provinces = boundary.features.map((f) => {
  const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
  const d = polys
    .map((poly) => ringToPath(poly[0]))
    .filter(Boolean)
    .join('');
  return {name: f.properties.province, areaKm2: f.properties.areaKm2, d};
});

const centroid = (ring) => {
  let x = 0;
  let y = 0;
  for (const [lon, lat] of ring) {
    x += lon;
    y += lat;
  }
  return [x / ring.length, y / ring.length];
};

const slides = landslides.features
  .map((f) => {
    const p = f.properties;
    const [x, y] = project(centroid(f.geometry.coordinates[0]));
    return {
      x,
      y,
      areaHa: p.areaHa,
      km: p.kmFromEpicentre,
      eviBefore: p.eviBefore,
      eviAfter: p.eviAfter,
    };
  })
  // Sort by distance from epicentre so the reveal can sweep outward.
  .sort((a, b) => a.km - b.km);

const totalHa = slides.reduce((s, l) => s + l.areaHa, 0);
const meanBefore = slides.reduce((s, l) => s + l.eviBefore, 0) / slides.length;
const meanAfter = slides.reduce((s, l) => s + l.eviAfter, 0) / slides.length;

const out = {
  width: WIDTH,
  height: HEIGHT,
  proj: {west: W, north: N, sx: Math.round(kx * scale * 1000) / 1000, sy: Math.round(scale * 1000) / 1000},
  epicentre: project(EPICENTRE),
  provinces,
  slides,
  stats: {
    count: slides.length,
    totalHa: Math.round(totalHa * 10) / 10,
    meanEviBefore: Math.round(meanBefore * 100) / 100,
    meanEviAfter: Math.round(meanAfter * 100) / 100,
  },
};

mkdirSync(dirname(outFile), {recursive: true});
writeFileSync(outFile, JSON.stringify(out));
console.log(`geo.json: ${WIDTH}x${HEIGHT}, ${provinces.length} provinces, ${slides.length} slides`, out.stats);
