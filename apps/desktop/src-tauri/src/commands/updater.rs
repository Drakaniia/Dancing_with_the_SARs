//! In-app updates from GitHub Releases.
//!
//! On launch (release builds only) the app reads `latest.json` from the newest
//! published release. When a newer, correctly signed version exists it asks
//! the user first, then downloads, installs and restarts. The About dialog can
//! run the same check on demand through `check_for_updates`.

use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_updater::UpdaterExt;

const MAX_NOTES_CHARS: usize = 600;

/// Starts a background update check. Skipped in debug builds so `tauri dev`
/// never offers to install a release over a development build.
pub fn check_on_startup(app: &AppHandle) {
    if cfg!(debug_assertions) {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(err) = check_and_prompt(app, false).await {
            eprintln!("update check failed: {err}");
        }
    });
}

/// Checks for an update on demand. Returns `true` when an update was found
/// (the install prompt is then shown), `false` when already up to date.
#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<bool, String> {
    check_and_prompt(app, true).await
}

async fn check_and_prompt(app: AppHandle, manual: bool) -> Result<bool, String> {
    let update = app
        .updater()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;

    let Some(update) = update else {
        if manual {
            app.dialog()
                .message("You are running the latest version.")
                .title("No updates available")
                .kind(MessageDialogKind::Info)
                .show(|_| {});
        }
        return Ok(false);
    };

    let mut notes = update.body.clone().unwrap_or_default().trim().to_string();
    if notes.chars().count() > MAX_NOTES_CHARS {
        notes = notes.chars().take(MAX_NOTES_CHARS).collect::<String>() + "…";
    }
    let mut message = format!(
        "Version {} is available. You have version {}.",
        update.version, update.current_version
    );
    if !notes.is_empty() {
        message.push_str("\n\n");
        message.push_str(&notes);
    }
    message.push_str("\n\nDownload and install it now? The app will restart when it finishes.");

    let handle = app.clone();
    app.dialog()
        .message(message)
        .title("Update available")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Install and restart".into(),
            "Later".into(),
        ))
        .show(move |accepted| {
            if !accepted {
                return;
            }
            tauri::async_runtime::spawn(async move {
                match update.download_and_install(|_, _| {}, || {}).await {
                    Ok(()) => handle.restart(),
                    Err(err) => {
                        handle
                            .dialog()
                            .message(format!("The update could not be installed: {err}"))
                            .title("Update failed")
                            .kind(MessageDialogKind::Error)
                            .show(|_| {});
                    }
                }
            });
        });

    Ok(true)
}
