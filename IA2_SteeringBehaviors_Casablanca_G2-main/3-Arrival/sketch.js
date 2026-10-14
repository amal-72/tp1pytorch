let snakes = [];
let rats = [];
let nextSnakeId = 1;
let nextRatId = 1;
let caughtCount = 0;
let playerScore = 0;
let captureEffects = [];
let scorePopups = [];
let pendingRatRespawns = [];
let retiredSnakes = [];
let gamePhase = 'ready';
let playerSnakeId = null;
let roundEndAt = 0;
let lastTimerShownSeconds = null;
let finalResults = null;
const MAX_SNAKES = 20;
const MAX_RATS = 100;
const snakePalettes = [
  ['#EC4899', '#F9A8D4', '#A81753'], ['#8B6FC7', '#C4B5FD', '#533A91'],
  ['#35A89C', '#9CE4D7', '#176B67'], ['#E58B45', '#FFD19A', '#A95626'],
  ['#4C91C7', '#A8D7F2', '#285D8A'], ['#C95E8A', '#F4B4CD', '#87334F'],
  ['#7B9E58', '#CBE0A1', '#4E6D34'], ['#D49B32', '#F8D477', '#93651B'],
  ['#5674B8', '#AABEF0', '#354C82'], ['#B66AA4', '#E5B5DB', '#78446D'],
  ['#D96767', '#F4A8A3', '#914343'], ['#497C75', '#A2D3C2', '#31594F'],
  ['#9976B8', '#D4B8E8', '#644A7C'], ['#4B6D8E', '#ADC5DD', '#324961'],
  ['#D47E65', '#F3BEA5', '#94533C'], ['#9D9C46', '#DFDEA0', '#696B2E'],
  ['#4E9B7A', '#A4DDC0', '#34684F'], ['#BF669F', '#E7B2D0', '#803C67'],
  ['#548D9F', '#ABD8E4', '#356170'], ['#A17159', '#DDBB9F', '#71513B']
];
let settings = {
  snakeCount: 2,
  ratCount: 5,
  playerSpeed: 4.2,
  playerForce: 0.18,
  aiSpeed: 3.1,
  aiForce: 0.16,
  ratSpeed: 2.2,
  mouthDistance: 105,
  fleeDistance: 155,
  snakeLength: 220,
  roundDurationSeconds: 60,
  ratSpawnWeights: { classic: 0.70, greedy: 0.20, golden: 0.08, magic: 0.02 }
};

let gamePanel;
let gameToggleButton;
let gameStats;
let gameOverOverlay;
let finalResultContent;
let gameStartButton;
let roundTimerLabel;
let controlSliders = {};
let mouseTarget = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  mouseTarget = createVector(0, 0);
  resetSimulation();
  createGameInterface();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function createSnake() {
  const margin = 55;
  const isPlayer = snakes.length === 0;
  const id = nextSnakeId++;
  const palette = snakePalettes[(id - 1) % snakePalettes.length];
  const tailLength = settings.snakeLength + 35;
  const safeDistance = Math.max(38, settings.snakeLength * 0.105 + 18);
  let spawn = null;
  let bestClearance = -Infinity;
  let fallback = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const heading = random(TWO_PI);
    const x = random(margin, width - margin);
    const y = random(margin, height - margin);
    const tailX = x + Math.cos(heading + PI) * tailLength;
    const tailY = y + Math.sin(heading + PI) * tailLength;
    if (tailX < 15 || tailX > width - 15 || tailY < 15 || tailY > height - 15) continue;

    let clearance = Infinity;
    for (const other of snakes) {
      const trailStride = Math.max(1, Math.floor(other.trail.length / 65));
      for (let index = 0; index < other.trail.length; index += trailStride) {
        const point = other.trail[index];
        for (let distance = 0; distance <= tailLength; distance += 16) {
          const px = x - Math.cos(heading) * distance;
          const py = y - Math.sin(heading) * distance;
          const dx = px - point.x;
          const dy = py - point.y;
          clearance = Math.min(clearance, dx * dx + dy * dy);
        }
      }
    }
    if (!Number.isFinite(clearance)) clearance = Infinity;
    if (clearance > bestClearance) {
      bestClearance = clearance;
      fallback = { x, y, heading };
    }
    if (clearance >= safeDistance * safeDistance) {
      spawn = { x, y, heading };
      break;
    }
  }
  spawn ||= fallback || { x: width * 0.5, y: height * 0.5, heading: 0 };
  const snake = new Snake(spawn.x, spawn.y, {
    id,
    heading: spawn.heading,
    bodyLength: settings.snakeLength,
    maxSpeed: isPlayer ? settings.playerSpeed : settings.aiSpeed,
    maxForce: isPlayer ? settings.playerForce : settings.aiForce,
    mouthOpenDistance: settings.mouthDistance,
    color: palette[0],
    colorLight: palette[1],
    colorDark: palette[2]
  });
  snake.isPlayer = isPlayer;
  return snake;
}

