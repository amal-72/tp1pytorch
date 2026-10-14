// =============================================================================
// Simulation 2-PursueEvade : Classe Leurre (Contre-mesure défensive)
// Hérite de Target - Détourne l'attention des prédateurs sans fuite
// =============================================================================

class Leurre extends Target {
  /**
   * @param {number} x - Position X initiale
   * @param {number} y - Position Y initiale
   * @param {p5.Vector} parentVel - Vecteur vitesse de la cible émettrice
   * @param {number} parentRadius - Rayon de la cible émettrice
   * @param {number} lifespanSeconds - Durée de vie en secondes (défaut 1.0s)
   */
  constructor(x, y, parentVel, parentRadius = 16, lifespanSeconds = 1.0) {
    super(x, y);

    // 1. Taille égale au quart de celle de la cible originale qui l'a créé
    this.r = Math.max(3, parentRadius / 4);

    // 2. Durée de vie en millisecondes basée sur le temps réel
    this.lifespan = lifespanSeconds * 1000;
    this.spawnTime = millis();

    // 3. Position initiale située derrière la cible dans un cône de dispersion
    let dirArriere = (parentVel && parentVel.magSq() > 0.001)
      ? parentVel.copy().normalize().mult(-1)
      : p5.Vector.random2D();

    let dispersionAngulaire = random(-PI / 5, PI / 5);
    let dirDispersion = dirArriere.copy().rotate(dispersionAngulaire);

    let distanceRecul = parentRadius * 1.2 + random(2, parentRadius * 0.8);
    this.pos = createVector(x, y).add(dirDispersion.copy().mult(distanceRecul));

    // 4. Vitesse initiale très faible et constante
    let vitesseLente = random(0.6, 1.4);
    this.vel = dirDispersion.copy().mult(vitesseLente);
    this.acc = createVector(0, 0);

    // 5. Propriétés spécifiques aux leurres
    this.rayonDetection = 0; // Pas de détection
    this.leurresRestants = 0; // Un leurre ne peut pas libérer d'autres leurres
    this.isLeurre = true;
  }

  // Aucun comportement de fuite : le leurre ne fuit jamais les prédateurs
  evade() {
    return createVector(0, 0);
  }

  // Désactivation de la détection et du largage pour les leurres
  updateBehavior() {
    // Les leurres n'ont aucun comportement de décision
  }

  // Déplacement linéaire simple et constant sans force de steering
  update() {
    this.pos.add(this.vel);
    // Pas d'accélération
    this.acc.set(0, 0);
  }

  // Vérifie si la durée de vie du leurre est écoulée
  isExpired() {
    return (millis() - this.spawnTime) >= this.lifespan;
  }

  // Ratio de vie restante [1 -> 0] pour l'animation visuelle
  getRemainingRatio() {
    let elapsed = millis() - this.spawnTime;
    return constrain(1 - elapsed / this.lifespan, 0, 1);
  }

  // Dessin du leurre sous forme de fusée éclairante pastel (Flare)
  show() {
    let ratio = this.getRemainingRatio();
    if (ratio <= 0) return;

    push();
    translate(this.pos.x, this.pos.y);

    // Halo lumineux qui s'estompe avec le temps
    noStroke();
    let alphaHalo = map(ratio, 0, 1, 30, 140);
    fill(254, 215, 170, alphaHalo); // Pêche lumineux
    circle(0, 0, this.r * 3.5 * ratio);

    // Corps brillant du leurre
    let alphaCore = map(ratio, 0, 1, 80, 240);
    stroke(255, 255, 255, alphaCore);
    strokeWeight(1);
    fill(251, 146, 60, alphaCore); // Ambre chaud
    circle(0, 0, this.r * 2);

    // Étincelle centrale blanche
    fill(255, 255, 255, alphaCore);
    noStroke();
    circle(0, 0, this.r);

    pop();
  }
}

// Alias pour compatibilité
const Leurres = Leurre;
