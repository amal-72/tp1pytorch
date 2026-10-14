class Snake extends Vehicle {
  constructor(x, y, options = {}) {
    super(x, y);
    this.id = options.id ?? 0;
    this.size = options.size ?? 34;
    this.r = this.size * 0.5;
    this.bodyLength = options.bodyLength ?? 220;
    this.bodyWidth = options.bodyWidth ?? constrain(this.bodyLength * 0.105, 12, 36);
    this.maxSpeed = options.maxSpeed ?? 3.6;
    this.baseMaxSpeed = this.maxSpeed;
    this.speedBoostUntil = 0;
    this.speedBoostMultiplier = 1.5;
    this.maxForce = options.maxForce ?? 0.16;
    this.rayonZoneDeFreinage = 100;
    this.color = options.color ?? '#EC4899';
    this.colorLight = options.colorLight ?? '#F9A8D4';
    this.colorDark = options.colorDark ?? '#BE185D';
    this.heading = options.heading ?? random(TWO_PI);
    this.targetRatId = null;
    this.targetDistance = Infinity;
    this.ratsEaten = 0;
    this.mouthOpen = 0;
    this.mouthOpenDistance = options.mouthOpenDistance ?? 95;
    this.biteUntil = 0;
    this.pathSampleSpacing = 2.5;
    this.trail = [];
    this.geometryStep = 5;
    this.geometrySamples = Math.ceil(this.bodyLength / this.geometryStep) + 1;
    this.geometryLeftX = new Float32Array(this.geometrySamples);
    this.geometryLeftY = new Float32Array(this.geometrySamples);
    this.geometryRightX = new Float32Array(this.geometrySamples);
    this.geometryRightY = new Float32Array(this.geometrySamples);
    this.geometryCenterX = new Float32Array(this.geometrySamples);
    this.geometryCenterY = new Float32Array(this.geometrySamples);
    this.geometryTangentX = new Float32Array(this.geometrySamples);
    this.geometryTangentY = new Float32Array(this.geometrySamples);
    this.positionTolerance = 3;
    this.separationX = 0;
    this.separationY = 0;
    this.seedTrail();
  }

  seedTrail() {
    const backward = p5.Vector.fromAngle(this.heading + PI);
    for (let distance = this.bodyLength + 35; distance >= 0; distance -= this.pathSampleSpacing) {
      this.trail.push(p5.Vector.add(this.pos, p5.Vector.mult(backward, distance)));
    }
  }

  setBodyLength(length) {
    const previousLength = this.bodyLength;
    this.bodyLength = constrain(Number(length) || 220, 120, 420);
    this.bodyWidth = constrain(this.bodyLength * 0.105, 12, 36);
    const samples = Math.ceil(this.bodyLength / this.geometryStep) + 1;
    if (samples !== this.geometrySamples) {
      this.geometrySamples = samples;
      this.geometryLeftX = new Float32Array(samples);
      this.geometryLeftY = new Float32Array(samples);
      this.geometryRightX = new Float32Array(samples);
      this.geometryRightY = new Float32Array(samples);
      this.geometryCenterX = new Float32Array(samples);
      this.geometryCenterY = new Float32Array(samples);
      this.geometryTangentX = new Float32Array(samples);
      this.geometryTangentY = new Float32Array(samples);
    }
    this.r = Math.max(15, this.bodyWidth * 0.72);
    this.rayonZoneDeFreinage = Math.max(70, this.r * 5);

    if (this.bodyLength > previousLength && this.trail.length > 1) {
      let available = 0;
      for (let i = this.trail.length - 1; i > 0; i--) {
        available += p5.Vector.dist(this.trail[i], this.trail[i - 1]);
      }
      const missing = this.bodyLength + 45 - available;
      if (missing > 0) {
        let towardHead = p5.Vector.sub(this.trail[1], this.trail[0]);
        if (towardHead.magSq() < 0.001) towardHead = p5.Vector.fromAngle(this.heading);
        towardHead.normalize().mult(-1);
        const extension = [];
        for (let distance = missing; distance > 0; distance -= this.pathSampleSpacing) {
          extension.push(p5.Vector.add(this.trail[0], p5.Vector.mult(towardHead, distance)));
        }
        this.trail = extension.concat(this.trail);
      }
    }
  }

  setMovement(maxSpeed, maxForce) {
    this.baseMaxSpeed = constrain(Number(maxSpeed) || 3.6, 0.5, 9);
    this.maxSpeed = this.baseMaxSpeed * (millis() < this.speedBoostUntil ? this.speedBoostMultiplier : 1);
    this.maxForce = constrain(Number(maxForce) || 0.16, 0.02, 0.6);
  }

  activateSpeedBoost(duration = 5000) {
    const now = millis();
    this.speedBoostUntil = Math.max(this.speedBoostUntil, now) + duration;
    this.maxSpeed = this.baseMaxSpeed * this.speedBoostMultiplier;
  }

  updateSpeedBoost() {
    if (this.speedBoostUntil > 0 && millis() >= this.speedBoostUntil) {
      this.speedBoostUntil = 0;
      this.maxSpeed = this.baseMaxSpeed;
    }
  }

  update(target, mouthOpenDistance = this.mouthOpenDistance, distanceForMouth = null) {
    this.updateSpeedBoost();
    this.mouthOpenDistance = mouthOpenDistance;
    if (target) {
      const dx = target.x - this.pos.x;
      const dy = target.y - this.pos.y;
      const distanceSq = dx * dx + dy * dy;
      this.targetDistance = distanceForMouth ?? Math.sqrt(distanceSq);

      // A small dead zone prevents noisy steering around a stationary cursor.
      // Clear residual acceleration and settle only once the snake is already slow.
      if (distanceSq <= this.positionTolerance * this.positionTolerance && this.vel.magSq() < 0.09) {
        this.pos.set(target.x, target.y);
        this.vel.set(0, 0);
        this.acc.set(0, 0);
      } else if (distanceSq < 18 * 18) {
        // Critically damp the final approach so a tight turn cannot bounce
        // the head back and forth across a stationary cursor.
        let forceX = dx * 0.075 - this.vel.x * 0.45;
        let forceY = dy * 0.075 - this.vel.y * 0.45;
        const forceMagnitude = Math.hypot(forceX, forceY);
        const closeForceLimit = this.maxForce * 2.5;
        if (forceMagnitude > closeForceLimit) {
          forceX *= closeForceLimit / forceMagnitude;
          forceY *= closeForceLimit / forceMagnitude;
        }
        this.acc.x += forceX;
        this.acc.y += forceY;
      } else {
        const distance = Math.sqrt(distanceSq);
        const desiredSpeed = Math.min(this.maxSpeed, distance * this.maxSpeed / this.rayonZoneDeFreinage);
        const desiredX = distance > 0.0001 ? dx / distance * desiredSpeed : 0;
        const desiredY = distance > 0.0001 ? dy / distance * desiredSpeed : 0;
        let forceX = desiredX - this.vel.x;
        let forceY = desiredY - this.vel.y;
        const forceMagnitude = Math.hypot(forceX, forceY);
        if (forceMagnitude > this.maxForce) {
          forceX *= this.maxForce / forceMagnitude;
          forceY *= this.maxForce / forceMagnitude;
        }
        this.acc.x += forceX;
        this.acc.y += forceY;
      }
    } else {
      this.targetDistance = distanceForMouth ?? Infinity;
    }

    this.acc.x += this.separationX;
    this.acc.y += this.separationY;
    this.separationX = 0;
    this.separationY = 0;

    super.update();
    this.keepInsideCanvas();
    if (this.vel.magSq() > 0.36) this.heading = this.vel.heading();

    if (this.pos.dist(this.trail[this.trail.length - 1]) >= 1.2) {
      this.trail.push(this.pos.copy());
    }
    this.trimTrail();

    const approach = constrain(1 - this.targetDistance / this.mouthOpenDistance, 0, 1);
    const biteAnimation = millis() < this.biteUntil ? 1 : 0;
    this.mouthOpen = lerp(this.mouthOpen, Math.max(approach, biteAnimation), 0.18);
  }

  keepInsideCanvas() {
    const margin = this.r;
    if (this.pos.x < margin || this.pos.x > width - margin) this.vel.x *= -0.45;
    if (this.pos.y < margin || this.pos.y > height - margin) this.vel.y *= -0.45;
    this.pos.x = constrain(this.pos.x, margin, width - margin);
    this.pos.y = constrain(this.pos.y, margin, height - margin);
  }

  trimTrail() {
    let length = 0;
    let index = this.trail.length - 1;
    const needed = this.bodyLength + 45;
    while (index > 0 && length < needed) {
      const dx = this.trail[index].x - this.trail[index - 1].x;
      const dy = this.trail[index].y - this.trail[index - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
      index--;
    }
    if (index > 0) this.trail.splice(0, index);
  }

  bodyGeometry() {
    const wavePhase = millis() * 0.006 + this.id * 1.7;
    const speed = Math.min(1, this.vel.mag() / Math.max(0.1, this.maxSpeed));
    // The trail supplies the resting curve. Procedural wave is motion-only,
    // so its phase cannot make a stopped tail shimmer in place.
    const waveAmount = this.bodyWidth * 0.07 * speed * speed;
    let segment = this.trail.length - 1;
    let accumulated = 0;
    for (let sample = 0; sample < this.geometrySamples; sample++) {
      const distance = Math.min(this.bodyLength, sample * this.geometryStep);
      while (segment > 0) {
        const a = this.trail[segment];
        const b = this.trail[segment - 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const span = Math.sqrt(dx * dx + dy * dy);
        if (accumulated + span >= distance || span < 0.0001) {
          const t = span < 0.0001 ? 0 : (distance - accumulated) / span;
          this.geometryCenterX[sample] = a.x + dx * t;
          this.geometryCenterY[sample] = a.y + dy * t;
          break;
        }
        accumulated += span;
        segment--;
      }
      if (segment === 0) {
        this.geometryCenterX[sample] = this.trail[0].x;
        this.geometryCenterY[sample] = this.trail[0].y;
      }
    }
    for (let sample = 0; sample < this.geometrySamples; sample++) {
      const before = Math.max(0, sample - 1);
      const after = Math.min(this.geometrySamples - 1, sample + 1);
      let tx = this.geometryCenterX[before] - this.geometryCenterX[after];
      let ty = this.geometryCenterY[before] - this.geometryCenterY[after];
      const magnitude = Math.hypot(tx, ty);
      if (magnitude > 0.001) { tx /= magnitude; ty /= magnitude; }
      else { tx = Math.cos(this.heading); ty = Math.sin(this.heading); }
      this.geometryTangentX[sample] = tx;
      this.geometryTangentY[sample] = ty;
    }
    for (let sample = 0; sample < this.geometrySamples; sample++) {
      const distance = Math.min(this.bodyLength, sample * this.geometryStep);
      const progress = constrain(distance / this.bodyLength, 0, 1);
      const taper = Math.pow(1 - progress, 0.72);
      const radius = Math.max(1.2, this.bodyWidth * (0.53 * taper + 0.018));
      const waveEnvelope = Math.sin(Math.PI * progress) * (0.5 + progress * 0.5);
      const wave = Math.sin(wavePhase - distance * 0.055) * waveAmount * waveEnvelope;
      const nx = -this.geometryTangentY[sample], ny = this.geometryTangentX[sample];
      const cx = this.geometryCenterX[sample] + nx * wave, cy = this.geometryCenterY[sample] + ny * wave;
      this.geometryLeftX[sample] = cx + nx * radius;
      this.geometryLeftY[sample] = cy + ny * radius;
      this.geometryRightX[sample] = cx - nx * radius;
      this.geometryRightY[sample] = cy - ny * radius;
    }
    return this.geometrySamples;
  }

  drawBody() {
    const count = this.bodyGeometry();
    if (count < 4) return;
    const drawOutline = () => {
      beginShape();
      curveVertex(this.geometryLeftX[1], this.geometryLeftY[1]);
      curveVertex(this.geometryLeftX[0], this.geometryLeftY[0]);
      for (let i = 0; i < count; i++) curveVertex(this.geometryLeftX[i], this.geometryLeftY[i]);
      for (let i = count - 1; i >= 0; i--) curveVertex(this.geometryRightX[i], this.geometryRightY[i]);
      curveVertex(this.geometryRightX[0], this.geometryRightY[0]);
      curveVertex(this.geometryRightX[1], this.geometryRightY[1]);
      endShape(CLOSE);
    };

    drawingContext.save();
    drawingContext.shadowColor = 'rgba(120, 30, 72, 0.2)';
    drawingContext.shadowBlur = 12;
    drawingContext.shadowOffsetY = 5;
    noStroke();
    fill(this.colorDark);
    drawOutline();
    drawingContext.restore();

    noStroke();
    fill(this.colorLight);
    drawOutline();

    // A narrow highlight gives the single continuous body some soft volume.
    stroke(255, 220, 238, 150);
    strokeWeight(Math.max(1.5, this.bodyWidth * 0.08));
    noFill();
    beginShape();
    for (let i = 0; i < count; i += 2) {
      curveVertex(this.geometryLeftX[i] * 0.28 + this.geometryRightX[i] * 0.72,
        this.geometryLeftY[i] * 0.28 + this.geometryRightY[i] * 0.72);
    }
    endShape();
  }

  drawHead() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.heading);

    drawingContext.save();
    drawingContext.shadowColor = 'rgba(120, 30, 72, 0.25)';
    drawingContext.shadowBlur = 10;
    drawingContext.shadowOffsetY = 4;
    stroke(this.colorDark);
    strokeWeight(2.5);
    fill('#F47FB6');
    ellipse(0, 0, this.r * 2.1, this.r * 1.75);
    drawingContext.restore();

    // The mouth grows smoothly as the rat approaches and during the bite.
    noStroke();
    fill('#5B1736');
    const jawHeight = 2 + this.mouthOpen * this.r * 0.72;
    arc(this.r * 0.78, this.r * 0.18, this.r * 0.85, jawHeight, -0.08, PI + 0.18, CHORD);
    if (this.mouthOpen > 0.3) {
      stroke('#F9A8D4');
      strokeWeight(2.4);
      const tongueLength = this.r * (0.5 + 0.45 * Math.sin(millis() * 0.018));
      line(this.r * 1.04, this.r * 0.23, this.r * 1.04 + tongueLength, this.r * 0.23);
      line(this.r * 1.04 + tongueLength, this.r * 0.23, this.r * 1.04 + tongueLength + 3, this.r * 0.23 - 3);
      line(this.r * 1.04 + tongueLength, this.r * 0.23, this.r * 1.04 + tongueLength + 3, this.r * 0.23 + 3);
    }

    noStroke();
    fill(255);
    ellipse(this.r * 0.12, -this.r * 0.43, this.r * 0.5, this.r * 0.56);
    ellipse(this.r * 0.12, this.r * 0.43, this.r * 0.5, this.r * 0.56);
    fill('#401229');
    ellipse(this.r * 0.22, -this.r * 0.43, this.r * 0.2, this.r * 0.25);
    ellipse(this.r * 0.22, this.r * 0.43, this.r * 0.2, this.r * 0.25);
    fill('#8D174D');
    circle(this.r * 0.88, -this.r * 0.16, 2.5);
    circle(this.r * 0.88, this.r * 0.16, 2.5);
    pop();
  }

  startBite() {
    this.biteUntil = millis() + 420;
  }

  show() {
    push();
    this.drawBody();
    this.drawSpeedBoost();
    this.drawHead();
    this.drawIdentifier();
    pop();
  }

  drawIdentifier() {
    push();
    textAlign(CENTER, CENTER);
    textSize(11);
    textStyle(BOLD);
    stroke(255, 245, 249, 230);
    strokeWeight(3);
    fill(this.colorDark);
    text(`S${this.id}`, this.pos.x, this.pos.y - this.r - 12);
    pop();
  }

  drawSpeedBoost() {
    if (millis() >= this.speedBoostUntil) return;
    const phase = millis() * 0.004 + this.id;
    noFill();
    stroke(129, 94, 245, 90);
    strokeWeight(2);
    circle(this.pos.x, this.pos.y, this.r * 2.8);
    noStroke();
    fill('#A78BFA');
    for (let i = 0; i < 3; i++) {
      const angle = phase + i * TWO_PI / 3;
      circle(this.pos.x + Math.cos(angle) * this.r * 1.55,
        this.pos.y + Math.sin(angle) * this.r * 1.2, 3.5);
    }
  }
}