function createRat(type = null) {
  const margin = 45;
  return new Rat(random(margin, width - margin), random(margin, height - margin),
    nextRatId++, settings.ratSpeed, type || chooseRatType());
}

function resetSimulation() {
  gamePhase = 'ready';
  roundEndAt = 0;
  lastTimerShownSeconds = null;
  finalResults = null;
  playerSnakeId = null;
  caughtCount = 0;
  playerScore = 0;
  captureEffects = [];
  scorePopups = [];
  pendingRatRespawns = [];
  retiredSnakes = [];
  snakes = [];
  rats = [];
  nextSnakeId = 1;
  nextRatId = 1;
  for (let i = 0; i < settings.snakeCount; i++) snakes.push(createSnake());
  for (let i = 0; i < settings.ratCount; i++) rats.push(createRat());
  assignTargets();
  updateGameOverState();
  updateGameStats();
  updateRoundUi();
  updateRoundTimer(settings.roundDurationSeconds);
}

function restartSimulation() {
  resetSimulation();
  startGame();
}

function returnToGame() {
  // Start from a clean setup so old results and counters cannot leak into a replay.
  resetSimulation();
}

function startGame() {
  if (gamePhase !== 'ready' || snakes.length === 0) return;
  gamePhase = 'playing';
  playerSnakeId = snakes[0].id;
  roundEndAt = millis() + settings.roundDurationSeconds * 1000;
  lastTimerShownSeconds = null;
  updateRoundUi();
  updateRoundTimer(settings.roundDurationSeconds);
}

