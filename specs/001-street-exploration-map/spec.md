# Feature Specification: Carte d'exploration des rues de Montréal

**Feature Branch**: `001-street-exploration-map`

**Created**: 2026-10-08

**Status**: Draft

## Clarifications

### Session 2026-10-08

- Q: Qu'est-ce qu'une « rue » pour le suivi ? → A: Un tronçon entre deux intersections.
- Q: Quel périmètre géographique ? → A: L'île de Montréal entière (villes liées incluses).
- Q: Les déplacements motorisés colorent-ils les rues ? → A: Oui, tout déplacement compte.
- Q: Le fond de carte peut-il être téléchargé depuis un service externe, ou doit-il être
  embarqué ? → A: Aucun fond de carte téléchargé ; seules les rues embarquées sont dessinées sur
  un fond uni, entièrement hors ligne.
- Q: Quand l'utilisateur touche une rue sur la carte, faut-il afficher des informations ? → A:
  Oui : nom de la rue, pourcentage de points visités, état textuel et longueur du tronçon.
- Q: Les points d'une rue proches d'une intersection simplement traversée comptent-ils comme
  visités ? → A: Oui ; tout point à moins de 25 m d'une position est visité, quelle que soit la
  rue empruntée (un tronçon très court peut ainsi être complété en le traversant).

### Session 2026-10-08 (retours du premier essai sur iPhone)

- Q: Faut-il une carte 3D avec bâtiments, comme Plans ? → A: Non ; la carte reste en 2D, sans fond
  de carte téléchargé (FR-001a inchangée, principe I de la constitution respecté).
- Q: Que montre la carte quand on dézoome au-delà d'un quartier ? → A: Les arrondissements et
  villes liées, colorés selon le pourcentage parcouru de leurs rues ; les rues réapparaissent en
  zoomant. Cette progression par quartier est la seule « statistique » admise en v1.

### Session 2026-10-08 (deuxième essai sur iPhone)

- Q: Faut-il pouvoir dézoomer au-delà de l'île ? → A: Non ; le dézoom s'arrête quand l'île entière
  est visible et la carte ne peut pas être déplacée loin de l'île.
- Q: Où afficher l'échelle ? → A: En bas à droite, en permanence.
- Q: Les rues doivent-elles rester visibles en dézoomant ? → A: Oui, toutes les rues, à tous les
  niveaux de zoom (remplace la bascule rues → quartiers de la session précédente).
- Q: Que faire des noms de quartiers, de routes, etc. affichés hors de l'île ? → A: Aucun nom ni
  élément cartographique ne provenant pas de l'app ne doit apparaître.
- Q: Que devient la coloration des quartiers ? → A: Une teinte légère sous les rues, au dézoom.

**Input**: User description: "Une application mobile pour découvrir Montréal à pied. L'utilisateur voit une carte de la ville. Quand l'application est ouverte et qu'il se déplace, les rues qu'il parcourt se colorent de façon permanente sur la carte ; les rues jamais parcourues restent dans une couleur neutre. Chaque rue est représentée par une suite de points ; un point est visité quand l'utilisateur passe à moins de 25 mètres, et une rue est complétée quand au moins 90 % de ses points sont visités. Les rues partiellement parcourues sont visibles comme telles. L'historique est conservé entre les sessions et stocké uniquement sur l'appareil. L'utilisateur peut effacer tout son historique. Les autoroutes, tunnels et voies privées sont exclus. Hors périmètre pour cette version : suivi en arrière-plan, statistiques, badges, comptes, autres villes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voir les rues se colorer en marchant (Priority: P1)

L'utilisateur ouvre l'application et voit une carte de Montréal où toutes les rues éligibles
apparaissent dans une couleur neutre, ainsi que sa position actuelle. Il marche avec
l'application ouverte : au fur et à mesure, les rues qu'il emprunte changent d'apparence —
d'abord « partiellement parcourue », puis « complétée » lorsqu'il en a couvert au moins 90 %.

