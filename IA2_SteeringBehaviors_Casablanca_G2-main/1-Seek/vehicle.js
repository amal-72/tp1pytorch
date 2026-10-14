// =============================================================================
// Simulation 1-Seek : Classe Vehicle
// Conforme au TP du professeur & comportements de pilotage (Craig Reynolds)
// =============================================================================

class Vehicle {
  constructor(x, y, color = "#F472B6") {
    // Position du véhicule
    this.pos = createVector(x, y);
    // Vitesse du véhicule
    this.vel = createVector(0, 0);
    // Accélération du véhicule
    this.acc = createVector(0, 0);
    // Vitesse maximale du véhicule
    this.maxSpeed = 4;
    // Force maximale appliquée au véhicule (rayon de braquage)
    this.maxForce = 0.1;
    // Rayon du véhicule
    this.r = 16;
    // Nuance de couleur rose assignée
    this.color = color;
  }

  // Application combinée des comportements de pilotage :
  // 1. Suivi ou fuite de la cible (seek ou flee)
  // 2. Maintien strict à l'intérieur du canvas (boundaries)
  applyBehaviors(target, behaviorType = 'seek') {
    // Compatibilité descendante si arguments passés sous ancienne forme
    if (typeof arguments[1] === 'string') {
      behaviorType = arguments[1];
    } else if (typeof arguments[3] === 'string') {
      behaviorType = arguments[3];
    }

    let targetPos = (target && target.pos) ? target.pos : target;

    // 1. Force de pilotage principale vers ou loin de la cible
    if (targetPos) {
      let mainForce;
      if (behaviorType === 'flee') {
        mainForce = this.flee(targetPos);
      } else {
        mainForce = this.seek(targetPos);
      }
      this.applyForce(mainForce);
    }

    // 2. Steering de bordure (maintien fluide vers l'intérieur à l'approche des limites)
    let boundaryForce = this.boundaries(60);
    this.applyForce(boundaryForce);
  }

  // Steering de bordure inspiré de Craig Reynolds :
  // Dirige les vaisseaux vers l'intérieur dès qu'ils s'approchent des limites du canvas
  boundaries(margin = 60) {
    let desired = null;

    if (this.pos.x < margin) {
      desired = createVector(this.maxSpeed, this.vel.y);
    } else if (this.pos.x > width - margin) {
      desired = createVector(-this.maxSpeed, this.vel.y);
    }

    if (this.pos.y < margin) {
      if (desired) {
        desired.y = this.maxSpeed;
      } else {
        desired = createVector(this.vel.x, this.maxSpeed);
      }
    } else if (this.pos.y > height - margin) {
      if (desired) {
        desired.y = -this.maxSpeed;
      } else {
        desired = createVector(this.vel.x, -this.maxSpeed);
      }
    }

    if (desired !== null) {
      desired.normalize();
      desired.mult(this.maxSpeed);
      let steer = p5.Vector.sub(desired, this.vel);
      steer.limit(this.maxForce * 1.6);
      return steer;
    }
    return createVector(0, 0);
  }

  // Évitement d'obstacles désactivé (obstacles supprimés)
  avoid() {
    return createVector(0, 0);
  }

  // Comportement Seek (Craig Reynolds) : se dirige vers une cible
  seek(target) {
    let targetPos = (target && target.pos) ? target.pos : target;
    // 1. Vitesse désirée orientée vers la cible
    let desiredSpeed = p5.Vector.sub(targetPos, this.pos);
    desiredSpeed.setMag(this.maxSpeed);

    // 2. Force de pilotage = vitesse désirée - vitesse courante
    let force = p5.Vector.sub(desiredSpeed, this.vel);
    force.limit(this.maxForce);

    return force;
  }

  // 1ère approche demandée par le TP pour flee : inverser la force renvoyée par seek() à l'aide de v.mult(-1)
  fleeBasic(target) {
    return this.seek(target).mult(-1);
  }

  // Implémentation correcte de flee() inspirée de Craig Reynolds :
  // 1. Inverser la vitesse désirée (s'éloigner de la cible)
  // 2. Calculer la différence avec la vitesse actuelle (desired - current)
  // 3. Limiter la force de steering à la force maximale autorisée (maxForce)
  flee(target) {
    let targetPos = (target && target.pos) ? target.pos : target;
    let desiredSpeed = p5.Vector.sub(this.pos, targetPos);
    desiredSpeed.setMag(this.maxSpeed);

    let force = p5.Vector.sub(desiredSpeed, this.vel);
    force.limit(this.maxForce);

    return force;
  }

  // Applique une force à l'accélération
  applyForce(force) {
    this.acc.add(force);
  }

  // Mise à jour de la physique (appelée à chaque frame)
  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  // Maintien strict à l'intérieur du canvas en tenant compte du rayon du véhicule
  edges() {
    let minX = this.r;
    let maxX = width - this.r;
    let minY = this.r;
    let maxY = height - this.r;

    if (this.pos.x < minX) {
      this.pos.x = minX;
      if (this.vel.x < 0) this.vel.x *= -0.2;
    } else if (this.pos.x > maxX) {
      this.pos.x = maxX;
      if (this.vel.x > 0) this.vel.x *= -0.2;
    }

    if (this.pos.y < minY) {
      this.pos.y = minY;
      if (this.vel.y < 0) this.vel.y *= -0.2;
    } else if (this.pos.y > maxY) {
      this.pos.y = maxY;
      if (this.vel.y > 0) this.vel.y *= -0.2;
    }
  }

  // Réapparition aléatoire entièrement située dans le canvas
  respawnInsideCanvas() {
    let margin = this.r + 25;
    this.pos.set(
      random(margin, width - margin),
      random(margin, height - margin)
    );
    this.vel.set(0, 0);
    this.acc.set(0, 0);
  }

  // Dessin du véhicule dans sa nuance de rose avec forme aérodynamique
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    // Ombre douce sous le véhicule
    noStroke();
    fill(190, 24, 93, 30);
    ellipse(0, 0, this.r * 2.2, this.r * 1.4);

    // Corps du véhicule aux tons roses avec contour blanc pastel
    stroke(255, 255, 255, 230);
    strokeWeight(1.8);
    fill(this.color);

    // Vaisseau profilé triangulaire
    triangle(-this.r, -this.r * 0.55, -this.r, this.r * 0.55, this.r * 1.15, 0);

    // Cockpit lumineux
    fill(255, 255, 255, 220);
    noStroke();
    ellipse(this.r * 0.1, 0, this.r * 0.55, this.r * 0.35);

    pop();

    // Dessin du vecteur vitesse avec contraste framboise
    this.drawVelocityVector();
  }

  // Visualisation du vecteur vitesse
  drawVelocityVector() {
    push();
    strokeWeight(2.5);
    stroke("#9D174D"); // Rose framboise soutenu
    line(this.pos.x, this.pos.y, this.pos.x + this.vel.x * 10, this.pos.y + this.vel.y * 10);
    
    let arrowSize = 5;
    translate(this.pos.x + this.vel.x * 10, this.pos.y + this.vel.y * 10);
    rotate(this.vel.heading());
    translate(-arrowSize / 2, 0);
    fill("#9D174D");
    noStroke();
    triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
    pop();
  }
}