# Spécifications du projet 1-Seek

Ce document rassemble les spécifications fonctionnelles et techniques pour le module `1-Seek`.

---

## Tâche 1 : Contrôle interactif des véhicules

### 1. Contexte et éléments concernés
L'exemple de base implémente un véhicule unique (`vehicle`) qui se déplace en direction de la position de la souris (`target`) en appliquant la méthode de pilotage `seek`.
Les éléments du code identifiés pour cette tâche sont :
- **`sketch.js`** : initialisation du canvas, boucle d'animation (`draw`), fonction `creerVehicules(nb)`, fonction `ajusterNombreVehicules(nouveauTotal)`, appel de `edges()` pour le franchissement torique des bords de l'écran, et création de l'interface DOM p5.js.
- **`vehicle.js`** : classe `Vehicle`, comprenant les propriétés physiques et de pilotage (`pos`, `vel`, `acc`, `maxSpeed`, `maxForce`) et les méthodes `seek(target)`, `applyForce(force)`, `update()`, `edges()`, `show()`.
- **`index.html` / `style.css`** : conteneur DOM et styles du panneau d'interface utilisateur en superposition.

---

### 2. Fonctionnalités attendues

1. **Nombre de véhicules dynamiques :**
   - Implémenter et conserver la fonction `creerVehicules(nb)` pour initialiser et ajouter des véhicules suiveurs.
   - Gérer un ensemble de vaisseaux représentés par des instances de la classe `Vehicle` regroupées au sein d'un tableau (`vehicles`).
   - Mettre à disposition un curseur permettant de modifier dynamiquement le nombre de véhicules affichés à l'écran.
   - En cas d'augmentation du curseur, instancier de nouveaux véhicules (avec une position initiale aléatoire sur le canvas).
   - En cas de diminution du curseur, réduire la taille du tableau en supprimant les véhicules excédentaires sans perturber ceux qui restent.

2. **Franchissement des bords (`edges()`) :**
   - Appliquer la méthode `edges()` sur chaque véhicule à chaque frame afin qu'il réapparaisse automatiquement du côté opposé lorsqu'il franchit les bords du canvas (comportement toroïdal).

3. **Vitesse maximale commune (`maxSpeed`) :**
   - Proposer un curseur dédié au réglage de la vitesse maximale (`maxSpeed`).
   - La valeur sélectionnée doit être partagée et appliquée à l'ensemble des véhicules actifs dans la simulation.

4. **Force maximale commune (`maxForce` ou steering force) :**
   - Proposer un curseur dédié au réglage de la force maximale de pilotage (`maxForce`).
   - La valeur sélectionnée doit borner la force de direction calculée par la méthode `seek()` pour tous les véhicules, déterminant directement leur maniabilité et leur rayon de braquage.

5. **Mise à jour en temps réel :**
   - Toute manipulation d'un curseur doit être immédiatement visible et effective à l'écran au fil des frames de la boucle `draw()`.
   - Les changements ne doivent nécessiter aucun rechargement de page (`F5`) ni interruption de la simulation.
   - Les valeurs numériques associées aux curseurs doivent s'actualiser dynamiquement pour afficher en direct les valeurs choisies.

6. **Comportement cohérent et synchronisé :**
   - L'ensemble des véhicules doit appliquer simultanément les valeurs courantes de vitesse et de force.
   - Tout nouveau véhicule créé suite à l'augmentation du nombre de vaisseaux doit hériter des paramètres courants définis par les curseurs.
   - L'augmentation ou la diminution du nombre de véhicules doit préserver la continuité du mouvement des vaisseaux déjà existants (pas de repositionnement intempestif des véhicules conservés).
   - Tous les véhicules doivent continuer à poursuivre la cible (`target` liée à la souris) via l'algorithme `seek`.

---

### 3. Spécification détaillée des curseurs véhicules

| Curseur | Propriété ciblée | Valeur Min | Valeur Max | Valeur par défaut | Pas (Step) | Description & Effet |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Nombre de véhicules** | Taille du tableau de véhicules | 1 | 100 | 15 | 1 | Règle le nombre d'instances de `Vehicle` actives et affichées via `ajusterNombreVehicules()`. |
| **Vitesse maximale** | `Vehicle.maxSpeed` | 1 | 20 | 4 | 0.5 | Règle le plafond de vitesse pour l'ensemble des véhicules. |
| **Force maximale** | `Vehicle.maxForce` | 0.02 | 1.5 | 0.1 | 0.02 | Règle la force de braquage / capacité de virage des véhicules. |

---

### 4. Critères d'acceptation et de vérification (Tâche 1)

