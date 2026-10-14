// =============================================================================
// Simulation 1-Seek : Classe Target (hérite de Vehicle)
// Cible circulaire autonome avec fuite prédictive, endurance et duplication cellulaire
// =============================================================================

class Target extends Vehicle {
  constructor(x, y) {
    // Couleur fuchsia / framboise contrastée (#BE185D)
    super(x, y, '#BE185D');

    // Rayon de la cible circulaire
    this.r = 24;

    // Paramètres de vitesse et force en déplacement normal (stable et fluide)
    this.normalMaxSpeed = 3.0;
    this.normalMaxForce = 0.15;
    this.maxSpeed = this.normalMaxSpeed;
    this.maxForce = this.normalMaxForce;

    // Paramètres en régime accéléré de fuite
    this.fleeMaxSpeed = 6.5;
    this.fleeMaxForce = 0.4;

    // Vitesse initiale aléatoire
    this.vel = p5.Vector.random2D().mult(this.normalMaxSpeed);

    // Paramètres configurables de fuite (TP Section 5)
    this.detectionRadius = 200; // Rayon de détection initial (200 px)
    this.fleeDistance = 300;    // Distance de fin de fuite (300 px)
    this.sprintDuration = 2.0;  // Durée maximale d'accélération (2.0 secondes)

    // Gestion de l'état de fuite (machine à états & hystérésis)
    // États possibles : 'normal' | 'fleeing' | 'fatigued'
    this.fleeState = 'normal';
    this.fleeStartTime = 0;

    // Angle d'errance pour le déplacement aléatoire (Wander doux et stable)
    this.wanderAngle = random(TWO_PI);

    // Système de duplication
    this.birthTime = millis();
    this.lastDuplicationTime = millis();
    this.isSplitting = false;
    this.splitStartTime = 0;
    this.splitDuration = 700; // Animation de séparation de 0,7 seconde
    this.splitAngle = 0;
  }

  // Déplacement normal autonome doux et stable (sans tremblements ni à-coups)
  wander() {
    this.wanderAngle += random(-0.06, 0.06);
    let circleRadius = 20;
    let circleDist = 60;

    let circleCenter = this.vel.copy().normalize().mult(circleDist);
    let displacement = p5.Vector.fromAngle(this.wanderAngle + this.vel.heading()).mult(circleRadius);
    let wanderForce = p5.Vector.add(circleCenter, displacement);
    wanderForce.limit(this.normalMaxForce * 0.7);
    this.applyForce(wanderForce);
  }

  // Comportement complet du mode « La cible fuit les vaisseaux »
  updateFleeBehavior(vehicles) {
    if (!vehicles || vehicles.length === 0) {
      this.resetFleeState();
      this.wander();
      return;
    }

    // 1. Détection des vaisseaux à portée du rayon de détection
    let threats = [];
    for (let v of vehicles) {
      let d = p5.Vector.dist(this.pos, v.pos);
      if (d < this.detectionRadius) {
        threats.push({ vehicle: v, dist: d });
      }
    }

    // 2. Machine à états (avec hystérésis et mémorisation)
    if (this.fleeState === 'normal') {
      if (threats.length > 0) {
        // Déclenchement de la fuite : démarrage du chronomètre
        this.fleeState = 'fleeing';
        this.fleeStartTime = millis();
        this.maxSpeed = this.fleeMaxSpeed;
        this.maxForce = this.fleeMaxForce;
      }
    } else {
      // Déjà en fuite ('fleeing' ou 'fatigued')
      // Vérification de la condition de fin de poursuite :
      // La cible continue de fuir tant qu'AU MOINS un vaisseau reste à moins de fleeDistance (300 px)
      let anyThreatNear = false;
      for (let v of vehicles) {
        let d = p5.Vector.dist(this.pos, v.pos);
        if (d < this.fleeDistance) {
          anyThreatNear = true;
          break;
        }
      }

      if (!anyThreatNear) {
        // Tous les vaisseaux sont au-delà de la distance de fuite : sortie propre de la fuite
        this.resetFleeState();
        this.wander();
        return;
      }

      // La fuite continue ! Gestion de l'accélération et de la fatigue (mesurée avec millis())
      if (this.fleeState === 'fleeing') {
        let elapsed = (millis() - this.fleeStartTime) / 1000;
        if (elapsed >= this.sprintDuration) {
          // Durée d'accélération écoulée : passage en état de fatigue
          this.fleeState = 'fatigued';
          this.maxSpeed = this.normalMaxSpeed;
          this.maxForce = this.normalMaxForce;
        } else {
          // Maintien des performances accélérées
          this.maxSpeed = this.fleeMaxSpeed;
          this.maxForce = this.fleeMaxForce;
        }
      } else if (this.fleeState === 'fatigued') {
        // En fatigue : vitesse et force normales conservées
        this.maxSpeed = this.normalMaxSpeed;
        this.maxForce = this.normalMaxForce;
      }
    }

    // 3. Calcul de la force de fuite ou déplacement normal stable
    if (this.fleeState === 'fleeing' || this.fleeState === 'fatigued') {
      // Trouver tous les véhicules dans la zone de fuite
      let threateningVehicles = vehicles.filter(v => p5.Vector.dist(this.pos, v.pos) < this.fleeDistance);
      if (threateningVehicles.length > 0) {
        let fleeForce = this.calculateCombinedFleeForce(threateningVehicles);
        this.applyForce(fleeForce);
      }
    } else {
      // En l'absence de vaisseaux, déplacement stable sans tremblements
      this.wander();
    }
  }

