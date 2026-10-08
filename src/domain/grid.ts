// Module feuille (aucun import) : partagé avec scripts/build-streets, pour que la grille
// calculée par le script et celle de l'app soient identiques (research.md R8).

export const GRID = { lat0: 45.38, lon0: -74.0, dlat: 0.0005, dlon: 0.0007 } as const;

const ROW_FACTOR = 10000;

function rowOf(lat: number): number {
  return Math.floor((lat - GRID.lat0) / GRID.dlat);
}

function colOf(lon: number): number {
  return Math.floor((lon - GRID.lon0) / GRID.dlon);
}

export function cellOf(lat: number, lon: number): number {
  return rowOf(lat) * ROW_FACTOR + colOf(lon);
}

// Cellule de la position et ses 8 voisines : une cellule (~55 m) est plus grande que le rayon
// de visite (25 m), donc tout point proche se trouve dans ce voisinage 3×3.
export function neighborhood(lat: number, lon: number): number[] {
  const row = rowOf(lat);
  const col = colOf(lon);
  const cells: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      cells.push((row + dr) * ROW_FACTOR + (col + dc));
    }
  }
  return cells;
}
