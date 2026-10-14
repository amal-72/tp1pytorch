// =============================================================================
// Simulation 1-Seek : Steering Behaviors (Pastel & Ambient Sound Edition)
// Multi-cibles, fuite Craig Reynolds, duplication cellulaire & visibilité adaptative
// =============================================================================

let targets = [];
let vehicles = [];

// Nuances de rose pour les véhicules
const NUANCES_ROSE = [
  '#F9A8D4', // Rose pastel
  '#EC4899', // Rose vif
  '#BE185D'  // Rose framboise
];

// Mode de comportement actif
let modeActuel = 'flee_target';
let selectMode;
let checkboxRespawnTarget;
let checkboxDuplication;
let rowRespawnCheckbox;
let rowDuplicationCheckbox;
let secTarget;

// Curseurs Cibles & Mode « La cible fuit les vaisseaux »
let sliderNbTargets;
let sliderDetectionRadius;
let sliderFleeDistance;
let sliderSprintDuration;
let sliderFleeSpeed;
let sliderDuplicationTime;

// Curseurs Véhicules (TP)
let sliderNbVehicules;
let sliderMaxSpeed;
let sliderMaxForce;

// Arrière-plan Pastel & Plasma
let plasmaBuffer;
let plasmaTime = 0;
let pastelLut = []; // Table de conversion pour palette pastel fluide
let blobs = [];     // Blobs lumineux flottants

// Curseurs Arrière-plan
let sliderPastelIntensity;
let sliderPlasmaComplexity;
let sliderPlasmaSpeed;
let sliderPlasmaMouse;

// Audio Synthétisé (Web Audio API natif)
let ambientAudio;
let btnAudio;
let sliderVolume;

// =============================================================================
// Initialisation P5.js
// =============================================================================
function setup() {
  createCanvas(windowWidth, windowHeight);

  // Construction de la palette de couleurs pastel (rose, lilas, lavande, pêche, bleu ciel)
  initPastelPalette();

  // Buffer basse résolution pour l'animation plasma (60 FPS garantis)
  initPlasmaBuffer();

  // Création des blobs lumineux pastel flottants
  initBlobs();

  // Initialisation du synthétiseur sonore relaxant
  ambientAudio = new PastelAmbientAudio();

  // Création de l'interface utilisateur interactive
  creerInterface();

  // Création de la population initiale de cibles
  creerCibles(sliderNbTargets ? sliderNbTargets.value() : 1);

  // Création de la flotte de véhicules
  creerVehicules(sliderNbVehicules ? sliderNbVehicules.value() : 15);

  // Synchronisation initiale de la visibilité contextuelle des contrôles
  actualiserVisibiliteControles();
}

// Adaptation automatique au redimensionnement de l'écran
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initPlasmaBuffer();
  initBlobs();
}

// =============================================================================
// Gestion multi-cibles (Création, ajustement, recherche de la plus proche)
// =============================================================================
function creerCibles(nb) {
  for (let i = 0; i < nb; i++) {
    // Répartition équilibrée sans superposition complète
    let marginX = width * 0.15;
    let marginY = height * 0.15;
    let x = random(marginX, width - marginX);
    let y = random(marginY, height - marginY);

    let t = new Target(x, y);
    if (sliderDetectionRadius) t.detectionRadius = sliderDetectionRadius.value();
    if (sliderFleeDistance) t.fleeDistance = sliderFleeDistance.value();
    if (sliderSprintDuration) t.sprintDuration = sliderSprintDuration.value();
    if (sliderFleeSpeed) t.fleeMaxSpeed = sliderFleeSpeed.value();
    targets.push(t);
  }
}

function ajusterNombreCibles(nouveauTotal) {
  if (targets.length < nouveauTotal) {
    creerCibles(nouveauTotal - targets.length);
  } else if (targets.length > nouveauTotal) {
    targets.splice(nouveauTotal);
  }

  if (sliderNbTargets && sliderNbTargets.valDisplay) {
    sliderNbTargets.value(targets.length);
    sliderNbTargets.valDisplay.html(targets.length);
  }
}

// Recherche de la cible la plus proche pour chaque vaisseau (Craig Reynolds)
function cibleLaPlusProche(vehicle, targetList) {
  if (!targetList || targetList.length === 0) return null;
  let nearest = null;
  let minDist = Infinity;
  for (let t of targetList) {
    let d = p5.Vector.dist(vehicle.pos, t.pos);
    if (d < minDist) {
      minDist = d;
      nearest = t;
    }
  }
  return nearest;
}

