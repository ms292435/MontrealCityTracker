# Constitution de Montreal City Tracker

## Core Principles

### I. Vie privée d'abord (NON NÉGOCIABLE)

- Toutes les données de localisation (positions, traces, rues visitées, badges) DOIVENT rester
  stockées uniquement sur l'appareil de l'utilisateur.
- L'application NE DOIT PAS exiger ni proposer de compte utilisateur.
- L'application NE DOIT PAS envoyer de données à un serveur, qu'il soit propre au projet ou tiers.
- Aucune télémétrie, analytique, rapport de plantage distant ou SDK publicitaire n'est autorisé.
- Les données de référence (ex. réseau des rues de Montréal) DOIVENT être embarquées dans
  l'application ou téléchargées sans transmettre aucune information sur l'utilisateur.

**Justification** : l'historique de déplacements est une donnée parmi les plus sensibles. La
garantie la plus simple et la plus vérifiable est de ne jamais la faire sortir de l'appareil.

### II. Simplicité

- Le projet est mené par une seule personne ; la v1 DOIT rester minimale et couvrir uniquement
  les fonctionnalités explicitement spécifiées.
- Toute nouvelle dépendance ou abstraction DOIT être nécessaire à la fonctionnalité en cours ;
  sinon elle est refusée. Pas d'anticipation de besoins futurs (YAGNI).
- Une dépendance ajoutée DOIT être justifiée dans le plan de la fonctionnalité (pourquoi elle est
  requise, pourquoi une solution sans dépendance ne suffit pas).

**Justification** : chaque abstraction ou dépendance est un coût de maintenance permanent pour
un développeur seul.

### III. Compatibilité Expo Go

- L'application DOIT rester exécutable dans Expo Go tant que possible.
- Du code natif ou un build de développement (development build / prebuild) NE DOIT être
  introduit que lorsqu'une fonctionnalité spécifiée l'exige explicitement et qu'aucune API
  disponible dans Expo Go ne permet de la réaliser.
- Ce passage DOIT être documenté dans le plan de la fonctionnalité concernée, avec la limitation
  d'Expo Go qui le motive.

**Justification** : Expo Go garde la boucle de développement rapide et évite la maintenance de
projets natifs iOS/Android.

### IV. Économie de batterie

- Toute utilisation du GPS DOIT être justifiée par une fonctionnalité spécifiée.
- La précision, la fréquence et la distance minimale de mise à jour DOIVENT être réglées au
  minimum utile pour la fonctionnalité (ex. précision « équilibrée » plutôt que « maximale » si
  elle suffit à identifier une rue).
- Le suivi en arrière-plan NE DOIT être activé que s'il est explicitement requis, et DOIT pouvoir
  être arrêté par l'utilisateur.
- Les réglages de localisation retenus DOIVENT être documentés dans le plan avec leur
  justification.

**Justification** : une application de suivi qui vide la batterie est désinstallée.

### V. TypeScript strict et logique métier testée

- Le code DOIT être écrit en TypeScript avec `strict: true` ; `any` implicite interdit, et tout
  `any` explicite DOIT être justifié en commentaire.
- La logique métier (correspondance positions → rues, calcul des rues visitées, progression,
  attribution des badges) DOIT résider dans des modules purs, indépendants de React, de React
  Native et des API Expo.
- Cette logique métier DOIT être couverte par des tests unitaires ; une fonctionnalité qui la
  modifie n'est pas terminée sans tests correspondants qui passent.

**Justification** : séparer la logique de l'interface la rend testable rapidement, sans appareil
ni simulateur, et protège les calculs centraux de l'application contre les régressions.

### VI. Interface en français, textes centralisés

- Tous les textes visibles par l'utilisateur DOIVENT être en français.
- Ces textes DOIVENT être centralisés dans un module dédié et référencés par clé ; aucune chaîne
  affichée NE DOIT être codée en dur dans les composants.
- Aucune bibliothèque d'internationalisation n'est requise en v1 (cf. principe II) ; la
  centralisation suffit à permettre une traduction ultérieure.

**Justification** : le public cible est montréalais ; centraliser dès le départ rend une future
traduction peu coûteuse sans ajouter de dépendance aujourd'hui.

## Contraintes techniques

- Plateforme : application mobile React Native gérée par Expo, en TypeScript strict.
- Stockage : local à l'appareil uniquement (principe I).
- Réseau : aucune requête transportant des données utilisateur ; toute requête réseau DOIT être
  justifiée dans le plan de la fonctionnalité.
- Permissions : seules les permissions nécessaires à la fonctionnalité en cours sont demandées,
  avec un texte d'explication en français.

## Flux de développement

- Chaque fonctionnalité suit le cycle Spec Kit : spécification → plan → tâches → implémentation.
- Le plan de chaque fonctionnalité DOIT contenir une vérification de conformité à cette
  constitution (« Constitution Check »), notamment : flux de données (I), dépendances ajoutées
  (II), compatibilité Expo Go (III), réglages GPS (IV), séparation et tests de la logique métier
  (V), centralisation des textes (VI).
- Avant de considérer une fonctionnalité terminée : vérification des types sans erreur et tests
  unitaires de la logique métier qui passent.

## Governance

- Cette constitution prévaut sur toute autre pratique ou convention du projet.
- Toute dérogation à un principe DOIT être consignée dans la section « Complexity Tracking » du
  plan concerné, avec sa justification et l'alternative plus simple écartée. Le principe I ne
  peut faire l'objet d'aucune dérogation.
- Amendements : modification de ce fichier, mise à jour du rapport d'impact, incrément de version
  et de la date de dernier amendement.
- Versionnement sémantique :
  - MAJEUR : suppression ou redéfinition incompatible d'un principe ;
  - MINEUR : ajout d'un principe ou d'une section, ou extension notable des règles ;
  - CORRECTIF : clarifications et reformulations sans changement de sens.
- La conformité est revérifiée à chaque plan (`/speckit-plan`) et à chaque analyse
  (`/speckit-analyze`).

**Version**: 1.0.0 | **Ratified**: 2026-10-08 | **Last Amended**: 2026-10-08
