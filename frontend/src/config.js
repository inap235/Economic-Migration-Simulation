export const REGIONS = [
  { name: 'Chișinău',    lat: 47.005, lon: 28.857, weight: 0.35, spread: 0.12 },
  { name: 'Nord',        lat: 47.760, lon: 27.929, weight: 0.20, spread: 0.18 },
  { name: 'Sud',         lat: 46.300, lon: 28.900, weight: 0.15, spread: 0.16 },
  { name: 'Centru',      lat: 47.200, lon: 28.300, weight: 0.15, spread: 0.15 },
  { name: 'Găgăuzia',   lat: 46.100, lon: 28.670, weight: 0.08, spread: 0.10 },
  { name: 'Transnistria',lat: 47.200, lon: 29.400, weight: 0.07, spread: 0.08 },
];

// Bounding box for lat/lon → canvas projection.
// Expanded west (24.3) and east (31.8) to show external emigrant zones outside Moldova.
export const GEO = { latMin: 45.0, latMax: 49.0, lonMin: 24.3, lonMax: 31.8 };

// Simplified Moldova border polygon [lat, lon]
export const MOLDOVA_BORDER = [
  [48.47, 27.73], [48.35, 27.46], [48.08, 27.18],
  [47.78, 26.95], [47.52, 26.72], [47.33, 26.62],
  [47.08, 26.72], [46.87, 26.97], [46.55, 27.20],
  [46.20, 27.12], [45.97, 27.42], [45.75, 27.87],
  [45.47, 28.22], [45.52, 28.54], [45.65, 28.95],
  [46.05, 29.28], [46.33, 29.61], [46.47, 29.56],
  [47.20, 29.45], [47.65, 28.95], [47.90, 28.60],
  [48.10, 28.12], [48.47, 27.73],
];

export const COLORS = {
  S: '#4A90D9', I: '#F5A623', M: '#E74C3C', R: '#2ECC71',
  bg: '#070B14', panel: '#0A0E1A', accent: '#F5A623', text: '#E8E4D9',
};

export const N_AGENTS         = 2000;
export const TICK_MS          = 180;
export const SPAWN_BATCH      = 50;
export const SPAWN_INTERVAL   = 30;
export const SIM_START_YEAR   = 2015;

export const DEFAULT_SLIDERS = {
  wageGap:         1.0,   // 0.5 – 2.0
  tiktokPressure:  0.5,   // 0.0 – 1.0
  migrationCost:   1.0,   // 0.5 – 2.0
  networkStrength: 1.0,   // 0.5 – 2.0
  cognitiveBias:   0.5,   // 0.0 – 1.0
};
