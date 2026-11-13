import type { LayerFamily } from "./dataset";

export type ValueType = "continuous" | "categorical" | "count";
export type RampKind = "sequential" | "diverging";

export type RampStop = [number, string];

export interface Ramp {
  kind: RampKind;
  stops: RampStop[];
}

export interface ClassEntry {
  code: number;
  label: string;
  color: string;
}

export interface ManifestLayer {
  id: string;
  family: LayerFamily;
  name: string;
  units: string;
  valueType: ValueType;
  sourceFile: string;
  band: number;
  scaleFactor: number;
  nodata: number | null;
  period: string;
  periods: string[];
  tilePath: string;
  minZoom: number;
  maxZoom: number;
  ramp: Ramp;
  domain: [number, number];
  coverage?: number;
  caveats: string[];
  classes?: ClassEntry[];
}

export interface ManifestGenerator {
  name: string;
  version: string;
  generatedAt: string;
}

export interface ManifestSource {
  repo: string;
  commit: string;
  crs: string;
  resolutionMeters: number;
  attribution: string;
}

export interface ManifestTotals {
  tiles: number;
  bytes: number;
  byFamily?: Record<string, { tiles: number; bytes: number }>;
}

export interface Manifest {
  schemaVersion: number;
  generator: ManifestGenerator;
  source: ManifestSource;
  bounds: [number, number, number, number];
  dates: string[];
  trimmed?: string[];
  totals?: ManifestTotals;
  layers: ManifestLayer[];
}

export interface LandslideRankedItem {
  rank: number;
  barangay: string;
  municipality: string;
  province: string;
  areaHa: number;
  patches: number;
  lat: number;
  lng: number;
  slopeDeg: number;
  elevM: number;
  eviBefore: number;
  eviAfter: number;
  kmFromEpicentre: number;
}

export interface AoiMonthlyMean {
  month: string;
  ndviMean: number;
  ndviCoverPct: number;
  lstDayMeanC: number;
  lstCoverPct: number;
}

export interface OutlookScenarioRow {
  month: string;
  rainNormalMm: number;
  rainExpectedMm: number;
  rainP10Mm: number;
  rainP90Mm: number;
  rainPctNormal: number;
  eviAnomalyMean: number;
  eviExpectedMean: number;
  eviAnomSarangani: number;
  eviAnomDavaoOccidental: number;
  pctLandBelowNormalGreenness: number;
  ndviAnomalyMean: number;
  lstDayAnomalyC: number;
}

export interface ModisMonthlyRow {
  month: string;
  evi: number | null;
  lst: number | null;
  ndvi: number | null;
  ndviDavaoOccidental: number | null;
  ndviSarangani: number | null;
  validPct: number | null;
}

export interface TablesPayload {
  epicentre: {
    lng: number;
    lat: number;
    label: string;
  };
  landslidesRanked: LandslideRankedItem[];
  aoiMonthlyMeans: AoiMonthlyMean[];
  outlookScenario: OutlookScenarioRow[];
  modisMonthlySeries: ModisMonthlyRow[];
}

const TILE_PATH_RE =
  /^tiles\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9._-]*\/\{z\}\/\{x\}\/\{y\}\.png$/;
const LAYER_ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const COMMIT_RE = /^[0-9a-f]{7,40}$/;

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Runtime validator for `/data/manifest.json` matching `scripts/tiles/manifest_schema.py`.
 * Returns a list of human-readable error strings; empty means valid.
 */
export function validateManifest(doc: unknown): string[] {
  const errors: string[] = [];
  if (!doc || typeof doc !== "object") {
    return ["manifest is not an object"];
  }
  const m = doc as Record<string, unknown>;
  for (const key of [
    "schemaVersion",
    "generator",
    "source",
    "bounds",
    "dates",
    "layers",
  ]) {
    if (!(key in m)) errors.push(`missing top-level '${key}'`);
  }
  if (errors.length > 0) return errors;

  if (m.schemaVersion !== 1) {
    errors.push(`schemaVersion ${String(m.schemaVersion)} != 1`);
  }

  const gen = m.generator as Record<string, unknown> | undefined;
  if (!gen || typeof gen !== "object") {
    errors.push("generator must be an object");
  } else {
    for (const k of ["name", "version", "generatedAt"]) {
      if (typeof gen[k] !== "string" || !gen[k]) {
        errors.push(`generator.${k} is missing`);
      }
    }
  }

  const src = m.source as Record<string, unknown> | undefined;
  if (!src || typeof src !== "object") {
    errors.push("source must be an object");
  } else {
    if (typeof src.repo !== "string" || !src.repo.startsWith("https://")) {
      errors.push("source.repo must be an https URL");
    }
    if (typeof src.commit !== "string" || !COMMIT_RE.test(src.commit)) {
      errors.push("source.commit is not a hex commit sha");
    }
    if (src.crs !== "EPSG:32651") {
      errors.push("source.crs != 'EPSG:32651'");
    }
    if (!isNumber(src.resolutionMeters) || src.resolutionMeters <= 0) {
      errors.push("source.resolutionMeters must be positive");
    }
  }

  const bounds = m.bounds;
  if (
    !Array.isArray(bounds) ||
    bounds.length !== 4 ||
    !bounds.every(isNumber)
  ) {
    errors.push("bounds must be [west, south, east, north]");
  } else if (!(bounds[0] < bounds[2] && bounds[1] < bounds[3])) {
    errors.push("bounds is not [west < east, south < north]");
  }

  const layers = m.layers;
  if (!Array.isArray(layers) || layers.length === 0) {
    errors.push("layers is empty");
    return errors;
  }

  for (let i = 0; i < layers.length; i++) {
    const l = layers[i] as Record<string, unknown>;
    const where = `layers[${i}]`;
    if (!l || typeof l !== "object") {
      errors.push(`${where}: not an object`);
      continue;
    }
    if (typeof l.id !== "string" || !LAYER_ID_RE.test(l.id)) {
      errors.push(`${where}: invalid id`);
    }
    if (
      typeof l.tilePath !== "string" ||
      !TILE_PATH_RE.test(l.tilePath) ||
      l.tilePath.includes("%") ||
      l.tilePath.includes(" ")
    ) {
      errors.push(`${where}: invalid tilePath`);
    }
    if (
      !Array.isArray(l.domain) ||
      l.domain.length !== 2 ||
      !isNumber(l.domain[0]) ||
      !isNumber(l.domain[1]) ||
      !(l.domain[0] < l.domain[1])
    ) {
      errors.push(`${where}: domain is not increasing`);
    }
    const ramp = l.ramp as Record<string, unknown> | undefined;
    if (!ramp || typeof ramp !== "object" || !Array.isArray(ramp.stops)) {
      errors.push(`${where}: missing ramp stops`);
    } else {
      for (const stop of ramp.stops as unknown[]) {
        if (
          !Array.isArray(stop) ||
          stop.length !== 2 ||
          !isNumber(stop[0]) ||
          typeof stop[1] !== "string" ||
          !HEX_RE.test(stop[1])
        ) {
          errors.push(`${where}: invalid ramp stop`);
        }
      }
    }
    if (l.valueType === "categorical") {
      if (!Array.isArray(l.classes) || l.classes.length === 0) {
        errors.push(`${where}: categorical layer needs classes[]`);
      }
    }
  }

  return errors;
}