**Why this priority**: c'est le cœur de l'application ; sans cette boucle, il n'y a aucun produit.

**Independent Test**: marcher le long d'une rue courte avec l'application ouverte et constater
qu'elle passe de l'état neutre à « partiellement parcourue », puis à « complétée ».

**Acceptance Scenarios**:

1. **Given** l'utilisateur n'a jamais rien parcouru, **When** il ouvre l'application,
   **Then** la carte de Montréal s'affiche, centrée sur sa position, avec toutes les rues
   éligibles dans la couleur neutre.
2. **Given** l'application est ouverte, **When** l'utilisateur passe à moins de 25 m d'un point
   d'une rue, **Then** ce point est marqué visité et la rue apparaît comme partiellement
   parcourue.
3. **Given** une rue dont 89 % des points sont visités, **When** l'utilisateur visite un point
   supplémentaire qui porte le taux à 90 % ou plus, **Then** la rue apparaît comme complétée.
4. **Given** l'utilisateur marche, **When** une rue change d'état, **Then** la carte reflète le
   nouvel état en quelques secondes, sans action de sa part.
5. **Given** la carte est affichée, **When** l'utilisateur touche un tronçon, **Then** il voit
   le nom de la rue, son pourcentage de points visités, son état et sa longueur.

---

### User Story 2 - Retrouver sa progression d'une session à l'autre (Priority: P2)

L'utilisateur ferme l'application (ou redémarre son téléphone) puis la rouvre plus tard : toutes
les rues parcourues et complétées précédemment sont toujours affichées dans leur état.

**Why this priority**: la coloration « permanente » n'a de valeur que si elle survit aux sessions.

**Independent Test**: parcourir une rue, fermer complètement l'application, la rouvrir et
vérifier que la rue conserve son état.

**Acceptance Scenarios**:

1. **Given** l'utilisateur a visité des points lors d'une session précédente, **When** il rouvre
   l'application, **Then** les mêmes rues apparaissent dans le même état qu'à la fermeture.
2. **Given** l'appareil n'a pas de connexion réseau, **When** l'utilisateur rouvre
   l'application, **Then** sa progression s'affiche quand même.

---

### User Story 3 - Effacer tout son historique (Priority: P3)

L'utilisateur choisit d'effacer son historique. Après confirmation, toutes les rues reviennent à
l'état neutre et aucune donnée de parcours ne subsiste sur l'appareil.

**Why this priority**: contrôle de l'utilisateur sur ses données de localisation (vie privée),
mais non nécessaire pour faire la démonstration du cœur du produit.

**Independent Test**: après avoir parcouru quelques rues, effacer l'historique et vérifier que
toutes les rues sont neutres, y compris après redémarrage de l'application.

**Acceptance Scenarios**:

1. **Given** l'utilisateur a un historique, **When** il demande l'effacement, **Then** une
   confirmation explicite lui est demandée avant toute suppression.
2. **Given** la confirmation est affichée, **When** l'utilisateur annule, **Then** rien n'est
   effacé.
3. **Given** l'utilisateur confirme, **When** l'effacement se termine, **Then** toutes les rues
   sont dans l'état neutre et le restent après redémarrage de l'application.

---

### User Story 4 - Embrasser toute l'île et sa progression par quartier (Priority: P2)

L'utilisateur peut dézoomer jusqu'à voir l'île entière, et pas au-delà. Toutes les rues restent
dessinées à tous les niveaux de zoom, avec leurs états ; au dézoom, chaque arrondissement ou
ville liée est légèrement teinté selon la part de ses rues déjà parcourue. Une échelle en bas à
droite indique les distances. Rien d'autre n'apparaît sur la carte : ni noms, ni routes, ni
éléments venant d'ailleurs que de l'app.

**Why this priority**: sans cette vue, la carte dézoomée est inutilisable (retours des essais
sur iPhone) ; elle donne aussi la vue d'ensemble qui motive l'exploration.

