// Requêtes SQL du contrat specs/001-street-exploration-map/contracts/streets-db.md.
// Aucune logique métier ici : seulement de l'accès aux données.
import type { SQLiteDatabase } from 'expo-sqlite';
import { fromE6, toE6, type LatLon } from '../domain/geo';
import type { CandidatePoint } from '../domain/visits';
import type { Bounds, Region } from '../domain/viewport';

export const SCHEMA_VERSION = '1';

export type SegmentRow = {
  id: number;
  name: string;
  quartier: string;
  lengthM: number;
  pointCount: number;
};

const placeholders = (n: number) => new Array(n).fill('?').join(',');

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS visited_point (
      point_id INTEGER PRIMARY KEY REFERENCES point(id)
    );
  `);
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'schema_version'",
  );
  if (row?.value !== SCHEMA_VERSION) {
    throw new Error(`Version de schéma inattendue : ${row?.value ?? 'absente'}`);
  }
}

export async function getCandidatePoints(db: SQLiteDatabase, cells: number[]): Promise<CandidatePoint[]> {
  const rows = await db.getAllAsync<{ id: number; segment_id: number; lat: number; lon: number }>(
    `SELECT id, segment_id, lat, lon FROM point WHERE cell IN (${placeholders(cells.length)})`,
    cells,
  );
  return rows.map((r) => ({ id: r.id, segmentId: r.segment_id, lat: fromE6(r.lat), lon: fromE6(r.lon) }));
}

// Tronçons dont la boîte englobante coupe `bounds`, les plus proches du centre de la région
// d'abord : le tri est fait par SQLite avant la limite (research.md R10).
export async function getVisibleSegments(
  db: SQLiteDatabase,
  bounds: Bounds,
  center: Region,
  limit: number,
): Promise<SegmentRow[]> {
  const lonWeight = Math.cos((center.latitude * Math.PI) / 180) ** 2;
  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    quartier: string;
    length_m: number;
    point_count: number;
  }>(
    `SELECT id, name, quartier, length_m, point_count FROM segment
     WHERE min_lat <= ? AND max_lat >= ? AND min_lon <= ? AND max_lon >= ?
     ORDER BY ((min_lat + max_lat) / 2.0 - ?) * ((min_lat + max_lat) / 2.0 - ?)
            + ? * ((min_lon + max_lon) / 2.0 - ?) * ((min_lon + max_lon) / 2.0 - ?)
     LIMIT ?`,
    [
      toE6(bounds.north),
      toE6(bounds.south),
      toE6(bounds.east),
      toE6(bounds.west),
      toE6(center.latitude),
      toE6(center.latitude),
      lonWeight,
      toE6(center.longitude),
      toE6(center.longitude),
      limit,
    ],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    quartier: r.quartier,
    lengthM: r.length_m,
    pointCount: r.point_count,
  }));
}

export async function getSegmentGeometries(
  db: SQLiteDatabase,
  segmentIds: number[],
): Promise<Map<number, LatLon[]>> {
  const geometries = new Map<number, LatLon[]>();
  if (segmentIds.length === 0) return geometries;
  const rows = await db.getAllAsync<{ segment_id: number; lat: number; lon: number }>(
    `SELECT segment_id, lat, lon FROM point WHERE segment_id IN (${placeholders(segmentIds.length)})
     ORDER BY segment_id, seq`,
    segmentIds,
  );
  for (const r of rows) {
    const list = geometries.get(r.segment_id) ?? [];
    list.push({ lat: fromE6(r.lat), lon: fromE6(r.lon) });
    geometries.set(r.segment_id, list);
  }
  return geometries;
}

export async function getVisitedCounts(
  db: SQLiteDatabase,
  segmentIds: number[],
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (segmentIds.length === 0) return counts;
  const rows = await db.getAllAsync<{ segment_id: number; visited: number }>(
    `SELECT p.segment_id, COUNT(*) AS visited
     FROM visited_point v JOIN point p ON p.id = v.point_id
     WHERE p.segment_id IN (${placeholders(segmentIds.length)})
     GROUP BY p.segment_id`,
    segmentIds,
  );
  for (const r of rows) counts.set(r.segment_id, r.visited);
  return counts;
}

export type QuartierTotals = { totalPoints: number; totalLengthM: number };

export async function getQuartierTotals(db: SQLiteDatabase): Promise<Map<string, QuartierTotals>> {
  const rows = await db.getAllAsync<{ quartier: string; points: number; length: number }>(
    'SELECT quartier, SUM(point_count) AS points, SUM(length_m) AS length FROM segment GROUP BY quartier',
  );
  return new Map(rows.map((r) => [r.quartier, { totalPoints: r.points, totalLengthM: r.length }]));
}

export async function getQuartierVisited(db: SQLiteDatabase): Promise<Map<string, number>> {
  const rows = await db.getAllAsync<{ quartier: string; visited: number }>(
    `SELECT s.quartier, COUNT(*) AS visited
     FROM visited_point v
     JOIN point p ON p.id = v.point_id
     JOIN segment s ON s.id = p.segment_id
     GROUP BY s.quartier`,
  );
  return new Map(rows.map((r) => [r.quartier, r.visited]));
}

// Chaque position est validée immédiatement dans sa propre transaction : aucun tampon en
// mémoire, donc rien n'est perdu si l'app est tuée (FR-010).
// Retourne les points réellement nouveaux (déjà visités = ignorés).
export async function insertVisitedPoints(db: SQLiteDatabase, pointIds: number[]): Promise<number[]> {
  const inserted: number[] = [];
  if (pointIds.length === 0) return inserted;
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const id of pointIds) {
      const result = await txn.runAsync('INSERT OR IGNORE INTO visited_point (point_id) VALUES (?)', id);
      if (result.changes > 0) inserted.push(id);
    }
  });
  return inserted;
}

// Efface tout l'historique sans laisser d'anciennes pages dans la base ni dans le WAL (FR-013).
export async function resetHistory(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('DELETE FROM visited_point;');
  await db.execAsync('VACUUM;');
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}
