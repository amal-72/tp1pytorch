const RAT_TYPES = {
  classic: { points: 1, speed: 1, color: '#A7A9B4' },
  greedy: { points: 3, speed: 1, color: '#C6B9A8' },
  golden: { points: 10, speed: 1.8, color: '#E7B83E' },
  magic: { points: 0, speed: 1, color: '#8B75D7' }
};

function chooseRatType() {
  const roll = random(1);
  const weights = settings.ratSpawnWeights;
  let cumulative = 0;
  for (const type of ['classic', 'greedy', 'golden', 'magic']) {
    cumulative += weights[type];
    if (roll < cumulative) return type;
  }
  return 'classic';
}

class Rat extends Vehicle {
  constructor(x, y, id, maxSpeed = 2.1, type = chooseRatType()) {
    super(x, y);
    this.id = id;
    this.type = RAT_TYPES[type] ? type : 'classic';
    this.points = RAT_TYPES[this.type].points;
    this.speedMultiplier = RAT_TYPES[this.type].speed;
    this.baseSpeed = maxSpeed;
    this.r = 12;
    this.maxSpeed = maxSpeed * this.speedMultiplier;
    this.maxForce = 0.12;
    this.rayonZoneDeFreinage = 60;
    this.heading = random(TWO_PI);
    this.vel = p5.Vector.fromAngle(this.heading).mult(maxSpeed * 0.35);
    this.roamTarget = createVector(x + random(-100, 100), y + random(-100, 100));
    this.nextTurnAt = millis() + random(900, 2200);
    this.fleeing = false;
    this.fleeDistance = 145;
    this.pawPhase = random(TWO_PI);
    this.hideDefaultVehicle = true;
  }

  setMaxSpeed(speed) {
    this.baseSpeed = constrain(Number(speed) || 2.1, 0.5, 5);
    const nextSpeed = this.baseSpeed * this.speedMultiplier;
    if (nextSpeed !== this.maxSpeed) {
      this.maxSpeed = nextSpeed;
      this.vel.limit(this.maxSpeed);
    }
  }

  chooseRoamTarget() {
    const margin = this.r + 24;
    this.roamTarget = createVector(random(margin, width - margin), random(margin, height - margin));
    this.nextTurnAt = millis() + random(1000, 2600);
  }

  update(snakes, fleeDistance, ratSpeed) {
    this.fleeDistance = fleeDistance;
    this.setMaxSpeed(ratSpeed);
    let threat = null;
    let nearestDistanceSq = Infinity;
    for (const snake of snakes) {
      const dx = this.pos.x - snake.pos.x;
      const dy = this.pos.y - snake.pos.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        threat = snake;
      }
    }

