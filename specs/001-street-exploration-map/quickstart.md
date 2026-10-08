# Quickstart: valider la carte d'exploration des rues

**Feature**: `001-street-exploration-map`

## Prérequis

- Ordinateur : Node.js 24 LTS, npm.
- iPhone avec **Expo Go** (version correspondant au SDK du projet), sur le même réseau Wi-Fi.
- Fichier GeoJSON « Limites administratives de l'agglomération de Montréal »
  (donnees.montreal.ca) placé dans `scripts/build-streets/input/` (voir research.md R5).
- Pour V7 : un proxy d'inspection (Proxyman, Charles…) ou le rapport de confidentialité d'iOS.

## 1. Générer les données de rues (une fois)

```bash
npm install
npm run build:streets      # node scripts/build-streets/build-streets.ts
```

**Attendu** : le script affiche le nombre de tronçons, de points et la taille de
`assets/streets.db`, et termine avec le code 0 (invariants du contrat
[streets-db.md](contracts/streets-db.md) vérifiés). Ordre de grandeur : ~10⁵ tronçons,
15–30 Mo.

## 2. Vérifications automatiques

```bash
npm run typecheck          # tsc --noEmit, 0 erreur
npm test                   # tests unitaires du domaine et du script
```

**Attendu** : tout passe, y compris les cas de [domain-api.md](contracts/domain-api.md).

## 3. Lancer dans Expo Go

```bash
npx expo start
```

Scanner le QR code avec l'appareil photo de l'iPhone.

## 4. Scénarios de validation manuelle

| # | Scénario | Résultat attendu | Spec |
|---|----------|------------------|------|
| V1 | Premier lancement, accepter la localisation | Carte sur fond uni, centrée sur la position ; rues neutres ; message d'attribution visible | US1-1, FR-001a |
| V2 | Marcher ~100 m le long d'une rue | Le tronçon passe à « partielle » puis « complétée » en ≤ 5 s après le passage | US1-2/3/4, SC-001/002 |
| V3 | Toucher un tronçon | Fiche : nom, %, état, longueur ; toucher ailleurs la masque | US1-5, FR-008a |
| V4 | Dézoomer au-delà de ~1,7 km | Les rues disparaissent, message « Zoomez pour voir les rues » ; la carte reste fluide | R10 |
| V5 | Fermer complètement l'app, mode avion, rouvrir | Même progression affichée en < 3 s | US2, SC-003 |
| V6 | Effacer l'historique → Annuler, puis → Confirmer, puis relancer | Annuler : rien ne change ; Confirmer : toutes les rues neutres, y compris après relance | US3, SC-004 |
| V7 | 5 min de navigation sur la carte avec proxy actif | 0 requête réseau émise par l'app (hors serveur de dev Expo) | SC-005, R1 |
| V8 | Refuser la permission de localisation | Carte consultable, message français expliquant comment l'activer ; aucun point visité | Edge cases, FR-015 |
| V9 | Passer l'app en arrière-plan en marchant 2 min, revenir | Aucun point visité pendant l'arrière-plan ; le suivi reprend au retour | FR-014 |
| V10 | 1 h de marche app ouverte | Batterie consommée ≤ 10 % | SC-006 |

> V7 doit être exécuté **en premier** (spike, research.md R1) : son échec remet en cause le
> choix de react-native-maps.
