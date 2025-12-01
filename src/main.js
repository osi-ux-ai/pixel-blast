const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const ammoEl = document.getElementById('ammo');
const tierEl = document.getElementById('tier');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');
const menuEl = document.getElementById('menu');
const startBtn = document.getElementById('start');
const laneButtons = Array.from(document.querySelectorAll('[data-lane]'));
const START_KEYS = ['enter', ' '];

const LANE_COLORS = ['#3ca6ff', '#ff4d67', '#ffd447', '#5be17a'];
const LANE_KEYS = ['a', 's', 'd', 'f'];
const ENEMY_SIZE = { w: 64, h: 52 };
const BULLET_SIZE = { w: 12, h: 20 };
const SHIP_PIXEL = 4;
const SHIP_PATTERN = [
  '0000H0H0000',
  '000HHHHH000',
  '00HHCHHHH00',
  '00HHMMMHH00',
  '0HHMMMMMHH0',
  '0HMMMMMMMH0',
  '0MMMMMMMMM0',
  '0MMMMMMMMM0',
  '00MMSMMMS00',
  '000SSS00000',
  '000FFF00000',
  '0000F000000',
];
const SHIP_HEIGHT = SHIP_PATTERN.length * SHIP_PIXEL;
const SHIP_WIDTH = SHIP_PATTERN[0].length * SHIP_PIXEL;
const SHIP_MARGIN = 12;
const START_AMMO = 10;

const state = {
  running: false,
  ammo: START_AMMO,
  score: 0,
  enemies: [],
  bullets: [],
  lastSpawn: 0,
  lastFrame: performance.now(),
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const adjust = (channel) => clamp(Math.round(channel + (percent / 100) * 255), 0, 255);
  const toHex = (channel) => channel.toString(16).padStart(2, '0');
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

function difficulty(score) {
  const tier = Math.floor(score / 500);
  return {
    tier,
    speedMultiplier: 1 + tier * 0.2,
    hpMin: 1 + Math.min(tier, 2),
    hpMax: 5 + tier,
    spawnInterval: clamp(1600 - 200 * tier, 500, 1600),
    ammoGain: tier < 3 ? 1 : 0,
  };
}

function resetGame() {
  state.running = true;
  state.ammo = START_AMMO;
  state.score = 0;
  state.enemies = [];
  state.bullets = [];
  state.lastSpawn = performance.now();
  state.lastFrame = performance.now();
  messageEl.classList.add('hidden');
  restartBtn.classList.add('hidden');
  menuEl.classList.add('hidden');
  updateHud();
  requestAnimationFrame(loop);
}

function startFromMenu() {
  resetGame();
}

function handleStartKey(event) {
  const key = event.key.toLowerCase();
  if (state.running) return;
  if (!START_KEYS.includes(key)) return;
  event.preventDefault();
  startFromMenu();
}

function endGame(reason) {
  state.running = false;
  messageEl.textContent = reason;
  messageEl.classList.remove('hidden');
  restartBtn.classList.remove('hidden');
}

function updateHud() {
  const { tier } = difficulty(state.score);
  scoreEl.textContent = state.score;
  ammoEl.textContent = state.ammo;
  tierEl.textContent = tier;
}

function spawnEnemy(time) {
  const diff = difficulty(state.score);
  if (time - state.lastSpawn < diff.spawnInterval) return;

  const lane = Math.floor(Math.random() * 4);
  const hp = Math.floor(Math.random() * (diff.hpMax - diff.hpMin + 1)) + diff.hpMin;
  state.enemies.push({
    lane,
    y: -ENEMY_SIZE.h,
    hp,
    speed: (35 + Math.random() * 20) * diff.speedMultiplier,
  });
  state.lastSpawn = time;
}

function fire(lane) {
  if (!state.running) return;
  if (lane < 0 || lane > 3) return;
  if (state.ammo <= 0) {
    endGame('Mermi bitti!');
    return;
  }
  state.ammo -= 1;
  updateHud();
  const laneWidth = canvas.width / 4;
  const x = laneWidth * lane + laneWidth / 2 - BULLET_SIZE.w / 2;
  const shipTop = canvas.height - SHIP_HEIGHT - SHIP_MARGIN;
  state.bullets.push({ lane, x, y: shipTop - BULLET_SIZE.h + SHIP_PIXEL });
  if (state.ammo <= 0) {
    endGame('Mermi bitti!');
  }
}

function handleInput(event) {
  const key = event.key.toLowerCase();
  const lane = LANE_KEYS.indexOf(key);
  if (lane >= 0) {
    fire(lane);
  }
}

function handleTouch(event) {
  const target = event.target.closest('[data-lane]');
  if (!target) return;
  const lane = Number(target.dataset.lane);
  fire(lane);
}

function update(dt) {
  const diff = difficulty(state.score);
  // Move enemies
  for (const enemy of state.enemies) {
    enemy.y += enemy.speed * dt;
    if (enemy.y + ENEMY_SIZE.h >= canvas.height - 12) {
      endGame('Düşman gemiye ulaştı!');
      return;
    }
  }

  // Move bullets
  for (const bullet of state.bullets) {
    bullet.y -= 400 * dt;
  }

  // Collision detection
  for (const bullet of state.bullets) {
    for (const enemy of state.enemies) {
      if (enemy.lane !== bullet.lane) continue;
      const overlapsY =
        bullet.y <= enemy.y + ENEMY_SIZE.h &&
        bullet.y + BULLET_SIZE.h >= enemy.y;
      if (overlapsY) {
        enemy.hp -= 1;
        bullet._hit = true;
        if (enemy.hp <= 0) {
          state.score += 100;
          state.ammo += diff.ammoGain > 0 ? diff.ammoGain : 0;
          enemy._dead = true;
        }
      }
    }
  }

  state.enemies = state.enemies.filter((enemy) => !enemy._dead);
  state.bullets = state.bullets.filter((bullet) => !bullet._hit && bullet.y + BULLET_SIZE.h >= 0);
  updateHud();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLanes();
  drawEnemies();
  drawBullets();
  drawShips();
}

function drawLanes() {
  const laneWidth = canvas.width / 4;
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(i * laneWidth, 0, laneWidth - 1, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeRect(i * laneWidth + 1, 0, laneWidth - 2, canvas.height);
  }
}

function drawShips() {
  const laneWidth = canvas.width / 4;
  const y = canvas.height - SHIP_HEIGHT - SHIP_MARGIN;
  for (let i = 0; i < 4; i++) {
    const x = laneWidth * i + laneWidth / 2 - SHIP_WIDTH / 2;
    const base = LANE_COLORS[i];
    const colors = {
      M: base,
      H: shadeColor(base, 28),
      S: shadeColor(base, -32),
      C: '#b5f0ff',
      F: '#ffb347',
    };
    for (let row = 0; row < SHIP_PATTERN.length; row++) {
      for (let col = 0; col < SHIP_PATTERN[row].length; col++) {
        const cell = SHIP_PATTERN[row][col];
        if (cell === '0') continue;
        const color = colors[cell];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x + col * SHIP_PIXEL, y + row * SHIP_PIXEL, SHIP_PIXEL, SHIP_PIXEL);
      }
    }
  }
}