// =============================================================================
// Véhicules & TP Steering Behaviors
// =============================================================================
function creerVehicules(nb) {
  let currentSpeed = sliderMaxSpeed ? sliderMaxSpeed.value() : 4;
  let currentForce = sliderMaxForce ? sliderMaxForce.value() : 0.1;

  for (let i = 0; i < nb; i++) {
    let nuance = NUANCES_ROSE[(vehicles.length + i) % NUANCES_ROSE.length];
    let v = new Vehicle(random(width * 0.1, width * 0.9), random(height * 0.1, height * 0.9), nuance);
    v.maxSpeed = currentSpeed;
    v.maxForce = currentForce;
    vehicles.push(v);
  }
}

function ajusterNombreVehicules(nouveauTotal) {
  if (vehicles.length < nouveauTotal) {
    creerVehicules(nouveauTotal - vehicles.length);
  } else if (vehicles.length > nouveauTotal) {
    vehicles.splice(nouveauTotal);
  }
}

// =============================================================================
// Palette & Arrière-plan Pastel (Plasma + Blobs)
// =============================================================================
function initPastelPalette() {
  const stops = [
    [251, 207, 232], // Rose pastel (#FBCFE8)
    [233, 213, 255], // Lilas (#E9D5FF)
    [221, 214, 254], // Lavande (#DDD6FE)
    [186, 230, 253], // Bleu ciel (#BAE6FD)
    [254, 215, 170], // Pêche (#FED7AA)
    [251, 207, 232]  // Boucle vers Rose pastel
  ];

  pastelLut = [];
  const total = 256;
  const segments = stops.length - 1;
  const perSegment = total / segments;

  for (let i = 0; i < total; i++) {
    let seg = Math.min(Math.floor(i / perSegment), segments - 1);
    let t = (i - seg * perSegment) / perSegment;
    let c1 = stops[seg];
    let c2 = stops[seg + 1];

    let r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    let g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    let b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    pastelLut.push([r, g, b]);
  }
}

function initPlasmaBuffer() {
  let pw = 120;
  let ph = Math.max(40, Math.round(120 * (height / width)));
  plasmaBuffer = createGraphics(pw, ph);
  plasmaBuffer.pixelDensity(1);
}

function initBlobs() {
  blobs = [];
  const blobColors = [
    [233, 213, 255], // Lilas
    [186, 230, 253], // Bleu ciel
    [254, 215, 170], // Pêche
    [221, 214, 254], // Lavande
    [251, 207, 232]  // Rose doux
  ];

  for (let i = 0; i < 5; i++) {
    let bx = (width / 5) * (i + 0.5) + random(-50, 50);
    let by = (height / 2) + random(-height * 0.3, height * 0.3);
    let br = random(160, 280);
    blobs.push(new PastelBlob(bx, by, br, blobColors[i]));
  }
}

// Blobs lumineux vaporeux en arrière-plan
class PastelBlob {
  constructor(x, y, r, rgb) {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.r = r;
    this.rgb = rgb;
    this.tx = random(1000);
    this.ty = random(1000);
  }

  update(speed, mouseInfluence) {
    this.tx += 0.002 * speed;
    this.ty += 0.002 * speed;

    let nx = map(noise(this.tx), 0, 1, -100, 100);
    let ny = map(noise(this.ty), 0, 1, -100, 100);

    let d = dist(mouseX, mouseY, this.baseX + nx, this.baseY + ny);
    let pushX = 0, pushY = 0;
    if (d < 300 && d > 0) {
      let f = (1 - d / 300) * 35 * mouseInfluence;
      pushX = ((this.baseX + nx - mouseX) / d) * f;
      pushY = ((this.baseY + ny - mouseY) / d) * f;
    }

    this.x = this.baseX + nx + pushX;
    this.y = this.baseY + ny + pushY;
  }

  show() {
    push();
    noStroke();
    for (let step = 3; step >= 1; step--) {
      let alpha = map(step, 1, 3, 45, 12);
      fill(this.rgb[0], this.rgb[1], this.rgb[2], alpha);
      circle(this.x, this.y, this.r * (step * 0.45));
    }
    pop();
  }
}

