---

description: "Task list for feature 001-street-exploration-map"
---

# Tasks: Carte d'exploration des rues de Montréal

**Input**: Design documents from `/specs/001-street-exploration-map/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/streets-db.md,
contracts/domain-api.md, quickstart.md

**Tests**: tests unitaires **obligatoires** pour la logique métier (constitution, principe V) :
`src/domain/` et `scripts/build-streets/lib/`. Pas de tests d'interface ni E2E ; l'interface est
validée manuellement sur iPhone via quickstart.md (V1–V10).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projet Expo unique à la racine du dépôt : `App.tsx`, `src/`, `assets/`, `scripts/build-streets/`,
`tests/unit/` (voir plan.md, Project Structure). Tous les textes visibles par l'utilisateur
passent par `src/strings/fr.ts` (principe VI) : aucune chaîne affichée codée en dur.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialisation du projet Expo TypeScript à la racine

- [X] T001 Initialiser un projet Expo TypeScript à la racine du dépôt : générer le gabarit `blank-typescript` avec `npx create-expo-app@latest` dans un dossier temporaire, puis déplacer `App.tsx`, `app.json`, `package.json`, `tsconfig.json`, `babel.config.js` (s'il existe), `.gitignore` et `assets/` à la racine, sans toucher à `.claude/`, `.specify/` et `specs/` ; vérifier que `npx expo start` démarre
- [X] T002 Installer les dépendances d'exécution avec `npx expo install react-native-maps expo-location expo-sqlite expo-asset` et les dépendances de dev avec `npx expo install jest jest-expo @types/jest -- --save-dev` dans package.json (aucune autre dépendance : principe II)
- [X] T003 Configurer tsconfig.json : `extends: "expo/tsconfig.base"`, `compilerOptions.strict: true`, `allowImportingTsExtensions: true`, `noEmit: true`, `include` couvrant `App.tsx`, `src`, `scripts`, `tests`
- [X] T004 Ajouter dans package.json les scripts `"typecheck": "tsc --noEmit"`, `"test": "jest"`, `"build:streets": "node scripts/build-streets/build-streets.ts"`, le champ `"engines": { "node": ">=24" }` et la config Jest `"jest": { "preset": "jest-expo", "testMatch": ["<rootDir>/tests/unit/**/*.test.ts"] }`
- [X] T005 [P] Créer metro.config.js à partir de `getDefaultConfig` d'`expo/metro-config` et ajouter `'db'` à `config.resolver.assetExts`
- [X] T006 [P] Ajouter `scripts/build-streets/cache/` à .gitignore
- [X] T007 [P] Configurer app.json : `name` « Montréal à pied », `ios.infoPlist.NSLocationWhenInUseUsageDescription` en français (pour un futur build ; Expo Go utilise son propre texte), aucun plugin de localisation en arrière-plan
- [X] T008 [P] Créer src/strings/fr.ts exportant un objet `fr` typé `as const` avec toutes les clés de textes de la v1 : explication et refus de permission (FR-015), « Zoomez pour voir les rues », libellés d'état « Non parcourue » / « Partiellement parcourue » / « Complétée », « Ruelle », « Inconnu », libellés de la fiche (FR-008a), bouton et confirmation d'effacement (titre, message, « Annuler », « Effacer »), chargement, attribution « © contributeurs OpenStreetMap · Ville de Montréal (CC BY 4.0) »

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: spike MapKit, modules partagés, données de rues et base locale, nécessaires à toutes les stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Spike R1 (GATE vie privée)

- [X] T009 Créer assets/blank-tile.png : PNG uni 256×256 de la couleur de fond de la carte (couleur neutre claire, ex. `#F2F0EA`), généré une fois (ex. par un petit script Node avec `node:zlib`, non conservé)
- [X] T010 Créer src/ui/map/StreetsMap.tsx minimal : `MapView` centré sur 45.5017, -73.5673, `showsPointsOfInterests={false}`, `showsBuildings={false}`, `showsTraffic={false}`, `showsUserLocation={false}`, contenant un `UrlTile` avec `shouldReplaceMapContent={true}` et `urlTemplate` = `localUri` de `Asset.fromModule(require('../../../assets/blank-tile.png'))` après `downloadAsync()` (aucun placeholder `{z}/{x}/{y}`) ; l'afficher depuis App.tsx
- [ ] T011 Exécuter le scénario V7 de specs/001-street-exploration-map/quickstart.md sur iPhone (proxy ou rapport de confidentialité iOS, 5 min de déplacements/zooms) et consigner le résultat dans la section R1 de specs/001-street-exploration-map/research.md. **Si une requête MapKit est observée : STOP, arbitrage du propriétaire (amender FR-001a/SC-005 ou rendu maison) avant de continuer**

