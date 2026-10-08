# Montréal à pied

Application mobile pour découvrir l'île de Montréal à pied.

## Le but de l'application

Montréal compte des dizaines de milliers de rues, de ruelles et de passages. Montréal à pied
transforme l'exploration de la ville en une carte qui se remplit au fil de vos marches :

- la carte montre les rues de l'île, toutes grises au départ ;
- quand vous marchez avec l'app ouverte, chaque rue que vous empruntez se colore, d'abord comme
  « partiellement parcourue », puis « complétée » quand vous en avez couvert au moins 90 % ;
- votre progression est conservée d'une sortie à l'autre ;
- toucher une rue affiche son nom, son pourcentage parcouru, son état et sa longueur ;
- en dézoomant, les arrondissements et villes liées se colorent selon la part de leurs rues
  déjà parcourue, pour voir d'un coup d'œil les secteurs connus et ceux à découvrir.

L'idée est simple : donner envie de sortir des trajets habituels et de voir, rue après rue, la
part de la ville que l'on connaît vraiment.

### Comment ça marche

Chaque rue est découpée en tronçons entre deux intersections, et chaque tronçon en points
espacés d'environ 20 m. Un point est visité quand vous passez à moins de 25 m ; un tronçon est
complété quand 90 % de ses points le sont. Les autoroutes, tunnels et voies privées sont exclus.

### Vie privée

- Aucun compte, aucun serveur, aucune télémétrie.
- Votre position n'est jamais enregistrée : seuls les numéros des points de rue visités sont
  conservés, dans une base SQLite sur votre téléphone.
- La carte n'utilise aucun fond de carte téléchargé : les rues sont embarquées dans l'app.
- Le suivi s'arrête dès que l'app quitte le premier plan.
- « Effacer l'historique » supprime définitivement toute la progression.

## Une expérience de Spec-Driven Development

