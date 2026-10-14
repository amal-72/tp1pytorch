// =============================================================================
// Simulation 2-PursueEvade : Poursuite & Évasion avec Système de Leurres
// Prédateurs (pursue / pursuePerfect), Cibles autonomes (evade) & Leurres (Leurre)
// =============================================================================

// Flottes et populations
let predators = [];
let targets = [];
let leurres = [];

// Paramètres configurables de la simulation
let modePredateur = 'pursue'; // 'pursue' ou 'pursuePerfect'
let predictionDistance = 80;  // Distance spatiale de prédiction pour pursue() (px)
let rayonDetection = 150;     // Rayon de détection des prédateurs par les cibles (px)
let nbLeurresParDetection = 10; // Nombre de leurres libérés par détection (défaut 10)
let dureeDeVieLeurres = 1.0;  // Durée de vie des leurres en secondes (défaut 1.0s)
let populationCiblesInitiale = 3; // Nombre de cibles configuré

// Contrôles UI
let uiPanel;
let btnToggleUI;
let selectModePredateur;
let sliderNbPredateurs;
let sliderNbTargets;
let sliderPredictionDist;
let sliderRayonDetection;
let sliderNbLeurres;
let sliderDureeLeurres;
let btnResetTargets;
let statDisplayContainer;

// =============================================================================
// Initialisation P5.js
// =============================================================================
function setup() {
  createCanvas(windowWidth, windowHeight);

  // 1. Initialisation par défaut : exactement 1 prédateur (conforme consigne)
  creerPredateurs(1);

  // 2. Initialisation des cibles originales
  creerCibles(populationCiblesInitiale);

  // 3. Création de l'interface utilisateur pastel masquable
  creerInterface();
}

// Adaptation automatique au redimensionnement de l'écran
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// =============================================================================
// Boucle principale d'animation et de simulation (60 FPS)
// =============================================================================
function draw() {
  // Arrière-plan rose pastel doux avec légère traînée esthétique
  background(252, 231, 243);

  // Grille pastel subtile pour donner de la profondeur
  dessinerGrillePastel();

  // 1. Mise à jour et affichage des leurres actifs
  // Les leurres n'ont aucun comportement de fuite, ils dérivent lentement
  leurres.forEach(leurre => {
    leurre.update();
    leurre.edges();
    leurre.show();
  });

  // 2. Mise à jour du comportement de chaque cible vivante
  targets.forEach(target => {
    target.rayonDetection = rayonDetection;
    // Détection des prédateurs, fuite (1s) et largage éventuel de leurres
    target.updateBehavior(predators, nbLeurresParDetection, dureeDeVieLeurres, leurres);
    target.update();
    target.edges();
    target.show();
  });

  // 3. Poursuite par chaque vaisseau prédateur
  predators.forEach(predator => {
    // Les prédateurs peuvent cibler les cibles vivantes OU les leurres (détournement)
    let ciblesCandidates = [...targets, ...leurres];
    let proie = cibleLaPlusProche(predator, ciblesCandidates);

    if (proie) {
      let force;
      if (modePredateur === 'pursuePerfect') {
        force = predator.pursuePerfect(proie, predictionDistance);
      } else {
        force = predator.pursue(proie, predictionDistance, true);
      }
      predator.applyForce(force);
    }

    predator.update();
    predator.edges();
    predator.show();
  });

  // 4. Détection rigoureuse des collisions (Prédateurs vs Cibles & Leurres)
  gererCollisions();

  // 5. Nettoyage des leurres expirés ou interceptés
  leurres = leurres.filter(l => !l.isExpired() && !l.intercepted);

  // 6. Actualisation en temps réel des statistiques affichées dans l'UI
  actualiserStatistiquesUI();
}

// =============================================================================
// Gestion des Collisions & Mort des Cibles
// =============================================================================
function gererCollisions() {
  // Détection des collisions prédateur <-> cible originale
  for (let predator of predators) {
    for (let target of targets) {
      if (target.isDead) continue;

      let d = p5.Vector.dist(predator.pos, target.pos);
      // Prise en compte réelle des rayons des deux cercles
      if (d <= (predator.r + target.r)) {
        target.isDead = true;
      }
    }

    // Détection des collisions prédateur <-> leurres (interception)
    for (let leurre of leurres) {
      if (leurre.intercepted) continue;

      let d = p5.Vector.dist(predator.pos, leurre.pos);
      if (d <= (predator.r + leurre.r)) {
        leurre.intercepted = true;
      }
    }
  }

  // Retrait immédiat des cibles éliminées (une cible ne meurt qu'une seule fois)
  let ciblesMortes = targets.filter(t => t.isDead);
  if (ciblesMortes.length > 0) {
    targets = targets.filter(t => !t.isDead);
  }
}