- [x] **Fonction `creerVehicules(nb)` présente et opérationnelle :** Utilisée pour initialiser et compléter le tableau `vehicles`.
- [x] **Comportement aux bords (`edges()`) fonctionnel :** Tout véhicule dépassant les limites du canvas réapparaît sur le bord opposé sans disparaître.
- [x] **Interface de contrôle visible et fonctionnelle :** Les 3 curseurs véhicules sont présents sur l'interface avec leurs libellés et l'affichage de leur valeur courante.
- [x] **Gestion dynamique de la population de véhicules :** L'ajustement du curseur modifie instantanément la flotte sans saccade ni rechargement de page.
- [x] **Application uniforme et immédiate de `maxSpeed` et `maxForce` :** Tous les véhicules actuels et futurs appliquent immédiatement les nouvelles contraintes.
- [x] **Maintien du comportement Steering (`seek`) :** Tous les véhicules poursuivent continuellement la position du curseur de la souris.

---

## Tâche 2 : Arrière-plan psychédélique (Plasma) et contrôles dédiés

### 1. Contexte et objectifs
L'effet plasma psychédélique est intégré en arrière-plan afin d'enrichir visuellement la simulation sans jamais altérer ni casser les fonctionnalités de Steering Behaviors du TP initial.
Pour garantir une cadence d'affichage optimale de **60 FPS constants**, le rendu du plasma est calculé sur un buffer hors-écran (`plasmaBuffer`) à résolution adaptée et redimensionné avec lissage bilinéaire sur le canvas principal.

---

## Tâche 3 : Personnalisation visuelle pastel & ambiance sonore relaxante

### 1. Contexte et objectifs
Donner à la simulation une atmosphère harmonieuse, douce et poétique inspirée du style pastel moderne, tout en intégrant des obstacles contrastés et une ambiance sonore relaxante entièrement autonome.

---

### 2. Fonctionnalités attendues

1. **Arrière-plan Pastel & Blobs lumineux :**
   - Fond de toile teinté en rose clair doux : `#FCE7F3` (`rgb(252, 231, 243)`).
   - Animation plasma douce avec une table de dégradés pastel harmonieuse : rose pastel (`#FBCFE8`), lilas (`#E9D5FF`), lavande (`#DDD6FE`), bleu ciel (`#BAE6FD`) et pêche (`#FED7AA`).
   - Blobs lumineux flottants (`PastelBlob`) animés par du bruit de Perlin et réagissant subtilement à la proximité de la souris.

2. **Véhicules en nuances de rose :**
   - Répartition équilibrée de la flotte en 3 nuances distinctes : rose pastel (`#F9A8D4`), rose vif (`#EC4899`) et rose framboise (`#BE185D`).
   - Forme aérodynamique reconnaissable avec contour blanc pastel, cockpit lumineux et ombre douce.
   - Vecteur vitesse matérialisé en rose framboise foncé (`#9D174D`) pour un contraste immédiat.

3. **Ambiance sonore relaxante (Web Audio API synthétisé) :**
   - Génération sonore purement native via l'API Web Audio (`AudioContext`), sans dépendance externe ni fichier manquant.
   - Nappe harmonique relaxante basée sur un accord de Fa Majeur 9 filtrée par passe-bas, enrichie de carillons pentatoniques lofi.
   - Bouton **Lecture / Pause** interactif et curseur de volume (0 à 100%).

---

## Tâche 4 : Suppression totale des obstacles (Zone de jeu épurée)

Conformément à la consigne de simplification, les obstacles noirs et tous les mécanismes associés ont été entièrement retirés du projet :
- **Suppression du rendu et des instances :** Aucun obstacle n'apparaît à l'écran, quel que soit le mode sélectionné ou après un changement de mode.
- **Suppression de la création automatique :** Aucune instance n'est créée ni générée au démarrage (`creerObstacles` supprimé).
- **Désactivation de la logique d'évitement :** La méthode `avoid()` ne calcule plus de force d'évitement et renvoie un vecteur nul sans erreur.
- **Nettoyage de l'interface :** Le bouton de régénération des obstacles (« ⟳ Régénérer obstacles ») et le raccourci clavier `R` ont été retirés.
- **Zone de jeu épurée :** La scène contient exclusivement les véhicules roses et les cibles requises par le mode actif.

---

## Tâche 5 : Confinement strict dans le canvas & Cible autonome circulaire (`Target`)

### 1. Contexte et objectifs
Garantir que les vaisseaux ne sortent jamais du canvas, même temporairement, tout en confiant la poursuite à une ou plusieurs cibles autonomes circulaires (`Target extends Vehicle`) dotées d'un comportement torique aux bords de l'écran.