Ce projet est aussi une **tentative de développement piloté par la spécification**
(*Spec-Driven Development*, SDD), menée avec [Spec Kit](https://github.com/github/spec-kit) et
un agent de code IA (Claude Code).

En SDD, le code n'est pas le point de départ : on écrit d'abord *ce que* l'application doit
faire et *pourquoi*, puis on en déduit le *comment*. Chaque étape produit un document versionné,
relu et corrigé avant de passer à la suivante. Le code est la dernière étape, et il doit pouvoir
être justifié par les documents qui le précèdent.

| Étape | Commande Spec Kit | Document produit | Rôle |
|-------|-------------------|------------------|------|
| 1. Principes | `/speckit.constitution` | [constitution.md](.specify/memory/constitution.md) | Règles non négociables du projet (vie privée, simplicité, Expo Go, batterie, tests, français) |
| 2. Spécification | `/speckit.specify` | [spec.md](specs/001-street-exploration-map/spec.md) | Le *quoi* et le *pourquoi* : récits utilisateur, exigences, critères de succès, sans technique |
| 3. Clarification | `/speckit.clarify` | spec.md (section Clarifications) | Questions ciblées pour lever les ambiguïtés (unité « rue », périmètre, fond de carte…) |
| 4. Plan | `/speckit.plan` | [plan.md](specs/001-street-exploration-map/plan.md), [research.md](specs/001-street-exploration-map/research.md), [data-model.md](specs/001-street-exploration-map/data-model.md), [contracts/](specs/001-street-exploration-map/contracts/), [quickstart.md](specs/001-street-exploration-map/quickstart.md) | Le *comment* : choix techniques justifiés, modèle de données, contrats, scénarios de validation |
| 5. Tâches | `/speckit.tasks` | [tasks.md](specs/001-street-exploration-map/tasks.md) | 60 tâches ordonnées par récit utilisateur, tests avant le code |
| 6. Analyse | `/speckit.analyze` | rapport (non versionné) | Contrôle de cohérence entre spec, plan et tâches avant d'écrire du code |
| 7. Implémentation | `/speckit.implement` | le code | Exécution des tâches, cochées au fur et à mesure |

Quelques enseignements de l'expérience, visibles dans l'historique git :

- les questions de clarification ont changé des décisions structurantes (pas de fond de carte
  téléchargé, tronçons plutôt que rues entières) avant qu'une seule ligne de code n'existe ;
- la constitution a servi de garde-fou concret : chaque dépendance et chaque réglage GPS est
  justifié dans le plan ;
- l'analyse de cohérence a détecté de vraies incohérences (seuil de zoom contre « toutes les
  rues », tri avant la limite d'affichage) ;
- le premier essai sur iPhone a fait émerger un besoin absent de la spec (carte dézoomée vide) :
  il a été traité comme une nouvelle clarification et un nouveau récit utilisateur (US4) avant
  d'écrire le code, et la demande de carte 3D a été écartée au nom du principe de vie privée ;
- l'implémentation a tout de même révélé des écarts que les documents n'avaient pas anticipés
  (option GPS inexistante, serveur Overpass surchargé), reportés dans les documents.

## État du projet

- ✅ Code complet de la v1, 114 tests unitaires, TypeScript strict, bundle iOS compilé
- ✅ Données des rues générées : 53 757 tronçons, 377 200 points (23 Mo), 34 zones de quartier
- ✅ Premier lancement sur iPhone réussi (via le partage de connexion de l'iPhone)
- ⏳ Validation sur iPhone à terminer (tâches T011, T046, T049, T053, T058–T060, T070), en
  commençant par le test réseau d'Apple Maps (T011), qui conditionne le principe de vie privée

> Sur un réseau d'université ou d'entreprise, l'iPhone ne peut souvent pas joindre
> l'ordinateur : utilisez le partage de connexion de l'iPhone (sans VPN) ou
> `npx expo start --tunnel`.

## Prérequis

- Node.js 24 ou plus récent
- Un iPhone avec **Expo Go** (SDK 57)

## Lancer l'app

```bash
npm install
npx expo start
```

Scannez le QR code avec l'appareil photo de l'iPhone.

## Vérifications

```bash
npm run typecheck   # TypeScript strict
npm test            # tests unitaires (domaine et script de données)
```

Scénarios de validation manuelle sur iPhone :
[specs/001-street-exploration-map/quickstart.md](specs/001-street-exploration-map/quickstart.md).

## Structure

```text
App.tsx                  point d'entrée (base SQLite + écran carte)
src/domain/              logique métier pure et testée (visites, progression, grille, zoom)
src/data/                requêtes SQLite
src/location/            localisation au premier plan
src/ui/                  écran, carte, fiche, boutons
src/strings/fr.ts        tous les textes de l'interface
scripts/build-streets/   script de génération des données de rues
tests/unit/              tests unitaires
specs/                   documents Spec Kit (spécification, plan, tâches…)
```

## Régénérer les données de rues

`assets/streets.db` est produit une seule fois par un script local :

```bash
npm run build:streets
```

Le script :

1. télécharge les limites administratives de la Ville de Montréal (si absentes de
   `scripts/build-streets/input/`) ;
2. interroge OpenStreetMap via Overpass (réponse mise en cache dans
   `scripts/build-streets/cache/` ; supprimez ce dossier pour récupérer des données fraîches) ;
3. garde les voies éligibles de l'île de Montréal (sans autoroutes, tunnels ni voies privées),
   les découpe en tronçons entre intersections, place un point tous les ~20 m et associe chaque
   tronçon à son arrondissement ou sa ville liée ;
4. écrit `assets/streets.db` et vérifie ses invariants.

Si le serveur Overpass principal est surchargé (erreur 504), utilisez un autre serveur :

```bash
OVERPASS_URL=https://overpass.kumi.systems/api/interpreter npm run build:streets
```

## Licences des données

- `assets/streets.db` est dérivé d'OpenStreetMap : © contributeurs OpenStreetMap, base de
  données sous licence [ODbL](https://opendatacommons.org/licenses/odbl/). Elle peut être
  régénérée avec le script ci-dessus.
- Limites administratives : Ville de Montréal, données ouvertes (CC BY 4.0).

L'attribution est affichée en bas de la carte.