### Modules de domaine partagés avec le script (feuilles, aucun import)

- [X] T012 [P] Écrire tests/unit/domain/geo.test.ts : `distanceMeters` (0 pour deux points identiques ; ≈ 111 195 m pour 1° de latitude ; écart < 0,5 % vs haversine à 25 m près de 45,5° N), `toE6`/`fromE6` aller-retour à 1e-6 près
- [X] T013 [P] Écrire tests/unit/domain/grid.test.ts : `cellOf` = `row * 10000 + col` avec `row = floor((lat - 45.38) / 0.0005)` et `col = floor((lon - -74.0) / 0.0007)` ; `neighborhood` renvoie 9 cellules distinctes ; pour des positions aux coins et bords d'une cellule, toute cellule contenant un point à < 25 m est incluse
- [X] T014 [P] Implémenter src/domain/geo.ts selon contracts/domain-api.md (`LatLon`, `distanceMeters` équirectangulaire, `toE6`, `fromE6`), sans aucun import
- [X] T015 [P] Implémenter src/domain/grid.ts selon contracts/domain-api.md (`GRID = { lat0: 45.38, lon0: -74.0, dlat: 0.0005, dlon: 0.0007 }`, `cellOf`, `neighborhood`), sans aucun import

### Script de génération des données (fonctions pures testées)

