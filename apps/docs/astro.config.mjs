// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

const REPO = "https://github.com/Drakaniia/Dancing_with_the_SARs";

export default defineConfig({
  integrations: [
    starlight({
      title: "NISAR Surface Change Monitor",
      description:
        "Documentation for The Cartographers' NISAR Surface Change Monitor: a Tauri desktop dashboard for radar-based surface change in Sarangani and Davao Occidental, Philippines.",
      logo: {
        src: "./src/assets/logo.svg",
        alt: "NISAR Surface Change Monitor",
      },
      social: [{ icon: "github", label: "GitHub", href: REPO }],
      editLink: {
        baseUrl: `${REPO}/edit/main/apps/docs/`,
      },
      customCss: ["./src/styles/custom.css"],
      lastUpdated: true,
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "getting-started/introduction" },
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Project commands", slug: "getting-started/commands" },
          ],
        },
        {
          label: "User Guide",
          items: [
            { label: "The interface", slug: "guide/interface" },
            { label: "Datasets and layers", slug: "guide/layers" },
            { label: "Timeline and playback", slug: "guide/timeline" },
            { label: "Comparison view", slug: "guide/comparison" },
            { label: "Inspecting locations", slug: "guide/inspecting" },
            { label: "Search, bookmarks and tools", slug: "guide/tools" },
          ],
        },
        {
          label: "Data",
          items: [
            { label: "Data sources", slug: "data/sources" },
            { label: "The NISAR release", slug: "data/release" },
            { label: "Layer catalogue", slug: "data/catalogue" },
            { label: "Manifest format", slug: "data/manifest" },
            { label: "Provenance and limitations", slug: "data/limitations" },
          ],
        },
        {
          label: "Tile Pipeline",
          items: [
            { label: "Overview", slug: "pipeline/overview" },
            { label: "Fetch and inventory", slug: "pipeline/fetch-inventory" },
            { label: "Tiles and manifest", slug: "pipeline/tiles" },
            { label: "Colour ramps", slug: "pipeline/ramps" },
            { label: "Screenshots", slug: "pipeline/screenshots" },
          ],
        },
        {
          label: "Architecture",
          items: [
            { label: "Overview", slug: "architecture/overview" },
            { label: "Frontend", slug: "architecture/frontend" },
            { label: "Tauri backend", slug: "architecture/backend" },
            { label: "Testing and quality", slug: "architecture/testing" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Design decisions", slug: "reference/decisions" },
            { label: "Roadmap and history", slug: "reference/roadmap" },
            { label: "Glossary", slug: "reference/glossary" },
          ],
        },
        {
          label: "About",
          items: [{ label: "The team", slug: "about/team" }],
        },
      ],
    }),
  ],
});