  // Calcul d'une force de fuite stable et pondérée contre plusieurs vaisseaux (Craig Reynolds)
  // Inverse la vitesse désirée et ajuste progressivement le mouvement
  calculateCombinedFleeForce(threateningVehicles) {
    let desired = createVector(0, 0);

    for (let v of threateningVehicles) {
      let d = p5.Vector.dist(this.pos, v.pos);
      if (d < 0.001) d = 0.001;

      // Vecteur unitaire d'éloignement, inversement pondéré par la distance
      let diff = p5.Vector.sub(this.pos, v.pos);
      diff.normalize();
      diff.div(d);
      desired.add(diff);
    }

    if (desired.magSq() > 0) {
      desired.setMag(this.maxSpeed);
      let steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxForce);
      return steer;
    }
    return createVector(0, 0);
  }

  // Vérification et exécution de la duplication automatique
  // Retourne une nouvelle instance de Target lorsque la duplication aboutit, sinon null
  checkDuplication(duplicationIntervalSeconds) {
    if (!duplicationIntervalSeconds || duplicationIntervalSeconds <= 0) return null;

    let now = millis();

    // 1. Déclenchement de la scission lorsque le temps de duplication est atteint
    if (!this.isSplitting) {
      let survivalElapsed = (now - this.lastDuplicationTime) / 1000;
      if (survivalElapsed >= duplicationIntervalSeconds) {
        this.isSplitting = true;
        this.splitStartTime = now;
        // Direction perpendiculaire à la vitesse courante pour un écartement naturel
        this.splitAngle = (this.vel.magSq() > 0.01) ? (this.vel.heading() + HALF_PI) : random(TWO_PI);
      }
    }

    // 2. Évolution de l'animation de séparation (environ 0,7 seconde)
    if (this.isSplitting) {
      let splitElapsed = now - this.splitStartTime;
      if (splitElapsed >= this.splitDuration) {
        // Fin de l'animation : création de deux objets distincts
        this.isSplitting = false;
        this.lastDuplicationTime = now; // Compteur de la première cible remis à zéro

        let sepOffset = p5.Vector.fromAngle(this.splitAngle).mult(this.r * 1.1);
        this.pos.add(sepOffset);

        // Deuxième cible créée à l'opposé avec son propre état indépendant
        let childPos = p5.Vector.sub(this.pos, p5.Vector.mult(sepOffset, 2));
        let childTarget = new Target(childPos.x, childPos.y);

        childTarget.vel = p5.Vector.fromAngle(this.splitAngle + PI).mult(this.normalMaxSpeed);
        childTarget.lastDuplicationTime = now; // Compteur de la nouvelle cible remis à zéro
        childTarget.detectionRadius = this.detectionRadius;
        childTarget.fleeDistance = this.fleeDistance;
        childTarget.sprintDuration = this.sprintDuration;
        childTarget.fleeMaxSpeed = this.fleeMaxSpeed;
        childTarget.fleeMaxForce = this.fleeMaxForce;

        return childTarget;
      }
    }

    return null;
  }

  // Réinitialisation de l'état de fuite et des temporisations
  resetFleeState() {
    this.fleeState = 'normal';
    this.fleeStartTime = 0;
    this.maxSpeed = this.normalMaxSpeed;
    this.maxForce = this.normalMaxForce;
  }

  // Repliement torique conforme au TP :
  // "La cible, contrairement aux véhicules, conserve son comportement de réapparition
  // du côté opposé lorsqu'elle quitte le canvas, conformément à la logique de edges()."
  edges() {
    if (this.pos.x > width + this.r) {
      this.pos.x = -this.r;
    } else if (this.pos.x < -this.r) {
      this.pos.x = width + this.r;
    }
    if (this.pos.y > height + this.r) {
      this.pos.y = -this.r;
    } else if (this.pos.y < -this.r) {
      this.pos.y = height + this.r;
    }
  }

  // Réapparition aléatoire entièrement située dans le canvas
  respawnInsideCanvas() {
    let margin = this.r + 30;
    this.pos.set(
      random(margin, width - margin),
      random(margin, height - margin)
    );
    this.vel = p5.Vector.random2D().mult(this.normalMaxSpeed);
    this.resetFleeState();
    this.lastDuplicationTime = millis();
    this.isSplitting = false;
  }

  // Affichage de la cible : cercle complet ou animation de scission en deux demi-cercles
  show(showDetectionZone = false) {
    push();

    // 1. Rayon de détection circulaire subtil (mode fuite)
    if (showDetectionZone && this.detectionRadius > 0) {
      push();
      noFill();
      if (this.fleeState === 'fleeing') {
        stroke(219, 39, 119, 120);
        strokeWeight(1.8);
      } else if (this.fleeState === 'fatigued') {
        stroke(225, 29, 72, 90);
        strokeWeight(1.5);
      } else {
        stroke(190, 24, 93, 40);
        strokeWeight(1.2);
      }
      drawingContext.setLineDash([6, 6]);
      circle(this.pos.x, this.pos.y, this.detectionRadius * 2);
      drawingContext.setLineDash([]);
      pop();
    }

    // 2. Dessin : Soit animation de séparation (2 demi-cercles), soit cercle complet
    if (this.isSplitting) {
      this.drawSplittingAnimation();
    } else {
      this.drawCompleteCircle();
    }

    pop();

    // 3. Barre d'endurance (affichée UNIQUEMENT pendant la fuite)
    if (!this.isSplitting && (this.fleeState === 'fleeing' || this.fleeState === 'fatigued')) {
      this.drawEnduranceBar();
    }
  }

  // Animation de séparation : le cercle se divise visuellement en deux demi-cercles qui s'écartent
  drawSplittingAnimation() {
    let splitElapsed = millis() - this.splitStartTime;
    let ratio = constrain(splitElapsed / this.splitDuration, 0, 1);
    let sepDist = ratio * this.r * 1.1;
    let angle = this.splitAngle;
    let dir = p5.Vector.fromAngle(angle);

    let mainColor = (this.fleeState === 'fleeing') ? "#DB2777" : ((this.fleeState === 'fatigued') ? "#9F1239" : "#BE185D");

    push();
    translate(this.pos.x, this.pos.y);

    // Halo lumineux vaporeux
    noStroke();
    fill(219, 39, 119, 30);
    circle(0, 0, this.r * 2.2 + sepDist);

    // Demi-cercle 1 s'écartant vers +dir
    push();
    translate(dir.x * (sepDist / 2), dir.y * (sepDist / 2));
    rotate(angle);
    fill(mainColor);
    stroke(255, 255, 255, 240);
    strokeWeight(2.2);
    arc(0, 0, this.r * 2, this.r * 2, -HALF_PI, HALF_PI, CHORD);
    fill(255);
    noStroke();
    circle(this.r * 0.28, 0, 5);
    pop();

    // Demi-cercle 2 s'écartant vers -dir
    push();
    translate(-dir.x * (sepDist / 2), -dir.y * (sepDist / 2));
    rotate(angle);
    fill(mainColor);
    stroke(255, 255, 255, 240);
    strokeWeight(2.2);
    arc(0, 0, this.r * 2, this.r * 2, HALF_PI, 3 * HALF_PI, CHORD);
    fill(255);
    noStroke();
    circle(-this.r * 0.28, 0, 5);
    pop();

    // Filament élastique de séparation
    if (ratio < 0.85) {
      stroke(255, 255, 255, map(ratio, 0, 0.85, 200, 0));
      strokeWeight(map(ratio, 0, 0.85, 2.5, 0.6));
      line(-dir.x * (sepDist / 2), -dir.y * (sepDist / 2), dir.x * (sepDist / 2), dir.y * (sepDist / 2));
    }

    // Libellé de division
    textAlign(CENTER, BOTTOM);
    textSize(8.5);
    textStyle(BOLD);
    fill("#9D174D");
    noStroke();
    text("SCISSION", 0, -this.r - 8);

    pop();
  }

  // Forme circulaire complète de la cible
  drawCompleteCircle() {
    push();
    // Halo lumineux extérieur doux
    noStroke();
    fill(219, 39, 119, 35);
    circle(this.pos.x, this.pos.y, this.r * 2 + 18);

    // Corps circulaire
    if (this.fleeState === 'fleeing') {
      fill("#DB2777"); // Rose vif éclatant en fuite rapide
    } else if (this.fleeState === 'fatigued') {
      fill("#9F1239"); // Framboise sombre en état de fatigue
    } else {
      fill("#BE185D"); // Framboise profond en état normal
    }

    stroke(255, 255, 255, 240);
    strokeWeight(2.5);
    circle(this.pos.x, this.pos.y, this.r * 2);

    // Anneau stylisé intérieur
    noFill();
    stroke(255, 255, 255, 180);
    strokeWeight(1.5);
    circle(this.pos.x, this.pos.y, this.r * 1.15);

    // Cœur lumineux blanc central
    fill(255);
    noStroke();
    circle(this.pos.x, this.pos.y, 6);
    pop();
  }

  // Barre d'endurance et jauge de fatigue (centrée au-dessus de la cible)
  drawEnduranceBar() {
    push();
    let barWidth = 52;
    let barHeight = 6;
    let barX = this.pos.x - barWidth / 2;
    let barY = this.pos.y - this.r - 18;

    // Calcul du ratio d'endurance restante (1.0 -> 0.0)
    let ratio = 0;
    if (this.fleeState === 'fleeing') {
      let elapsed = (millis() - this.fleeStartTime) / 1000;
      ratio = constrain(1 - elapsed / this.sprintDuration, 0, 1);
    }

    // Fond de la barre avec bordure pastel contrastée
    fill(255, 255, 255, 230);
    stroke("#831843");
    strokeWeight(1.2);
    rect(barX - 1, barY - 1, barWidth + 2, barHeight + 2, 4);

    // Dégradé de couleur dynamique selon l'endurance restante
    let barColor;
    if (ratio > 0.6) {
      barColor = color(52, 211, 153); // Vert pastel
    } else if (ratio > 0.25) {
      barColor = color(251, 146, 60); // Orange pêche
    } else {
      barColor = color(225, 29, 72);  // Rouge framboise
    }

    // Remplissage de la jauge
    noStroke();
    fill(barColor);
    if (ratio > 0) {
      rect(barX, barY, barWidth * ratio, barHeight, 3);
    }

    // Libellé de statut centré
    textAlign(CENTER, BOTTOM);
    textSize(8.5);
    textStyle(BOLD);
    if (this.fleeState === 'fatigued') {
      fill("#BE185D");
      text("FATIGUÉE", this.pos.x, barY - 2);
    } else {
      fill("#9D174D");
      text("ACCÉLÉRATION", this.pos.x, barY - 2);
    }

    pop();
  }
}