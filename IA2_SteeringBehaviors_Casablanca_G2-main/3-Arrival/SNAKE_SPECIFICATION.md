# Spécification — Jeu « Serpents et rats »

## Objectif

La scène `3-Arrival` est un jeu dans lequel le joueur contrôle le premier serpent avec la souris, tandis que les serpents suivants sont pilotés par l’IA et chassent des rats animés. Tous les serpents ont un corps rose continu et utilisent Arrival. Les rats choisissent leurs propres points de promenade et fuient les serpents qui s’approchent.

## Architecture et chargement

- `vehicle.js` conserve la classe générique `Vehicle` et ses propriétés `pos`, `vel`, `acc`, `maxSpeed`, `maxForce` et `r`, ainsi que `arrive`, `seek`, `applyForce` et `update`.
- `snake.js` définit `Snake extends Vehicle`. La tête est l’instance `Snake`; le corps visuel est construit depuis un historique de positions, sans objets d’anneaux dessinés séparément.
- `rat.js` définit `Rat extends Vehicle`. Le rat réutilise `arrive()` pour rejoindre un point de promenade et calcule une force de fuite personnalisée quand un serpent est proche.
- `sketch.js` gère les populations, l’attribution persistante des cibles, les collisions, les compteurs, l’interface et la boucle de jeu.
- `index.html` charge, dans l’ordre, `vehicle.js`, `snake.js`, `rat.js`, puis `sketch.js` après les bibliothèques p5.js.
- `style.css` fournit le panneau de contrôle, ses curseurs, les compteurs, les boutons et l’écran de fin avec une palette pastel.
- `Vehicle.show()` n’est pas modifié ni utilisé pour dessiner les serpents ou les rats; la scène ne dessine aucun véhicule triangulaire ni marqueur rouge de souris.

## Serpents

Le premier serpent est le serpent du joueur : sa tête utilise Arrival vers la position de la souris, sans clic. Son identité est conservée tant qu’il reste dans la population. Les serpents suivants sont pilotés par l’IA; chacun cible un rat vivant et conserve sa cible tant que le rat vit. Après une capture ou une suppression, une nouvelle cible est choisie. Le joueur peut toucher n’importe quel rat; un serpent IA ne peut capturer que le rat qu’il poursuit.

La tête du joueur applique `arrive(positionSouris, 0)`; les têtes IA appliquent `arrive(rat.pos, 0)`. Dans les deux cas, le mouvement passe par `applyForce()` et `update()`. La vitesse et la force maximale du joueur, ainsi que la vitesse des IA, sont configurables. Le serpent ne se téléporte jamais vers sa cible.

Le corps est une silhouette continue construite depuis l’historique du trajet de la tête. Des points espacés le long de cet historique définissent un axe central; une tangente et une normale à cet axe permettent de former les deux côtés du corps. Une courbe fermée p5.js lisse le contour. La largeur s’amincit vers une queue pointue. Une oscillation visuelle de faible amplitude varie avec le temps et la distance le long du corps, sans déplacer les éléments physiques ni produire de saut aux virages.

La tête est dessinée séparément au-dessus du corps, avec orientation selon la vitesse, yeux, narines, bouche animée et langue fourchue. La bouche s’ouvre progressivement à proximité d’un rat et reste ouverte pendant la courte animation de morsure. Le fond, le corps et la tête utilisent des teintes rose pastel, un contour, un reflet et une ombre légère.

La longueur du corps, la vitesse maximale et la force maximale sont propres aux instances et réglables par l’interface. En cas de modification de la longueur, l’historique est ajusté sans reconstruire la tête.

## Rats

Chaque rat possède un point de promenade qu’il rejoint avec Arrival. Il choisit une nouvelle destination quand il l’atteint ou après un délai, ce qui crée un déplacement autonome avec changements de direction. La vitesse est réglable.

Quand un serpent entre dans son rayon de fuite, le rat accélère dans la direction opposée au serpent le plus proche. Une force de bord l’oriente vers l’intérieur; la position est bornée selon son rayon. Le déplacement s’effectue par steering et intégration physique, jamais par téléportation vers la souris.

Le rendu personnalisé présente un corps gris-beige, une tête et un museau, des oreilles rondes, des yeux, un nez, des moustaches, quatre pattes animées et une longue queue ondulante. L’orientation suit la vitesse. Le rat n’utilise pas le rendu triangulaire de `Vehicle`.

## Capture

La capture est déclenchée lorsqu’un serpent touche le rat qu’il poursuit : la distance des centres est inférieure ou égale au rayon de collision de la tête plus le rayon du rat. Le rat est retiré une seule fois, le compteur de captures augmente et le serpent joue une animation de morsure. Un effet circulaire bref marque le contact. Les autres rats restent actifs; les serpents qui ont perdu leur cible en choisissent une nouvelle.

Quand aucun rat vivant ne reste, l’interface affiche un écran de fin avec un bouton de reprise. La reprise réinitialise les compteurs et recrée les populations configurées; si la population configurée de rats est nulle, elle en recrée cinq.

## Populations et interface

Les valeurs initiales sont deux serpents et cinq rats. Le premier serpent reste contrôlé par le joueur; les autres sont des IA. Ajouter ou retirer des personnages ajuste les tableaux sans réinitialiser les instances conservées. Une suppression par curseur ne compte pas comme une capture.

Le panneau affiche en temps réel le nombre de serpents, de rats vivants et de rats attrapés. Ses contrôles changent sans rechargement :

- nombre de serpents (0–8) et de rats (0–20);
- vitesse maximale et force maximale d’accélération du serpent joueur, vitesse des serpents IA;
- longueur du corps (130–420 px);
- distance d’ouverture de la bouche (35–220 px);
- vitesse des rats (0,5–5);
- distance de fuite (50–300 px).

Chaque curseur affiche sa valeur numérique. Le panneau et son bouton sont masquables par le bouton ou la touche H sans interrompre l’animation. La touche D conserve le basculement de `Vehicle.debug`.

## Ordre de mise à jour par image

1. Dessiner le fond pastel discret.
2. Mettre à jour les rats (promenade, fuite et limites).
3. Conserver ou attribuer une cible vivante aux serpents IA; le serpent joueur n’a pas de cible de rat pour son déplacement.
4. Diriger le joueur vers la souris et les IA vers leurs rats, puis animer les bouches selon la proximité d’un rat.
5. Détecter les contacts, dédupliquer les captures, retirer les rats attrapés et réattribuer les cibles.
6. Dessiner les rats, les silhouettes de serpents et les effets de capture.
7. Actualiser les compteurs et l’écran de fin.

## Critères de validation

- Le jeu démarre avec deux serpents et cinq rats; plusieurs de chaque peuvent coexister.
- Le premier serpent est piloté par la souris avec Arrival; tous les serpents suivants utilisent Arrival pour poursuivre des rats vivants.
- Le corps rose forme une seule silhouette lisse et ondulante, qui suit les virages de la tête et s’affine vers la queue; aucun anneau indépendant ni triangle n’est dessiné.
- Les rats se déplacent de manière autonome, changent de destination, fuient les serpents et restent dans le canvas.
- La bouche s’ouvre à l’approche; seul un contact valide déclenche la capture et l’incrémentation unique du compteur.
- Les curseurs actualisent les paramètres et les populations en direct; les compteurs distinguent rats vivants et rats attrapés.
- L’écran de fin permet de relancer le jeu; le masquage de l’interface ne suspend pas l’animation.
- Aucun cercle rouge ni curseur dessiné comme cible n’apparaît, aucune méthode générale de `Vehicle` n’est modifiée et aucun obstacle ou module externe n’est ajouté.
