export const COMPLETION_RATIO = 0.9;

export type SegmentState = 'non_parcourue' | 'partielle' | 'completee';

export function segmentState(visitedCount: number, pointCount: number): SegmentState {
  if (visitedCount === 0) return 'non_parcourue';
  return visitedCount / pointCount >= COMPLETION_RATIO ? 'completee' : 'partielle';
}

// Arrondi à l'entier inférieur : on n'affiche jamais 100 % tant que tout n'est pas visité.
export function percentVisited(visitedCount: number, pointCount: number): number {
  return Math.floor((visitedCount * 100) / pointCount);
}