    this.fleeing = Boolean(threat && nearestDistanceSq < this.fleeDistance * this.fleeDistance);
    if (this.fleeing) {
      let dx = this.pos.x - threat.pos.x;
      let dy = this.pos.y - threat.pos.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 0.001) {
        const angle = this.heading + Math.PI;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        distance = 1;
      }
      const forceLimit = this.maxForce * 1.8;
      const fx = dx / distance * this.maxSpeed - this.vel.x;
      const fy = dy / distance * this.maxSpeed - this.vel.y;
      const magnitude = Math.hypot(fx, fy);
      const scale = magnitude > forceLimit ? forceLimit / magnitude : 1;
      this.acc.x += fx * scale;
      this.acc.y += fy * scale;
      this.nextTurnAt = millis() + 700;
    } else {
      const roamDx = this.pos.x - this.roamTarget.x;
      const roamDy = this.pos.y - this.roamTarget.y;
      if (millis() > this.nextTurnAt || roamDx * roamDx + roamDy * roamDy < 28 * 28) {
        this.chooseRoamTarget();
      }
      const dx = this.roamTarget.x - this.pos.x;
      const dy = this.roamTarget.y - this.pos.y;
      const distance = Math.hypot(dx, dy);
      const desiredSpeed = Math.min(this.maxSpeed, distance * this.maxSpeed / this.rayonZoneDeFreinage);
      const forceLimit = this.maxForce;
      const fx = (distance > 0.001 ? dx / distance * desiredSpeed : 0) - this.vel.x;
      const fy = (distance > 0.001 ? dy / distance * desiredSpeed : 0) - this.vel.y;
      const magnitude = Math.hypot(fx, fy);
      const scale = magnitude > forceLimit ? forceLimit / magnitude : 1;
      this.acc.x += fx * scale;
      this.acc.y += fy * scale;
    }

    const edgeMargin = 48;
    let edgeX = 0, edgeY = 0;
    if (this.pos.x < edgeMargin) edgeX = this.maxSpeed;
    else if (this.pos.x > width - edgeMargin) edgeX = -this.maxSpeed;
    if (this.pos.y < edgeMargin) edgeY = this.maxSpeed;
    else if (this.pos.y > height - edgeMargin) edgeY = -this.maxSpeed;
    if (edgeX !== 0 || edgeY !== 0) {
      const magnitude = Math.hypot(edgeX, edgeY);
      if (magnitude > 0) { edgeX = edgeX / magnitude * this.maxSpeed; edgeY = edgeY / magnitude * this.maxSpeed; }
      let fx = edgeX - this.vel.x, fy = edgeY - this.vel.y;
      const forceLimit = this.maxForce * 2;
      const forceMagnitude = Math.hypot(fx, fy);
      if (forceMagnitude > forceLimit) { fx *= forceLimit / forceMagnitude; fy *= forceLimit / forceMagnitude; }
      this.acc.x += fx;
      this.acc.y += fy;
    }

    super.update();
    this.pos.x = constrain(this.pos.x, this.r, width - this.r);
    this.pos.y = constrain(this.pos.y, this.r, height - this.r);
    if (this.vel.magSq() > 0.04) this.heading = this.vel.heading();
    this.pawPhase += this.vel.mag() * 0.11;
  }

  show() {
    const run = Math.sin(this.pawPhase);
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.heading);

    // Long tail, drawn first so it sits behind the body.
    noFill();
    stroke('#9B7764');
    strokeWeight(2.1);
    beginShape();
    curveVertex(-this.r * 0.7, 0);
    curveVertex(-this.r * 0.7, 0);
    curveVertex(-this.r * 1.5, Math.sin(this.pawPhase * 0.45) * 5);
    curveVertex(-this.r * 2.25, Math.sin(this.pawPhase * 0.45 + 0.8) * 9);
    curveVertex(-this.r * 2.8, Math.sin(this.pawPhase * 0.45 + 1.4) * 5);
    endShape();

    // Four tiny feet animate under the body while the rat runs.
    stroke('#8B6B5A');
    strokeWeight(2.4);
    for (const side of [-1, 1]) {
      const stride = run * 3.2;
      line(-this.r * 0.35, side * this.r * 0.45, -this.r * 0.35 + stride, side * this.r * 0.88);
      line(this.r * 0.42, side * this.r * 0.42, this.r * 0.42 - stride, side * this.r * 0.86);
    }

    drawingContext.save();
    drawingContext.shadowColor = 'rgba(50, 35, 28, 0.18)';
    drawingContext.shadowBlur = 6;
    drawingContext.shadowOffsetY = 2;
    stroke('#796354');
    strokeWeight(1.5);
    fill(this.fleeing && this.type === 'classic' ? '#B9BBC4' : RAT_TYPES[this.type].color);
    ellipse(-this.r * 0.08, 0, this.r * 2.15, this.r * 1.35);
    drawingContext.restore();

    // Ears, head and pointed muzzle.
    noStroke();
    fill(this.type === 'golden' ? '#B8821D' : this.type === 'magic' ? '#5D4AA6' : '#8D8E9A');
    circle(this.r * 0.58, -this.r * 0.5, this.r * 0.78);
    circle(this.r * 0.58, this.r * 0.5, this.r * 0.78);
    fill(this.type === 'magic' ? '#C4B5FD' : '#E8B5B2');
    circle(this.r * 0.62, -this.r * 0.5, this.r * 0.43);
    circle(this.r * 0.62, this.r * 0.5, this.r * 0.43);
    fill(RAT_TYPES[this.type].color);
    ellipse(this.r * 0.65, 0, this.r * 1.18, this.r * 1.05);
    fill('#E5C8B3');
    ellipse(this.r * 1.05, 0, this.r * 0.75, this.r * 0.58);
    fill('#6A453A');
    circle(this.r * 1.33, 0, this.r * 0.22);

    // Eye and whiskers.
    fill('#2F2624');
    circle(this.r * 0.88, -this.r * 0.22, this.r * 0.17);
    stroke('#72594D');
    strokeWeight(0.8);
    line(this.r * 1.12, -this.r * 0.08, this.r * 1.8, -this.r * 0.38);
    line(this.r * 1.13, 0, this.r * 1.9, 0);
    line(this.r * 1.12, this.r * 0.08, this.r * 1.8, this.r * 0.38);

    if (this.type === 'greedy') {
      // A small cheese wedge sits on the back and uses only a few primitives.
      noStroke();
      fill('#F6C84F');
      triangle(-this.r * 0.85, -this.r * 0.48, -this.r * 0.05, -this.r * 0.48,
        -this.r * 0.28, -this.r * 1.05);
      fill('#D99B27');
      circle(-this.r * 0.56, -this.r * 0.62, 2.2);
      circle(-this.r * 0.34, -this.r * 0.77, 1.8);
    } else if (this.type === 'golden') {
      noStroke();
      fill('#FFF3AE');
      circle(-this.r * 0.68, -this.r * 0.45, 3);
      circle(this.r * 0.12, this.r * 0.48, 2.2);
      stroke('#FFF3AE');
      strokeWeight(1.4);
      line(-this.r * 0.75, -this.r * 0.78, -this.r * 0.75, -this.r * 1.1);
      line(-this.r * 0.91, -this.r * 0.94, -this.r * 0.59, -this.r * 0.94);
    } else if (this.type === 'magic') {
      noStroke();
      fill('#F4E8FF');
      beginShape();
      vertex(-this.r * 0.65, -this.r * 0.92);
      vertex(-this.r * 0.27, -this.r * 0.92);
      vertex(-this.r * 0.48, -this.r * 0.58);
      vertex(-this.r * 0.16, -this.r * 0.58);
      vertex(-this.r * 0.72, -this.r * 0.12);
      vertex(-this.r * 0.55, -this.r * 0.49);
      vertex(-this.r * 0.83, -this.r * 0.49);
      endShape(CLOSE);
    }
    pop();
  }
}
