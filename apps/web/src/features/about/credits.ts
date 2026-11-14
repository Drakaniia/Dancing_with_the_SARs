/**
 * Attribution text shared by the About dialog, the provenance dialog and the
 * on-map attribution line. The Copernicus wording follows the Sentinel data
 * licence, which requires the credit for modified Sentinel-1/2 data.
 */
export const COPERNICUS_CREDIT =
  "Contains modified Copernicus Sentinel data 2026";

export const COPERNICUS_LICENCE_URL =
  "https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice";

export const LICENSE_URL =
  "https://github.com/Drakaniia/Dancing_with_the_SARs/blob/main/LICENSE";

export const CREDITS_DOCS_URL =
  "https://drakaniia.github.io/Dancing_with_the_SARs/about/credits/";

/** Desktop installers, linked from the browser build. */
export const DESKTOP_DOWNLOAD_URL =
  "https://drakaniia.github.io/Dancing_with_the_SARs/getting-started/download/";

/** Short form for the map corner, where space is tight. */
export const MAP_ATTRIBUTION = [
  "NASA-ISRO NISAR",
  "NASA/USGS",
  COPERNICUS_CREDIT,
  "Esri",
] as const;

export interface CreditGroup {
  title: string;
  items: readonly { label: string; href?: string }[];
}

export const DATA_CREDITS: readonly CreditGroup[] = [
  {
    title: "NASA and NASA-ISRO data",
    items: [
      {
        label: "NISAR L2 GCOV (NASA-ISRO, provisional), via the ASF DAAC",
        href: "https://nisar.jpl.nasa.gov/",
      },
      {
        label: "Harmonized Landsat Sentinel-2 (HLS) L30 v2.0",
        href: "https://hls.gsfc.nasa.gov/",
      },
      {
        label: "MODIS MOD13Q1 and MOD11A2 v061 (NASA LP DAAC)",
        href: "https://lpdaac.usgs.gov/",
      },
      { label: "GPM IMERG V07", href: "https://gpm.nasa.gov/data/imerg" },
      {
        label: "SRTMGL1 v003 (NASA LP DAAC)",
        href: "https://lpdaac.usgs.gov/products/srtmgl1v003/",
      },
    ],
  },
  {
    title: "Copernicus",
    items: [
      {
        label: `${COPERNICUS_CREDIT}. Sentinel-1 and Sentinel-2 data come from the European Union's Copernicus programme.`,
        href: COPERNICUS_LICENCE_URL,
      },
    ],
  },
  {
    title: "Other data and services",
    items: [
      {
        label: "NOAA CPC Oceanic Niño Index",
        href: "https://www.cpc.ncep.noaa.gov/",
      },
      {
        label:
          "Esri World Light Gray Canvas, World Imagery, World Boundaries and Places (basemaps)",
        href: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
      },
      {
        label: "Team data release: sarangani-davao-occidental-nisar",
        href: "https://github.com/monteropeterdominic-arch/sarangani-davao-occidental-nisar",
      },
    ],
  },
];
