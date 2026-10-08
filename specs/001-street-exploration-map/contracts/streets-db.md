# Contract: `assets/streets.db` (script → application)

Interface entre le script `scripts/build-streets/` (producteur) et l'application
(consommatrice). Toute modification incompatible incrémente `meta.schema_version`.

## Schéma

```sql
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- clés obligatoires :
--   schema_version  '1'
--   generated_at    date ISO 8601 de génération
--   osm_timestamp   horodatage des données OSM (champ osm3s.timestamp_osm_base d'Overpass)
--   grid            JSON {"lat0":45.38,"lon0":-74.0,"dlat":0.0005,"dlon":0.0007}
--   point_spacing_m '20'

CREATE TABLE segment (
  id          INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  quartier    TEXT    NOT NULL,
  length_m    REAL    NOT NULL CHECK (length_m > 0),
  point_count INTEGER NOT NULL CHECK (point_count >= 2),
  min_lat     INTEGER NOT NULL,  -- microdegrés
  max_lat     INTEGER NOT NULL,
  min_lon     INTEGER NOT NULL,
  max_lon     INTEGER NOT NULL
);
CREATE INDEX segment_min_lat ON segment(min_lat);

CREATE TABLE point (
  id         INTEGER PRIMARY KEY,
  segment_id INTEGER NOT NULL REFERENCES segment(id),
  seq        INTEGER NOT NULL,
  lat        INTEGER NOT NULL,   -- microdegrés
  lon        INTEGER NOT NULL,
  cell       INTEGER NOT NULL
);
CREATE INDEX point_cell    ON point(cell);
CREATE INDEX point_segment ON point(segment_id, seq);
```

## Table créée par l'application (hors contrat du script)

```sql
CREATE TABLE IF NOT EXISTS visited_point (
  point_id INTEGER PRIMARY KEY REFERENCES point(id)
);
```

## Garanties du producteur

1. Seules les voies éligibles (research.md R4) dans le périmètre (R5) sont présentes.
2. `meta.grid` est identique aux constantes de `src/domain/grid.ts` (même module importé).
3. Les invariants de data-model.md (« Intégrité du script ») sont vérifiés à la fin du script ;
   le script échoue (code ≠ 0) si l'un d'eux est violé.
4. La base est compactée (`VACUUM`) et ne contient aucune table `visited_point`.

## Requêtes de l'application (référence)

| Usage | Requête |
|-------|---------|
| Points candidats (R8) | `SELECT id, segment_id, lat, lon FROM point WHERE cell IN (?,…9)` |
| Tronçons visibles (R10) | `SELECT … FROM segment WHERE min_lat <= :north AND max_lat >= :south AND min_lon <= :east AND max_lon >= :west ORDER BY <distance² du centre de la boîte au centre de la région> LIMIT 1500` (tri avant la limite) |
| Géométrie | `SELECT segment_id, lat, lon FROM point WHERE segment_id IN (…) ORDER BY segment_id, seq` |
| Progression | `SELECT p.segment_id, COUNT(*) FROM visited_point v JOIN point p ON p.id = v.point_id WHERE p.segment_id IN (…) GROUP BY p.segment_id` |
| Visite | `INSERT OR IGNORE INTO visited_point(point_id) VALUES (?)` |
| Effacement | `DELETE FROM visited_point; VACUUM;` |