- [X] T016 [P] Écrire tests/unit/scripts/eligibility.test.ts couvrant research.md R4 : acceptés = `highway` ∈ {primary, primary_link, secondary, secondary_link, tertiary, tertiary_link, unclassified, residential, living_street, pedestrian, footway, path, cycleway, steps, track, service} **avec** `name`, ou `highway=service` + `service=alley` sans nom ; refusés = motorway, motorway_link, trunk, trunk_link, construction, proposed, raceway, bus_guideway ; `tunnel` ≠ `no` ; `access` ∈ {private, no} ; `service` ∈ {driveway, parking_aisle, drive-through} ; `footway` ∈ {sidewalk, crossing} ; `area=yes` ; `highway=service` sans `service=alley` ; voie non-ruelle sans `name`
- [X] T017 [P] Écrire tests/unit/scripts/segmentation.test.ts (R6) : coupure aux nœuds partagés par ≥ 2 voies retenues, aux extrémités et aux changements de nom ; chaînage de deux voies OSM de même nom reliées par un nœud de degré 2 en un seul tronçon ; boucle fermée ; voie traversant une intersection coupée en deux tronçons
- [X] T018 [P] Écrire tests/unit/scripts/resample.test.ts (R7) : `n = max(2, ceil(L / 20) + 1)` points, extrémités incluses, espacement égal ≤ 20 m le long de la polyligne ; tronçon de 5 m → 2 points ; tronçon de 100 m → 6 points ; polyligne coudée respectée
- [X] T019 [P] Écrire tests/unit/scripts/assembleRings.test.ts (R5) : assemblage d'anneaux fermés à partir de membres `outer` non ordonnés et parfois inversés ; erreur explicite si un anneau ne peut pas être fermé
- [X] T020 [P] Écrire tests/unit/scripts/pointInPolygon.test.ts (R5) : point intérieur / extérieur / dans un trou (`inner`) d'un multipolygone ; recherche du nom du polygone administratif contenant un point, `null` si aucun
- [X] T021 [P] Implémenter scripts/build-streets/lib/eligibility.ts (`isEligible(tags): boolean` et `displayName(tags): string`, « Ruelle » pour une ruelle sans nom)
- [X] T022 [P] Implémenter scripts/build-streets/lib/segmentation.ts (`buildSegments(ways): { name, coords: LatLon[] }[]`)
- [X] T023 [P] Implémenter scripts/build-streets/lib/resample.ts (`resample(coords, spacingM = 20): LatLon[]`) en important `../../../src/domain/geo.ts` (avec l'extension `.ts`)
- [X] T024 [P] Implémenter scripts/build-streets/lib/assembleRings.ts
- [X] T025 [P] Implémenter scripts/build-streets/lib/pointInPolygon.ts (lancer de rayon, multipolygones avec trous)
- [X] T026 Implémenter scripts/build-streets/build-streets.ts : (1) lire le GeoJSON des limites administratives dans scripts/build-streets/input/ (erreur explicite en français si absent, avec l'URL du jeu donnees.montreal.ca à télécharger) ; (2) requête Overpass unique (`[out:json]`, voies `highway` dans la bbox de l'île + relation `place=island` / `name="Île de Montréal"`, `out geom`) via `fetch`, mise en cache dans scripts/build-streets/cache/overpass.json ; (3) filtrer (T021), découper (T022), garder les tronçons dont le point milieu est dans l'île (T024, T025), rééchantillonner (T023), associer `quartier` (« Inconnu » si aucun polygone, compté dans les statistiques) ; (4) écrire assets/streets.db avec `node:sqlite` selon le schéma exact de specs/001-street-exploration-map/contracts/streets-db.md (coordonnées en microdegrés via `toE6`, `cell` via `cellOf` de `src/domain/grid.ts`, table `meta` avec `schema_version='1'`, `generated_at`, `osm_timestamp`, `grid` = JSON de `GRID`, `point_spacing_m='20'`) ; (5) vérifier les invariants de data-model.md (« Intégrité du script » : `point_count >= 2`, `seq` 0..n-1, espacement ≤ 20 m, points dans la boîte englobante, `cell = cellOf(lat, lon)`, `length_m > 0`) et quitter avec un code ≠ 0 si l'un échoue ; (6) `VACUUM` ; (7) afficher le nombre de tronçons, de points, de quartiers « Inconnu » et la taille du fichier
- [X] T027 Télécharger manuellement le GeoJSON « Limites administratives de l'agglomération de Montréal » dans scripts/build-streets/input/, exécuter `npm run build:streets` et vérifier : code 0, assets/streets.db produit, ordre de grandeur ~10⁵ tronçons et 15–30 Mo (si > 50 Mo : revoir R4 avant de continuer)

### Base locale dans l'app

- [X] T028 Dans App.tsx, envelopper l'app dans `SQLiteProvider` (`databaseName="streets.db"`, `assetSource={{ assetId: require('./assets/streets.db'), forceOverwrite: false }}`) avec un `onInit` qui exécute `PRAGMA journal_mode = WAL;` puis `CREATE TABLE IF NOT EXISTS visited_point (point_id INTEGER PRIMARY KEY REFERENCES point(id));` et vérifie que `meta.schema_version = '1'`
- [X] T029 Créer src/data/streetsRepository.ts : fonctions prenant un `SQLiteDatabase` en paramètre, types de lignes (`SegmentRow`, `PointRow`) conformes à contracts/streets-db.md, conversion des microdegrés via `fromE6` ; aucune logique métier (seulement des requêtes)

**Checkpoint**: MapKit validé sans requête réseau, `streets.db` généré et ouvert par l'app, domaine partagé testé → les stories peuvent commencer

---

## Phase 3: User Story 1 - Voir les rues se colorer en marchant (Priority: P1) 🎯 MVP

**Goal**: carte sur fond uni avec les tronçons de la zone visible, position de l'utilisateur, coloration en direct (non parcourue / partielle / complétée) et fiche d'information au toucher

**Independent Test**: marcher le long d'une rue courte, app ouverte : le tronçon passe de neutre à « partielle » puis « complétée » ; le toucher affiche nom, %, état, longueur (quickstart V1–V4, V8, V9)

### Tests for User Story 1 ⚠️

> Écrire ces tests D'ABORD et vérifier qu'ils échouent avant l'implémentation

- [X] T030 [P] [US1] Écrire tests/unit/domain/visits.test.ts : `isUsableFix` → true pour `accuracy` 25, false pour 25,1 et `null` ; `visitedPointIds` → point à 24,9 m visité, à 25 m non visité ; `[]` si fix inutilisable ; aucun filtre de vitesse ni de direction (deux tronçons qui se croisent : les points des deux sont visités)
- [X] T031 [P] [US1] Écrire tests/unit/domain/progress.test.ts avec les cas de contracts/domain-api.md : 0/10 → `non_parcourue`, 1/10 et 8/10 → `partielle`, 9/10 → `completee`, 1/2 → `partielle`, 2/2 → `completee` ; `percentVisited(199, 200)` = 99 (`floor`, jamais 100 % avant 100 %)
- [X] T032 [P] [US1] Écrire tests/unit/domain/viewport.test.ts : `shouldShowStreets` true si `latitudeDelta ≤ 0.015`, false au-delà ; `queryBounds` = région élargie de 20 % (north/south/east/west corrects)
- [X] T033 [P] [US1] Écrire tests/unit/domain/format.test.ts : `formatLength(85)` = « 85 m », `formatLength(1234)` = « 1,2 km » (virgule décimale, fr-CA)

### Implementation for User Story 1

- [X] T034 [P] [US1] Implémenter src/domain/visits.ts (`VISIT_RADIUS_M = 25`, `MAX_ACCURACY_M = 25`, `Fix`, `CandidatePoint`, `isUsableFix`, `visitedPointIds`) en important `distanceMeters` de ./geo
- [X] T035 [P] [US1] Implémenter src/domain/progress.ts (`COMPLETION_RATIO = 0.9`, `SegmentState`, `segmentState`, `percentVisited`) selon data-model.md (« `completee` : ratio ≥ 0.9 », « `partielle` : visited_count ≥ 1 et ratio < 0.9 »)
- [X] T036 [P] [US1] Implémenter src/domain/viewport.ts (`MAX_LATITUDE_DELTA = 0.015`, `MAX_VISIBLE_SEGMENTS = 1500`, `Region`, `Bounds`, `shouldShowStreets`, `queryBounds`)
- [X] T037 [P] [US1] Implémenter src/domain/format.ts (`formatLength` : mètres arrondis sous 1 000 m, sinon km à une décimale avec virgule)
- [X] T038 [US1] Ajouter dans src/data/streetsRepository.ts : `getCandidatePoints(db, cells: number[])`, `getVisibleSegments(db, bounds, limit)` (requête par boîte englobante du contrat, `LIMIT 1500`, tri par distance du centre de la boîte au centre de la région si plus de résultats), `getSegmentGeometries(db, segmentIds)` (ordonné par `segment_id, seq`), `getVisitedCounts(db, segmentIds)`, `insertVisitedPoints(db, pointIds)` (`INSERT OR IGNORE` dans une transaction, retourne les ids réellement insérés)
- [X] T039 [P] [US1] Créer src/location/useForegroundLocation.ts : demande de permission « pendant l'utilisation » uniquement (`requestForegroundPermissionsAsync`), `watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10, activityType: Location.ActivityType.Fitness })`, désabonnement quand `AppState` ≠ `active` et réabonnement au retour (FR-014) ; expose `{ permission: 'granted' | 'denied' | 'pending', lastFix: Fix | null }`
- [X] T040 [P] [US1] Créer src/ui/map/stateColors.ts : couleurs des trois états (neutre gris clair pour `non_parcourue`, couleur intermédiaire pour `partielle`, couleur vive pour `completee`), contrastées sur le fond `#F2F0EA`, et épaisseurs de trait
- [X] T041 [P] [US1] Créer src/ui/PermissionNotice.tsx : bandeau affichant l'explication (avant la demande) et, en cas de refus, le message expliquant comment activer la localisation dans Réglages, avec les textes de src/strings/fr.ts
- [X] T042 [P] [US1] Créer src/ui/SegmentInfoCard.tsx : affiche le nom, `percentVisited` + « % », le libellé d'état et `formatLength(length_m)`, avec les textes de src/strings/fr.ts
- [X] T043 [US1] Compléter src/ui/map/StreetsMap.tsx : props `segments` (id, coordonnées, état), `userPosition`, `onRegionChangeComplete`, `onSegmentPress`, `onMapPress` ; un `Polyline` `tappable` par tronçon (couleur et épaisseur de stateColors.ts) ; `Marker` pour la position de l'utilisateur ; conserver la tuile vierge de T010
- [X] T044 [US1] Créer src/ui/MapScreen.tsx : (1) région initiale centrée sur le premier fix, sinon sur 45.5017, -73.5673 ; (2) à chaque `onRegionChangeComplete`, si `shouldShowStreets`, charger tronçons, géométries et compteurs visités et calculer les états avec `segmentState`, sinon vider les rues et afficher « Zoomez pour voir les rues » ; (3) à chaque `lastFix` : `neighborhood` → `getCandidatePoints` → `visitedPointIds` → `insertVisitedPoints` ; si des ids sont insérés, recalculer uniquement les états des tronçons concernés présents à l'écran (SC-002 ≤ 5 s) ; (4) fiche SegmentInfoCard au toucher d'un tronçon, masquée au toucher de la carte (FR-008a) ; (5) attribution permanente en bas de l'écran ; (6) PermissionNotice selon `permission`
- [X] T045 [US1] Remplacer l'écran du spike par MapScreen dans App.tsx (à l'intérieur du `SQLiteProvider`)
- [ ] T046 [US1] Valider sur iPhone les scénarios V1, V2, V3, V4, V8 et V9 de specs/001-street-exploration-map/quickstart.md ; ajuster `MAX_LATITUDE_DELTA` / `MAX_VISIBLE_SEGMENTS` dans src/domain/viewport.ts si la carte n'est pas fluide (et mettre à jour les tests T032 en conséquence)

