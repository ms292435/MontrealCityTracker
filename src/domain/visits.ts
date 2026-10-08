import { distanceMeters } from './geo';

export const VISIT_RADIUS_M = 25;
export const MAX_ACCURACY_M = 25;

export type Fix = { lat: number; lon: number; accuracy: number | null };
export type CandidatePoint = { id: number; segmentId: number; lat: number; lon: number };

// Une position trop imprécise risquerait de colorer des rues non parcourues (FR-006).
export function isUsableFix(fix: Fix): boolean {
  return fix.accuracy !== null && fix.accuracy <= MAX_ACCURACY_M;
}

// Aucun filtre de vitesse ni de direction : tout point à moins de 25 m est visité.
export function visitedPointIds(fix: Fix, candidates: CandidatePoint[]): number[] {
  if (!isUsableFix(fix)) return [];
  return candidates
    .filter((point) => distanceMeters(fix, point) < VISIT_RADIUS_M)
    .map((point) => point.id);
}
