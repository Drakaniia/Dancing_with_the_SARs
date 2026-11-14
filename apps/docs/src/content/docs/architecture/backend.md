---
title: Tauri backend
description: The Rust shell, its plugins, and every Tauri command including sample_layers.
---

The desktop shell is in `apps/desktop/src-tauri/`. `src/lib.rs` registers three plugins and five commands:

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_store::Builder::new().build())
    .setup(|app| { let _store = app.store("config.json")?; Ok(()) })
    .invoke_handler(tauri::generate_handler![
        commands::import::import_file,
        commands::export::export_screenshot,
        commands::fs_cache::read_tile_cache,
        commands::fs_cache::write_tile_cache,
        commands::fs_cache::missing_tile_cache,
        commands::fs_cache::clear_tile_cache,
        commands::sample::sample_layers,
    ])
```

Dependencies are deliberately small: `tauri` 2, the dialog, fs and store plugins, `serde` /
`serde_json`, `base64`, and **`tiff` 0.9**. There is no GDAL.

## Window and build

From `tauri.conf.json`:

- **Product:** "NISAR Surface Change Monitor", identifier `com.nisar.surface-change-monitor`.
- **Window:** 1400 × 900 by default, minimum 900 × 600.
- **Dev:** runs `pnpm --filter web dev` and loads `http://localhost:5173`.
- **Build:** runs `pnpm --filter web build` and bundles `../../web/dist` (that is,
  `apps/web/dist`) for all targets.

## `sample_layers`

```rust
#[tauri::command]
async fn sample_layers(
    app: AppHandle,
    lng: f64,
    lat: f64,
    period: String,
    layer_ids: Option<Vec<String>>,
) -> Result<Vec<LayerSample>, String>
```

The frontend calls it on every map click (`selectionStore.inspectCoordinate`). It works as
follows:

1. **Find the workspace.** It walks up from the current directory (`apps/desktop/src-tauri`
   under `tauri dev`) until it finds `apps/web/public/data/manifest.json`, then falls back to
   the resource directory.
2. **Read the manifest** and group entries by layer id, keeping only `layer_ids` when given.
3. **Project** WGS84 to **UTM zone 51N** (EPSG:32651, central meridian 123 °E) with a
   closed-form transverse Mercator in `wgs84_to_utm51n()`. No projection crate is needed.
4. **Pick the period** per layer: an exact match, else the latest period at or before the
   request, else the first.
5. **Read the pixel** from `data/<sourceFile>` with the `tiff` crate. The geotransform comes
   from the GeoTIFF tags `ModelPixelScale` (33550) and `ModelTiepoint` (33922), not from
   assumptions. Int16, UInt8, UInt16, Int32, UInt32, Float32 and Float64 are supported.
6. **Interpret the value.** NaN or `nodata` returns `value: null`. Otherwise the raw value is
   multiplied by `scaleFactor`, and categorical codes are mapped to `className` / `classColor`.

### `LayerSample` (camelCase JSON)

```ts
{
  layerId: string;
  family: string;
  name: string;
  period: string;
  value: number | null;
  raw: number | null;
  className?: string | null;
  classColor?: string | null;
  units: string;
  caveats: string[];
}
```

:::note[Performance]
The decoder reads the whole band (`read_image`) and then indexes the pixel, with a 256 MB
decoding limit. Results are cached per `(file, band)` only within a single call. Every click on
a 25-megapixel 30 m raster therefore costs a full band decode. A persistent per-file cache, or
block-level decoding, is the obvious optimisation.
:::

If `data/` is missing, every sample has `value: null`. If the command itself fails, the
frontend falls back to placeholder readings.

## Other commands

| Command              | Signature                                      | Behaviour                                                                                                 |
| -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `import_file`        | `() -> ImportedFile { name, path, size }`      | Opens a file picker filtered to GeoTIFF and GeoJSON, and returns metadata. Not yet used by the UI.        |
| `export_screenshot`  | `(data_url: String) -> String`                 | Saves a `data:image/png;base64,…` URL through a save dialog and returns the path. Not yet used by the UI. |
| `read_tile_cache`    | `(key: String) -> Response` (raw bytes)        | Reads `<app cache dir>/tiles/<key>`. An empty body means not cached.                                      |
| `write_tile_cache`   | raw body, `x-tile-key` header                  | Writes `<app cache dir>/tiles/<key>` through a `.part` file.                                              |
| `missing_tile_cache` | `(entries: Vec<(String, u64)>) -> Vec<String>` | Keys that are not cached or whose cached size differs.                                                    |
| `clear_tile_cache`   | `()`                                           | Deletes `<app cache dir>/tiles/`.                                                                         |

## Store plugin

The app's store holds the persisted panel open/closed state (`uiStore`) and bookmarks
(`bookmarkStore`).
