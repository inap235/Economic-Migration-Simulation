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

// Normalized simplified Moldova border polygon [x, y], 0..1.
// Moldavian “leaf”: tall, narrow, spoon-curved west coast, straighter east.
export const MOLDOVA_BORDER = [
  [0.560, 0.800], [0.580, 0.780], [0.600, 0.760],
  [0.620, 0.730], [0.635, 0.690], [0.640, 0.650],
  [0.635, 0.610], [0.625, 0.570], [0.615, 0.530],
  [0.605, 0.490], [0.600, 0.450], [0.595, 0.410],
  [0.590, 0.370], [0.585, 0.330], [0.580, 0.300],
  [0.570, 0.320], [0.565, 0.360], [0.565, 0.420],
  [0.570, 0.480], [0.575, 0.540], [0.580, 0.620],
  [0.585, 0.690],
];

// Normalized simplified Romania outline [x, y], 0..1.
// Tilted oval with an eastern bite for Moldova; north bulge and south curve.
export const ROMANIA_BORDER = [
  [0.035, 0.280], [0.100, 0.250], [0.180, 0.230],
  [0.250, 0.215], [0.315, 0.210], [0.390, 0.215],
  [0.460, 0.235], [0.520, 0.270], [0.560, 0.320],
  [0.585, 0.365], [0.595, 0.420], [0.595, 0.470],
  [0.585, 0.505], [0.560, 0.540], [0.520, 0.565],
  [0.470, 0.560], [0.410, 0.540], [0.340, 0.505],
  [0.275, 0.460], [0.205, 0.420], [0.140, 0.380],
];

// Normalized simplified Ukraine outline [x, y], 0..1.
// Wide plank with left notch for Moldova, extended east, Crimea wedge.
export const UKRAINE_BORDER = [
  [0.600, 0.690], [0.640, 0.720], [0.690, 0.745],
  [0.760, 0.755], [0.830, 0.745], [0.900, 0.725],
  [0.940, 0.690], [0.970, 0.640], [0.960, 0.585],
  [0.910, 0.535], [0.850, 0.500], [0.790, 0.480],
  [0.730, 0.470], [0.670, 0.460], [0.620, 0.445],
  [0.605, 0.420], [0.620, 0.390], [0.660, 0.360],
  [0.700, 0.340], [0.740, 0.320], [0.770, 0.305],
  [0.805, 0.315], [0.840, 0.330], [0.875, 0.350],
  [0.900, 0.370], [0.910, 0.410], [0.930, 0.460],
];

export const COLORS = {
  S: '#4A90D9', I: '#F5A623', M: '#E74C3C', R: '#2ECC71',
  bg: '#070B14', panel: '#0A0E1A', accent: '#F5A623', text: '#E8E4D9',
};

// Source: Numbeo cost of living index 2024 (excluding rent)
// Romania: 44.60 → normalized ~0.68, Ukraine: 37.30 → normalized ~0.57
export const ROMANIA_LIFE_COST = 0.68;
export const UKRAINE_LIFE_COST = 0.57;

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
  lifeCost:        1.0,   // 0.5 – 2.0: 1.0 = actual index-based expectation
};
