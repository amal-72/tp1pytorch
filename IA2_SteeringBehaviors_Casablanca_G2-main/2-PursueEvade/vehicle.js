// =============================================================================
// Simulation 2-PursueEvade : Classe Vehicle (Vaisseau prédateur)
// Comportements Seek, Flee, Pursue (prédictif classique) & PursuePerfect (loi des sinus)
// =============================================================================

class Vehicle {
  constructor(x, y) {
    // Position du véhicule
    this.pos = createVector(x, y);
    // Vitesse du véhicule
    this.vel = createVector(0, 0);
    // Accélération du véhicule
    this.acc = createVector(0, 0);
    // Vitesse maximale du véhicule
    this.maxSpeed = 8;
    // Force maximale de braquage appliquée au véhicule
    this.maxForce = 0.35;
    // Rayon du véhicule
    this.r = 16;
    // Couleur pastel assignée
    this.color = '#EC4899'; // Rose vif
  }

  /*
   * seek : calcule la force de braquage vers une cible donnée
   */
  seek(target) {
    let targetPos = (target && target.pos) ? target.pos : target;
    // Direction vers la cible
    let desired = p5.Vector.sub(targetPos, this.pos);
    // Limite à maxSpeed
    desired.setMag(this.maxSpeed);
    // Force de steering : desired - vel
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  /*
   * flee : inverse de seek (s'éloigne d'une cible)
   */
  flee(target, distanceDeDetection = Infinity) {
    let targetPos = (target && target.pos) ? target.pos : target;
    let d = p5.Vector.dist(this.pos, targetPos);
    if (d <= distanceDeDetection) {
      return this.seek(targetPos).mult(-1);
    }
    return createVector(0, 0);
  }

  /*
   * pursue : poursuite prédictive d'un point devant la cible
   * @param {Target|Vehicle} target - La cible poursuivie
   * @param {number} predictionDistance - Distance spatiale de prédiction en pixels
   * @param {boolean} drawPrediction - Afficher ou non le point vert
   */
  pursue(target, predictionDistance = 80, drawPrediction = true) {
    if (!target) return createVector(0, 0);

    // 1 - Estimation de la position future de la cible
    // Convert the configured spatial distance into a time horizon from target speed.
    // The marker and steering target therefore use the same predicted position.
    const speed = target.vel.mag();
    const predictionTime = speed > 0.001 ? predictionDistance / speed : 0;
    let targetAhead = target.vel.copy();
    targetAhead.mult(predictionTime);
    targetAhead.add(target.pos);

    // 2 - Dessin du vecteur prédictif et du point vert
    if (drawPrediction) {
      this.drawVector(target.pos, target.vel.copy().mult(predictionTime));
      push();
      fill(34, 197, 94); // Vert vif
      stroke(255);
      strokeWeight(2);
      circle(targetAhead.x, targetAhead.y, 14);
      pop();
    }

    // 3 - Steering vers le point anticipé
    let force = this.seek(targetAhead);
    return force;
  }

  /*
   * evade : inverse de pursue (fuite prédictive)
   */
  evade(target, predictionDistance = 80) {
    let force = this.pursue(target, predictionDistance, false).mult(-1);
    return force;
  }

  /*
   * pursuePerfect : poursuite parfaite par triangulation géométrique (Loi des sinus)
   * Prédit le point exact de collision en tenant compte du ratio de vitesses
   */
  pursuePerfect(vehicle, fallbackPredictionDistance = 80) {
    if (!vehicle) return createVector(0, 0);

    const speed_ratio = vehicle.vel.mag() / Math.max(0.001, this.maxSpeed);
    const toTarget = p5.Vector.sub(this.pos, vehicle.pos);
    const target_angle = vehicle.vel.angleBetween(toTarget);
    const sinMyAngle = sin(target_angle) * speed_ratio;

    // Vérification de validité trigonométrique
    if (Math.abs(sinMyAngle) <= 1) {
      const my_angle = asin(sinMyAngle);
      const denom = sin(PI - my_angle - target_angle);
      if (Math.abs(denom) > 0.001) {
        const dist = this.pos.dist(vehicle.pos);
        const prediction = dist * sin(my_angle) / denom;
        if (prediction > 0 && !isNaN(prediction) && isFinite(prediction)) {
          const target = vehicle.vel.copy().setMag(prediction).add(vehicle.pos);

          // Affichage des vecteurs et flèches de la loi des sinus
          drawArrow(vehicle.pos, p5.Vector.mult(vehicle.vel, 15), 'red');
          drawArrow(this.pos, p5.Vector.sub(target, this.pos), 'green');

          push();
          fill(34, 197, 94);
          stroke(255);
          strokeWeight(2);
          circle(target.x, target.y, 10);
          pop();

          return this.seek(target);
        }
      }
    }

    // Repli de sécurité sur pursue classique si la trajectoire géométrique n'a pas d'interception
    return this.pursue(vehicle, fallbackPredictionDistance, true);
  }

  // Application de la force à l'accélération
  applyForce(force) {
    this.acc.add(force);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  // Dessin du prédateur sous forme de vaisseau aérodynamique pastel
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());

    // Ombre douce
    noStroke();
    fill(0, 0, 0, 25);
    triangle(-this.r + 2, -this.r / 2 + 2, -this.r + 2, this.r / 2 + 2, this.r + 2, 2);

    // Corps du vaisseau
    stroke(255);
    strokeWeight(2);
    fill(this.color);
    triangle(-this.r, -this.r / 2, -this.r, this.r / 2, this.r, 0);

    // Cockpit lumineux
    fill(255, 255, 255, 220);
    noStroke();
    circle(this.r * 0.2, 0, this.r * 0.45);

    pop();

    // Vecteur vitesse avec flèche
    this.drawVector(this.pos, this.vel.copy().mult(8));
  }

  drawVector(pos, v) {
    push();
    strokeWeight(2.5);
    stroke("red");
    line(pos.x, pos.y, pos.x + v.x, pos.y + v.y);
    let arrowSize = 5;
    translate(pos.x + v.x, pos.y + v.y);
    rotate(v.heading());
    translate(-arrowSize / 2, 0);
    fill("red");
    noStroke();
    triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
    pop();
  }

  // Repliement toroïdal aux limites du canvas
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
}

// Fonction utilitaire pour dessiner une flèche orientée
function drawArrow(base, vec, myColor) {
  push();
  stroke(myColor);
  strokeWeight(2.5);
  fill(myColor);
  translate(base.x, base.y);
  line(0, 0, vec.x, vec.y);
  rotate(vec.heading());
  let arrowSize = 6;
  translate(vec.mag() - arrowSize, 0);
  triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
  pop();
}
