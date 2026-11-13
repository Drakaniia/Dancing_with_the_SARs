"""Validator for `public/data/manifest.json` (spec §4, D20).

The manifest is the only contract between the pipeline and the app, so it is checked on
both sides of the boundary: the pipeline refuses to write a manifest that fails here, and
the app test suite (P2) runs the same rules against the committed file.

No third-party imports: `python scripts/tiles/manifest_schema.py public/data/manifest.json`
works on a machine with nothing but Python.
"""

from __future__ import annotations

import json
import re
import sys

SCHEMA_VERSION = 1

# ASCII, URL-safe: no spaces, no percent-encoding, no parentheses.
TILE_PATH = re.compile(r"^tiles/[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9._-]*/\{z\}/\{x\}/\{y\}\.png$")
LAYER_ID = re.compile(r"^[a-z0-9][a-z0-9-]*$")
PERIOD = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 .()_>-]*$")
COMMIT = re.compile(r"^[0-9a-f]{7,40}$")
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
VALUE_TYPES = {"continuous", "categorical", "count"}

TOP_LEVEL = ("schemaVersion", "generator", "source", "bounds", "dates", "layers")
LAYER_KEYS = ("id", "family", "name", "units", "valueType", "sourceFile", "band",
              "scaleFactor", "nodata", "period", "periods", "tilePath", "minZoom",
              "maxZoom", "ramp", "domain", "caveats")


