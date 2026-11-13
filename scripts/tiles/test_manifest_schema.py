"""Tests for `manifest_schema.validate` (spec §5.1 step 5, D20).

    python -m unittest discover -s scripts/tiles -p "test_*.py"
"""

from __future__ import annotations

import copy
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import manifest_schema  # noqa: E402


def _layer(**overrides) -> dict:
    layer = {
        "id": "radar-backscatter-hv-monthly",
        "family": "radar",
        "name": "HV Backscatter (monthly)",
        "units": "dB",
        "valueType": "continuous",
        "sourceFile": "nisar/backscatter_by_month/NISAR_HV_dB_2026-09_month_30m.tif",
        "band": 1,
        "scaleFactor": 0.01,
        "nodata": -32768,
        "period": "2026-09",
        "periods": ["2026-09", "2026-10"],
        "tilePath": "tiles/radar-backscatter-hv-monthly/2026-09/{z}/{x}/{y}.png",
        "minZoom": 5,
        "maxZoom": 13,
        "ramp": {
            "kind": "sequential",
            "stops": [[-18.0, "#08131f"], [-9.0, "#8ec96f"], [0.0, "#f7f7b0"]],
        },
        "domain": [-18.0, -8.2],
        "caveats": ["Provisional NISAR calibration"],
    }
    layer.update(overrides)
    return layer


def _manifest(*layers) -> dict:
    layers = list(layers) or [_layer()]
    periods = sorted({period for layer in layers for period in layer["periods"]},
                     key=manifest_schema.period_sort_key)
    return {
        "schemaVersion": 1,
        "generator": {"name": "nisar-tile-pipeline", "version": "1.0.0",
                      "generatedAt": "2026-11-02T09:14:00Z"},
        "source": {
            "repo": "https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar",
            "commit": "7ea38ff1b5c0dd4571b1935d01c5bd71ebf72862",
            "crs": "EPSG:32651",
            "resolutionMeters": 30,
            "attribution": "NISAR L2 GCOV (NASA-ISRO, provisional) · Landsat HLS L30 v2.0",
        },
        "bounds": [124.357, 5.365, 125.715, 6.633],
        "dates": periods,
        "layers": layers,
    }


class ValidManifestTest(unittest.TestCase):
    def test_minimal_manifest_passes(self):
        self.assertEqual(manifest_schema.validate(_manifest()), [])

    def test_pair_product_period_is_allowed(self):
        layer = _layer(
            id="radar-change-hv-monthly",
            period="2026-10 (vs 2026-09)",
            periods=["2026-10 (vs 2026-09)"],
            tilePath="tiles/radar-change-hv-monthly/2026-10-vs-2026-09/{z}/{x}/{y}.png",
            domain=[-3.0, 3.0],
        )
        self.assertEqual(manifest_schema.validate(_manifest(layer)), [])


class RejectedManifestTest(unittest.TestCase):
    def assert_rejected(self, doc: dict, fragment: str):
        errors = manifest_schema.validate(doc)
        self.assertTrue(errors, "expected the manifest to be rejected")
        self.assertTrue(any(fragment in error for error in errors),
                        f"no error containing {fragment!r} in {errors}")

    def test_percent_encoded_tile_path_is_rejected(self):
        doc = _manifest()
        doc["layers"][0]["tilePath"] = "tiles/radar-backscatter-hv-monthly/2026-09%20x/{z}/{x}/{y}.png"
        self.assert_rejected(doc, "tilePath")

    def test_space_in_tile_path_is_rejected(self):
        doc = _manifest()
        doc["layers"][0]["tilePath"] = "tiles/radar-backscatter-hv-monthly/2026-09 x/{z}/{x}/{y}.png"
        self.assert_rejected(doc, "tilePath")

    def test_tile_path_with_other_layer_id_is_rejected(self):
        doc = _manifest()
        doc["layers"][0]["tilePath"] = "tiles/radar-change-hv-monthly/2026-09/{z}/{x}/{y}.png"
        self.assert_rejected(doc, "tilePath id")

    def test_unsorted_ramp_stops_are_rejected(self):
        doc = _manifest()
        doc["layers"][0]["ramp"]["stops"] = [[0.0, "#f7f7b0"], [-9.0, "#8ec96f"]]
        self.assert_rejected(doc, "ascending")

    def test_bad_ramp_colour_is_rejected(self):
        doc = _manifest()
        doc["layers"][0]["ramp"]["stops"][0][1] = "teal"
        self.assert_rejected(doc, "#rrggbb")

    def test_non_increasing_domain_is_rejected(self):
        doc = _manifest()
        doc["layers"][0]["domain"] = [0.0, 0.0]
        self.assert_rejected(doc, "not increasing")

    def test_dates_must_be_the_union_of_periods(self):
        doc = _manifest()
        doc["dates"] = ["2026-09"]
        self.assert_rejected(doc, "dates")

    def test_period_must_be_declared_in_periods(self):
        doc = _manifest()
        doc["layers"][0]["period"] = "2026-11"
        doc["dates"] = ["2026-11"]
        self.assert_rejected(doc, "not in periods")

    def test_duplicate_layer_entry_is_rejected(self):
        doc = _manifest(_layer())
        doc["layers"].append(copy.deepcopy(doc["layers"][0]))
        self.assert_rejected(doc, "duplicate")

    def test_entries_for_one_layer_must_agree_on_periods(self):
        first = _layer()
        second = _layer(period="2026-10",
                        tilePath="tiles/radar-backscatter-hv-monthly/2026-10/{z}/{x}/{y}.png",
                        periods=["2026-10"])
        doc = _manifest(first, second)
        doc["dates"] = ["2026-09", "2026-10"]
        self.assert_rejected(doc, "disagree on periods")

    def test_categorical_layer_needs_classes(self):
        doc = _manifest()
        doc["layers"][0]["valueType"] = "categorical"
        self.assert_rejected(doc, "classes")

    def test_unsafe_layer_id_is_rejected(self):
        doc = _manifest()
        doc["layers"][0]["id"] = "Radar HV"
        doc["layers"][0]["tilePath"] = "tiles/Radar HV/2026-09/{z}/{x}/{y}.png"
        self.assert_rejected(doc, "lowercase ASCII")

    def test_bad_schema_version_is_rejected(self):
        doc = _manifest()
        doc["schemaVersion"] = 2
        self.assert_rejected(doc, "schemaVersion")

    def test_missing_top_level_key_is_rejected(self):
        doc = _manifest()
        del doc["source"]
        self.assert_rejected(doc, "source")


if __name__ == "__main__":
    unittest.main()