function drawBackground() {
  // Fond rose clair (#FCE7F3 = rgb(252, 231, 243))
  background(252, 231, 243);

  let intensite = sliderPastelIntensity.value();
  let complexity = sliderPlasmaComplexity.value() * 0.022;
  let speed = sliderPlasmaSpeed.value();
  let mouseInf = sliderPlasmaMouse.value();

  // Calcul du plasma pastel sur buffer hors-écran
  if (intensite > 0.02) {
    plasmaTime += 0.02 * speed;

    let normMx = (mouseX / width) * plasmaBuffer.width;
    let normMy = (mouseY / height) * plasmaBuffer.height;

    plasmaBuffer.loadPixels();
    let pw = plasmaBuffer.width;
    let ph = plasmaBuffer.height;
    let px = plasmaBuffer.pixels;

    let idx = 0;
    for (let y = 0; y < ph; y++) {
      let yComp = y * complexity;
      for (let x = 0; x < pw; x++) {
        let xComp = x * complexity;

        let v1 = Math.sin(xComp + plasmaTime);
        let v2 = Math.sin(yComp + plasmaTime * 0.7);
        let v3 = Math.sin((xComp + yComp) * 0.75 + plasmaTime * 1.1);

        let dx = x - normMx;
        let dy = y - normMy;
        let distM = Math.sqrt(dx * dx + dy * dy);
        let v4 = mouseInf * Math.sin(distM * complexity * 2.0 - plasmaTime * 1.4);

        let v = (v1 + v2 + v3 + v4 + 4) / 8.0;
        v = (v % 1.0 + 1.0) % 1.0;

        let lutIdx = Math.floor(v * 255);
        let col = pastelLut[lutIdx];

        px[idx]     = Math.round(252 * (1 - intensite) + col[0] * intensite);
        px[idx + 1] = Math.round(231 * (1 - intensite) + col[1] * intensite);
        px[idx + 2] = Math.round(243 * (1 - intensite) + col[2] * intensite);
        px[idx + 3] = 255;
        idx += 4;
      }
    }
    plasmaBuffer.updatePixels();
    image(plasmaBuffer, 0, 0, width, height);
  }

  // Évolution et affichage des blobs
  blobs.forEach(b => {
    b.update(speed, mouseInf);
    b.show();
  });
}

// Marqueur stylisé pour la souris
function drawMouseTargetMarker(x, y) {
  push();
  noStroke();
  fill(219, 39, 119, 35);
  circle(x, y, 44);

  fill("#DB2777");
  stroke("#FFFFFF");
  strokeWeight(2.5);
  circle(x, y, 22);

  fill(255);
  noStroke();
  circle(x, y, 6);
  pop();
}

