// Génère assets/streets.db à partir d'OpenStreetMap (Overpass) et des limites administratives
// de la Ville de Montréal. Exécuté une seule fois sur l'ordinateur : `npm run build:streets`.
// Contrat de sortie : specs/001-street-exploration-map/contracts/streets-db.md

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

import { distanceMeters, fromE6, toE6, type LatLon } from '../../src/domain/geo.ts';
import { cellOf, GRID } from '../../src/domain/grid.ts';
import { fr } from '../../src/strings/fr.ts';
import { assembleRings } from './lib/assembleRings.ts';
import { ACCEPTED_HIGHWAYS, displayName, isEligible, type Tags } from './lib/eligibility.ts';
import { findContaining, pointInPolygon, type NamedPolygon, type Polygon } from '../../src/domain/polygon.ts';
import { polylineLength, resample } from './lib/resample.ts';
import { buildSegments, type OsmWay } from './lib/segmentation.ts';
import { simplify } from './lib/simplify.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const INPUT_DIR = join(HERE, 'input');
const CACHE_DIR = join(HERE, 'cache');
const BOUNDARIES_FILE = join(INPUT_DIR, 'limites-administratives-agglomeration.geojson');
const OVERPASS_CACHE = join(CACHE_DIR, 'overpass.json');
const OUTPUT_DB = join(ROOT, 'assets', 'streets.db');
const OUTPUT_QUARTIERS = join(ROOT, 'assets', 'quartiers.json');

const BOUNDARIES_URL =
  'https://donnees.montreal.ca/dataset/9797a946-9da8-41ec-8815-f6b276dec7e9/resource/e18bfd07-edc8-4ce8-8a5a-3b617662a794/download/limites-administratives-agglomeration.geojson';
// Serveur Overpass : modifiable via la variable d'environnement OVERPASS_URL si le serveur
// principal est surchargé (erreur 504).
const OVERPASS_URL = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';
const ISLAND_NAME = 'Île de Montréal';
// Boîte englobante de l'île de Montréal (sud, ouest, nord, est), avec une petite marge.
const ISLAND_BBOX = '45.39,-74.00,45.72,-73.46';
const POINT_SPACING_M = 20;
const SCHEMA_VERSION = '1';

type OverpassGeometry = { lat: number; lon: number } | null;
type OverpassWay = {
  type: 'way';
  id: number;
  tags?: Tags;
  nodes: number[];
  geometry: OverpassGeometry[];
};
type OverpassMember = { type: string; role: string; geometry?: OverpassGeometry[] };
type OverpassRelation = { type: 'relation'; id: number; tags?: Tags; members: OverpassMember[] };
type OverpassResponse = {
  osm3s: { timestamp_osm_base: string };
  elements: (OverpassWay | OverpassRelation)[];
};

type GeoJsonPosition = [number, number];
type GeoJsonFeature = {
  properties: { NOM?: string };
  geometry:
    | { type: 'Polygon'; coordinates: GeoJsonPosition[][] }
    | { type: 'MultiPolygon'; coordinates: GeoJsonPosition[][][] };
};

function log(message: string): void {
  console.log(`[build-streets] ${message}`);
}

function fail(message: string): never {
  console.error(`[build-streets] ERREUR : ${message}`);
  process.exit(1);
}

// ---------- 1. Limites administratives (quartier) ----------

async function loadBoundaries(): Promise<NamedPolygon[]> {
  if (!existsSync(BOUNDARIES_FILE)) {
    log(`Téléchargement des limites administratives depuis donnees.montreal.ca…`);
    const response = await fetch(BOUNDARIES_URL);
    if (!response.ok) {
      fail(
        `téléchargement impossible (${response.status}). Téléchargez manuellement le GeoJSON WGS 84 ` +
          `« Limites administratives de l'agglomération de Montréal » depuis ${BOUNDARIES_URL} ` +
          `et placez-le dans ${BOUNDARIES_FILE}.`,
      );
    }
    mkdirSync(INPUT_DIR, { recursive: true });
    writeFileSync(BOUNDARIES_FILE, await response.text());
  }
  const geojson = JSON.parse(readFileSync(BOUNDARIES_FILE, 'utf8')) as { features: GeoJsonFeature[] };
  const toRing = (ring: GeoJsonPosition[]): LatLon[] => ring.map(([lon, lat]) => ({ lat, lon }));

  return geojson.features.map((feature) => {
    const name = feature.properties.NOM;
    if (!name) fail('une entité du GeoJSON des limites administratives n’a pas de propriété NOM.');
    const parts =
      feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const polygon: Polygon = {
      outer: parts.map((rings) => toRing(rings[0])),
      inner: parts.flatMap((rings) => rings.slice(1).map(toRing)),
    };
    return { name, polygon };
  });
}

// ---------- 2. OpenStreetMap via Overpass ----------

