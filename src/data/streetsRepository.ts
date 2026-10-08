// Requêtes SQL du contrat specs/001-street-exploration-map/contracts/streets-db.md.
// Aucune logique métier ici : seulement de l'accès aux données.
import type { SQLiteDatabase } from 'expo-sqlite';
import { fromE6 } from '../domain/geo';
import type { CandidatePoint } from '../domain/visits';

export const SCHEMA_VERSION = '1';

export type SegmentRow = {
  id: number;
  name: string;
  quartier: string;
  lengthM: number;
  pointCount: number;
};

// Toute la géométrie des rues, en tableaux typés (research.md R16) : les points du tronçon `id`
// occupent les indices offsets[id] à offsets[id + 1] - 1 de lat et lon.
export type Geometry = {
  segmentCount: number;
  offsets: Int32Array;
  lat: Float64Array;
  lon: Float64Array;
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

export async function loadGeometry(db: SQLiteDatabase): Promise<Geometry> {
  const counts = await db.getFirstAsync<{ segments: number; points: number }>(
    'SELECT (SELECT MAX(id) FROM segment) AS segments, (SELECT COUNT(*) FROM point) AS points',
  );
  const segmentCount = counts?.segments ?? 0;
  const pointCount = counts?.points ?? 0;
  const offsets = new Int32Array(segmentCount + 2);
  const lat = new Float64Array(pointCount);
  const lon = new Float64Array(pointCount);

  // Résultat « brut » (tableaux de valeurs) : bien plus léger que des objets pour ~377 k lignes.
  const statement = await db.prepareAsync('SELECT segment_id, lat, lon FROM point ORDER BY segment_id, seq');
  try {
    const result = await statement.executeForRawResultAsync<{ segment_id: number; lat: number; lon: number }>();
    const rows = await result.getAllAsync();
    let previous = 0;
    rows.forEach(([segmentId, latE6, lonE6], i) => {
      while (previous < segmentId) offsets[++previous] = i;
      lat[i] = fromE6(latE6);
      lon[i] = fromE6(lonE6);
    });
    while (previous <= segmentCount) offsets[++previous] = rows.length;
  } finally {
    await statement.finalizeAsync();
  }
  return { segmentCount, offsets, lat, lon };
}

export async function getSegment(db: SQLiteDatabase, id: number): Promise<SegmentRow | null> {
  const row = await db.getFirstAsync<{
    id: number;
    name: string;
    quartier: string;
    length_m: number;
    point_count: number;
  }>('SELECT id, name, quartier, length_m, point_count FROM segment WHERE id = ?', id);
  if (!row) return null;
  return { id: row.id, name: row.name, quartier: row.quartier, lengthM: row.length_m, pointCount: row.point_count };
}

export async function getCandidatePoints(db: SQLiteDatabase, cells: number[]): Promise<CandidatePoint[]> {
  const rows = await db.getAllAsync<{ id: number; segment_id: number; lat: number; lon: number }>(
    `SELECT id, segment_id, lat, lon FROM point WHERE cell IN (${placeholders(cells.length)})`,
    cells,
  );
  return rows.map((r) => ({ id: r.id, segmentId: r.segment_id, lat: fromE6(r.lat), lon: fromE6(r.lon) }));
}

export async function getAllVisitedCounts(db: SQLiteDatabase): Promise<Map<number, number>> {
  const rows = await db.getAllAsync<{ segment_id: number; visited: number }>(
    `SELECT p.segment_id, COUNT(*) AS visited
     FROM visited_point v JOIN point p ON p.id = v.point_id
     GROUP BY p.segment_id`,
  );
  return new Map(rows.map((r) => [r.segment_id, r.visited]));
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