function finishGame() {
  if (gamePhase !== 'playing') return;
  gamePhase = 'ended';
  roundEndAt = 0;
  pendingRatRespawns.length = 0;
  for (const snake of snakes) {
    snake.vel.set(0, 0);
    snake.acc.set(0, 0);
    snake.speedBoostUntil = 0;
    snake.maxSpeed = snake.baseMaxSpeed;
    snake.separationX = 0;
    snake.separationY = 0;
  }
  for (const rat of rats) {
    rat.vel.set(0, 0);
    rat.acc.set(0, 0);
  }

  finalResults = retiredSnakes.concat(snakes.map(snake => ({
    id: snake.id,
    isPlayer: snake.id === playerSnakeId || snake.isPlayer,
    ratsEaten: snake.ratsEaten
  })));
  const best = finalResults.reduce((highest, result) => Math.max(highest, result.ratsEaten), 0);
  const winners = best > 0 ? finalResults.filter(result => result.ratsEaten === best) : [];
  const playerWon = winners.some(result => result.isPlayer);
  let verdict;
  if (winners.length === 0) verdict = 'AUCUN GAGNANT — aucun rat mangé.';
  else if (playerWon) verdict = winners.length > 1 ? 'TU AS GAGNÉ ! Égalité en tête.' : 'TU AS GAGNÉ !';
  else verdict = 'TU AS PERDU !';

  const winnerIds = new Set(winners.map(result => result.id));
  const winnerNames = winners.map(result => `Serpent ID ${result.id}${result.isPlayer ? ' (joueur)' : ''}`).join(', ');
  const rows = finalResults.map(result => {
    const winning = winnerIds.has(result.id);
    const role = result.isPlayer ? 'joueur' : 'IA';
    return `<div class="result-row ${winning ? 'result-winner' : 'result-loser'}"><span>Serpent ID ${result.id} (${role})${winning ? ' — GAGNANT !' : ' — perdant'}</span><strong>${result.ratsEaten} rat${result.ratsEaten === 1 ? '' : 's'}</strong></div>`;
  }).join('');
  const playerResults = finalResults.filter(result => result.isPlayer);
  const playerEaten = playerResults.reduce((total, result) => total + result.ratsEaten, 0);
  if (finalResultContent) {
    finalResultContent.html(`<h2>FIN DE LA PARTIE</h2><p class="result-verdict">${verdict}</p>${winnerNames ? `<p>En tête : ${winnerNames} — ${best} rat${best === 1 ? '' : 's'} mangé${best === 1 ? '' : 's'}.</p>` : ''}<p>Rats mangés par le serpent du joueur : ${playerEaten}</p><div class="result-list">${rows}</div>`);
  }
  updateRoundUi();
  updateRoundTimer(0);
  updateGameStats();
}

function setSnakeCount(count) {
  if (gamePhase === 'ended') return;
  const desired = constrain(Math.floor(Number(count) || 0), 0, MAX_SNAKES);
  while (snakes.length > desired) {
    const removed = snakes.pop();
    if (gamePhase === 'playing') {
      retiredSnakes.push({ id: removed.id, isPlayer: removed.id === playerSnakeId, ratsEaten: removed.ratsEaten });
    }
  }
  while (snakes.length < desired) snakes.push(createSnake());
  settings.snakeCount = desired;
  assignTargets();
  updateGameStats();
  updateRoundUi();
}

function setRatCount(count) {
  if (gamePhase === 'ended') return;
  const desired = constrain(Math.floor(Number(count) || 0), 0, MAX_RATS);
  // A manual population change takes ownership of every pending replacement.
  pendingRatRespawns.length = 0;
  while (rats.length > desired) rats.pop();
  while (rats.length < desired) rats.push(createRat());
  settings.ratCount = desired;
  assignTargets();
  updateGameOverState();
  updateGameStats();
}

function assignTargets() {
  if (snakes.length > 0) {
    snakes[0].targetRatId = null;
    snakes[0].targetRat = null;
  }
  for (let i = 1; i < snakes.length; i++) {
    const snake = snakes[i];
    if (snake.targetRat && rats.includes(snake.targetRat)) continue;
    snake.targetRatId = null;
    snake.targetRat = null;
    let closest = null;
    let bestDistanceSq = Infinity;
    for (const rat of rats) {
      const dx = snake.pos.x - rat.pos.x;
      const dy = snake.pos.y - rat.pos.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        closest = rat;
      }
    }
    if (closest) {
      snake.targetRatId = closest.id;
      snake.targetRat = closest;
    }
  }
}

function draw() {
  background('#FFF7F8');
  drawAmbientBackground();
  if (gamePhase === 'playing') {
    const remainingSeconds = Math.ceil((roundEndAt - millis()) / 1000);
    if (remainingSeconds <= 0) {
      finishGame();
    } else {
      updateRoundTimer(remainingSeconds);
      updateRatRespawns();
      for (const rat of rats) rat.update(snakes, settings.fleeDistance, settings.ratSpeed);
      applySnakeSeparation();
      for (let i = 0; i < snakes.length; i++) {
        const snake = snakes[i];
        if (i === 0) {
          mouseTarget.set(constrain(mouseX, snake.r, width - snake.r), constrain(mouseY, snake.r, height - snake.r));
          snake.update(mouseTarget, settings.mouthDistance, nearestRatDistance(snake));
          continue;
        }
        const targetRat = snake.targetRat;
        let targetDistance = Infinity;
        if (targetRat) {
          const dx = snake.pos.x - targetRat.pos.x;
          const dy = snake.pos.y - targetRat.pos.y;
          targetDistance = Math.sqrt(dx * dx + dy * dy);
        }
        snake.update(targetRat ? targetRat.pos : null, settings.mouthDistance, targetDistance);
      }
      handleCaptures();
      drawCaptureEffects();
      drawScorePopups();
    }
  }
  for (const rat of rats) rat.show();
  for (const snake of snakes) snake.show();
}