async function loadOverpass(): Promise<OverpassResponse> {
  if (existsSync(OVERPASS_CACHE)) {
    log(`Réponse Overpass lue depuis le cache (${OVERPASS_CACHE}).`);
    return JSON.parse(readFileSync(OVERPASS_CACHE, 'utf8')) as OverpassResponse;
  }
  const query = `
[out:json][timeout:600];
(
  way["highway"~"^(${ACCEPTED_HIGHWAYS.join('|')})$"](${ISLAND_BBOX});
  relation["place"="island"]["name"="${ISLAND_NAME}"];
);
out geom;`;
  log('Requête Overpass (peut prendre plusieurs minutes)…');
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'montreal-city-tracker build-streets (script local)',
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) fail(`Overpass a répondu ${response.status} : ${await response.text()}`);
  const text = await response.text();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(OVERPASS_CACHE, text);
  return JSON.parse(text) as OverpassResponse;
}

function islandPolygon(data: OverpassResponse): Polygon {
  const relations = data.elements.filter(
    (e): e is OverpassRelation => e.type === 'relation' && e.tags?.place === 'island',
  );
  if (relations.length !== 1) {
    fail(
      `${relations.length} relation(s) place=island nommée(s) « ${ISLAND_NAME} » trouvée(s) ; 1 attendue. ` +
        'Vérifiez le nom de la relation dans OpenStreetMap, puis supprimez le cache Overpass.',
    );
  }
  const linesFor = (role: string): LatLon[][] =>
    relations[0].members
      .filter((m) => m.type === 'way' && m.role === role && m.geometry)
      .map((m) => (m.geometry ?? []).filter((g): g is LatLon => g !== null));
  return { outer: assembleRings(linesFor('outer')), inner: assembleRings(linesFor('inner')) };
}

function eligibleWays(data: OverpassResponse): OsmWay[] {
  const ways: OsmWay[] = [];
  for (const element of data.elements) {
    if (element.type !== 'way' || !element.tags || !isEligible(element.tags)) continue;
    if (element.geometry.some((g) => g === null)) continue; // géométrie incomplète
    ways.push({
      id: element.id,
      name: displayName(element.tags),
      nodes: element.nodes,
      coords: element.geometry as LatLon[],
    });
  }
  return ways;
}

// ---------- 3. Tronçons, points, quartiers ----------

type OutSegment = {
  name: string;
  quartier: string;
  lengthM: number;
  points: { latE6: number; lonE6: number; cell: number }[];
  raw: LatLon[];
};