### 2. Spécifications techniques
1. **Classe `Target` héritant de `Vehicle` :**
   - Représentée sous forme circulaire avec rayon $r = 24$, contraste fuchsia/framboise (`#BE185D`) et anneau stylisé.
   - Déplacement autonome fluide sans tremblement ni saccade via un algorithme Wander adapté (angles lissés `random(-0.06, 0.06)`).
   - Les véhicules poursuivent la cible la plus proche (`cibleLaPlusProche(vehicle, targets)`) au lieu du curseur de la souris.
2. **Franchissement toroïdal de la cible :**
   - Contrairement aux véhicules, les cibles conservent leur comportement de repliement torique (`edges()`) : lorsqu'elles dépassent un bord, elles réapparaissent sur le bord opposé.
3. **Maintien absolu des véhicules dans le canvas :**
   - **Steering de bordure (`boundaries(margin)`) :** Force de pilotage douce orientant les vaisseaux vers l'intérieur dès qu'ils s'approchent à moins de 60 pixels d'un bord.
   - **Protection rigide (`edges()`) :** Prise en compte du rayon $r$ du véhicule : $x \in [r, \text{width} - r]$, $y \in [r, \text{height} - r]$. Si contact avec la bordure, la position est bridée et la composante normale de vitesse est amortie ($v \times -0.2$). Aucun véhicule ne peut franchir le bord.
4. **Réapparition aléatoire sécurisée :**
   - Lorsqu'un véhicule atteint sa cible ($d < r_{cible} + r_{vehicule}$), il réapparaît aléatoirement à des coordonnées valides avec marge de sécurité garantie.
   - Option / case à cocher permettant de faire réapparaître également la cible lors d'un contact.

---

## Tâche 6 : Mode « La cible fuit les vaisseaux » & Multi-Cibles

### 1. Contexte et objectifs
Implémenter le mode interactif avancé **« La cible fuit les vaisseaux »** (sélectionnable dans le menu déroulant avec ce nom exact), avec gestion simultanée de plusieurs cibles autonomes et affichage contextuel des commandes.

### 2. Algorithmes et règles de fonctionnement

1. **Rayon de détection & Fuite combinée de Craig Reynolds :**
   - Rayon initial de **200 pixels** (réglable par curseur de 50 à 500 px).
   - Visible **uniquement** lorsque le mode « La cible fuit les vaisseaux » est actif.
   - Détection en temps réel de tous les vaisseaux dans le rayon (`calculateCombinedFleeForce`).
   - Combinaison vectorielle des directions de fuite pondérées inversement par la distance relative ($\vec{d}_{norm} / dist$), assurant une trajectoire d'échappement fluide et cohérente face à une meute de vaisseaux.
2. **Hystérésis et fin de poursuite :**
   - Distance de fin de fuite initiale de **300 pixels** (réglable par curseur de 100 à 600 px).
   - Mémorisation de l'état : la cible continue de fuir tant qu'au moins un vaisseau reste à portée.
   - Fin de poursuite dès que tous les vaisseaux sont hors de portée : retour au repos et récupération de l'endurance.
3. **Accélération temporaire & Gestion de la fatigue :**
   - Régime normal : vitesse max = 3.0, force max = 0.15.
   - Régime fuite accélérée : vitesse max = 6.5 (réglable de 3.0 à 12.0), force max = 0.4.
   - Durée max d'accélération : **2.0 secondes** par épisode (réglable de 0.5 à 6.0 s).
   - À l'expiration du temps, passage à l'état fatigué avec vitesse et force réduites.
4. **Barre d'endurance visuelle :**
   - Affichée centrée au-dessus de la cible **uniquement pendant qu'elle fuit**.
   - Dégradé tricolore dynamique : vert pastel (> 60%), orange pêche (25% - 60%), rouge framboise (< 25%).
   - Indication textuelle "FATIGUÉE" au terme du sprint. Masquée automatiquement au repos.

---

## Tâche 7 : Curseur multi-cibles & Duplication cellulaire autonome

### 1. Curseur du nombre de cibles
- Curseur **« Nombre de cibles »** (1 à 15 cibles, valeur par défaut 1).
- Affichage direct de la valeur numérique sélectionnée.
- Actualisation instantanée :
  - En cas d'augmentation, de nouvelles instances de `Target` sont créées avec des positions initiales distinctes et sécurisées sur le canvas.
  - En cas de diminution, seules les cibles excédentaires sont retirées (`splice`).
- Chaque cible dispose de sa propre position, vitesse, état de fatigue et horloge de duplication.
- Les vaisseaux poursuivent dynamiquement la cible la plus proche d'eux.