// =============================================================================
// Recherche de l'entité la plus proche (Cible originale ou Leurre)
// =============================================================================
function cibleLaPlusProche(vehicle, liste) {
  if (!liste || liste.length === 0) return null;
  let plusProche = null;
  let distMin = Infinity;

  for (let entite of liste) {
    if (entite.isDead || entite.intercepted) continue;
    let d = p5.Vector.dist(vehicle.pos, entite.pos);
    if (d < distMin) {
      distMin = d;
      plusProche = entite;
    }
  }
  return plusProche;
}

// =============================================================================
// Gestion de la population des Prédateurs
// =============================================================================
function creerPredateurs(nb) {
  const nuances = ['#EC4899', '#BE185D', '#DB2777', '#9D174D'];
  for (let i = 0; i < nb; i++) {
    let margin = 80;
    let x = random(margin, width - margin);
    let y = random(margin, height - margin);
    let p = new Vehicle(x, y);
    p.color = nuances[predators.length % nuances.length];
    predators.push(p);
  }
}

function ajusterNombrePredateurs(nouveauTotal) {
  if (predators.length < nouveauTotal) {
    creerPredateurs(nouveauTotal - predators.length);
  } else if (predators.length > nouveauTotal) {
    predators.splice(nouveauTotal);
  }
}

// =============================================================================
// Gestion de la population des Cibles Originales
// =============================================================================
function creerCibles(nb) {
  for (let i = 0; i < nb; i++) {
    let margin = 100;
    let x = random(margin, width - margin);
    let y = random(margin, height - margin);
    let t = new Target(x, y);
    targets.push(t);
  }
}

function ajusterNombreCibles(nouveauTotal) {
  populationCiblesInitiale = nouveauTotal;
  if (targets.length < nouveauTotal) {
    creerCibles(nouveauTotal - targets.length);
  } else if (targets.length > nouveauTotal) {
    targets.splice(nouveauTotal);
  }
}

function reinitialiserCibles() {
  targets = [];
  leurres = [];
  targetGlobalIdCounter = 1;
  creerCibles(populationCiblesInitiale);
}

// =============================================================================
// Dessin de fond : Grille pastel décorative
// =============================================================================
function dessinerGrillePastel() {
  push();
  stroke(244, 114, 182, 35);
  strokeWeight(0.8);
  let step = 60;
  for (let x = 0; x < width; x += step) {
    line(x, 0, x, height);
  }
  for (let y = 0; y < height; y += step) {
    line(0, y, width, y);
  }
  pop();
}

// =============================================================================
// Interface Utilisateur Configurable & Masquable
// =============================================================================
function creerInterface() {
  // 1. Bouton flottant pour masquer / afficher l'interface
  btnToggleUI = createButton('👁 Masquer UI (H)');
  btnToggleUI.id('btn-toggle-ui');
  btnToggleUI.mousePressed(toggleUI);

  // 2. Panneau glassmorphism
  uiPanel = createDiv();
  uiPanel.id('ui-panel');

  // En-tête
  let title = createDiv('<h2>⚡ Pursue & Evade <span style="font-size:11px;font-weight:normal;color:#BE185D;">Touche H</span></h2>');
  title.parent(uiPanel);

  // Catégorie 1 : Prédateurs
  let secPred = createDiv('<h3>🚀 Vaisseaux Prédateurs</h3>');
  secPred.parent(uiPanel);

  sliderNbPredateurs = creerControleSlider(
    uiPanel,
    'Nombre de prédateurs',
    0, 10, predators.length, 1,
    (val) => { ajusterNombrePredateurs(val); }
  );

  let headerMode = createDiv();
  headerMode.class('control-header');
  headerMode.parent(uiPanel);
  let labelMode = createSpan('Comportement de poursuite :');
  labelMode.parent(headerMode);

  selectModePredateur = createSelect();
  selectModePredateur.class('control-select');
  selectModePredateur.parent(uiPanel);
  selectModePredateur.option('pursue() — Poursuite prédictive', 'pursue');
  selectModePredateur.option('pursuePerfect() — Loi des sinus', 'pursuePerfect');
  selectModePredateur.selected(modePredateur);
  selectModePredateur.changed(() => {
    modePredateur = selectModePredateur.value();
  });

  sliderPredictionDist = creerControleSlider(
    uiPanel,
    'Distance de prédiction (px)',
    0, 300, predictionDistance, 5,
    (val) => { predictionDistance = val; }
  );

  // Catégorie 2 : Cibles
  let secTargets = createDiv('<h3>🎯 Cibles Originales</h3>');
  secTargets.parent(uiPanel);

  sliderNbTargets = creerControleSlider(
    uiPanel,
    'Population initiale cibles',
    0, 10, populationCiblesInitiale, 1,
    (val) => { ajusterNombreCibles(val); }
  );

  sliderRayonDetection = creerControleSlider(
    uiPanel,
    'Rayon détection cible (px)',
    50, 350, rayonDetection, 10,
    (val) => { rayonDetection = val; }
  );

  btnResetTargets = createButton('⟳ Réinitialiser les cibles');
  btnResetTargets.class('pastel-btn');
  btnResetTargets.parent(uiPanel);
  btnResetTargets.mousePressed(() => {
    reinitialiserCibles();
  });

  // Catégorie 3 : Système de Leurres
  let secLeurres = createDiv('<h3>💥 Système de Leurres (Flares)</h3>');
  secLeurres.parent(uiPanel);

  sliderNbLeurres = creerControleSlider(
    uiPanel,
    'Leurres lâchés par détection',
    1, 10, nbLeurresParDetection, 1,
    (val) => { nbLeurresParDetection = val; }
  );

  sliderDureeLeurres = creerControleSlider(
    uiPanel,
    'Durée de vie leurres (s)',
    0.5, 5.0, dureeDeVieLeurres, 0.1,
    (val) => { dureeDeVieLeurres = val; }
  );

  // Catégorie 4 : Statistiques en direct
  let secStats = createDiv('<h3>📊 Statistiques en direct</h3>');
  secStats.parent(uiPanel);

  statDisplayContainer = createDiv();
  statDisplayContainer.class('stats-container');
  statDisplayContainer.parent(uiPanel);

  actualiserStatistiquesUI();
}