**Independent Test**: dézoomer au maximum : l'île entière est visible avec toutes ses rues, le
dézoom s'arrête là, aucun nom n'apparaît, l'échelle se met à jour ; un arrondissement où des
rues ont été parcourues est teinté et le toucher affiche son pourcentage.

**Acceptance Scenarios**:

1. **Given** la carte est zoomée sur une rue, **When** l'utilisateur dézoome au maximum,
   **Then** le dézoom s'arrête quand l'île entière est visible, et toutes les rues restent
   dessinées avec leurs états.
2. **Given** la carte, **When** l'utilisateur la fait glisser loin de l'île, **Then** elle
   s'arrête de façon à garder l'île à l'écran.
3. **Given** un niveau de zoom quelconque, **When** l'utilisateur regarde la carte, **Then**
   aucun nom, route ou élément cartographique extérieur à l'app n'est visible, et une échelle en
   bas à droite indique une distance arrondie (ex. « 500 m », « 2 km »).
4. **Given** la carte dézoomée au-delà de l'échelle d'un quartier, **When** elle s'affiche,
   **Then** chaque arrondissement est légèrement teinté selon son pourcentage parcouru (neutre à
   0 %), sous les rues.
5. **Given** la carte dézoomée, **When** l'utilisateur touche un arrondissement, **Then** il voit
   son nom, son pourcentage parcouru (une décimale) et la longueur totale de ses rues.
6. **Given** la carte dézoomée, **When** l'utilisateur visite de nouveaux points, **Then** la
   teinte et le pourcentage de son arrondissement se mettent à jour sans action de sa part.

---

### Edge Cases

- L'utilisateur refuse la permission de localisation : la carte reste consultable (progression
  existante visible), un message en français explique pourquoi la localisation est nécessaire
  et comment l'activer ; aucun point n'est enregistré.
- La précision de la position est mauvaise (incertitude supérieure à 25 m, ex. entre de grands
  immeubles) : la position est ignorée pour le calcul des points visités, afin d'éviter de
  colorer des rues non parcourues.
- L'utilisateur se trouve hors de l'île de Montréal : la carte s'affiche, aucun point n'est visité, rien
  ne plante.
- L'utilisateur passe sous une autoroute ou au-dessus d'un tunnel : ces voies étant exclues,
  elles ne se colorent jamais et n'apparaissent pas comme rues à parcourir.
- Un point se trouve à moins de 25 m de plusieurs rues (intersection) : il est visité pour
  chacune des rues auxquelles il appartient.
- L'utilisateur traverse une rue à une intersection sans l'emprunter : les points de cette rue
  situés à moins de 25 m de ses positions sont visités, sans filtrage par direction ni exclusion
  des abords d'intersection ; un tronçon très court peut ainsi devenir partiellement parcouru,
  voire complété. Ce comportement est accepté en v1.
- L'application passe en arrière-plan ou l'écran se verrouille : aucun point n'est enregistré
  pendant ce temps (suivi en arrière-plan hors périmètre) ; le suivi reprend au retour au
  premier plan.
- Saut de position (perte de signal puis reprise loin) : seuls les points proches des positions
  effectivement reçues sont visités ; aucun point n'est déduit entre deux positions éloignées.
- L'utilisateur se déplace en véhicule (voiture, bus, vélo) : tout déplacement compte ; les
  points sont visités selon les mêmes règles qu'à pied, sans filtrage par vitesse.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT afficher une carte de l'île de Montréal présentant toutes les rues
  éligibles, à tous les niveaux de zoom, ainsi que la position actuelle de l'utilisateur.
- **FR-001a**: La carte NE DOIT PAS utiliser de fond de carte téléchargé : elle se compose
  uniquement des tracés des rues embarqués dans l'application, dessinés sur un fond uni, et de la
  position de l'utilisateur ; aucun nom, étiquette ou élément cartographique ne provenant pas de
  l'app ne DOIT apparaître. L'application DOIT fonctionner entièrement hors ligne et n'émettre
  aucune requête réseau liée à la carte.