function applySnakeSeparation() {
  // Separate heads from one another.
  for (let i = 0; i < snakes.length; i++) {
    const a = snakes[i];
    for (let j = i + 1; j < snakes.length; j++) {
      const b = snakes[j];
      const dx = a.pos.x - b.pos.x;
      const dy = a.pos.y - b.pos.y;
      const distanceSq = dx * dx + dy * dy;
      // Start easing apart before the heads visibly overlap; the force remains
      // capped and fades smoothly to zero at the edge of this zone.
      const range = (a.r + b.r) * 1.25;
      if (distanceSq >= range * range) continue;
      const distance = Math.sqrt(distanceSq);
      const directionX = distance > 0.001 ? dx / distance : (a.id < b.id ? 1 : -1);
      const directionY = distance > 0.001 ? dy / distance : 0;
      const force = 0.06 * (1 - distance / range);
      a.separationX += directionX * force;
      a.separationY += directionY * force;
      b.separationX -= directionX * force;
      b.separationY -= directionY * force;
    }
  }

  // Steer each head away from the other snakes' continuous body trails.
  // A bounded sample count keeps this affordable with 20 snakes.
  for (const snake of snakes) {
    let forceX = snake.separationX;
    let forceY = snake.separationY;
    for (const other of snakes) {
      if (other === snake || other.trail.length < 4) continue;
      const safeDistance = snake.r + other.bodyWidth * 0.55 + 8;
      const safeDistanceSq = safeDistance * safeDistance;
      const skipHeadSamples = Math.max(2, Math.ceil(safeDistance / 2.5));
      const lastBodyIndex = other.trail.length - 1 - skipHeadSamples;
      if (lastBodyIndex < 1) continue;
      const stride = Math.max(1, Math.floor(other.trail.length / 70));
      let closestSq = safeDistanceSq;
      let closestX = 0;
      let closestY = 0;
      let closestIndex = -1;

      for (let index = 0; index <= lastBodyIndex; index += stride) {
        const point = other.trail[index];
        const dx = snake.pos.x - point.x;
        const dy = snake.pos.y - point.y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < closestSq) {
          closestSq = distanceSq;
          closestX = dx;
          closestY = dy;
          closestIndex = index;
        }
      }
      if (closestIndex < 0) continue;

      const distance = Math.sqrt(closestSq);
      if (distance > 0.001) {
        const strength = 0.12 * (1 - distance / safeDistance);
        forceX += closestX / distance * strength;
        forceY += closestY / distance * strength;
      } else {
        const before = other.trail[Math.max(0, closestIndex - 1)];
        const after = other.trail[Math.min(other.trail.length - 1, closestIndex + 1)];
        const magnitude = Math.hypot(after.x - before.x, after.y - before.y) || 1;
        const side = snake.id < other.id ? 1 : -1;
        forceX -= (after.y - before.y) / magnitude * 0.12 * side;
        forceY += (after.x - before.x) / magnitude * 0.12 * side;
      }
    }

    const magnitude = Math.hypot(forceX, forceY);
    const limit = snake.maxForce * 0.9;
    if (magnitude > limit) {
      forceX *= limit / magnitude;
      forceY *= limit / magnitude;
    }
    snake.separationX = forceX;
    snake.separationY = forceY;
  }
}