// Fonction de bascule de visibilité de l'interface
function toggleUI() {
  let isHidden = uiPanel.style('display') === 'none';
  uiPanel.style('display', isHidden ? 'block' : 'none');
  btnToggleUI.html(isHidden ? '👁 Masquer UI (H)' : '👁 Afficher UI (H)');
}

// Actualisation des données statistiques en direct
function actualiserStatistiquesUI() {
  if (!statDisplayContainer) return;

  let targetsAlive = targets.length;
  let decoysActive = leurres.length;
  let predCount = predators.length;

  let itemsHtml = `
    <div class="stat-item"><span>Cibles vivantes :</span><span class="stat-val">${targetsAlive} / ${populationCiblesInitiale}</span></div>
    <div class="stat-item"><span>Prédateurs actifs :</span><span class="stat-val">${predCount}</span></div>
    <div class="stat-item"><span>Leurres en vol :</span><span class="stat-val">${decoysActive}</span></div>
    <div class="stat-item"><span>Mode actuel :</span><span class="stat-val">${modePredateur}</span></div>
    <div class="target-stat-list">
  `;

  if (targets.length === 0) {
    itemsHtml += `<div class="target-stat-item" style="color:#BE185D;font-weight:bold;">Toutes les cibles ont été éliminées !</div>`;
  } else {
    targets.forEach(t => {
      let etatFuite = t.isFleeing ? '⚡ EN FUITE' : 'NORMAL';
      itemsHtml += `
        <div class="target-stat-item">
          <span>Cible #${t.id} (${etatFuite}) :</span>
          <span class="stat-val">${t.leurresRestants}/10 leurres</span>
        </div>
      `;
    });
  }

  itemsHtml += `</div>`;
  statDisplayContainer.html(itemsHtml);
}

// Raccourci clavier 'H' pour masquer / afficher l'interface
function keyPressed() {
  if (key === 'h' || key === 'H') {
    toggleUI();
  }
}

// Téléportation du premier prédateur au clic de souris (fonctionnalité conservée)
function mouseClicked(event) {
  // Ignorer si le clic a lieu sur l'interface
  let panelElt = uiPanel ? uiPanel.elt : null;
  let btnElt = btnToggleUI ? btnToggleUI.elt : null;

  const eventTarget = event && event.target;
  if (panelElt && eventTarget && panelElt.contains(eventTarget)) return;
  if (btnElt && eventTarget && btnElt.contains(eventTarget)) return;

  if (predators.length > 0) {
    predators[0].pos = createVector(mouseX, mouseY);
  }
}

// Création d'un contrôle slider complet avec label et affichage dynamique
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

  slider.input(() => {
    valDisplay.html(slider.value());
    if (onInputCallback) {
      onInputCallback(slider.value());
    }
  });

  return slider;
}