- **FR-002**: Le système DOIT représenter chaque rue éligible par une suite ordonnée de points
  répartis sur son tracé.
- **FR-003**: Le périmètre géographique couvert DOIT être l'île de Montréal entière, incluant
  les villes liées (ex. Westmount, Mont-Royal) ; les autres îles et la rive-sud/rive-nord sont
  exclues.
- **FR-004**: Le système DOIT exclure des rues éligibles les autoroutes, les tunnels et les voies
  privées.
- **FR-005**: Une « rue » au sens du suivi DOIT correspondre à un tronçon de voie compris entre
  deux intersections consécutives (ou entre une intersection et une extrémité) ; chaque tronçon
  a son propre état et ses propres points, et porte le nom de la voie à laquelle il appartient.
- **FR-006**: Lorsque l'application est ouverte au premier plan, le système DOIT marquer comme
  visité tout point situé à moins de 25 m d'une position reçue de l'utilisateur dont la
  précision est d'au plus 25 m, quels que soient le tronçon emprunté et la direction du
  déplacement.
- **FR-007**: Le système DOIT attribuer à chaque rue l'un de trois états : « non parcourue »
  (aucun point visité), « partiellement parcourue » (au moins un point visité et moins de 90 %)
  et « complétée » (au moins 90 % des points visités).
- **FR-008**: Le système DOIT afficher chaque état de rue de façon visuellement distincte ; les
  rues non parcourues DOIVENT apparaître dans une couleur neutre.
