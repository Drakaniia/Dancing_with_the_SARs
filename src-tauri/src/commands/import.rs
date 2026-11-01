use serde::{Deserialize, Serialize};
use std::fs;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportedFile {
    pub name: String,
    pub path: String,
    pub size: u64,
}

#[tauri::command]
pub async fn import_file(app: tauri::AppHandle) -> Result<ImportedFile, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("GeoTIFF", &["tif", "tiff"])
        .add_filter("GeoJSON", &["geojson", "json"])
        .blocking_pick_file()
        .ok_or("No file selected")?;

    let path_buf = file.into_path().map_err(|e| e.to_string())?;
    let path = path_buf.to_string_lossy().to_string();
    let name = path_buf
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    let size = fs::metadata(&path_buf).map(|m| m.len()).unwrap_or(0);

    Ok(ImportedFile { name, path, size })
}
