# Data Model: Carte d'exploration des rues de Montréal

**Feature**: `001-street-exploration-map` | **Date**: 2026-10-08

Toutes les données vivent dans une seule base SQLite sur l'appareil (`streets.db`, voir
research.md R9). Les tables `meta`, `segment` et `point` sont **produites par le script** et en
lecture seule pour l'app ; la table `visited_point` est **créée et écrite par l'app**. Le schéma
exact des tables produites est le contrat [contracts/streets-db.md](contracts/streets-db.md).

## Entités

### Tronçon (`segment`) — « Rue » au sens de la spec

| Champ | Type | Règle |
|-------|------|-------|
| `id` | entier | clé, unique par génération des données |
| `name` | texte | nom de la voie ; « Ruelle » pour une ruelle sans nom ; jamais vide |
| `quartier` | texte | arrondissement ou ville liée contenant le point milieu |
| `length_m` | réel | longueur en mètres, > 0 |
| `point_count` | entier | ≥ 2 ; égal au nombre de points du tronçon |
| `min_lat`, `max_lat`, `min_lon`, `max_lon` | entiers E6 | boîte englobante des points |

`quartier` n'est pas affiché en v1 (voir plan.md, Complexity Tracking).

### Point de rue (`point`)

| Champ | Type | Règle |
|-------|------|-------|
| `id` | entier | clé |
| `segment_id` | entier | → `segment.id` |
| `seq` | entier | ordre le long du tronçon, 0..`point_count`-1 |
| `lat`, `lon` | entiers E6 | microdegrés WGS84 |
| `cell` | entier | cellule de grille (research.md R8), calculée par `src/domain/grid.ts` |

Deux tronçons qui se touchent ont chacun leur propre point à l'intersection (pas de partage).

### Historique (`visited_point`) — données de l'utilisateur

| Champ | Type | Règle |
|-------|------|-------|
| `point_id` | entier | clé primaire → `point.id` |

Aucun horodatage ni aucune position brute ne sont stockés : seul le fait qu'un point ait été
visité est conservé (minimisation, principe I). Les positions GPS ne sont jamais persistées.

## Valeurs dérivées (calculées, jamais stockées)

- `visited_count(segment)` = nombre de `visited_point` dont le point appartient au tronçon.
- `ratio` = `visited_count / point_count`.
- `percent` affiché = `floor(ratio × 100)` (on n'affiche jamais 100 % pour 99,6 %).
- **État** du tronçon :

| État | Condition |
|------|-----------|
| `non_parcourue` | `visited_count = 0` |
| `partielle` | `visited_count ≥ 1` et `ratio < 0.9` |
| `completee` | `ratio ≥ 0.9` |

## Transitions

```text
non_parcourue ──(1er point visité)──► partielle ──(ratio ≥ 0,9)──► completee
       ▲                                   │                           │
       └─────────────── effacement de l'historique ◄───────────────────┘
```

- Les transitions sont **monotones** (FR-009) : un point visité le reste ; seul l'effacement
  remet tout à `non_parcourue`.
- Un tronçon peut passer directement de `non_parcourue` à `completee` (tronçon court, une seule
  position visite ≥ 90 % de ses points).

## Règles de validation

- **Visite (FR-006)** : un point est visité ssi une position reçue au premier plan a
  `accuracy ≤ 25 m` et `distance(position, point) < 25 m`. Aucun filtre de vitesse ni de
  direction.
- **Effacement (FR-013)** : `DELETE FROM visited_point`, puis `VACUUM` pour qu'aucune page de la
  base ne conserve d'anciennes données.
- **Intégrité du script** : chaque `segment` a exactement `point_count` points de `seq` 0..n-1 ;
  espacement entre points consécutifs ≤ 20 m ; chaque point est à l'intérieur de la boîte
  englobante de son tronçon ; `cell` = `cellOf(lat, lon)`.

## Volume attendu

~10⁵ tronçons, ~5·10⁵ points (à confirmer par le script). `visited_point` : au pire autant de
lignes que de points (~5·10⁵ entiers, quelques Mo).
