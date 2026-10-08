# Implementation Plan: Carte d'exploration des rues de Montréal

**Branch**: `001-street-exploration-map` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-street-exploration-map/spec.md`

## Summary

Application mobile Expo (TypeScript strict, exécutable dans Expo Go sur iPhone) affichant les
tronçons de rues de Montréal sur un fond uni, sans fond de carte téléchargé. Pendant que l'app
est au premier plan, chaque position GPS suffisamment précise (≤ 25 m) marque comme visités les
points de rue situés à moins de 25 m ; l'état de chaque tronçon (non parcourue / partielle /
complétée à ≥ 90 %) se colore en direct et persiste dans SQLite sur l'appareil.

Les données de rues sont produites **une fois** sur l'ordinateur par un script Node/TypeScript :
extraction OSM (Overpass), filtrage des voies éligibles, découpage en tronçons entre
intersections, rééchantillonnage en points tous les ~20 m, association au quartier, calcul de
cellules de grille ; le résultat est une base SQLite `assets/streets.db` embarquée dans l'app.
L'app retrouve les points proches par un index de grille 3×3 et n'affiche que les tronçons de la
zone visible (zoom limité, plafond de 1 500 tronçons) ; au-delà, les arrondissements et villes
liées sont colorés selon la progression (R15). Détails : [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript (mode `strict`) ; app sur le SDK Expo courant supporté par Expo
Go ; script sur Node.js 24 LTS (type stripping natif)

**Primary Dependencies**: `expo`, `react-native-maps`, `expo-location`, `expo-sqlite`
(+ `expo-asset`, déjà inclus dans `expo`) ; dev : `jest`, `jest-expo`, `typescript`. Script :
aucune dépendance (modules intégrés `node:sqlite`, `fetch`).

**Storage**: SQLite local (`streets.db` embarquée comme asset, copiée au premier lancement ; table
`visited_point` créée par l'app)

**Testing**: Jest (`jest-expo`) pour `src/domain/` et les fonctions pures du script ;
`tsc --noEmit` ; validation manuelle sur iPhone ([quickstart.md](quickstart.md))

**Target Platform**: iOS via Expo Go (iPhone) ; Android non visé en v1 mais non bloqué

**Project Type**: mobile-app + script de préparation de données hors ligne

**Performance Goals**: changement d'état visible ≤ 5 s après le passage (SC-002) ; progression
affichée < 3 s à la réouverture (SC-003) ; mise à jour des rues visibles < 500 ms après un
déplacement de carte

**Constraints**: aucune requête réseau à l'exécution (FR-001a, SC-005) ; premier plan uniquement
(FR-014) ; ≤ 10 % de batterie/h (SC-006) ; aucun code natif (Expo Go)

**Scale/Scope**: un seul écran ; ~10⁵ tronçons et ~5·10⁵ points (à confirmer par le script) ;
base embarquée 15–30 Mo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Vérification | Statut |
|----------|--------------|--------|
| I. Vie privée d'abord | Aucun compte, serveur, télémétrie. Positions GPS jamais persistées ; seul `visited_point(point_id)` est stocké. Fond Apple remplacé par une tuile locale. Le script contacte Overpass sur l'ordinateur du développeur, sans aucune donnée utilisateur. | ⚠️ PASS sous condition : le spike R1 doit montrer 0 requête MapKit (quickstart V7) |
| II. Simplicité | 3 dépendances d'exécution, toutes demandées et nécessaires ; aucune pour le script ; un seul écran, pas de routeur, pas de gestionnaire d'état ; une seule base. Colonne `quartier` non requise par la spec → voir Complexity Tracking. | PASS (1 écart justifié) |
| III. Expo Go | `react-native-maps`, `expo-location`, `expo-sqlite`, `expo-asset` sont inclus dans Expo Go ; l'asset `.db` ne demande qu'un ajout dans `metro.config.js`. Aucun build de développement. | PASS |
| IV. Batterie | `Accuracy.High` (≈ 10 m), minimum utile pour un rayon de 25 m (`Balanced` ≈ 100 m) ; `distanceInterval: 10` ; abonnement coupé hors premier plan ; une seule source GPS (`showsUserLocation=false`). Réglages justifiés en R11. | PASS |
| V. TS strict + domaine testé | `strict: true` ; `src/domain/` pur (contrat [domain-api.md](contracts/domain-api.md)) ; tests unitaires obligatoires ; fonctions pures du script testées aussi. | PASS |
| VI. Français, textes centralisés | Tous les textes dans `src/strings/fr.ts` (y compris l'attribution et l'explication de permission). Limite : le texte système iOS de la demande de permission est celui d'Expo Go, non modifiable sans build ; on affiche donc une explication en français dans l'app avant la demande. | PASS |

**Re-check post-conception (Phase 1)** : inchangé. Aucun nouvel écart introduit par le modèle de
données ni les contrats. Le statut du principe I reste conditionné au spike R1.

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
App.tsx                         # point d'entrée : SQLiteProvider + MapScreen
app.json
metro.config.js                 # assetExts += 'db'
tsconfig.json                   # strict, allowImportingTsExtensions
package.json                    # scripts : start, test, typecheck, build:streets

assets/
├── streets.db                  # généré par le script (ODbL)
├── blank-tile.png              # tuile unie remplaçant le fond Apple
└── quartiers.json              # zones simplifiées pour la vue par quartier (R15)

src/
├── domain/                     # pur, sans React/Expo/SQLite
│   ├── geo.ts                  # feuille, partagé avec le script
│   ├── grid.ts                 # feuille, partagé avec le script
│   ├── visits.ts
│   ├── progress.ts
│   ├── viewport.ts
│   ├── format.ts
│   └── quartiers.ts            # paliers et pourcentage par quartier (R15)
├── data/
│   └── streetsRepository.ts    # requêtes SQL du contrat streets-db.md
├── location/
│   └── useForegroundLocation.ts  # permission, watch, arrêt hors premier plan
├── ui/
│   ├── MapScreen.tsx
│   ├── map/                    # tout ce qui dépend de react-native-maps (isolé, cf. R1)
│   │   ├── StreetsMap.tsx
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
│   ├── assembleRings.ts        # R5 : polygone de l'île à partir des membres OSM
│   └── pointInPolygon.ts       # R5
├── input/                      # GeoJSON des limites administratives (téléchargé à la main)
└── cache/                      # réponse Overpass (ignoré par git)

tests/unit/
├── domain/                     # geo, grid, visits, progress, viewport, format
└── scripts/                    # eligibility, segmentation, resample, assembleRings, pointInPolygon
```

