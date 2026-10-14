// =============================================================================
// Simulation 2-PursueEvade : Classe Target (Cible fuyante avec leurres)
// Hérite de Vehicle - Détecte les prédateurs, s'évade et libère des leurres
// =============================================================================

let targetGlobalIdCounter = 1;

class Target extends Vehicle {
  constructor(x, y, id = null) {
    super(x, y);

    this.id = id !== null ? id : targetGlobalIdCounter++;

    // Propriétés physiques de déplacement
    this.vel = p5.Vector.random2D().mult(random(3, 5));
    this.maxSpeed = 4.5;
    this.maxForce = 0.35;
    this.r = 16;

    // Rayon de détection réglable (distance à laquelle un prédateur est détecté)
    this.rayonDetection = 150;

    // Gestion des leurres (maximum strict de 10 leurres pour toute la session de vie)
    this.totalLeurresMax = 10;
    this.leurresRestants = 10;

    // Machine à états de détection et de fuite (1 seconde de fuite au déclenchement)
    this.detectionActive = false; // Verrouille le déclenchement tant que le prédateur reste dans le rayon
    this.isFleeing = false;
    this.fleeStartTime = 0;
    this.dureeFuite = 1000; // 1 seconde (1000 ms)

    // État de vie
    this.isDead = false;
  }

  /**
   * Analyse la présence des prédateurs, enclenche la fuite (1s) et libère les leurres
   * @param {Array<Vehicle>} predators - Liste des vaisseaux prédateurs actifs
   * @param {number} nbLeurresParDetection - Nombre de leurres à larguer par déclenchement (défaut 10)
   * @param {number} dureeDeVieLeurres - Durée de vie des leurres en secondes (défaut 1.0s)
   * @param {Array<Leurre>} leurresList - Tableau partagé des leurres actifs
   */
  updateBehavior(predators, nbLeurresParDetection = 10, dureeDeVieLeurres = 1.0, leurresList = []) {
    if (this.isDead || !predators || predators.length === 0) return;

    // 1. Recherche des prédateurs situés dans le rayon de détection
    let predateursProches = [];
    let plusProche = null;
    let distMin = Infinity;

    for (let p of predators) {
      let d = p5.Vector.dist(this.pos, p.pos);
      if (d <= this.rayonDetection) {
        predateursProches.push(p);
        if (d < distMin) {
          distMin = d;
          plusProche = p;
        }
      }
    }

    // 2. Gestion du déclenchement initial à l'entrée dans le rayon
    if (predateursProches.length > 0) {
      if (!this.detectionActive) {
        // Premier contact : activation de la détection
        this.detectionActive = true;
        this.isFleeing = true;
        this.fleeStartTime = millis();

        // Largage des leurres si la cible en possède encore
        let nbALarguer = Math.min(nbLeurresParDetection, this.leurresRestants);
        if (nbALarguer > 0) {
          for (let i = 0; i < nbALarguer; i++) {
            let leurre = new Leurre(this.pos.x, this.pos.y, this.vel, this.r, dureeDeVieLeurres);
            leurresList.push(leurre);
          }
          this.leurresRestants -= nbALarguer;
        }
      }
    } else {
      // Aucun prédateur dans le rayon : réarmement de la détection pour une prochaine entrée
      this.detectionActive = false;
    }

    // 3. Application du comportement de fuite evade() pendant la durée impartie (1 seconde)
    if (this.isFleeing) {
      let tempsEcoule = millis() - this.fleeStartTime;
      if (tempsEcoule < this.dureeFuite) {
        // Fuite prédictive active face au prédateur le plus menaçant
        let menace = plusProche || predators[0];
        if (menace) {
          let forceFuite = this.evade(menace);
          this.applyForce(forceFuite);
        }
      } else {
        // La seconde de fuite est terminée
        this.isFleeing = false;
      }
    } else if (predateursProches.length > 0) {
      // Si un prédateur est toujours dans le rayon après 1s, maintenir une fuite de sécurité douce
      let forceFuite = this.evade(plusProche);
      this.applyForce(forceFuite.mult(0.5));
    }
  }

  // Comportement evade() inspiré de Craig Reynolds (inversion prédictive sans affichage)
  evade(predator, predictionFrames = 15) {
    if (!predator) return createVector(0, 0);

    // Estimation future du prédateur
    let prediction = predator.vel.copy().mult(predictionFrames);
    let menaceFuture = p5.Vector.add(predator.pos, prediction);

    // Fuite du point anticipé
    let force = this.flee(menaceFuture);
    return force;
  }

  // Flee d'une position donnée
  flee(targetPos) {
    let desired = p5.Vector.sub(this.pos, targetPos);
    desired.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  show() {
    if (this.isDead) return;

    push();

    // 1. Cercle de détection visuel
    push();
    noFill();
    if (this.isFleeing) {
      stroke(239, 68, 68, 160); // Rouge pastel lors de l'alerte/fuite
      strokeWeight(1.5);
    } else if (this.detectionActive) {
      stroke(245, 158, 11, 140); // Orange pastel si prédateur dans le champ
      strokeWeight(1.2);
    } else {
      stroke(255, 255, 255, 70); // Blanc discret au repos
      strokeWeight(1);
    }
    circle(this.pos.x, this.pos.y, this.rayonDetection * 2);
    pop();

    // 2. Dessin de la cible (Disque fuchsia/framboise moderne)
    translate(this.pos.x, this.pos.y);

    // Halo d'alerte lors de la fuite
    if (this.isFleeing) {
      noStroke();
      fill(244, 114, 182, 90);
      circle(0, 0, (this.r + 8) * 2);
    }

    // Contour blanc doux
    stroke(255, 255, 255, 220);
    strokeWeight(2);
    fill(236, 72, 153); // Rose framboise vif (#EC4899)
    circle(0, 0, this.r * 2);

    // Cœur clair
    noStroke();
    fill(253, 242, 248);
    circle(0, 0, this.r * 0.8);

    // Anneau stylisé
    stroke(190, 24, 93);
    strokeWeight(1.5);
    noFill();
    circle(0, 0, this.r * 1.3);

    // 3. Indicateur compact des leurres restants (au-dessus de la cible)
    noStroke();
    fill(255, 255, 255, 220);
    textAlign(CENTER, BOTTOM);
    textSize(10);
    textStyle(BOLD);
    let label = `🎯 ${this.leurresRestants}`;
    text(label, 0, -this.r - 4);

    pop();
  }
}