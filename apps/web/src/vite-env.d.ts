/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Remote host for the generated map tiles, e.g. `https://pub-<id>.r2.dev`.
   * Tile URLs become `<base>/tiles/<id>/<segment>/{z}/{x}/{y}.png`.
   * Unset: tiles are read from the app's own `public/tiles/`.
   */
  readonly VITE_TILE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
