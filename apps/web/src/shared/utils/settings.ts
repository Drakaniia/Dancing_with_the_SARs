import { isTauri } from "@tauri-apps/api/core";

/**
 * Persisted user settings (panel layout, bookmarks). The desktop app keeps them in the Tauri
 * store file `settings.json`; the browser build keeps them in `localStorage` under
 * `nisar.settings.<key>`. Both are best-effort: failures leave the in-memory state untouched.
 */

const SETTINGS_STORE = "settings.json";
const WEB_PREFIX = "nisar.settings.";

async function tauriStore() {
  const { load } = await import("@tauri-apps/plugin-store");
  return load(SETTINGS_STORE, { autoSave: true });
}

/** Reads a setting, or `undefined` when it is missing or storage is unavailable. */
export async function readSetting(key: string): Promise<unknown> {
  if (typeof window === "undefined") return undefined;
  try {
    if (isTauri()) return await (await tauriStore()).get<unknown>(key);
    const raw = window.localStorage.getItem(WEB_PREFIX + key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Saves a JSON-serialisable setting. */
export async function writeSetting(key: string, value: unknown): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (isTauri()) {
      await (await tauriStore()).set(key, value);
      return;
    }
    window.localStorage.setItem(WEB_PREFIX + key, JSON.stringify(value));
  } catch {
    // Best-effort persistence (private mode, quota, store errors).
  }
}
