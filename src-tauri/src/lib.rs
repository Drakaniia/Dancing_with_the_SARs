mod commands;

use tauri_plugin_store::StoreExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let _store = app.store("config.json")?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::import::import_file,
            commands::export::export_screenshot,
            commands::fs_cache::read_tile_cache,
            commands::fs_cache::write_tile_cache,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
