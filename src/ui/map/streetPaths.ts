// Construction des chemins Skia à partir de la géométrie projetée (research.md R16).
import { FillType, Skia, vec, type SkPath } from '@shopify/react-native-skia';
import { project, type WorldBounds } from '../../domain/camera';
import type { LatLon } from '../../domain/geo';
import { segmentState } from '../../domain/progress';
import type { Geometry } from '../../data/streetsRepository';

export type ProjectedGeometry = {
  geometry: Geometry;
  xs: Float32Array;
  ys: Float32Array;
  bounds: WorldBounds;
};

// Taille des cases du réseau neutre : Skia ignore les cases hors écran sans les tracer.
const BUCKET_M = 2000;

export function projectGeometry(geometry: Geometry): ProjectedGeometry {
  const n = geometry.lat.length;
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (let i = 0; i < n; i++) {
    const p = project(geometry.lat[i], geometry.lon[i]);
    xs[i] = p.x;
    ys[i] = p.y;
    if (p.x < bounds.minX) bounds.minX = p.x;
    if (p.x > bounds.maxX) bounds.maxX = p.x;
    if (p.y < bounds.minY) bounds.minY = p.y;
    if (p.y > bounds.maxY) bounds.maxY = p.y;
  }
  return { geometry, xs, ys, bounds };
}

function addSegment(path: SkPath, pg: ProjectedGeometry, id: number): void {
  const start = pg.geometry.offsets[id];
  const end = pg.geometry.offsets[id + 1];
  if (end - start < 2) return;
  path.moveTo(pg.xs[start], pg.ys[start]);
  for (let i = start + 1; i < end; i++) path.lineTo(pg.xs[i], pg.ys[i]);
}

// Réseau neutre complet, regroupé par case de 2 km selon le premier point du tronçon.
export function buildNeutralPaths(pg: ProjectedGeometry): SkPath[] {
  const buckets = new Map<string, SkPath>();
  for (let id = 1; id <= pg.geometry.segmentCount; id++) {
    const first = pg.geometry.offsets[id];
    const key = `${Math.floor(pg.xs[first] / BUCKET_M)}:${Math.floor(pg.ys[first] / BUCKET_M)}`;
    let path = buckets.get(key);
    if (!path) {
      path = Skia.Path.Make();
      buckets.set(key, path);
    }
    addSegment(path, pg, id);
  }
  return [...buckets.values()];
}

// Rues partielles et complétées, tracées par-dessus le réseau neutre.
export function buildStatePaths(
  pg: ProjectedGeometry,
  visitedCounts: Map<number, number>,
): { partielle: SkPath; completee: SkPath } {
  const partielle = Skia.Path.Make();
  const completee = Skia.Path.Make();
  for (const [id, visited] of visitedCounts) {
    const pointCount = pg.geometry.offsets[id + 1] - pg.geometry.offsets[id];
    const state = segmentState(visited, pointCount);
    if (state === 'partielle') addSegment(partielle, pg, id);
    else if (state === 'completee') addSegment(completee, pg, id);
  }
  return { partielle, completee };
}

export function buildSegmentPath(pg: ProjectedGeometry, id: number): SkPath {
  const path = Skia.Path.Make();
  addSegment(path, pg, id);
  return path;
}

// Zone de quartier remplie ; règle pair-impair pour les trous (enclave de Dorval).
export function buildQuartierPath(outer: LatLon[][], inner: LatLon[][]): SkPath {
  const path = Skia.Path.Make();
  path.setFillType(FillType.EvenOdd);
  for (const ring of [...outer, ...inner]) {
    path.addPoly(
      ring.map((p) => {
        const q = project(p.lat, p.lon);
        return vec(q.x, q.y);
      }),
      true,
    );
  }
  return path;
}
