// Release builds use the Windows GUI subsystem so no console window opens
// next to the app. Debug builds keep the console for Rust logs.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    nisar_surface_change_monitor_lib::run();
}
