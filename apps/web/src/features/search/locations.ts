export interface LocationEntry {
  name: string;
  province?: string;
  category?: "sarangani" | "davao-occidental" | "epicentre" | "philippines";
  center: [number, number];
  zoom?: number;
}

export const PHILIPPINES_LOCATIONS: LocationEntry[] = [
  {
    name: "M7.8 Quake Epicentre (8 Jun 2026)",
    province: "Sarangani Strait",
    category: "epicentre",
    center: [125.147, 6.0215],
    zoom: 10.5,
  },
  {
    name: "Malalan Landslide Cluster (#1 · 16.8 ha)",
    province: "Jose Abad Santos, Davao Occidental",
    category: "davao-occidental",
    center: [125.5013, 5.776],
    zoom: 12.5,
  },
  {
    name: "Mudan Landslide Cluster (#2 · 7.6 ha)",
    province: "Glan, Sarangani",
    category: "sarangani",
    center: [125.2714, 5.8538],
    zoom: 12.5,
  },
  {
    name: "Alabel (Provincial Capital)",
    province: "Sarangani",
    category: "sarangani",
    center: [125.2869, 6.1028],
    zoom: 11.5,
  },
  {
    name: "Glan",
    province: "Sarangani",
    category: "sarangani",
    center: [125.2044, 5.8247],
    zoom: 11.5,
  },
  {
    name: "Malapatan",
    province: "Sarangani",
    category: "sarangani",
    center: [125.2886, 5.9669],
    zoom: 11.5,
  },
  {
    name: "Maasim",
    province: "Sarangani",
    category: "sarangani",
    center: [125.0042, 5.8594],
    zoom: 11.5,
  },
  {
    name: "Kiamba",
    province: "Sarangani",
    category: "sarangani",
    center: [124.6242, 5.9892],
    zoom: 11.5,
  },
  {
    name: "Maitum",
    province: "Sarangani",
    category: "sarangani",
    center: [124.4975, 6.0394],
    zoom: 11.5,
  },
  {
    name: "Malungon",
    province: "Sarangani",
    category: "sarangani",
    center: [125.2764, 6.2994],
    zoom: 11.5,
  },
  {
    name: "Malita (Provincial Capital)",
    province: "Davao Occidental",
    category: "davao-occidental",
    center: [125.6089, 6.4036],
    zoom: 11.5,
  },
  {
    name: "Santa Maria",
    province: "Davao Occidental",
    category: "davao-occidental",
    center: [125.4714, 6.5519],
    zoom: 11.5,
  },
  {
    name: "Don Marcelino",
    province: "Davao Occidental",
    category: "davao-occidental",
    center: [125.6542, 6.1972],
    zoom: 11.5,
  },
  {
    name: "Jose Abad Santos",
    province: "Davao Occidental",
    category: "davao-occidental",
    center: [125.4728, 5.8644],
    zoom: 11.5,
  },
  {
    name: "Sarangani (Balut & Tumanao Islands)",
    province: "Davao Occidental",
    category: "davao-occidental",
    center: [125.405, 5.402],
    zoom: 11.5,
  },
  {
    name: "General Santos City",
    province: "South Cotabato",
    category: "philippines",
    center: [125.1716, 6.1164],
    zoom: 11,
  },
  {
    name: "Davao City",
    province: "Davao del Sur",
    category: "philippines",
    center: [125.612, 7.0707],
    zoom: 10.5,
  },
  {
    name: "Manila",
    province: "Metro Manila",
    category: "philippines",
    center: [120.9842, 14.5995],
    zoom: 10,
  },
  {
    name: "Cebu City",
    province: "Cebu",
    category: "philippines",
    center: [123.8854, 10.3157],
    zoom: 10,
  },
];

export function findNearestPlace(lng: number, lat: number): string {
  let best = PHILIPPINES_LOCATIONS[0];
  let bestDistSq = Number.POSITIVE_INFINITY;
  for (const loc of PHILIPPINES_LOCATIONS) {
    const dx = loc.center[0] - lng;
    const dy = loc.center[1] - lat;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = loc;
    }
  }
  if (bestDistSq > 1.2) {
    return "Mindanao / Philippine Archipelago";
  }
  return best.province ? `${best.name}, ${best.province}` : best.name;
}
