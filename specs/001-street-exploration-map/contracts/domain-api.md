# Contract: API du domaine (`src/domain/`)

Fonctions **pures** : aucun import de React, React Native, Expo ni SQLite (principe V). Toutes
couvertes par des tests unitaires dans `tests/unit/domain/`. Les fonctions appelées pendant les
gestes portent la directive `'worklet'` (simple chaîne, sans effet hors Reanimated).

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

## `polygon.ts` — partagé avec le script (imports de types seulement)

```ts
export type Polygon = { outer: LatLon[][]; inner: LatLon[][] };
export type NamedPolygon = { name: string; polygon: Polygon };
export function pointInRing(p: LatLon, ring: LatLon[]): boolean;   // lancer de rayon
export function pointInPolygon(p: LatLon, polygon: Polygon): boolean;
export function findContaining(p: LatLon, polygons: NamedPolygon[]): string | null;
```

## `camera.ts` (R16)

```ts
export type Point = { x: number; y: number };               // mètres, x vers l'est, y vers le sud
export type Camera = { x: number; y: number; scale: number }; // centre (m) + pixels par mètre
export type Viewport = { width: number; height: number };   // pixels
export type WorldBounds = { minX: number; minY: number; maxX: number; maxY: number };
export const MAX_SCALE = 4;
export function project(lat: number, lon: number): Point;
export function unproject(p: Point): LatLon;
export function worldToScreen(camera: Camera, p: Point, viewport: Viewport): Point;
export function screenToWorld(camera: Camera, p: Point, viewport: Viewport): Point;
export function minScale(bounds: WorldBounds, viewport: Viewport): number; // île entière visible
export function clampCamera(camera: Camera, bounds: WorldBounds, viewport: Viewport): Camera;
export function panBy(camera: Camera, dxPx: number, dyPx: number): Camera;
export function zoomAround(camera: Camera, factor: number, focalPx: Point, viewport: Viewport): Camera;
```

## `scaleBar.ts` (FR-020)

```ts
export function scaleBar(pxPerMeter: number, maxWidthPx?: number): { meters: number; widthPx: number };
// plus grande distance 1/2/5 × 10ⁿ m dont la largeur tient dans maxWidthPx (100 par défaut)
```

## `hitTest.ts` (R16)

```ts
export const TAP_TOLERANCE_PX = 20;
export const MAX_SEGMENT_TAP_M = 50;
export function isQuartierView(scale: number): boolean; // 20 px représentent plus de 50 m
export function nearestPoint<T extends { lat: number; lon: number }>(
  target: LatLon, candidates: T[], toleranceM: number): T | null;
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

## `quartiers.ts`

```ts
export type QuartierLevel = 0 | 1 | 2 | 3 | 4 | 5;
export function quartierPercent(visitedPoints: number, totalPoints: number): number; // floor au dixième
export function quartierLevel(visitedPoints: number, totalPoints: number): QuartierLevel;
// 0 si aucun point ; puis paliers < 1 %, < 5 %, < 15 %, < 40 %, ≥ 40 % (FR-017)
```

## `format.ts`

```ts
export function formatLength(meters: number): string;  // « 85 m », « 1,2 km » (format fr-CA)
export function formatPercent(percent: number): string; // « 0,7 % »
export function formatScale(meters: number): string;    // « 500 m », « 2 km »
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
| `visitedPointIds` | point à 24,9 m / 25,01 m | visité / non visité |
| `neighborhood` | point au coin d'une cellule | contient toutes les cellules à < 25 m |
| `formatLength` | 85 / 1234 | « 85 m » / « 1,2 km » |
| `quartierLevel` | 0 / 1000 ; 1 / 1000 ; 10 / 1000 ; 50 / 1000 ; 150 / 1000 ; 400 / 1000 | 0 ; 1 ; 2 ; 3 ; 4 ; 5 |
| `quartierPercent` | 7 / 1000 ; 1999 / 2000 | 0,7 ; 99,9 |
| `formatPercent` | 0,7 ; 12 | « 0,7 % » ; « 12,0 % » |
| `formatScale` | 500 ; 2000 ; 10000 | « 500 m » ; « 2 km » ; « 10 km » |
| `project` / `unproject` | aller-retour | identique à 1e-9° près ; 1° de latitude ≈ 111 195 m |
| `worldToScreen` / `screenToWorld` | aller-retour | identique |
| `clampCamera` | échelle trop petite / trop grande ; centre hors île | ramenée à `minScale` / `MAX_SCALE` ; centre ramené dans l'île |
| `zoomAround` | facteur 2 autour d'un point écran | le point du monde sous le doigt ne bouge pas |
| `scaleBar` | 1 px/m ; 0,03 px/m | 100 m / 100 px ; 2 000 m / 60 px |
| `isQuartierView` | 0,5 / 0,3 px/m | false / true |
| `nearestPoint` | points à 10 m et 30 m, tolérance 20 m | celui à 10 m ; `null` si aucun sous la tolérance |
| `simplify` (script) | ligne droite à points intermédiaires ; coude de 30 m | extrémités seules ; coude conservé |
