# Implementation Plan: Carte d'exploration des rues de Montréal

**Branch**: `001-street-exploration-map` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-street-exploration-map/spec.md`

## Summary

Application mobile Expo (TypeScript strict, exécutable dans Expo Go sur iPhone) qui dessine
elle-même, avec Skia, toutes les rues de l'île de Montréal sur un fond uni, sans aucun fond de
carte ni service cartographique. Pendant que l'app est au premier plan, chaque position GPS
suffisamment précise (≤ 25 m) marque comme visités les points de rue situés à moins de 25 m ;
l'état de chaque tronçon (non parcourue / partielle / complétée à ≥ 90 %) se colore en direct et
persiste dans SQLite sur l'appareil.

Les données de rues sont produites **une fois** sur l'ordinateur par un script Node/TypeScript :
extraction OSM (Overpass), filtrage des voies éligibles, découpage en tronçons entre
intersections, rééchantillonnage en points tous les ~20 m, association au quartier, calcul de
cellules de grille ; le résultat est une base SQLite `assets/streets.db` et un fichier
`assets/quartiers.json` embarqués dans l'app. L'app charge toute la géométrie au démarrage,
dessine toutes les rues à tous les zooms (dézoom borné à l'île), teinte les quartiers au dézoom,
retrouve les points proches d'une position par un index de grille 3×3 et affiche une échelle en
bas à droite. Détails : [research.md](research.md) (R16 pour le rendu).

## Technical Context

**Language/Version**: TypeScript (mode `strict`) ; app sur Expo SDK 57 (Expo Go) ; script sur
Node.js 24 LTS (type stripping natif)

**Primary Dependencies**: `expo`, `expo-location`, `expo-sqlite` (+ `expo-asset`),
`@shopify/react-native-skia`, `react-native-gesture-handler`, `react-native-reanimated`
(+ `react-native-worklets`) ; dev : `jest`, `jest-expo`, `typescript`, `@types/node`. Script :
aucune dépendance (modules intégrés `node:sqlite`, `fetch`).

**Storage**: SQLite local (`streets.db` embarquée comme asset, copiée au premier lancement ; table
`visited_point` créée par l'app)

**Testing**: Jest (`jest-expo`) pour `src/domain/` et les fonctions pures du script ;
`tsc --noEmit` ; validation manuelle sur iPhone ([quickstart.md](quickstart.md))

**Target Platform**: iOS via Expo Go (iPhone) ; Android non visé en v1 mais non bloqué

**Project Type**: mobile-app + script de préparation de données hors ligne

**Performance Goals**: changement d'état visible ≤ 5 s après le passage (SC-002) ; progression
affichée < 3 s à la réouverture (SC-003) ; gestes fluides avec l'île entière à l'écran (SC-008)

**Constraints**: aucune requête réseau à l'exécution (FR-001a, SC-005) ; premier plan uniquement
(FR-014) ; ≤ 10 % de batterie/h (SC-006) ; aucun code natif (Expo Go)

**Scale/Scope**: un seul écran ; 53 757 tronçons et 377 200 points ; base embarquée 23 Mo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|----------|--------------|--------|
| I. Vie privée d'abord | Aucun compte, serveur, télémétrie. Positions GPS jamais persistées ; seul `visited_point(point_id)` est stocké. Plus aucun service cartographique : la carte est dessinée par l'app (R16), ce qui règle l'échec du spike MapKit (R1). Le script contacte Overpass sur l'ordinateur du développeur, sans aucune donnée utilisateur. | PASS (à confirmer par V7) |
| II. Simplicité | Dépendances d'exécution : `expo-location`, `expo-sqlite`, et trois bibliothèques de rendu et de gestes, nécessaires pour afficher toutes les rues à tout zoom sans service externe (R16) ; `react-native-maps` retirée. Aucune pour le script. Un seul écran, pas de routeur, pas de gestionnaire d'état, une seule base. | PASS |
| III. Expo Go | Skia, Gesture Handler, Reanimated/Worklets, `expo-location`, `expo-sqlite`, `expo-asset` sont inclus dans Expo Go SDK 57 ; aucun build de développement. | PASS |
| IV. Batterie | `Accuracy.High` (≈ 10 m), minimum utile pour un rayon de 25 m ; `distanceInterval: 10` ; abonnement coupé hors premier plan. Le dessin n'est recalculé que lors d'un geste ou d'un changement d'état. | PASS (à mesurer par V10) |
| V. TS strict + domaine testé | `strict: true` ; `src/domain/` pur (contrat [domain-api.md](contracts/domain-api.md)), y compris la caméra, l'échelle et le toucher ; directive `'worklet'` = simple chaîne, sans import. | PASS |
| VI. Français, textes centralisés | Tous les textes dans `src/strings/fr.ts`. Limite : le texte système iOS de la demande de permission est celui d'Expo Go ; une explication en français est affichée dans l'app avant la demande. | PASS |

**Re-check post-conception** : inchangé.

## Project Structure

### Documentation (this feature)

```text
specs/001-street-exploration-map/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── streets-db.md     # schéma de la base produite par le script
│   └── domain-api.md     # signatures des fonctions pures du domaine
└── tasks.md              # (/speckit-tasks)
```

### Source Code (repository root)

```text
App.tsx                         # point d'entrée : gestes + SQLiteProvider + MapScreen
app.json
metro.config.js                 # assetExts += 'db'
tsconfig.json                   # strict, allowImportingTsExtensions
package.json                    # scripts : start, test, typecheck, build:streets