**Checkpoint**: User Story 1 fonctionnelle et testable seule (MVP)

---

## Phase 4: User Story 2 - Retrouver sa progression d'une session à l'autre (Priority: P2)

**Goal**: la progression survit à la fermeture de l'app et au redémarrage de l'appareil, hors ligne, et s'affiche en < 3 s

**Independent Test**: parcourir une rue, fermer complètement l'app, mode avion, rouvrir : même état (quickstart V5)

### Implementation for User Story 2

- [X] T047 [US2] Vérifier dans src/data/streetsRepository.ts que `insertVisitedPoints` valide sa transaction immédiatement à chaque position (aucun tampon en mémoire qui serait perdu si l'app est tuée) et documenter ce choix par un court commentaire
- [X] T048 [US2] Dans src/ui/MapScreen.tsx, afficher l'indicateur de chargement (texte de src/strings/fr.ts) jusqu'au premier chargement des tronçons visibles avec leurs compteurs visités, puis afficher directement la progression persistée, même si aucun fix GPS n'est encore reçu
- [ ] T049 [US2] Valider le scénario V5 de specs/001-street-exploration-map/quickstart.md (fermeture forcée, redémarrage de l'iPhone, mode avion) et mesurer le temps jusqu'à l'affichage de la progression (< 3 s, SC-003)

**Checkpoint**: User Stories 1 et 2 fonctionnelles

---

## Phase 5: User Story 3 - Effacer tout son historique (Priority: P3)

**Goal**: effacer tout l'historique après confirmation explicite ; toutes les rues reviennent à l'état neutre, de façon durable

**Independent Test**: après quelques rues parcourues, Effacer → Annuler (rien ne change), puis Effacer → Confirmer, puis relancer : tout est neutre (quickstart V6)

### Implementation for User Story 3

- [X] T050 [US3] Ajouter `resetHistory(db)` dans src/data/streetsRepository.ts : `DELETE FROM visited_point;` puis `VACUUM;` puis `PRAGMA wal_checkpoint(TRUNCATE);` (data-model.md : « aucune page de la base ne conserve d'anciennes données »)
- [X] T051 [P] [US3] Créer src/ui/ResetHistoryButton.tsx : bouton qui ouvre une confirmation `Alert.alert` (titre, message, « Annuler » de style `cancel`, « Effacer » de style `destructive`, textes de src/strings/fr.ts) et appelle `onConfirm` seulement après confirmation
- [X] T052 [US3] Intégrer ResetHistoryButton dans src/ui/MapScreen.tsx : à la confirmation, appeler `resetHistory`, masquer la fiche ouverte et remettre tous les tronçons affichés à `non_parcourue`
- [ ] T053 [US3] Valider le scénario V6 de specs/001-street-exploration-map/quickstart.md

**Checkpoint**: toutes les user stories fonctionnelles

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: conformité constitutionnelle et validations transverses

- [X] T054 [P] Rédiger README.md (en français) : présentation, prérequis (Node 24, Expo Go), régénération des données (`npm run build:streets`, GeoJSON à télécharger), licences (`assets/streets.db` sous ODbL, dérivé d'OpenStreetMap ; limites administratives Ville de Montréal CC BY 4.0), principes de vie privée
- [X] T055 [P] Vérifier qu'aucun texte affiché n'est codé en dur hors de src/strings/fr.ts (recherche de littéraux de chaînes dans les fichiers JSX de src/ui/ et App.tsx) et corriger
- [X] T056 [P] Vérifier que src/domain/ n'importe ni `react`, ni `react-native`, ni `expo-*` (recherche dans les imports) et qu'aucun `any` explicite n'est présent sans commentaire de justification dans src/ et scripts/
- [X] T057 Exécuter `npm run typecheck` et `npm test` : 0 erreur, tous les tests passent
- [ ] T058 Rejouer V7 de specs/001-street-exploration-map/quickstart.md avec l'app complète (navigation, marche, toucher, effacement) : 0 requête réseau émise par l'app (SC-005)
- [ ] T059 Exécuter V10 de specs/001-street-exploration-map/quickstart.md (1 h de marche, app ouverte) : ≤ 10 % de batterie (SC-006) ; si dépassement, revoir `distanceInterval` (R11) avant toute autre optimisation
- [ ] T060 Rejouer l'ensemble des scénarios V1–V10 de specs/001-street-exploration-map/quickstart.md et cocher les résultats

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** : aucune dépendance
- **Foundational (Phase 2)** : dépend de Setup. **T011 (spike) est une porte** : si elle échoue, tout s'arrête jusqu'à l'arbitrage du propriétaire. T026 dépend de T014, T015, T021–T025 ; T027 dépend de T026 ; T028 dépend de T027
- **US1 (Phase 3)** : dépend de toute la Phase 2
- **US2 (Phase 4)** : dépend de US1 (la progression n'est visible que sur la carte de US1)
- **US3 (Phase 5)** : dépend de US1 (bouton et rafraîchissement dans MapScreen) ; indépendante de US2
- **Polish (Phase 6)** : après les stories voulues

### User Story Dependencies

- **US1 (P1)** : base de l'app, aucune dépendance de story
- **US2 (P2)** : s'appuie sur US1 ; le stockage SQLite de US1 assure déjà la persistance, US2 la durcit et la valide
- **US3 (P3)** : s'appuie sur US1 ; peut être réalisée avant ou après US2

### Within Each User Story

- Tests du domaine écrits et en échec avant l'implémentation correspondante
- Domaine → repository → hook de localisation et composants → MapScreen → validation sur iPhone

### Parallel Opportunities

- Setup : T005–T008 en parallèle après T001–T004
- Foundational : T012–T015 en parallèle ; T016–T020 en parallèle, puis T021–T025 en parallèle ; le spike (T009–T011) peut avancer pendant l'écriture du script
- US1 : T030–T033 en parallèle, puis T034–T037 en parallèle ; T039–T042 en parallèle avec T038
- US3 : T051 en parallèle avec T050

---

## Parallel Example: User Story 1

```bash
# Tests du domaine US1 ensemble :
Task: "Écrire tests/unit/domain/visits.test.ts"
Task: "Écrire tests/unit/domain/progress.test.ts"
Task: "Écrire tests/unit/domain/viewport.test.ts"
Task: "Écrire tests/unit/domain/format.test.ts"

# Puis les implémentations du domaine ensemble :
Task: "Implémenter src/domain/visits.ts"
Task: "Implémenter src/domain/progress.ts"
Task: "Implémenter src/domain/viewport.ts"
Task: "Implémenter src/domain/format.ts"

# Composants indépendants ensemble :
Task: "Créer src/location/useForegroundLocation.ts"
Task: "Créer src/ui/map/stateColors.ts"
Task: "Créer src/ui/PermissionNotice.tsx"
Task: "Créer src/ui/SegmentInfoCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 : Setup
2. Phase 2 : Foundational. **Faire le spike T009–T011 en premier** : il décide si react-native-maps est conservé
3. Phase 3 : US1
4. **STOP and VALIDATE** : scénarios V1–V4, V8, V9 sur iPhone

### Incremental Delivery

1. Setup + Foundational → données et base prêtes
2. US1 → MVP utilisable en marchant
3. US2 → persistance validée hors ligne et au redémarrage
4. US3 → effacement de l'historique
5. Polish → conformité constitutionnelle, réseau, batterie

---

## Notes

- [P] = fichiers différents, sans dépendance sur une tâche inachevée
- Les tâches de validation manuelle (T011, T046, T049, T053, T058–T060) nécessitent un iPhone avec Expo Go ; T027 nécessite un téléchargement manuel
- Un commit après chaque tâche ou groupe logique ; s'arrêter à chaque checkpoint pour valider la story
