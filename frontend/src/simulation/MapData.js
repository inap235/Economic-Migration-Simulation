/**
 * MapData.js — Geographical constants and helpers for the Moldova migration simulation.
 *
 * Coordinate system: decimal degrees, WGS-84 (lat/lon).
 * All positions are calibrated approximations suitable for simulation-level accuracy.
 *
 * Key design decisions:
 * - Exit points are near actual Prut River crossings (west) and Tiraspol corridor (east)
 * - External zones are placed with enough lon offset to be clearly visible after GEO expansion
 * - assignMigDir reflects empirical Moldovan emigration patterns (~87% westward)
 */

// ── Border crossing targets ───────────────────────────────────────────────────
// I-state agents drift toward these coordinates when building migration intent.
export const WEST_EXIT = { lat: 47.08, lon: 26.80 }; // Prut River / Romanian border
export const EAST_EXIT = { lat: 47.55, lon: 29.65 }; // Ukraine / Transnistrian corridor

// ── External emigrant zones ───────────────────────────────────────────────────
// M-state agents are placed here on emigration; they drift loosely within.
export const WEST_ZONE = { latC: 46.95, lonC: 25.40, spread: 0.38 }; // Romania / EU side
export const EAST_ZONE = { latC: 47.60, lonC: 30.60, spread: 0.26 }; // Ukraine / Russia side

// ── Border proximity threshold ────────────────────────────────────────────────
// Degrees below which an I-agent is considered "waiting at border" (clustering zone).
export const BORDER_PROXIMITY_DEG = 0.32;

/**
 * Assign migration direction when an agent transitions S → I.
 *
 * Empirical basis: most Moldovans emigrate westward to Romania, Italy, Germany,
 * Portugal, UK (~87%). Transnistrian agents have higher eastward affinity (~45%)
 * reflecting historical Russia/Ukraine ties.
 */
export function assignMigDir(agent) {
  if (agent.region.name === 'Transnistria') {
    return Math.random() < 0.55 ? 'west' : 'east';
  }
  return Math.random() < 0.87 ? 'west' : 'east';
}

/** Returns the border exit target for a given migration direction. */
export function exitFor(migDir) {
  return migDir === 'east' ? EAST_EXIT : WEST_EXIT;
}

/** Returns the external zone descriptor for a given migration direction. */
export function zoneFor(migDir) {
  return migDir === 'east' ? EAST_ZONE : WEST_ZONE;
}
