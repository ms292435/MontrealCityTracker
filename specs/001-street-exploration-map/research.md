# Research: Carte d'exploration des rues de Montréal

**Feature**: `001-street-exploration-map` | **Date**: 2026-10-08

Chaque décision suit le format Décision / Justification / Alternatives écartées.

---

## R1. Supprimer le fond de carte Apple avec react-native-maps (FR-001a, SC-005)

**Décision** : utiliser `MapView` (fournisseur par défaut = Apple Maps sur iOS, seul fournisseur
disponible dans Expo Go sur iPhone) recouvert d'un `UrlTile` dont `shouldReplaceMapContent={true}`
et dont `urlTemplate` pointe vers une tuile unie **locale** (`file://…/blank.png`, sans
placeholder `{z}/{x}/{y}`). En complément : `showsPointsOfInterests={false}`,
`showsBuildings={false}`, `showsTraffic={false}`, `showsUserLocation={false}`.

**Justification** : `mapType="none"` n'existe pas sur MapKit (Google Maps uniquement).
`shouldReplaceMapContent` correspond à `MKTileOverlay.canReplaceMapContent` : le fond Apple n'est
plus affiché ; une URL `file://` est acceptée par `UrlTile`.

**Risque ouvert (bloquant pour SC-005)** : rien ne garantit que MapKit n'émette plus *aucune*
requête (initialisation, mention légale, configuration). **La première tâche d'implémentation est
un spike** : écran MapView + tuile locale, trafic inspecté (proxy type Proxyman/Charles ou
rapport de confidentialité iOS) pendant 5 min de navigation sur la carte.
- Si 0 requête liée à la carte → on continue.
- Sinon → arbitrage du propriétaire : (a) accepter l'exception et amender FR-001a/SC-005,
  ou (b) remplacer react-native-maps par un rendu maison (react-native-svg ou
  @shopify/react-native-skia, tous deux dans Expo Go) ; le reste du plan est inchangé, car le
  rendu est isolé dans `src/ui/map/`.

**Résultat du spike (T011)** : _à compléter après le test sur iPhone (quickstart V7)._

**Alternatives écartées** : Google Maps sur iOS (exige un build de développement, viole III) ;
rendu maison d'emblée (plus de code — pan/zoom/tap à écrire — alors que l'option demandée peut
suffire).

## R2. Tuile vierge locale

**Décision** : un PNG uni 256×256 dans `assets/blank-tile.png`, résolu au démarrage via
`expo-asset` (`Asset.fromModule(...).downloadAsync()` → `localUri`) pour obtenir un `file://`.

**Justification** : `expo-asset` est déjà une dépendance d'`expo` ; pas de nouveau paquet.

**Alternatives écartées** : URL `file://` inexistante (comportement MapKit en cas d'échec de
tuile non garanti) ; écrire le fichier avec `expo-file-system` (dépendance de plus).

## R3. Extraction des données OpenStreetMap (script hors application)

**Décision** : script **Node.js 24 LTS en TypeScript**, exécuté directement par Node (type
stripping natif, sans `tsx`), dans `scripts/build-streets/`. Étapes :
1. Charger les limites administratives de l'agglomération (R5).
2. Interroger l'API Overpass une seule fois (voies dans la bbox de l'île + relation de l'île,
   `out geom`) et mettre la réponse en cache dans `scripts/build-streets/cache/` (ignoré par
   git).
3. Filtrer les voies (R4), construire le graphe, découper en tronçons (R6), rééchantillonner en
   points (R7), associer le quartier (R5), calculer les cellules de grille (R8).
4. Écrire `assets/streets.db` avec le module intégré `node:sqlite` et afficher des statistiques
   (nombre de tronçons, de points, taille du fichier).

**Justification** : même langage que l'app ⇒ le script importe les modules purs partagés
(`src/domain/geo.ts`, `src/domain/grid.ts`) : la grille du script et celle de l'app ne peuvent
pas diverger. `node:sqlite` et le type stripping évitent toute dépendance (principe II). Overpass
évite de télécharger/traiter un extrait PBF du Québec (~1 Go).

**Contrainte induite** : les modules partagés sont des « feuilles » (aucun import) et sont
importés par le script avec l'extension `.ts` ; `tsconfig.json` active
`allowImportingTsExtensions` (compatible avec `noEmit` d'Expo).

**Alternatives écartées** : Python + osmnx (second langage, logique de grille dupliquée) ;
osmium + PBF Geofabrik (outillage natif, volume) ; better-sqlite3 (module natif à compiler).

## R4. Voies éligibles (FR-004)

**Décision** — une voie OSM est retenue si :
- `highway` ∈ {`primary`, `primary_link`, `secondary`, `secondary_link`, `tertiary`,
  `tertiary_link`, `unclassified`, `residential`, `living_street`, `pedestrian`, `footway`,
  `path`, `cycleway`, `steps`, `track`, `service`} ;
- **et** elle a un `name`, **sauf** `service=alley` (ruelle, nom affiché : « Ruelle ») ;
- **et** n'est pas : `tunnel` ≠ `no` ; `access` ∈ {`private`, `no`} ; `service` ∈
  {`driveway`, `parking_aisle`, `drive-through`} ; `footway` ∈ {`sidewalk`, `crossing`} ;
  `area=yes` ; `highway=service` sans `service=alley`.

Exclus d'office : `motorway`, `motorway_link`, `trunk`, `trunk_link` (autoroutes et voies
rapides), `construction`, `proposed`, `raceway`, `bus_guideway`.