assets/
├── streets.db                  # généré par le script (ODbL)
└── quartiers.json              # zones simplifiées des quartiers (R15)

src/
├── domain/                     # pur, sans React/Expo/SQLite
│   ├── geo.ts                  # feuille, partagé avec le script
│   ├── grid.ts                 # feuille, partagé avec le script
│   ├── polygon.ts              # point-dans-polygone, partagé avec le script
│   ├── camera.ts               # projection, zoom, bornes de l'île (R16)
│   ├── scaleBar.ts             # longueur « ronde » de l'échelle (FR-020)
│   ├── hitTest.ts              # tronçon ou quartier touché (R16)
│   ├── visits.ts
│   ├── progress.ts
│   ├── quartiers.ts            # paliers et pourcentage par quartier (R15)
│   └── format.ts
├── data/
│   └── streetsRepository.ts    # requêtes SQL du contrat streets-db.md
├── location/
│   └── useForegroundLocation.ts  # permission, watch, arrêt hors premier plan
├── ui/
│   ├── MapScreen.tsx
│   ├── map/                    # rendu Skia et gestes (R16)
│   │   ├── StreetsCanvas.tsx
│   │   ├── streetPaths.ts      # construction des chemins Skia
│   │   ├── ScaleBar.tsx
│   │   └── stateColors.ts
│   ├── SegmentInfoCard.tsx
│   ├── QuartierInfoCard.tsx
│   ├── ResetHistoryButton.tsx
│   └── PermissionNotice.tsx
└── strings/
    └── fr.ts

scripts/build-streets/
├── build-streets.ts            # orchestration : Overpass → filtres → tronçons → points → db
├── lib/                        # fonctions pures testées
│   ├── eligibility.ts          # R4
│   ├── segmentation.ts         # R6
│   ├── resample.ts             # R7
│   ├── simplify.ts             # R15 : Douglas-Peucker
│   └── assembleRings.ts        # R5 : polygone de l'île à partir des membres OSM
├── input/                      # GeoJSON des limites administratives
└── cache/                      # réponse Overpass (ignoré par git)

tests/unit/
├── domain/                     # geo, grid, polygon, camera, scaleBar, hitTest, visits, progress, quartiers, format
└── scripts/                    # eligibility, segmentation, resample, simplify, assembleRings
```

**Structure Decision**: projet unique Expo à la racine, sans routeur (un seul écran). Le domaine
pur (`src/domain/`) est séparé de l'interface (`src/ui/`), de l'accès aux données (`src/data/`)
et de la localisation (`src/location/`). Le script de données vit à part dans `scripts/` et ne
fait pas partie du bundle de l'app ; il réutilise `geo.ts`, `grid.ts` et `polygon.ts`.

## Complexity Tracking

| Écart | Pourquoi | Alternative plus simple écartée parce que |
|-------|----------|-------------------------------------------|
| Rendu de carte maison (Skia + gestes) au lieu d'une bibliothèque de carte (principe II) | MapKit affiche ses propres noms et charge ses données (échec du spike R1) et ne peut pas dessiner 53 k tronçons ; demandes FR-001, FR-001a, FR-019, FR-020. | react-native-maps : noms non masquables, polylignes natives trop nombreuses ; MapLibre : code natif hors Expo Go (principe III). |

## Décisions du propriétaire (2026-10-08)

- **Périmètre (R5)** : île de Montréal seule, autres îles exclues ; FR-003 est inchangée.
- **Éligibilité (R4)** : sentiers nommés uniquement ; `trunk` est exclu comme une autoroute.
- **Carte** : 2D sans fond Apple (pas de 3D) ; rendu maison Skia après l'échec du spike MapKit ;
  quartiers en teinte légère sous les rues au dézoom.
