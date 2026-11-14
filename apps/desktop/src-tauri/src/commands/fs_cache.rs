//! Offline map-tile cache under `<app cache dir>/tiles/`.
//!
//! Keys mirror the remote layout below `tiles/`, e.g.
//! `terrain-slope/static/9/430/247.png`. Tile bytes cross the IPC bridge as raw
//! binary (not JSON number arrays), so caching ~28k tiles stays fast.

use std::path::{Path, PathBuf};

use tauri::ipc::{InvokeBody, Request, Response};
use tauri::Manager;

/// Header carrying the tile key on `write_tile_cache` (the body is the PNG bytes).
const KEY_HEADER: &str = "x-tile-key";
const MAX_KEY_LEN: usize = 512;

fn cache_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("tiles"))
}

/// Resolve a tile key under `root`. Rejects anything that could escape it:
/// empty or `.`/`..` segments, absolute paths, backslashes, and characters
/// outside `[A-Za-z0-9._-]`.
fn tile_path(root: &Path, key: &str) -> Result<PathBuf, String> {
    if key.is_empty() || key.len() > MAX_KEY_LEN {
        return Err(format!("invalid tile key length: {}", key.len()));
    }
    let mut path = root.to_path_buf();
    for segment in key.split('/') {
        let valid = !segment.is_empty()
            && segment != "."
            && segment != ".."
            && segment
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'-' | b'_'));
        if !valid {
            return Err(format!("invalid tile key: {key}"));
        }
        path.push(segment);
    }
    Ok(path)
}

/// Returns the cached tile bytes, or an empty body when the tile is not cached.
#[tauri::command]
pub async fn read_tile_cache(app: tauri::AppHandle, key: String) -> Result<Response, String> {
    let path = tile_path(&cache_root(&app)?, &key)?;
    match std::fs::read(&path) {
        Ok(bytes) => Ok(Response::new(bytes)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Response::new(Vec::new())),
        Err(e) => Err(e.to_string()),
    }
}

/// Stores one tile. The key travels in the `x-tile-key` header and the raw PNG
/// bytes in the body. Writes go through a `.part` file so an interrupted
/// download never leaves a truncated tile behind.
#[tauri::command]
pub async fn write_tile_cache(
    app: tauri::AppHandle,
    request: Request<'_>,
) -> Result<(), String> {
    let key = request
        .headers()
        .get(KEY_HEADER)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| format!("missing {KEY_HEADER} header"))?;
    let InvokeBody::Raw(data) = request.body() else {
        return Err("expected raw tile bytes".into());
    };
    let path = tile_path(&cache_root(&app)?, key)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("invalid tile file name")?;
    let part = path.with_file_name(format!("{file_name}.part"));
    std::fs::write(&part, data).map_err(|e| e.to_string())?;
    std::fs::rename(&part, &path).map_err(|e| e.to_string())?;
    Ok(())
}

/// Given `(key, size)` pairs from the remote tile index, returns the keys that
/// are not cached yet or whose cached size differs (the tile was rebuilt).
#[tauri::command]
pub async fn missing_tile_cache(
    app: tauri::AppHandle,
    entries: Vec<(String, u64)>,
) -> Result<Vec<String>, String> {
    let root = cache_root(&app)?;
    let mut missing = Vec::new();
    for (key, size) in entries {
        let path = tile_path(&root, &key)?;
        let cached = std::fs::metadata(&path)
            .map(|meta| meta.len() == size)
            .unwrap_or(false);
        if !cached {
            missing.push(key);
        }
    }
    Ok(missing)
}

/// Deletes every cached tile.
#[tauri::command]
pub async fn clear_tile_cache(app: tauri::AppHandle) -> Result<(), String> {
    let root = cache_root(&app)?;
    match std::fs::remove_dir_all(&root) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::tile_path;
    use std::path::Path;

    #[test]
    fn accepts_tile_keys() {
        let root = Path::new("cache");
        let path = tile_path(root, "radar-change-hh-monthly/2026-10-vs-2026-09/9/430/247.png").unwrap();
        assert!(path.starts_with(root));
        assert!(path.ends_with("247.png"));
    }

    #[test]
    fn rejects_escaping_keys() {
        let root = Path::new("cache");
        for key in [
            "",
            "../secret",
            "a/../../b.png",
            "a/./b.png",
            "/etc/passwd",
            "a//b.png",
            "a\\b.png",
            "C:/x.png",
            "a/b c.png",
        ] {
            assert!(tile_path(root, key).is_err(), "accepted {key:?}");
        }
    }
}