**Justification** : correspond à « autoroutes, tunnels, voies privées exclus ». Les trottoirs
cartographiés séparément doubleraient chaque rue ; les sentiers sans nom (parcs) multiplieraient
le volume sans représenter des « rues ».

**Validé le 2026-10-08** : seuls les sentiers **nommés** sont éligibles ; `trunk` est assimilé à
une autoroute et exclu (hypothèse de la spec mise à jour).

## R5. Périmètre et quartier

**Décision (validée le 2026-10-08 : autres îles exclues, FR-003 inchangée)** :
- **Périmètre** = polygone de l'île de Montréal seule, obtenu par la même requête Overpass
  (relation `place=island` + `name="Île de Montréal"`, `out geom`). Les membres `outer` sont
  assemblés en anneaux par une fonction pure testée (`assembleRings`). L'Île Bizard, l'Île des
  Sœurs, l'Île Dorval et les autres îles sont donc exclues.
- **Quartier** = jeu de données ouvertes « Limites administratives de l'agglomération de
  Montréal » (donnees.montreal.ca, CC BY 4.0 : 19 arrondissements + 15 villes liées), fichier
  GeoJSON téléchargé une fois dans `scripts/build-streets/input/`.
- Un tronçon est retenu si son point milieu est dans le polygone de l'île ; son `quartier` est le
  nom du polygone administratif qui contient ce point milieu (« Inconnu » si aucun, cas limite
  signalé dans les statistiques du script). Test point-dans-polygone par lancer de rayon
  (fonction pure, testée).

**Justification** : les limites administratives ne suivent pas les rives (un arrondissement peut
couvrir plusieurs îles), donc seul le polygone de l'île respecte FR-003. Le quartier reste fourni
par la source officielle.

**Alternatives écartées** : agglomération entière (inclut d'autres îles, contraire à FR-003) ;
exclure les îles par une liste de noms de quartiers (L'Île-Bizard–Sainte-Geneviève chevauche deux
îles).

## R6. Découpage en tronçons (FR-005)

**Décision** : graphe des voies retenues ; un nœud OSM est une **coupure** s'il est partagé par
≥ 2 voies retenues, s'il est une extrémité de voie, ou si le nom change. Les voies OSM
consécutives de même nom reliées par un nœud de degré 2 sont chaînées. Un tronçon = chemin
entre deux coupures consécutives. Identifiant = entier séquentiel stable pour une génération.

**Justification** : OSM découpe les voies arbitrairement (changement de voies, de limite de
vitesse) ; le tronçon « entre deux intersections » doit en être indépendant.

## R7. Rééchantillonnage en points (~20 m)

**Décision** : pour un tronçon de longueur L, `n = max(2, ceil(L / 20) + 1)` points répartis à
intervalles égaux le long de la polyligne, extrémités incluses. Les points servent **aussi** de
géométrie d'affichage.

**Justification** : espacement ≤ 20 m < rayon de 25 m ⇒ un piéton qui longe la rue visite tous
les points (SC-001). Une seule géométrie à stocker ; la perte de détail sur courbes serrées est
invisible à 20 m.

## R8. Index spatial par grille (recherche des points proches)

**Décision** : grille régulière en degrés, origine `LAT0 = 45.38`, `LON0 = -74.00`, pas
`DLAT = 0.0005°` (≈ 55,6 m) et `DLON = 0.0007°` (≈ 54,6 m à 45,5° N). `cell = row * 10000 + col`.
Pour une position, on interroge la cellule et ses 8 voisines (3×3), puis on filtre par distance
réelle < 25 m. Distance : approximation équirectangulaire (erreur négligeable à 25 m).
Les cellules sont pré-calculées par le script (colonne indexée `point.cell`).

**Justification** : cellule > rayon ⇒ le voisinage 3×3 suffit toujours ; une requête SQL sur un
index entier, ~10–60 points candidats.

**Alternatives écartées** : R*Tree SQLite (disponibilité dans expo-sqlite non garantie) ;
quadtree/k-d tree en mémoire (charger ~500 k points en JS : mémoire et temps de démarrage).

## R9. Format embarqué et stockage local

**Décision** : **une seule base SQLite** `streets.db` produite par le script, embarquée comme
asset et ouverte via `SQLiteProvider` d'expo-sqlite avec `assetSource` (copiée une fois dans
l'espace de l'app au premier lancement, jamais écrasée ensuite). `metro.config.js` ajoute `db`
à `resolver.assetExts`. L'historique vit dans une table `visited_point` créée par l'app dans
cette même base (voir data-model.md).

Coordonnées stockées en **entiers microdegrés** (E6) pour réduire la taille.

