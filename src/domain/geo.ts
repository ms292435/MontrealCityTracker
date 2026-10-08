// Module feuille (aucun import) : partagé avec scripts/build-streets.

export type LatLon = { lat: number; lon: number };

const EARTH_RADIUS_M = 6371000;
const RAD = Math.PI / 180;

// Approximation équirectangulaire : erreur négligeable aux distances utilisées (≤ quelques km).
export function distanceMeters(a: LatLon, b: LatLon): number {
  const x = (b.lon - a.lon) * RAD * Math.cos(((a.lat + b.lat) / 2) * RAD);
  const y = (b.lat - a.lat) * RAD;
  return EARTH_RADIUS_M * Math.sqrt(x * x + y * y);
}

export function toE6(deg: number): number {
  return Math.round(deg * 1e6);
}

export function fromE6(e6: number): number {
  return e6 / 1e6;
}
