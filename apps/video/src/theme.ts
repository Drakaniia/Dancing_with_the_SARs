// Sand Atlas palette, mirrored from apps/web/src/styles/tokens.css.
// Used by programmatic (data-driven) SVG parts. Editable text and cards
// keep their colours inline so Studio can edit them.
export const C = {
  paper: '#efeade',
  paperLight: '#f7f3ea',
  paperWhite: '#fffdf8',
  sand200: '#ded8c9',
  sand250: '#d6cfbd',
  land: '#e3d9c2',
  ink: '#2e2a1e',
  ink700: '#4a4434',
  muted: '#686150',
  terracotta: '#a9471c',
  terracottaBright: '#c75a29',
  olive: '#3d692c',
  ochre: '#8a5a2b',
  amber: '#b07a1c',
  rain: '#4f6f8f',
  candidate: '#b2182b', // app ramp: "Possible landslide"
  cloudCheck: '#74add1', // app ramp: "Not checked (cloudy)"
  line: 'rgba(46, 42, 30, 0.14)',
} as const;

export const SANS = '"IBM Plex Sans", "Segoe UI", sans-serif';
export const MONO = '"IBM Plex Mono", "Cascadia Mono", monospace';
