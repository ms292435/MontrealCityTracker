// Projection et caméra de la carte dessinée par l'app (research.md R16).
// Les fonctions marquées 'worklet' sont aussi exécutées pendant les gestes, sur le fil
// d'interface de Reanimated ; la directive est une simple chaîne, sans effet ailleurs.
import type { LatLon } from './geo';

export type Point = { x: number; y: number }; // mètres, x vers l'est, y vers le sud
export type Camera = { x: number; y: number; scale: number }; // centre (m) + pixels par mètre
export type Viewport = { width: number; height: number };
export type WorldBounds = { minX: number; minY: number; maxX: number; maxY: number };

export const MAX_SCALE = 4;

// Projection équirectangulaire centrée sur l'île : précise à l'échelle d'une ville.
const ORIGIN_LAT = 45.55;
const ORIGIN_LON = -73.72;
const M_PER_DEG = 111_194.93;
const COS_ORIGIN = Math.cos((ORIGIN_LAT * Math.PI) / 180);

export function project(lat: number, lon: number): Point {
  'worklet';
  return { x: (lon - ORIGIN_LON) * M_PER_DEG * COS_ORIGIN, y: (ORIGIN_LAT - lat) * M_PER_DEG };
}

export function unproject(p: Point): LatLon {
  'worklet';
  return { lat: ORIGIN_LAT - p.y / M_PER_DEG, lon: ORIGIN_LON + p.x / (M_PER_DEG * COS_ORIGIN) };
}

export function worldToScreen(camera: Camera, p: Point, viewport: Viewport): Point {
  'worklet';
  return {
    x: (p.x - camera.x) * camera.scale + viewport.width / 2,
    y: (p.y - camera.y) * camera.scale + viewport.height / 2,
  };
}

export function screenToWorld(camera: Camera, p: Point, viewport: Viewport): Point {
  'worklet';
  return {
    x: (p.x - viewport.width / 2) / camera.scale + camera.x,
    y: (p.y - viewport.height / 2) / camera.scale + camera.y,
  };
}

// Plus petite échelle : l'île entière tient à l'écran (FR-019).
export function minScale(bounds: WorldBounds, viewport: Viewport): number {
  'worklet';
  return Math.min(viewport.width / (bounds.maxX - bounds.minX), viewport.height / (bounds.maxY - bounds.minY));
}

// Échelle bornée et centre gardé dans l'île : impossible de dézoomer ou de glisser hors de l'île.
export function clampCamera(camera: Camera, bounds: WorldBounds, viewport: Viewport): Camera {
  'worklet';
  const low = minScale(bounds, viewport);
  return {
    x: Math.min(Math.max(camera.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(camera.y, bounds.minY), bounds.maxY),
    scale: Math.min(Math.max(camera.scale, low), Math.max(low, MAX_SCALE)),
  };
}

export function panBy(camera: Camera, dxPx: number, dyPx: number): Camera {
  'worklet';
  return { x: camera.x - dxPx / camera.scale, y: camera.y - dyPx / camera.scale, scale: camera.scale };
}

// Zoom autour du point pincé : le point du monde sous les doigts reste en place.
export function zoomAround(camera: Camera, factor: number, focalPx: Point, viewport: Viewport): Camera {
  'worklet';
  const anchor = screenToWorld(camera, focalPx, viewport);
  const scale = camera.scale * factor;
  return {
    x: anchor.x - (focalPx.x - viewport.width / 2) / scale,
    y: anchor.y - (focalPx.y - viewport.height / 2) / scale,
    scale,
  };
}
