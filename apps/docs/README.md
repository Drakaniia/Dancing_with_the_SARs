# NISAR Surface Change Monitor — documentation

The documentation site for the app, built with [Astro Starlight](https://starlight.astro.build/).
It is a package in the repository's pnpm workspace.

```bash
pnpm docs:dev       # from the repo root: http://localhost:4321/Dancing_with_the_SARs/
pnpm docs:build     # static site in apps/docs/dist/
pnpm docs:preview   # serve the built site
```

- Published to GitHub Pages at https://drakaniia.github.io/Dancing_with_the_SARs/ by
  `.github/workflows/docs.yml`. Internal links must include the `/Dancing_with_the_SARs/` base.
- Pages live in `src/content/docs/`, one Markdown/MDX file per page. The sidebar is defined
  in `astro.config.mjs`.
- Screenshots and the team photo are referenced from their original locations
  (`docs/screenshots/`, `apps/web/public/images/`), so regenerating them with
  `scripts/capture_screenshots.py` also updates the docs.
- Theme colours follow the dashboard's tokens, in `src/styles/custom.css`.
