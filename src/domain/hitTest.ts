import { distanceMeters, type LatLon } from './geo';

export const TAP_TOLERANCE_PX = 20;
export const MAX_SEGMENT_TAP_M = 50;

// Très dézoomé, un doigt couvre plusieurs rues : on touche alors un quartier, et les quartiers
// sont teintés (FR-017). Seuil : 20 px représentent plus de 50 m (échelle < 0,4 px/m).
export function isQuartierView(scale: number): boolean {
  'worklet';
  return TAP_TOLERANCE_PX / scale > MAX_SEGMENT_TAP_M;
}

export function nearestPoint<T extends LatLon>(target: LatLon, candidates: T[], toleranceM: number): T | null {
  let best: T | null = null;
  let bestDistance = toleranceM;
  for (const candidate of candidates) {
    const d = distanceMeters(target, candidate);
    if (d <= bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}