- **FR-008a**: Lorsque l'utilisateur touche un tronçon sur la carte, le système DOIT afficher le
  nom de la rue, le pourcentage de points visités (arrondi à l'entier inférieur), l'état textuel (« Non
  parcourue », « Partiellement parcourue », « Complétée ») et la longueur du tronçon (en mètres
  ou kilomètres). Toucher ailleurs sur la carte DOIT masquer ces informations.
- **FR-009**: Un point visité DOIT le rester définitivement (jusqu'à effacement de l'historique) ;
  l'état d'une rue ne peut que progresser.
- **FR-010**: Le système DOIT conserver les points visités entre les sessions, y compris après
  fermeture de l'application ou redémarrage de l'appareil.
- **FR-011**: Toutes les données de parcours DOIVENT être stockées uniquement sur l'appareil et
  ne jamais être transmises à l'extérieur.
- **FR-012**: Le système DOIT fonctionner sans compte utilisateur.
- **FR-013**: L'utilisateur DOIT pouvoir effacer l'intégralité de son historique, après une
  confirmation explicite.
- **FR-014**: Le système NE DOIT PAS enregistrer de positions lorsque l'application n'est pas au
  premier plan.
- **FR-015**: Le système DOIT demander la permission de localisation avec une explication en
  français et rester utilisable en consultation si elle est refusée.
- **FR-016**: Tous les textes de l'interface DOIVENT être en français.
- **FR-017**: Au-delà de l'échelle d'un quartier, le système DOIT teinter légèrement, sous les
  rues, les arrondissements et villes liées de l'île selon le pourcentage de points visités parmi
  tous les points de leurs rues, avec une teinte neutre à 0 % et de plus en plus soutenue par
  paliers (> 0 %, ≥ 1 %, ≥ 5 %, ≥ 15 %, ≥ 40 %). Les zones sans aucune rue éligible ne sont pas
  affichées. Les teintes DOIVENT se mettre à jour à chaque nouvelle visite.
- **FR-018**: Lorsque l'utilisateur touche une zone de la vue par quartier, le système DOIT
  afficher son nom, son pourcentage parcouru (arrondi au dixième inférieur) et la longueur totale
  de ses rues éligibles.
- **FR-019**: Le dézoom DOIT s'arrêter lorsque l'île entière est visible, et le déplacement de la
  carte DOIT être borné de façon à garder l'île à l'écran.
- **FR-020**: Le système DOIT afficher en permanence, en bas à droite, une échelle graphique
  dont la longueur représente une distance arrondie (1, 2 ou 5 × 10ⁿ mètres), mise à jour
  pendant le zoom.

### Key Entities

- **Rue (tronçon)** : portion d'une voie éligible entre deux intersections ; possède le nom de
  sa voie, un tracé, une longueur et une suite ordonnée de points. Son état (non parcourue / partiellement parcourue / complétée) découle de la
  proportion de ses points visités.
- **Point de rue** : position géographique appartenant à une rue ; visité ou non.
- **Historique de parcours** : ensemble des points visités, propre à l'appareil, persistant
  entre les sessions, effaçable en totalité.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Lors d'une marche au milieu du trottoir d'une rue avec une bonne réception, au
  moins 95 % des points de la portion longée sont marqués visités.
- **SC-002**: Une rue change d'état à l'écran au plus 5 secondes après le passage qui
  déclenche ce changement.
- **SC-003**: À la réouverture, 100 % des rues retrouvent l'état qu'elles avaient à la
  fermeture, et la progression s'affiche en moins de 3 secondes.
- **SC-004**: Après effacement confirmé, 0 point visité subsiste et 100 % des rues sont neutres.
- **SC-005**: Aucune donnée de localisation ne quitte l'appareil : 0 requête réseau émise par
  l'application pendant l'utilisation de la carte, vérifiable par inspection du trafic.
- **SC-006**: Une heure d'utilisation continue en marchant consomme au plus 10 % de la
  batterie d'un téléphone récent.
- **SC-007**: Un nouvel utilisateur voit sa première rue se colorer sans aucune aide ni
  configuration, dès ses premiers pas avec l'application ouverte.
- **SC-008**: Glisser et zoomer restent fluides (aucune saccade perceptible) à tous les niveaux
  de zoom, y compris avec l'île entière et toutes ses rues à l'écran.

## Assumptions

- Une seule personne utilise l'application par appareil ; pas de profils multiples.
- Le seuil de 25 m et le seuil de 90 % sont fixes en v1 (non réglables par l'utilisateur).
- L'espacement entre les points d'une rue est suffisamment fin pour qu'un piéton longeant la rue
  les visite tous (ordre de grandeur : quelques dizaines de mètres au plus) ; la valeur exacte
  est fixée au moment de la conception.
- Les données des rues de Montréal sont fournies avec l'application ou obtenues sans transmettre
  aucune information sur l'utilisateur ; elles ne sont pas mises à jour pendant la v1.
- Aucune connexion réseau n'est nécessaire : sans fond de carte téléchargé, l'application
  fonctionne entièrement hors ligne (rendu volontairement dépouillé : pas de parcs, bâtiments ni
  plans d'eau en v1).
- Les sentiers **nommés**, les ruelles (même sans nom) et les voies piétonnes publiques sont
  éligibles s'ils ne sont ni autoroute, ni tunnel, ni voie privée ; les sentiers sans nom (ex.
  chemins de parc) et les trottoirs cartographiés séparément sont exclus. Les voies rapides
  (grands axes de type autoroutier) sont traitées comme des autoroutes et exclues.
- L'état « partiellement parcourue » est représenté par une couleur distincte appliquée à toute la
  rue ; l'affichage de la portion exacte parcourue n'est pas requis en v1.
- Hors périmètre v1 : suivi en arrière-plan, statistiques (hormis la progression par quartier de
  FR-017), badges, comptes, autres villes, export/import de l'historique, carte 3D.
- Les zones de quartier sont dessinées selon les limites officielles, qui peuvent déborder sur
  l'eau ou d'autres îles ; leur pourcentage ne porte que sur les rues de l'île de Montréal.
- La carte n'est pas orientable (le nord reste en haut) ni inclinable en v1.