// =============================================================================
// Boucle Principale d'Animation (draw)
// =============================================================================
function draw() {
  // 1. Arrière-plan pastel (plasma dégradé + blobs doux)
  drawBackground();

  // 2. Synchronisation des paramètres des cibles depuis les curseurs
  targets.forEach(t => {
    if (sliderDetectionRadius) t.detectionRadius = sliderDetectionRadius.value();
    if (sliderFleeDistance) t.fleeDistance = sliderFleeDistance.value();
    if (sliderSprintDuration) t.sprintDuration = sliderSprintDuration.value();
    if (sliderFleeSpeed) t.fleeMaxSpeed = sliderFleeSpeed.value();
  });

  // 3. Gestion de la duplication automatique des cibles
  let dupInterval = (checkboxDuplication && checkboxDuplication.checked() && sliderDuplicationTime) ? sliderDuplicationTime.value() : 0;
  let nouvellesCibles = [];
  for (let t of targets) {
    let splitChild = t.checkDuplication(dupInterval);
    if (splitChild) {
      nouvellesCibles.push(splitChild);
    }
  }

  // Ajout des nouvelles cibles créées par duplication
  if (nouvellesCibles.length > 0) {
    if (targets.length + nouvellesCibles.length <= 25) {
      targets.push(...nouvellesCibles);
    }
    if (sliderNbTargets && sliderNbTargets.valDisplay) {
      sliderNbTargets.value(targets.length);
      sliderNbTargets.valDisplay.html(targets.length);
    }
  }

  // 4. Exécution selon le mode de comportement sélectionné
  if (modeActuel === 'mouse') {
    // Mode suivi de souris : les vaisseaux suivent le curseur
    let mousePos = createVector(mouseX, mouseY);
    drawMouseTargetMarker(mouseX, mouseY);

    vehicles.forEach(vehicle => {
      vehicle.applyBehaviors(mousePos, 'seek');
      vehicle.update();
      vehicle.edges();
      vehicle.show();
    });

  } else if (modeActuel === 'seek') {
    // Mode Suivre la cible (Seek)
    targets.forEach(t => {
      t.wander();
      t.update();
      t.edges();
      t.show(false);
    });

    vehicles.forEach(vehicle => {
      let nearest = cibleLaPlusProche(vehicle, targets);
      vehicle.applyBehaviors(nearest ? nearest.pos : null, 'seek');
      vehicle.update();
      vehicle.edges();
      vehicle.show();

      // Détection de contact
      if (nearest) {
        let d = p5.Vector.dist(vehicle.pos, nearest.pos);
        if (d < nearest.r + vehicle.r) {
          vehicle.respawnInsideCanvas();
          ambientAudio.playHitSound();

          if (checkboxRespawnTarget && checkboxRespawnTarget.checked()) {
            nearest.respawnInsideCanvas();
          }
        }
      }
    });

  } else if (modeActuel === 'flee_target') {
    // Mode « La cible fuit les vaisseaux » (Craig Reynolds)
    targets.forEach(t => {
      t.updateFleeBehavior(vehicles);
      t.update();
      t.edges();
      t.show(true); // Affiche le rayon de détection et la barre d'endurance
    });

    vehicles.forEach(vehicle => {
      let nearest = cibleLaPlusProche(vehicle, targets);
      vehicle.applyBehaviors(nearest ? nearest.pos : null, 'seek');
      vehicle.update();
      vehicle.edges();
      vehicle.show();

      // Détection de contact
      if (nearest) {
        let d = p5.Vector.dist(vehicle.pos, nearest.pos);
        if (d < nearest.r + vehicle.r) {
          vehicle.respawnInsideCanvas();
          ambientAudio.playHitSound();

          if (checkboxRespawnTarget && checkboxRespawnTarget.checked()) {
            nearest.respawnInsideCanvas();
          }
        }
      }
    });

  } else if (modeActuel === 'flee') {
    // Mode Fuir la cible (Flee)
    targets.forEach(t => {
      t.wander();
      t.update();
      t.edges();
      t.show(false);
    });

    vehicles.forEach(vehicle => {
      let nearest = cibleLaPlusProche(vehicle, targets);
      vehicle.applyBehaviors(nearest ? nearest.pos : null, 'flee');
      vehicle.update();
      vehicle.edges();
      vehicle.show();
    });
  }
}

// =============================================================================
// Synthétiseur Audio d'Ambiance (Web Audio API natif)
// =============================================================================
class PastelAmbientAudio {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.masterGain = null;
    this.volume = 0.3;
    this.chimeTimer = null;
    this.filter = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(680, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(1.1, this.ctx.currentTime);

    this.filter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    const baseFreqs = [174.61, 220.00, 261.63, 329.63, 392.00];
    baseFreqs.forEach((freq, idx) => {
      let osc = this.ctx.createOscillator();
      let gain = this.ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.detune.setValueAtTime((idx - 2) * 3.5, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04 / baseFreqs.length, this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.filter);
      osc.start();
    });
  }

  startChimes() {
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

    const playChime = () => {
      if (!this.isPlaying || !this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const note = notes[Math.floor(Math.random() * notes.length)];
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.035, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

      osc.connect(gain);
      gain.connect(this.filter);

      osc.start(now);
      osc.stop(now + 2.5);

      const delay = 1600 + Math.random() * 2200;
      this.chimeTimer = setTimeout(playChime, delay);
    };

    this.chimeTimer = setTimeout(playChime, 1400);
  }

  playHitSound() {
    if (!this.isPlaying || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880.00, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.04, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.filter);

      osc.start(now);
      osc.stop(now + 0.55);
    } catch (e) {
      // Ignorer si audio non initialisé
    }
  }

  toggle() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = !this.isPlaying;
    const now = this.ctx.currentTime;

    if (this.isPlaying) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.3);
      this.startChimes();
    } else {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
      if (this.chimeTimer) clearTimeout(this.chimeTimer);
    }
    return this.isPlaying;
  }

  setVolume(val) {
    this.volume = val;
    if (this.masterGain && this.ctx && this.isPlaying) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.05);
    }
  }
}

