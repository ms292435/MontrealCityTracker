// Progression par quartier pour la vue dézoomée (FR-017, FR-018).

export type QuartierLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Paliers en pourcentage : une échelle linéaire resterait pâle pendant des mois, car un
// arrondissement compte des milliers de points (research.md R15).
const LEVEL_THRESHOLDS = [1, 5, 15, 40] as const;

export function quartierPercent(visitedPoints: number, totalPoints: number): number {
  if (totalPoints === 0) return 0;
  return Math.floor((visitedPoints * 1000) / totalPoints) / 10;
}

export function quartierLevel(visitedPoints: number, totalPoints: number): QuartierLevel {
  if (totalPoints === 0 || visitedPoints === 0) return 0;
  const percent = (visitedPoints * 100) / totalPoints;
  const above = LEVEL_THRESHOLDS.filter((threshold) => percent >= threshold).length;
  return (1 + above) as QuartierLevel;
}
