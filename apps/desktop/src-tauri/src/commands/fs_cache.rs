use tauri::Manager;

#[tauri::command]
pub async fn read_tile_cache(
    app: tauri::AppHandle,
    key: String,
) -> Result<Option<Vec<u8>>, String> {
    let cache_dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    let path = cache_dir.join("tiles").join(&key);
    if path.exists() {
        Ok(Some(std::fs::read(&path).map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn write_tile_cache(
    app: tauri::AppHandle,
    key: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let cache_dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    let tile_dir = cache_dir.join("tiles");
    std::fs::create_dir_all(&tile_dir).map_err(|e| e.to_string())?;
    std::fs::write(tile_dir.join(&key), data).map_err(|e| e.to_string())?;
    Ok(())
}