function updateRatRespawns() {
  if (gamePhase !== 'playing') return;
  const now = millis();
  let changed = false;
  let keep = 0;
  for (let i = 0; i < pendingRatRespawns.length; i++) {
    const pending = pendingRatRespawns[i];
    if (now >= pending.at && rats.length < settings.ratCount) {
      rats.push(createRat());
      changed = true;
    } else if (rats.length + (pendingRatRespawns.length - i) <= settings.ratCount) {
      pendingRatRespawns[keep++] = pending;
    }
  }
  pendingRatRespawns.length = keep;
  if (changed) {
    assignTargets();
    updateGameStats();
    updateGameOverState();
  }
}

function nearestRatDistance(snake) {
  let nearestSq = Infinity;
  for (const rat of rats) {
    const dx = snake.pos.x - rat.pos.x;
    const dy = snake.pos.y - rat.pos.y;
    nearestSq = Math.min(nearestSq, dx * dx + dy * dy);
  }
  return Math.sqrt(nearestSq);
}

function handleCaptures() {
  if (gamePhase !== 'playing') return;
  let capturedCount = 0;
  for (const snake of snakes) {
    if (snake === snakes[0]) {
      for (const rat of rats) {
        if (tryCaptureRat(snake, rat)) {
          capturedCount++;
          break;
        }
      }
    } else if (snake.targetRat && tryCaptureRat(snake, snake.targetRat)) {
      capturedCount++;
    }
  }

  if (capturedCount > 0) {
    rats = rats.filter(rat => !rat.captured);
    for (const snake of snakes) {
      if (snake.targetRat?.captured) {
        snake.targetRatId = null;
        snake.targetRat = null;
      }
    }
    assignTargets();
    updateGameStats();
    updateGameOverState();
  }
}

function tryCaptureRat(snake, rat) {
  if (rat.captured) return false;
  const contactDistance = snake.r * 0.86 + rat.r;
  const dx = snake.pos.x - rat.pos.x;
  const dy = snake.pos.y - rat.pos.y;
  if (dx * dx + dy * dy > contactDistance * contactDistance) return false;

  // Mark first, so no other snake can claim or score this rat.
  rat.captured = true;
  caughtCount++;
  snake.ratsEaten++;
  snake.startBite();
  if (rat.type === 'magic') snake.activateSpeedBoost(5000);
  if (snake === snakes[0]) {
    playerScore += rat.points;
    if (rat.points > 0) scorePopups.push({ x: rat.pos.x, y: rat.pos.y, points: rat.points, startedAt: millis() });
  }
  captureEffects.push({ pos: rat.pos.copy(), startedAt: millis() });
  pendingRatRespawns.push({ at: millis() + 520 });
  return true;
}

function drawCaptureEffects() {
  const now = millis();
  let keep = 0;
  for (let i = 0; i < captureEffects.length; i++) {
    const effect = captureEffects[i];
    if (now - effect.startedAt < 520) captureEffects[keep++] = effect;
  }
  captureEffects.length = keep;
  for (const effect of captureEffects) {
    const progress = (now - effect.startedAt) / 520;
    push();
    noFill();
    stroke(236, 72, 153, 180 * (1 - progress));
    strokeWeight(3);
    circle(effect.pos.x, effect.pos.y, 14 + progress * 54);
    pop();
  }
}

function drawScorePopups() {
  const now = millis();
  let keep = 0;
  for (let i = 0; i < scorePopups.length; i++) {
    const popup = scorePopups[i];
    const elapsed = now - popup.startedAt;
    if (elapsed >= 750) continue;
    scorePopups[keep++] = popup;
    push();
    noStroke();
    fill(157, 23, 77, 255 * (1 - elapsed / 750));
    textAlign(CENTER, CENTER);
    textSize(16);
    text(`+${popup.points}`, popup.x, popup.y - elapsed * 0.035);
    pop();
  }
  scorePopups.length = keep;
}

