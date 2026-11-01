use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn export_screenshot(
    app: tauri::AppHandle,
    data_url: String,
) -> Result<String, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("PNG", &["png"])
        .blocking_save_file()
        .ok_or("Save cancelled")?;

    let base64_data = data_url
        .strip_prefix("data:image/png;base64,")
        .ok_or("Invalid data URL")?;
    let bytes = STANDARD.decode(base64_data).map_err(|e| e.to_string())?;
    let path = file.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;

    Ok(path.to_string_lossy().to_string())
}