**Justification** : aucune analyse de gros JSON au démarrage (SC-003), requêtes indexées pour la
grille et la zone visible, une seule technologie de stockage (déjà imposée).

**Volume attendu** (à confirmer par le script) : ~10⁵ tronçons, ~5·10⁵ points, base de 15 à
30 Mo. Si > 50 Mo : réduire l'éligibilité (R4) avant toute optimisation.

**Alternatives écartées** : JSON/GeoJSON embarqué (taille et temps de parsing) ; binaire maison
(code de décodage à écrire et tester) ; deux bases + `ATTACH` (complexité sans bénéfice en v1).

## R10. Affichage limité à la zone visible

**Décision** : à chaque `onRegionChangeComplete`, si `latitudeDelta ≤ 0.015` (≈ 1,7 km),
requête des tronçons dont la boîte englobante intersecte la région élargie de 20 % ; plafond de
**1 500** tronçons (au-delà : on garde les plus proches du centre). Au-dessus du seuil de zoom :
aucune rue, vue par quartier (R15). Chaque tronçon = un `Polyline` (`tappable`,
`onPress` → fiche FR-008a), couleur selon l'état. Seuil et plafond sont des constantes à
ajuster après mesure sur iPhone.

**Justification** : MapKit ne peut pas afficher 10⁵ polylignes ; la requête par boîte
englobante (index sur `min_lat`) reste < 50 ms sur ~10⁵ lignes.

## R11. Localisation (principe IV, FR-006, FR-014)

**Décision** : `expo-location`, permission « pendant l'utilisation » uniquement.
`watchPositionAsync({ accuracy: Accuracy.High, distanceInterval: 10 })`. (`activityType`
n'est accepté par expo-location SDK 57 que pour le suivi en arrière-plan : non utilisé.) L'abonnement est supprimé quand `AppState` ≠ `active` et recréé au
retour. La position affichée est un `Marker` alimenté par ce même abonnement
(`showsUserLocation={false}` ⇒ une seule source GPS).
Filtre (fonction pure) : position ignorée si `accuracy` absente ou > 25 m.

**Justification** : sur iOS, `Balanced` ≈ 100 m, inutilisable pour un rayon de 25 m ;
`High` ≈ 10 m est le minimum utile. `distanceInterval: 10` (< espacement de 20 m) évite de
manquer un point sans réveiller le traitement à l'arrêt. `Highest`/`BestForNavigation`
écartés (coût batterie sans gain au regard du seuil).

## R12. Mise à jour en direct (SC-002)

**Décision** : à chaque position valide → cellules 3×3 → requête des points candidats → filtre
distance (domaine) → `INSERT OR IGNORE` dans `visited_point` → si nouvelles lignes, recalcul de
l'état des seuls tronçons concernés et mise à jour de l'état React de la carte.

## R13. Tests

**Décision** : Jest avec le préset `jest-expo` (outil standard d'Expo), tests unitaires dans
`tests/unit/` pour `src/domain/` et pour les fonctions pures du script
(`scripts/build-streets/lib/`). Vérification de types : `tsc --noEmit`.

**Alternatives écartées** : Vitest (second outillage à configurer avec Babel/Expo) ; tests
d'interface/E2E (hors principe V, coût élevé pour un projet solo en v1).

## R15. Vue par quartier au dézoom (US4, FR-017, FR-018)

**Décision** :
- Le script écrit un second asset, `assets/quartiers.json` : pour chacune des 34 zones des
  limites administratives, son nom (`NOM`) et ses anneaux simplifiés par Douglas-Peucker
  (tolérance 15 m, coordonnées arrondies à 1e-5°), importé directement par le bundle JS.
- Les totaux par zone (points, longueur) sont calculés à l'exécution par SQL
  (`GROUP BY segment.quartier`), une fois au démarrage ; les points visités par zone par une
  jointure `visited_point → point → segment`, rejouée après chaque visite en vue par quartier.
- Rendu : un `Polygon` react-native-maps par anneau extérieur (trous via `holes`), `tappable`,
  couleur de remplissage selon le palier de FR-017 (fonction pure `quartierLevel`).
- Les zones dont le total de points est 0 ne sont pas affichées.

**Justification** : aucun changement du schéma de `streets.db` ni de migration de la base déjà
copiée sur l'appareil ; 34 polygones simplifiés restent légers pour MapKit ; les paliers rendent
visibles de faibles progressions (un arrondissement compte des milliers de points).

**Alternatives écartées** : carte 3D avec bâtiments (fond Apple téléchargé, contraire au
principe I ; ou moteur 3D natif, contraire au principe III) ; toutes les rues en tuiles
d'images embarquées (plusieurs Mo et un moteur de rendu dans le script) ; échelle de couleur
linéaire 0–100 % (tout resterait pâle pendant des mois).

## R14. Licences et attribution

**Décision** : afficher en bas de la carte « © contributeurs OpenStreetMap · Ville de Montréal
(CC BY 4.0) » (texte centralisé). `streets.db` est une base dérivée d'OSM : elle est sous
licence ODbL ; le README le mentionne et indique comment la régénérer.