function midpoint(points: LatLon[]): LatLon {
  const n = points.length;
  if (n % 2 === 1) return points[(n - 1) / 2];
  const a = points[n / 2 - 1];
  const b = points[n / 2];
  return { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
}

function buildOutput(ways: OsmWay[], island: Polygon, boundaries: NamedPolygon[]) {
  const segments: OutSegment[] = [];
  let outsideIsland = 0;
  let unknownQuartier = 0;
  for (const segment of buildSegments(ways)) {
    const lengthM = polylineLength(segment.coords);
    if (lengthM <= 0) continue;
    const raw = resample(segment.coords, POINT_SPACING_M);
    const middle = midpoint(raw);
    if (!pointInPolygon(middle, island)) {
      outsideIsland++;
      continue;
    }
    let quartier = findContaining(middle, boundaries);
    if (quartier === null) {
      unknownQuartier++;
      quartier = fr.streetNames.unknownQuartier;
    }
    const points = raw.map((p) => {
      const latE6 = toE6(p.lat);
      const lonE6 = toE6(p.lon);
      // La cellule est calculée sur la coordonnée stockée, comme le ferait l'app.
      return { latE6, lonE6, cell: cellOf(fromE6(latE6), fromE6(lonE6)) };
    });
    segments.push({ name: segment.name, quartier, lengthM, points, raw });
  }
  return { segments, outsideIsland, unknownQuartier };
}

// ---------- 4. Invariants (data-model.md, « Intégrité du script ») ----------

function checkInvariants(segments: OutSegment[]): void {
  segments.forEach((segment, index) => {
    const where = `tronçon #${index + 1} (${segment.name})`;
    if (!(segment.lengthM > 0)) fail(`${where} : length_m doit être > 0.`);
    if (segment.points.length < 2) fail(`${where} : point_count doit être ≥ 2.`);
    for (let i = 1; i < segment.raw.length; i++) {
      const gap = distanceMeters(segment.raw[i - 1], segment.raw[i]);
      if (gap > POINT_SPACING_M + 1e-6) fail(`${where} : espacement de ${gap.toFixed(2)} m > 20 m.`);
    }
    for (const p of segment.points) {
      if (p.cell !== cellOf(fromE6(p.latE6), fromE6(p.lonE6))) fail(`${where} : cellule incorrecte.`);
    }
  });
}

// ---------- 5. Écriture de la base (contracts/streets-db.md) ----------

const SCHEMA = `
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE segment (
  id          INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  quartier    TEXT    NOT NULL,
  length_m    REAL    NOT NULL CHECK (length_m > 0),
  point_count INTEGER NOT NULL CHECK (point_count >= 2),
  min_lat     INTEGER NOT NULL,
  max_lat     INTEGER NOT NULL,
  min_lon     INTEGER NOT NULL,
  max_lon     INTEGER NOT NULL
);
CREATE TABLE point (
  id         INTEGER PRIMARY KEY,
  segment_id INTEGER NOT NULL REFERENCES segment(id),
  seq        INTEGER NOT NULL,
  lat        INTEGER NOT NULL,
  lon        INTEGER NOT NULL,
  cell       INTEGER NOT NULL
);`;

const INDEXES = `
CREATE INDEX segment_min_lat ON segment(min_lat);
CREATE INDEX point_cell    ON point(cell);
CREATE INDEX point_segment ON point(segment_id, seq);`;

function writeDatabase(segments: OutSegment[], osmTimestamp: string): void {
  rmSync(OUTPUT_DB, { force: true });
  const db = new DatabaseSync(OUTPUT_DB);
  db.exec(SCHEMA);

  const insertMeta = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
  const insertSegment = db.prepare(
    `INSERT INTO segment (id, name, quartier, length_m, point_count, min_lat, max_lat, min_lon, max_lon)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertPoint = db.prepare(
    'INSERT INTO point (id, segment_id, seq, lat, lon, cell) VALUES (?, ?, ?, ?, ?, ?)',
  );

  db.exec('BEGIN');
  insertMeta.run('schema_version', SCHEMA_VERSION);
  insertMeta.run('generated_at', new Date().toISOString());
  insertMeta.run('osm_timestamp', osmTimestamp);
  insertMeta.run('grid', JSON.stringify(GRID));
  insertMeta.run('point_spacing_m', String(POINT_SPACING_M));

  let pointId = 1;
  segments.forEach((segment, index) => {
    const segmentId = index + 1;
    const lats = segment.points.map((p) => p.latE6);
    const lons = segment.points.map((p) => p.lonE6);
    insertSegment.run(
      segmentId,
      segment.name,
      segment.quartier,
      Math.round(segment.lengthM * 10) / 10,
      segment.points.length,
      Math.min(...lats),
      Math.max(...lats),
      Math.min(...lons),
      Math.max(...lons),
    );
    segment.points.forEach((p, seq) => {
      insertPoint.run(pointId++, segmentId, seq, p.latE6, p.lonE6, p.cell);
    });
  });
  db.exec('COMMIT');
  db.exec(INDEXES);
  db.exec('VACUUM');
  db.close();
}

// ---------- 6. Zones de quartier pour la vue dézoomée (research.md R15) ----------

const QUARTIER_TOLERANCE_M = 15;

function writeQuartiers(boundaries: NamedPolygon[]): void {
  const round = (v: number) => Math.round(v * 1e5) / 1e5;
  const toPairs = (ring: LatLon[]) =>
    simplify(ring, QUARTIER_TOLERANCE_M).map((p) => [round(p.lat), round(p.lon)]);
  const quartiers = boundaries.map(({ name, polygon }) => ({
    name,
    outer: polygon.outer.map(toPairs),
    inner: polygon.inner.map(toPairs),
  }));
  writeFileSync(OUTPUT_QUARTIERS, JSON.stringify(quartiers));
}

// ---------- Orchestration ----------

async function main(): Promise<void> {
  const boundaries = await loadBoundaries();
  log(`${boundaries.length} arrondissements et villes liées chargés.`);

  const data = await loadOverpass();
  const island = islandPolygon(data);
  log(`Île de Montréal : ${island.outer.length} anneau(x) extérieur(s), ${island.inner.length} trou(s).`);

  const ways = eligibleWays(data);
  log(`${ways.length} voies OSM éligibles.`);

  const { segments, outsideIsland, unknownQuartier } = buildOutput(ways, island, boundaries);
  checkInvariants(segments);
  writeDatabase(segments, data.osm3s.timestamp_osm_base);
  writeQuartiers(boundaries);

  const pointCount = segments.reduce((sum, s) => sum + s.points.length, 0);
  const sizeMb = statSync(OUTPUT_DB).size / 1024 / 1024;
  log(`Tronçons écrits : ${segments.length} (hors de l'île ignorés : ${outsideIsland}).`);
  log(`Points écrits : ${pointCount}.`);
  log(`Tronçons sans quartier (« ${fr.streetNames.unknownQuartier} ») : ${unknownQuartier}.`);
  log(`Fichier : ${OUTPUT_DB} (${sizeMb.toFixed(1)} Mo).`);
  log(`Zones de quartier : ${OUTPUT_QUARTIERS} (${(statSync(OUTPUT_QUARTIERS).size / 1024).toFixed(0)} Ko).`);
  if (sizeMb > 50) log('ATTENTION : plus de 50 Mo, revoir l’éligibilité des voies (research.md R4).');
}

main().catch((error: unknown) => fail(error instanceof Error ? error.stack ?? error.message : String(error)));