function drawEnemies() {
  const laneWidth = canvas.width / 4;
  for (const enemy of state.enemies) {
    const x = laneWidth * enemy.lane + laneWidth / 2 - ENEMY_SIZE.w / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, enemy.y, ENEMY_SIZE.w, ENEMY_SIZE.h);
    ctx.fillStyle = LANE_COLORS[enemy.lane];
    ctx.fillRect(x + 6, enemy.y + 6, ENEMY_SIZE.w - 12, ENEMY_SIZE.h - 12);
    ctx.fillStyle = '#0b1021';
    ctx.fillRect(x + 10, enemy.y + 10, ENEMY_SIZE.w - 20, ENEMY_SIZE.h - 20);
    ctx.fillStyle = '#e6e9ff';
    ctx.font = '16px "DM Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.hp, x + ENEMY_SIZE.w / 2, enemy.y + ENEMY_SIZE.h / 2 + 6);
  }
}

function drawBullets() {
  for (const bullet of state.bullets) {
    ctx.fillStyle = LANE_COLORS[bullet.lane];
    ctx.fillRect(bullet.x, bullet.y, BULLET_SIZE.w, BULLET_SIZE.h);
  }
}

function loop(time) {
  if (!state.running) return;
  const dt = Math.min(0.05, (time - state.lastFrame) / 1000);
  state.lastFrame = time;

  spawnEnemy(time);
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', handleInput);
window.addEventListener('keydown', handleStartKey);
laneButtons.forEach((button) => button.addEventListener('click', handleTouch));
restartBtn.addEventListener('click', resetGame);
startBtn.addEventListener('click', startFromMenu);

updateHud();