**Structure Decision**: projet unique Expo à la racine, sans routeur (un seul écran). Le domaine
pur (`src/domain/`) est séparé de l'interface (`src/ui/`), de l'accès aux données (`src/data/`)
et de la localisation (`src/location/`). Le script de données vit à part dans `scripts/` et ne
fait pas partie du bundle de l'app ; il réutilise `geo.ts` et `grid.ts` pour garantir une grille
identique.

## Complexity Tracking

| Écart | Pourquoi | Alternative plus simple écartée parce que |
|-------|----------|-------------------------------------------|
| Colonne `segment.quartier`, non requise par la spec (principe II) | Demandée explicitement par le propriétaire ; coût quasi nul : le fichier des limites administratives est déjà nécessaire pour le périmètre (R5). Non affichée en v1. | Ne pas la stocker obligerait à régénérer `streets.db` le jour où elle sera utilisée ; le gain de simplicité serait négligeable. |

## Décisions du propriétaire (2026-10-08)

- **Périmètre (R5)** : île de Montréal seule, autres îles exclues ; FR-003 est inchangée.
- **Éligibilité (R4)** : sentiers nommés uniquement ; `trunk` est exclu comme une autoroute.

## Point ouvert

- **Spike MapKit (R1)** : il conditionne le principe I. S'il échoue, il faudra choisir entre
  amender FR-001a/SC-005 et remplacer react-native-maps par un rendu maison.