def _is_number(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def _check_layer(layer: dict, index: int, errors: list[str]) -> None:
    where = f"layers[{index}]"

    def fail(message: str) -> None:
        errors.append(f"{where}: {message}")

    for key in LAYER_KEYS:
        if key not in layer:
            fail(f"missing {key!r}")
    if any(key not in layer for key in LAYER_KEYS):
        return

    if not isinstance(layer["id"], str) or not LAYER_ID.match(layer["id"]):
        fail(f"id {layer['id']!r} is not lowercase ASCII with dashes")
    if not isinstance(layer["name"], str) or not layer["name"].strip():
        fail("name is empty")
    if not isinstance(layer["family"], str) or not layer["family"].strip():
        fail("family is empty")
    if not isinstance(layer["units"], str) or not layer["units"].strip():
        fail("units is empty")
    if layer["valueType"] not in VALUE_TYPES:
        fail(f"valueType {layer['valueType']!r} not in {sorted(VALUE_TYPES)}")

    if not isinstance(layer["period"], str) or not layer["period"]:
        fail("period is empty")
    periods = layer["periods"]
    if not isinstance(periods, list) or not periods:
        fail("periods is empty")
    else:
        if layer["period"] not in periods:
            fail(f"period {layer['period']!r} is not in periods")
        if list(periods) != sorted(periods, key=period_sort_key):
            fail("periods is not sorted")

    path = layer["tilePath"]
    if not isinstance(path, str) or not TILE_PATH.match(path):
        fail(f"tilePath {path!r} is not tiles/<id>/<period>/{{z}}/{{x}}/{{y}}.png")
    else:
        if path.split("/")[1] != layer["id"]:
            fail(f"tilePath id {path.split('/')[1]!r} != layer id {layer['id']!r}")
        if "%" in path or " " in path:
            fail("tilePath must be URL-safe with no percent-encoding")

    band = layer["band"]
    if not isinstance(band, int) or band < 1:
        fail("band must be a positive integer")
    if not _is_number(layer["scaleFactor"]) or layer["scaleFactor"] <= 0:
        fail("scaleFactor must be a positive number")
    if layer["nodata"] is not None and not _is_number(layer["nodata"]):
        fail("nodata must be a number or null")

    lo, hi = layer["minZoom"], layer["maxZoom"]
    if not isinstance(lo, int) or not isinstance(hi, int) or not (0 <= lo <= hi <= 22):
        fail(f"zoom range {lo}-{hi} is not 0 <= minZoom <= maxZoom <= 22")

    domain = layer["domain"]
    if not isinstance(domain, list) or len(domain) != 2 or not all(_is_number(v) for v in domain):
        fail("domain must be [lo, hi]")
    elif not domain[0] < domain[1]:
        fail(f"domain {domain} is not increasing")

    ramp = layer["ramp"]
    if not isinstance(ramp, dict):
        fail("ramp must be an object")
    else:
        if ramp.get("kind") not in ("sequential", "diverging"):
            fail(f"ramp.kind {ramp.get('kind')!r} is not sequential/diverging")
        stops = ramp.get("stops")
        if not isinstance(stops, list) or len(stops) < 2:
            fail("ramp.stops needs at least two stops")
        else:
            values: list[float] = []
            for stop in stops:
                if not (isinstance(stop, list) and len(stop) == 2):
                    fail(f"ramp stop {stop!r} is not [value, '#rrggbb']")
                    continue
                if not _is_number(stop[0]):
                    fail(f"ramp stop value {stop[0]!r} is not a number")
                if not isinstance(stop[1], str) or not HEX.match(stop[1]):
                    fail(f"ramp colour {stop[1]!r} is not #rrggbb")
                values.append(stop[0])
            if values != sorted(values):
                fail("ramp stops are not in ascending value order")

    caveats = layer["caveats"]
    if not isinstance(caveats, list) or not all(isinstance(c, str) for c in caveats):
        fail("caveats must be a list of strings")

    if layer["valueType"] == "categorical":
        classes = layer.get("classes")
        if not isinstance(classes, list) or not classes:
            fail("categorical layer needs classes[]")
        else:
            codes = []
            for entry in classes:
                if not (isinstance(entry, dict) and {"code", "label", "color"} <= set(entry)):
                    fail(f"class {entry!r} needs code, label and color")
                    continue
                if not isinstance(entry["code"], int) or not 0 <= entry["code"] <= 254:
                    fail(f"class code {entry['code']!r} is not 0..254")
                if not isinstance(entry["label"], str) or not entry["label"].strip():
                    fail(f"class {entry['code']} label is empty")
                if not isinstance(entry["color"], str) or not HEX.match(entry["color"]):
                    fail(f"class {entry['code']} colour {entry['color']!r} is not #rrggbb")
                codes.append(entry["code"])
            if len(codes) != len(set(codes)):
                fail("duplicate class codes")


def period_sort_key(period: str) -> tuple[str, str]:
    """Sort pair products by their first date, then by the full label."""
    return period.split(" (vs ")[0], period


def validate(doc: dict) -> list[str]:
    """Return a list of human-readable problems; empty means the manifest is valid."""
    errors: list[str] = []
    if not isinstance(doc, dict):
        return ["manifest is not an object"]

    for key in TOP_LEVEL:
        if key not in doc:
            errors.append(f"missing top-level {key!r}")
    if errors:
        return errors

    if doc["schemaVersion"] != SCHEMA_VERSION:
        errors.append(f"schemaVersion {doc['schemaVersion']!r} != {SCHEMA_VERSION}")

    generator = doc["generator"]
    if not isinstance(generator, dict):
        errors.append("generator must be an object")
    else:
        for key in ("name", "version", "generatedAt"):
            if not isinstance(generator.get(key), str) or not generator.get(key):
                errors.append(f"generator.{key} is missing")

    source = doc["source"]
    if not isinstance(source, dict):
        errors.append("source must be an object")
    else:
        repo = source.get("repo")
        if not isinstance(repo, str) or not repo.startswith("https://"):
            errors.append("source.repo must be an https URL")
        commit = source.get("commit")
        if not isinstance(commit, str) or not COMMIT.match(commit):
            errors.append(f"source.commit {commit!r} is not a hex commit sha")
        if source.get("crs") != "EPSG:32651":
            errors.append(f"source.crs {source.get('crs')!r} != 'EPSG:32651'")
        if not _is_number(source.get("resolutionMeters")) or source["resolutionMeters"] <= 0:
            errors.append("source.resolutionMeters must be positive")
        if not isinstance(source.get("attribution"), str) or not source["attribution"]:
            errors.append("source.attribution is empty")

    bounds = doc["bounds"]
    if not (isinstance(bounds, list) and len(bounds) == 4 and all(_is_number(v) for v in bounds)):
        errors.append("bounds must be [west, south, east, north]")
    else:
        west, south, east, north = bounds
        if not (west < east and south < north):
            errors.append(f"bounds {bounds} is not [west < east, south < north]")
        if not (-180 <= west <= 180 and -180 <= east <= 180 and -90 <= south <= 90 and -90 <= north <= 90):
            errors.append(f"bounds {bounds} is outside EPSG:4326")

    layers = doc["layers"]
    if not isinstance(layers, list) or not layers:
        errors.append("layers is empty")
        return errors

    for index, layer in enumerate(layers):
        if not isinstance(layer, dict):
            errors.append(f"layers[{index}] is not an object")
            continue
        _check_layer(layer, index, errors)

    keys = [(layer.get("id"), layer.get("period")) for layer in layers if isinstance(layer, dict)]
    for key in sorted({k for k in keys if keys.count(k) > 1}, key=str):
        errors.append(f"duplicate layer entry {key}")

    by_id: dict[str, list[str]] = {}
    for layer in layers:
        if isinstance(layer, dict) and isinstance(layer.get("periods"), list):
            by_id.setdefault(str(layer.get("id")), []).append(layer["periods"])
    for layer_id, seen in by_id.items():
        first = sorted(seen[0], key=period_sort_key)
        if any(sorted(other, key=period_sort_key) != first for other in seen[1:]):
            errors.append(f"{layer_id}: entries disagree on periods[]")

    dates = doc["dates"]
    if not isinstance(dates, list) or not dates:
        errors.append("dates is empty")
    else:
        union = sorted({period for layer in layers if isinstance(layer.get("periods"), list)
                        for period in layer["periods"]}, key=period_sort_key)
        if list(dates) != union:
            errors.append("dates is not the sorted union of every layer's periods")

    totals = doc.get("totals")
    if totals is not None:
        if not isinstance(totals, dict) or not isinstance(totals.get("tiles"), int) \
                or not isinstance(totals.get("bytes"), int):
            errors.append("totals needs integer tiles and bytes")
    trimmed = doc.get("trimmed")
    if trimmed is not None and not (isinstance(trimmed, list) and all(isinstance(t, str) for t in trimmed)):
        errors.append("trimmed must be a list of strings")

    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: python scripts/tiles/manifest_schema.py public/data/manifest.json",
              file=sys.stderr)
        return 2
    with open(argv[1], encoding="utf-8") as fh:
        doc = json.load(fh)
    errors = validate(doc)
    if errors:
        print(f"{argv[1]}: {len(errors)} problem(s)", file=sys.stderr)
        for error in errors:
            print(f"  {error}", file=sys.stderr)
        return 1
    print(f"{argv[1]}: valid ({len(doc['layers'])} layers, {len(doc['dates'])} dates)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