function drawAmbientBackground() {
  push();
  noStroke();
  fill(244, 114, 182, 18);
  circle(width * 0.78, height * 0.22, Math.min(width, height) * 0.42);
  fill(251, 207, 232, 40);
  circle(width * 0.16, height * 0.82, Math.min(width, height) * 0.32);
  pop();
}

function createGameInterface() {
  gameToggleButton = createButton('Masquer les paramètres (H)');
  gameToggleButton.id('game-toggle');
  gameToggleButton.mousePressed(toggleGameInterface);

  gamePanel = createDiv();
  gamePanel.id('game-panel');
  createDiv('<h2>🐍 Serpents &amp; rats</h2><p>Les rats explorent et fuient. Les serpents les chassent.</p>').parent(gamePanel);
  roundTimerLabel = createDiv('Temps restant : 01:00');
  roundTimerLabel.id('game-timer');
  roundTimerLabel.parent(gamePanel);

  createControlGroup('Population');
  addControl(`Serpents (maximum ${MAX_SNAKES})`, 'snakeCount', 0, MAX_SNAKES, 1, settings.snakeCount, setSnakeCount);
  addControl(`Rats présents en même temps (maximum ${MAX_RATS})`, 'ratCount', 0, MAX_RATS, 1, settings.ratCount, setRatCount);

  createControlGroup('Serpents');
  addControl('Vitesse du serpent joueur', 'playerSpeed', 0.8, 8, 0.1, settings.playerSpeed, value => {
    settings.playerSpeed = value;
    if (snakes[0]) snakes[0].setMovement(value, settings.playerForce);
  });
  addControl('Force du serpent joueur', 'playerForce', 0.02, 0.5, 0.01, settings.playerForce, value => {
    settings.playerForce = value;
    if (snakes[0]) snakes[0].setMovement(settings.playerSpeed, value);
  });
  addControl('Vitesse des serpents IA', 'aiSpeed', 0.8, 8, 0.1, settings.aiSpeed, value => {
    settings.aiSpeed = value;
    for (let i = 1; i < snakes.length; i++) snakes[i].setMovement(value, settings.aiForce);
  });
  addControl('Longueur du corps', 'snakeLength', 130, 420, 10, settings.snakeLength, value => {
    settings.snakeLength = value;
    snakes.forEach(snake => snake.setBodyLength(value));
  });
  addControl('Ouverture de la bouche (px)', 'mouthDistance', 35, 220, 5, settings.mouthDistance, value => {
    settings.mouthDistance = value;
  });

  createControlGroup('Rats');
  addControl('Vitesse des rats', 'ratSpeed', 0.5, 5, 0.1, settings.ratSpeed, value => {
    settings.ratSpeed = value;
    rats.forEach(rat => rat.setMaxSpeed(value));
  });
  addControl('Distance de fuite (px)', 'fleeDistance', 50, 300, 10, settings.fleeDistance, value => {
    settings.fleeDistance = value;
  });

  createControlGroup('Partie');
  addControl('Durée (secondes)', 'roundDurationSeconds', 30, 180, 15, settings.roundDurationSeconds, value => {
    if (gamePhase !== 'ready') return;
    settings.roundDurationSeconds = value;
    updateRoundTimer(value);
  });

  gameStats = createDiv();
  gameStats.id('game-stats');
  gameStats.parent(gamePanel);

  gameStartButton = createButton('Démarrer');
  gameStartButton.class('game-reset');
  gameStartButton.parent(gamePanel);
  gameStartButton.mousePressed(startGame);

  const resetButton = createButton('↻ Réinitialiser la simulation');
  resetButton.class('game-reset');
  resetButton.parent(gamePanel);
  resetButton.mousePressed(resetSimulation);

  gameOverOverlay = createDiv();
  gameOverOverlay.id('game-over');
  const gameOverCard = createDiv();
  gameOverCard.class('game-result-card');
  gameOverCard.parent(gameOverOverlay);
  finalResultContent = createDiv();
  finalResultContent.parent(gameOverCard);
  const gameOverActions = createDiv();
  gameOverActions.class('game-over-actions');
  gameOverActions.parent(gameOverCard);
  const replayButton = createButton('Rejouer');
  replayButton.class('game-reset');
  replayButton.parent(gameOverActions);
  replayButton.mousePressed(restartSimulation);
  const returnButton = createButton('Retour à la partie');
  returnButton.class('game-reset game-return');
  returnButton.parent(gameOverActions);
  returnButton.mousePressed(returnToGame);

  updateGameStats();
  updateGameOverState();
  updateRoundUi();
  updateRoundTimer(settings.roundDurationSeconds);
}