// =============================================================================
// Interface Utilisateur Pastel & Affichage Conditionnel des Contrôles
// =============================================================================
function creerInterface() {
  let panel = createDiv();
  panel.id('ui-panel');

  // Titre
  let title = createDiv('<h2>🌸 Steering Behaviors <span style="font-size:11px;font-weight:normal;color:#BE185D;">Touche H: Masquer</span></h2>');
  title.parent(panel);

  // Section 1 : Mode de comportement
  let secMode = createDiv('<h3>Mode de comportement</h3>');
  secMode.parent(panel);

  let modeHeader = createDiv();
  modeHeader.class('control-header');
  modeHeader.parent(panel);
  let labelMode = createSpan('Sélection du mode :');
  labelMode.parent(modeHeader);

  selectMode = createSelect();
  selectMode.class('control-select');
  selectMode.parent(panel);
  selectMode.option('La cible fuit les vaisseaux', 'flee_target'); // Nom exact requis
  selectMode.option('Suivre la cible (Seek)', 'seek');
  selectMode.option('Fuir la cible (Flee)', 'flee');
  selectMode.option('Suivre la souris', 'mouse');
  selectMode.selected('flee_target');

  selectMode.changed(() => {
    modeActuel = selectMode.value();
    targets.forEach(t => t.resetFleeState());
    actualiserVisibiliteControles();
  });

  // Section 2 : Cibles & Mode Fuite
  secTarget = createDiv('<h3>Cible & Mode Fuite</h3>');
  secTarget.parent(panel);

  // Curseur du nombre de cibles
  sliderNbTargets = creerControleSlider(
    panel,
    'Nombre de cibles',
    1, 15, 1, 1,
    (val) => { ajusterNombreCibles(val); }
  );

  // Curseur du rayon de détection (valeur initiale 200 px)
  sliderDetectionRadius = creerControleSlider(
    panel,
    'Rayon détection cible (px)',
    50, 500, 200, 10,
    (val) => { targets.forEach(t => t.detectionRadius = val); }
  );

  // Curseur Temps de duplication
  sliderDuplicationTime = creerControleSlider(
    panel,
    'Temps de duplication (s)',
    3, 30, 10, 1,
    null
  );

  // Autres curseurs de fuite
  sliderFleeDistance = creerControleSlider(
    panel,
    'Distance fin de fuite (px)',
    100, 600, 300, 10,
    (val) => { targets.forEach(t => t.fleeDistance = val); }
  );

  sliderSprintDuration = creerControleSlider(
    panel,
    'Durée accélération (s)',
    0.5, 6.0, 2.0, 0.1,
    (val) => { targets.forEach(t => t.sprintDuration = val); }
  );

  sliderFleeSpeed = creerControleSlider(
    panel,
    'Vitesse fuite cible',
    3.0, 12.0, 6.5, 0.5,
    (val) => { targets.forEach(t => t.fleeMaxSpeed = val); }
  );

  // Case à cocher : Duplication automatique des cibles
  rowDuplicationCheckbox = createDiv();
  rowDuplicationCheckbox.class('control-checkbox-row');
  rowDuplicationCheckbox.parent(panel);

  checkboxDuplication = createCheckbox('Duplication automatique des cibles', true);
  checkboxDuplication.class('control-checkbox');
  checkboxDuplication.parent(rowDuplicationCheckbox);

  // Case à cocher : Réapparition de la cible quand atteinte
  rowRespawnCheckbox = createDiv();
  rowRespawnCheckbox.class('control-checkbox-row');
  rowRespawnCheckbox.parent(panel);

  checkboxRespawnTarget = createCheckbox('Réapparition de la cible quand atteinte', false);
  checkboxRespawnTarget.class('control-checkbox');
  checkboxRespawnTarget.parent(rowRespawnCheckbox);

  // Section 3 : Véhicules (TP)
  let secVehicles = createDiv('<h3>Véhicules (TP)</h3>');
  secVehicles.parent(panel);

  sliderNbVehicules = creerControleSlider(
    panel,
    'Nombre de véhicules',
    1, 100, 15, 1,
    (val) => { ajusterNombreVehicules(val); }
  );

  sliderMaxSpeed = creerControleSlider(
    panel,
    'Vitesse max (maxSpeed)',
    1, 20, 4, 0.5,
    (val) => { vehicles.forEach(v => { v.maxSpeed = val; }); }
  );

  sliderMaxForce = creerControleSlider(
    panel,
    'Force max (maxForce)',
    0.02, 1.5, 0.1, 0.02,
    (val) => { vehicles.forEach(v => { v.maxForce = val; }); }
  );

  // Section 4 : Arrière-plan Pastel & Plasma
  let secPastel = createDiv('<h3>Arrière-plan Pastel</h3>');
  secPastel.parent(panel);

  sliderPastelIntensity = creerControleSlider(
    panel,
    'Intensité pastel',
    0, 1, 0.7, 0.05,
    null
  );

  sliderPlasmaComplexity = creerControleSlider(
    panel,
    'Complexité plasma',
    1, 10, 3, 0.2,
    null
  );

  sliderPlasmaSpeed = creerControleSlider(
    panel,
    'Vitesse animation',
    0, 5, 1, 0.1,
    null
  );

  sliderPlasmaMouse = creerControleSlider(
    panel,
    'Influence souris',
    0, 5, 1.5, 0.1,
    null
  );

  // Section 6 : Ambiance Sonore
  let secAudio = createDiv('<h3>Ambiance Sonore</h3>');
  secAudio.parent(panel);

  let audioRow = createDiv();
  audioRow.class('audio-controls');
  audioRow.parent(panel);

  btnAudio = createButton('▶ Démarrer l\'ambiance');
  btnAudio.class('pastel-btn');
  btnAudio.parent(audioRow);
  btnAudio.mousePressed(() => {
    let active = ambientAudio.toggle();
    btnAudio.html(active ? '⏸ Pause sonore' : '▶ Démarrer l\'ambiance');
  });

  sliderVolume = creerControleSlider(
    panel,
    'Volume sonore',
    0, 1, 0.3, 0.02,
    (val) => { ambientAudio.setVolume(val); }
  );
}

