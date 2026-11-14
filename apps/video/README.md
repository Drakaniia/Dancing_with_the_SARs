# Demo video

A 29-second motion-graphics demo of the NISAR Surface Change Monitor for the
NASA Space Apps judging round. It's built with [Remotion](https://www.remotion.dev)
in the Sand Atlas (light) theme.

## Commands

Run these from the repo root:

```console
pnpm --filter video dev      # Remotion Studio preview
pnpm --filter video geo      # regenerate src/data/geo.json from apps/web/public/data
pnpm --filter video render   # render out/demo.mp4
pnpm --filter video lint     # eslint + tsc
```

## Layout

- `src/timeline.ts`: start frames for each scene.
- `src/components/MapStory.tsx`: the single map that carries scenes 1–5 and docks into the app UI.
- `src/components/map/*`: province, quake, cloud, radar, landslide and satellite layers.
- `src/components/AppChrome.tsx`, `Hud.tsx`, `TitleCard.tsx`: app UI, margin notes and closing card.
- `VOICEOVER.md`: timed voiceover script. The video is silent.

Remotion needs a company license for some organisations; see the
[license terms](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