function createControlGroup(title) {
  const heading = createDiv(title);
  heading.class('game-group-title');
  heading.parent(gamePanel);
}

function addControl(labelText, name, min, max, step, initial, onChange) {
  const row = createDiv();
  row.class('game-control');
  row.parent(gamePanel);
  const header = createDiv();
  header.class('game-control-header');
  header.parent(row);
  createSpan(labelText).parent(header);
  const valueText = createSpan(formatValue(initial));
  valueText.class('game-control-value');
  valueText.parent(header);
  const slider = createSlider(min, max, initial, step);
  slider.class('game-slider');
  slider.parent(row);
  controlSliders[name] = { slider, valueText };
  slider.input(() => {
    const value = Number(slider.value());
    onChange(value);
    valueText.html(formatValue(value));
    updateGameStats();
    updateGameOverState();
  });
}

function formatValue(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) ? String(numeric) : String(Number(numeric.toFixed(2)));
}

function updateGameStats() {
  if (!gameStats) return;
  let snakeRows = '';
  for (const snake of snakes) {
    snakeRows += `<div><span>Serpent ${snake.id}${snake.isPlayer ? ' · joueur' : ' · IA'}</span><strong>${snake.ratsEaten}</strong></div>`;
  }
  gameStats.html(`
    <div><span>Serpents</span><strong>${snakes.length}</strong></div>
    <div><span>Rats vivants</span><strong>${rats.length}</strong></div>
    <div><span>Rats attrapés</span><strong>${caughtCount}</strong></div>
    <div><span>Score joueur</span><strong>${playerScore}</strong></div>
    ${snakeRows}
  `);
}

function updateGameOverState() {
  if (!gameOverOverlay) return;
  gameOverOverlay.style('display', gamePhase === 'ended' ? 'flex' : 'none');
}

function updateRoundTimer(seconds) {
  const remaining = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!roundTimerLabel || lastTimerShownSeconds === remaining) return;
  lastTimerShownSeconds = remaining;
  const minutes = Math.floor(remaining / 60);
  const secondPart = String(remaining % 60).padStart(2, '0');
  roundTimerLabel.html(`Temps restant : ${String(minutes).padStart(2, '0')}:${secondPart}`);
}

function updateRoundUi() {
  if (gameStartButton) {
    gameStartButton.style('display', gamePhase === 'ready' ? 'block' : 'none');
    gameStartButton.elt.disabled = snakes.length === 0;
  }
  for (const [name, control] of Object.entries(controlSliders)) {
    control.slider.elt.disabled = gamePhase === 'ended' || (gamePhase === 'playing' && name === 'roundDurationSeconds');
  }
  updateGameOverState();
}

function toggleGameInterface() {
  const hidden = gamePanel.style('display') === 'none';
  gamePanel.style('display', hidden ? 'block' : 'none');
  gameToggleButton.html(hidden ? 'Masquer les paramètres (H)' : 'Afficher les paramètres (H)');
}

function keyPressed() {
  if (key === 'd' || key === 'D') {
    Vehicle.debug = !Vehicle.debug;
  } else if (key === 'h' || key === 'H') {
    toggleGameInterface();
  }
}