// Fonction centrale pour adapter la visibilité des contrôles selon le mode sélectionné
function actualiserVisibiliteControles() {
  let isFleeTarget = (modeActuel === 'flee_target');
  let hasTargets = (modeActuel === 'seek' || modeActuel === 'flee' || modeActuel === 'flee_target');

  // En-tête de section Cible
  if (secTarget) secTarget.style('display', hasTargets ? 'block' : 'none');

  // Le curseur du rayon de détection est visible uniquement en mode « La cible fuit les vaisseaux »
  if (sliderDetectionRadius) sliderDetectionRadius.setVisible(isFleeTarget);
  if (sliderFleeDistance) sliderFleeDistance.setVisible(isFleeTarget);
  if (sliderSprintDuration) sliderSprintDuration.setVisible(isFleeTarget);
  if (sliderFleeSpeed) sliderFleeSpeed.setVisible(isFleeTarget);

  // Le curseur du nombre de cibles et de duplication apparaît dans les modes concernés
  if (sliderNbTargets) sliderNbTargets.setVisible(hasTargets);
  if (sliderDuplicationTime) sliderDuplicationTime.setVisible(hasTargets);
  if (rowDuplicationCheckbox) rowDuplicationCheckbox.style('display', hasTargets ? 'block' : 'none');
  if (rowRespawnCheckbox) rowRespawnCheckbox.style('display', hasTargets ? 'block' : 'none');
}

function creerControleSlider(parent, labelText, min, max, initialValue, step, onInputCallback) {
  let row = createDiv();
  row.class('control-row');
  row.parent(parent);

  let header = createDiv();
  header.class('control-header');
  header.parent(row);

  let label = createSpan(labelText);
  label.parent(header);

  let valDisplay = createSpan(initialValue);
  valDisplay.class('control-val');
  valDisplay.parent(header);

  let slider = createSlider(min, max, initialValue, step);
  slider.class('control-slider');
  slider.parent(row);

  slider.row = row;
  slider.valDisplay = valDisplay;
  slider.setVisible = function(show) {
    this.row.style('display', show ? 'block' : 'none');
  };

  slider.input(() => {
    valDisplay.html(slider.value());
    if (onInputCallback) {
      onInputCallback(slider.value());
    }
  });

  return slider;
}

function keyPressed() {
  if (key === 'h' || key === 'H') {
    let panel = select('#ui-panel');
    if (panel) {
      let isVisible = panel.style('display') !== 'none';
      panel.style('display', isVisible ? 'none' : 'block');
    }
  }
}
