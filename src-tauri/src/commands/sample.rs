use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use tauri::Manager;
use tiff::decoder::{Decoder, DecodingResult, Limits};
use tiff::tags::Tag;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassEntry {
    pub code: i64,
    pub label: String,
    pub color: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ManifestLayer {
    id: String,
    family: String,
    name: String,
    units: String,
    value_type: String,
    source_file: String,
    band: usize,
    scale_factor: f64,
    nodata: Option<f64>,
    period: String,
    caveats: Vec<String>,
    classes: Option<Vec<ClassEntry>>,
}

#[derive(Debug, Clone, Deserialize)]
struct ManifestDoc {
    layers: Vec<ManifestLayer>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LayerSample {
    pub layer_id: String,
    pub family: String,
    pub name: String,
    pub period: String,
    pub value: Option<f64>,
    pub raw: Option<f64>,
    pub class_name: Option<String>,
    pub class_color: Option<String>,
    pub units: String,
    pub caveats: Vec<String>,
}

/// Project WGS84 (lng, lat in degrees) to WGS84 / UTM Zone 51N (EPSG:32651) in meters.
pub fn wgs84_to_utm51n(lng_deg: f64, lat_deg: f64) -> (f64, f64) {
    let a = 6378137.0_f64;
    let f = 1.0 / 298.257223563_f64;
    let k0 = 0.9996_f64;
    let e2 = f * (2.0 - f);
    let ep2 = e2 / (1.0 - e2);

    let lat = lat_deg.to_radians();
    let lon = lng_deg.to_radians();
    let lon0 = 123.0_f64.to_radians(); // Zone 51 central meridian (123°E)

    let sin_lat = lat.sin();
    let cos_lat = lat.cos();
    let tan_lat = lat.tan();

    let n = a / (1.0 - e2 * sin_lat * sin_lat).sqrt();
    let t = tan_lat * tan_lat;
    let c = ep2 * cos_lat * cos_lat;
    let a_term = cos_lat * (lon - lon0);

    let e4 = e2 * e2;
    let e6 = e4 * e2;
    let m = a
        * ((1.0 - e2 / 4.0 - 3.0 * e4 / 64.0 - 5.0 * e6 / 256.0) * lat
            - (3.0 * e2 / 8.0 + 3.0 * e4 / 32.0 + 45.0 * e6 / 1024.0) * (2.0 * lat).sin()
            + (15.0 * e4 / 256.0 + 45.0 * e6 / 1024.0) * (4.0 * lat).sin()
            - (35.0 * e6 / 3072.0) * (6.0 * lat).sin());

    let a2 = a_term * a_term;
    let a3 = a2 * a_term;
    let a4 = a2 * a2;
    let a5 = a4 * a_term;
    let a6 = a4 * a2;

    let easting = 500_000.0
        + k0 * n
            * (a_term
                + (1.0 - t + c) * a3 / 6.0
                + (5.0 - 18.0 * t + t * t + 72.0 * c - 58.0 * ep2) * a5 / 120.0);

    let northing = k0
        * (m + n
            * tan_lat
            * (a2 / 2.0
                + (5.0 - t + 9.0 * c + 4.0 * c * c) * a4 / 24.0
                + (61.0 - 58.0 * t + t * t + 600.0 * c - 330.0 * ep2) * a6 / 720.0));

    (easting, northing)
}

fn resolve_workspace_root(app: &tauri::AppHandle) -> PathBuf {
    if let Ok(cwd) = std::env::current_dir() {
        if cwd.join("public").join("data").join("manifest.json").exists() {
            return cwd;
        }
        if let Some(parent) = cwd.parent() {
            if parent.join("public").join("data").join("manifest.json").exists() {
                return parent.to_path_buf();
            }
        }
    }
    if let Ok(res_dir) = app.path().resource_dir() {
        if res_dir.join("data").join("manifest.json").exists() {
            return res_dir;
        }
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn read_pixel_from_tiff(path: &Path, easting: f64, northing: f64, band_1based: usize) -> Option<f64> {
    let file = File::open(path).ok()?;
    let mut limits = Limits::default();
    limits.decoding_buffer_size = 256 * 1024 * 1024;
    let mut decoder = Decoder::new(BufReader::new(file)).ok()?.with_limits(limits);

    let (width, height) = decoder.dimensions().ok()?;

    // GeoTIFF tags: ModelPixelScaleTag (33550) and ModelTiepointTag (33922)
    let scale = decoder
        .get_tag_f64_vec(Tag::Unknown(33550))
        .ok()
        .filter(|v| v.len() >= 2)?;
    let tiepoint = decoder
        .get_tag_f64_vec(Tag::Unknown(33922))
        .ok()
        .filter(|v| v.len() >= 6)?;

    let scale_x = scale[0];
    let scale_y = scale[1];
    let origin_x = tiepoint[3] - tiepoint[0] * scale_x;
    let origin_y = tiepoint[4] + tiepoint[1] * scale_y;

    let col_f = (easting - origin_x) / scale_x;
    let row_f = (origin_y - northing) / scale_y;

    if col_f < 0.0 || row_f < 0.0 {
        return None;
    }
    let col = col_f.floor() as usize;
    let row = row_f.floor() as usize;
    if col >= width as usize || row >= height as usize {
        return None;
    }

    let decoded = decoder.read_image().ok()?;
    let total_pixels = (width as usize) * (height as usize);
    let band_idx = band_1based.saturating_sub(1);

    let extract_at = |len: usize| -> Option<usize> {
        let samples_per_pixel = (len / total_pixels).max(1);
        let b = band_idx.min(samples_per_pixel - 1);
        let idx = (row * (width as usize) + col) * samples_per_pixel + b;
        if idx < len {
            Some(idx)
        } else {
            None
        }
    };

    match decoded {
        DecodingResult::I16(buf) => extract_at(buf.len()).map(|i| buf[i] as f64),
        DecodingResult::U8(buf) => extract_at(buf.len()).map(|i| buf[i] as f64),
        DecodingResult::U16(buf) => extract_at(buf.len()).map(|i| buf[i] as f64),
        DecodingResult::F32(buf) => extract_at(buf.len()).map(|i| buf[i] as f64),
        DecodingResult::F64(buf) => extract_at(buf.len()).map(|i| buf[i]),
        DecodingResult::I32(buf) => extract_at(buf.len()).map(|i| buf[i] as f64),
        DecodingResult::U32(buf) => extract_at(buf.len()).map(|i| buf[i] as f64),
        _ => None,
    }
}

#[tauri::command]
pub async fn sample_layers(
    app: tauri::AppHandle,
    lng: f64,
    lat: f64,
    period: String,
    layer_ids: Option<Vec<String>>,
) -> Result<Vec<LayerSample>, String> {
    let root = resolve_workspace_root(&app);
    let manifest_path = if root.join("public").join("data").join("manifest.json").exists() {
        root.join("public").join("data").join("manifest.json")
    } else {
        root.join("data").join("manifest.json")
    };

    let manifest_bytes = std::fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest at {}: {}", manifest_path.display(), e))?;
    let doc: ManifestDoc =
        serde_json::from_str(&manifest_bytes).map_err(|e| format!("Invalid manifest JSON: {}", e))?;

    let (easting, northing) = wgs84_to_utm51n(lng, lat);

    // Group layers by id and pick the entry matching `period` (or nearest available period)
    let mut by_id: HashMap<String, Vec<ManifestLayer>> = HashMap::new();
    for layer in doc.layers {
        if let Some(ref allowed) = layer_ids {
            if !allowed.contains(&layer.id) {
                continue;
            }
        }
        by_id.entry(layer.id.clone()).or_default().push(layer);
    }

    let mut samples = Vec::new();
    let mut file_cache: HashMap<(String, usize), Option<f64>> = HashMap::new();

    for (_id, entries) in by_id {
        let chosen = entries
            .iter()
            .find(|e| e.period == period)
            .or_else(|| entries.iter().rev().find(|e| e.period <= period))
            .or_else(|| entries.first())
            .cloned();

        let Some(layer) = chosen else { continue };
        let tif_path = root.join("data").join(&layer.source_file);
        let cache_key = (layer.source_file.clone(), layer.band);

        let raw_opt = if let Some(cached) = file_cache.get(&cache_key) {
            *cached
        } else {
            let val = if tif_path.exists() {
                read_pixel_from_tiff(&tif_path, easting, northing, layer.band)
            } else {
                None
            };
            file_cache.insert(cache_key, val);
            val
        };

        let mut value_out = None;
        let mut class_name = None;
        let mut class_color = None;

        if let Some(raw) = raw_opt {
            let is_nodata = if raw.is_nan() {
                true
            } else if let Some(nd) = layer.nodata {
                (raw - nd).abs() < 1e-6
            } else {
                false
            };

            if !is_nodata {
                let scaled = (raw * layer.scale_factor * 10000.0).round() / 10000.0;
                value_out = Some(scaled);
                if layer.value_type == "categorical" {
                    let code = raw.round() as i64;
                    if let Some(ref classes) = layer.classes {
                        if let Some(found) = classes.iter().find(|c| c.code == code) {
                            class_name = Some(found.label.clone());
                            class_color = Some(found.color.clone());
                        }
                    }
                }
            }
        }

        samples.push(LayerSample {
            layer_id: layer.id,
            family: layer.family,
            name: layer.name,
            period: layer.period,
            value: value_out,
            raw: raw_opt.filter(|v| v.is_finite()),
            class_name,
            class_color,
            units: layer.units,
            caveats: layer.caveats,
        });
    }

    samples.sort_by(|a, b| a.layer_id.cmp(&b.layer_id));
    Ok(samples)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wgs84_to_utm51n_sarangani() {
        // General Santos / Sarangani bay region: ~125.17°E, 6.11°N
        let (e, n) = wgs84_to_utm51n(125.17, 6.11);
        assert!(e > 730_000.0 && e < 750_000.0, "easting out of bounds: {}", e);
        assert!(n > 670_000.0 && n < 685_000.0, "northing out of bounds: {}", n);
    }
}
