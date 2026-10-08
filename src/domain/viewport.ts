// Au-delà de ce zoom (~1,7 km de hauteur), trop de tronçons pour un affichage fluide (R10).
export const MAX_LATITUDE_DELTA = 0.015;
export const MAX_VISIBLE_SEGMENTS = 1500;
const MARGIN = 1.2;

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};
export type Bounds = { north: number; south: number; east: number; west: number };

export function shouldShowStreets(region: Region): boolean {
  return region.latitudeDelta <= MAX_LATITUDE_DELTA;
}

// Région élargie de 20 % pour que les rues soient déjà là au bord de l'écran.
export function queryBounds(region: Region): Bounds {
  const halfLat = (region.latitudeDelta * MARGIN) / 2;
  const halfLon = (region.longitudeDelta * MARGIN) / 2;
  return {
    north: region.latitude + halfLat,
    south: region.latitude - halfLat,
    east: region.longitude + halfLon,
    west: region.longitude - halfLon,
  };
}
