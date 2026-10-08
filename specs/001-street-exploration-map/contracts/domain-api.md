# Contract: API du domaine (`src/domain/`)

Fonctions **pures** : aucun import de React, React Native, Expo ni SQLite (principe V). Toutes
couvertes par des tests unitaires dans `tests/unit/domain/`. Les signatures ci-dessous sont le
contrat ; les noms de fichiers sont indicatifs.

## `geo.ts` — module feuille (aucun import), partagé avec le script

```ts
export type LatLon = { lat: number; lon: number };        // degrés décimaux
export function distanceMeters(a: LatLon, b: LatLon): number; // équirectangulaire
export function toE6(deg: number): number;                // arrondi entier
export function fromE6(e6: number): number;
```

## `grid.ts` — module feuille (aucun import), partagé avec le script

```ts
export const GRID: { lat0: number; lon0: number; dlat: number; dlon: number };
export function cellOf(lat: number, lon: number): number;     // row * 10000 + col
export function neighborhood(lat: number, lon: number): number[]; // 9 cellules (3×3)
```

## `visits.ts`

```ts
export const VISIT_RADIUS_M = 25;
export const MAX_ACCURACY_M = 25;
export type Fix = { lat: number; lon: number; accuracy: number | null };
export type CandidatePoint = { id: number; segmentId: number; lat: number; lon: number };

export function isUsableFix(fix: Fix): boolean;   // accuracy !== null && accuracy <= 25
export function visitedPointIds(fix: Fix, candidates: CandidatePoint[]): number[];
// [] si !isUsableFix(fix) ; sinon ids des candidats à distance < 25 m
```

## `progress.ts`

```ts
export const COMPLETION_RATIO = 0.9;
export type SegmentState = 'non_parcourue' | 'partielle' | 'completee';
export function segmentState(visitedCount: number, pointCount: number): SegmentState;
export function percentVisited(visitedCount: number, pointCount: number): number; // floor, 0..100
```

## `viewport.ts`

```ts
export const MAX_LATITUDE_DELTA = 0.015;
export const MAX_VISIBLE_SEGMENTS = 1500;
export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
export type Bounds = { north: number; south: number; east: number; west: number };
export function shouldShowStreets(region: Region): boolean;
export function queryBounds(region: Region): Bounds; // région élargie de 20 %
```

## `format.ts`

```ts
export function formatLength(meters: number): string; // « 85 m », « 1,2 km » (format fr-CA)
```

## Comportements attendus (cas de test minimaux)

| Fonction | Entrée | Sortie attendue |
|----------|--------|-----------------|
| `segmentState` | 0 / 10 | `non_parcourue` |
| `segmentState` | 1 / 10 | `partielle` |
| `segmentState` | 8 / 10 | `partielle` |
| `segmentState` | 9 / 10 | `completee` |
| `segmentState` | 2 / 2 | `completee` ; 1 / 2 → `partielle` |
| `percentVisited` | 199 / 200 | 99 |
| `isUsableFix` | accuracy 25 / 25,1 / null | true / false / false |
| `visitedPointIds` | point à 24,9 m / 25 m | visité / non visité |
| `neighborhood` | point au coin d'une cellule | contient toutes les cellules à < 25 m |
| `formatLength` | 85 / 1234 | « 85 m » / « 1,2 km » |