### 2. Duplication cellulaire biologique (Mitose 0,7 s)
- Curseur **« Temps de duplication (s) »** (3 à 30 secondes, valeur par défaut 10 s).
- Chaque cible possède son propre chronomètre de survie indépendant (`lastDuplicationTime`).
- Lorsque le temps de duplication est atteint :
  1. La cible enclenche son animation de division (`isSplitting = true`, durée fixée à 700 ms).
  2. Le disque se scinde visuellement en deux demi-cercles distincts (`arc(..., CHORD)`).
  3. Les deux moitiés s'écartent perpendiculairement à la direction de déplacement le long d'un pont élastique.
  4. Au terme des 0,7 seconde, une nouvelle instance distincte de `Target` est formellement insérée dans le tableau `targets` du moteur physique.
  5. Les compteurs de duplication des deux cibles (parente et enfant) sont remis à zéro.
  6. Le curseur du nombre de cibles est automatiquement synchronisé avec la nouvelle population.
  7. Chaque nouvelle cible reprend une forme circulaire complète et poursuit son comportement autonome, pouvant à son tour se dupliquer.

### 3. Affichage conditionnel des contrôles
- Les curseurs spécifiques à la cible fuyante (**Rayon de détection**, **Distance de fin de fuite**, **Durée d'accélération**, **Vitesse de fuite**) ne sont visibles que lorsque le mode **« La cible fuit les vaisseaux »** est sélectionné.
- Les curseurs de population des cibles (**Nombre de cibles**, **Temps de duplication**, cases à cocher) sont visibles dans les modes à cibles (`seek`, `flee`, `flee_target`) et automatiquement masqués en mode **« Suivre la souris »**.

---

### Tableau complet et actualisé des contrôles

| Catégorie | Contrôle | Type | Plage / Valeurs | Défaut | Visibilité conditionnelle | Effet |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **Comportement** | Sélection du mode | Menu déroulant | La cible fuit les vaisseaux, Suivre la cible (Seek), Fuir la cible (Flee), Suivre la souris | La cible fuit les vaisseaux | Toujours visible | Détermine le comportement global |
| **Cible & Mode Fuite** | Nombre de cibles | Curseur | 1 à 15 | 1 | Modes cibles | Nombre de cibles simultanées autonomes |
| **Cible & Mode Fuite** | Rayon détection cible (px) | Curseur | 50 à 500 px | 200 | Mode « La cible fuit les vaisseaux » | Rayon de détection des vaisseaux par la cible |
| **Cible & Mode Fuite** | Temps de duplication (s) | Curseur | 3 à 30 s | 10 | Modes cibles | Période de survie avant division cellulaire |
| **Cible & Mode Fuite** | Distance fin de fuite (px) | Curseur | 100 à 600 px | 300 | Mode « La cible fuit les vaisseaux » | Distance de sécurité requise pour cesser la fuite |
| **Cible & Mode Fuite** | Durée accélération (s) | Curseur | 0.5 à 6.0 s | 2.0 | Mode « La cible fuit les vaisseaux » | Temps maximal de sprint avant fatigue |
| **Cible & Mode Fuite** | Vitesse fuite cible | Curseur | 3.0 à 12.0 | 6.5 | Mode « La cible fuit les vaisseaux » | Vitesse de pointe de la cible en fuite |
| **Cible & Mode Fuite** | Duplication automatique | Case à cocher | Actif / Inactif | Actif | Modes cibles | Active ou désactive la mitose automatique |
| **Cible & Mode Fuite** | Réapparition cible touchée | Case à cocher | Actif / Inactif | Inactif | Modes cibles | Téléporte la cible sur contact avec un vaisseau |
| **Véhicules (TP)** | Nombre de véhicules | Curseur | 1 à 100 | 15 | Toujours visible | Nombre de vaisseaux suiveurs |
| **Véhicules (TP)** | Vitesse max (maxSpeed) | Curseur | 1 à 20 | 4 | Toujours visible | Vitesse maximale des vaisseaux |
| **Véhicules (TP)** | Force max (maxForce) | Curseur | 0.02 à 1.5 | 0.1 | Toujours visible | Force maximale de steering des vaisseaux |
| **Arrière-plan** | Intensité pastel | Curseur | 0 à 1 | 0.7 | Toujours visible | Teinte et présence du plasma pastel |
| **Arrière-plan** | Complexité plasma | Curseur | 1 à 10 | 3 | Toujours visible | Densité des ondes colorées |
| **Arrière-plan** | Vitesse animation | Curseur | 0 à 5 | 1 | Toujours visible | Vitesse d'évolution du fond et des blobs |
| **Arrière-plan** | Influence souris | Curseur | 0 à 5 | 1.5 | Toujours visible | Déformation du fond par le curseur |
| **Sonorisation** | Bouton Audio | Bouton | Play / Pause | Pause | Toujours visible | Démarre / suspend l'ambiance sonore |
| **Sonorisation** | Volume sonore | Curseur | 0 à 1 | 0.3 | Toujours visible | Volume de l'ambiance et des carillons |
