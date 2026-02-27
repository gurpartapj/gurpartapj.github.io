// =============================
// I did not code this Site - ChatGPT was used for the Site Coding
// Any Embedded System coding is done by me 
// =============================
// Scripted Tetris Replay (Deterministic)
// Builds stack -> 4-line clear -> explode -> site
// =============================

const intro = document.getElementById("intro");
const content = document.getElementById("content");
const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

// ----- Canvas / DPR (performance + crisp) -----
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

// ----- Tetris config -----
const CELL = 26;
const ROWS = 18;
const COLS = 10;

const GRID_W = COLS * CELL;
const GRID_H = ROWS * CELL;

function gridOrigin() {
  return {
    x: Math.floor((window.innerWidth - GRID_W) / 2),
    y: Math.floor((window.innerHeight - GRID_H) / 2),
  };
}

// ----- Tetrominoes (4x4) -----
const SHAPES = {
  I: [
    [0,0,0,0],
    [1,1,1,1],
    [0,0,0,0],
    [0,0,0,0],
  ],
  O: [
    [0,1,1,0],
    [0,1,1,0],
    [0,0,0,0],
    [0,0,0,0],
  ],
  T: [
    [0,1,0,0],
    [1,1,1,0],
    [0,0,0,0],
    [0,0,0,0],
  ],
  J: [
    [1,0,0,0],
    [1,1,1,0],
    [0,0,0,0],
    [0,0,0,0],
  ],
  L: [
    [0,0,1,0],
    [1,1,1,0],
    [0,0,0,0],
    [0,0,0,0],
  ],
  S: [
    [0,1,1,0],
    [1,1,0,0],
    [0,0,0,0],
    [0,0,0,0],
  ],
  Z: [
    [1,1,0,0],
    [0,1,1,0],
    [0,0,0,0],
    [0,0,0,0],
  ],
};

const COLORS = {
  I: "#39c6ff",
  O: "#ffd24a",
  T: "#b884ff",
  S: "#58e06f",
  Z: "#ff5c6c",
  J: "#4f79ff",
  L: "#ff9a3c",
};

// ----- Helpers -----
function clone4(m) { return m.map(r => r.slice()); }

function rotateCW(mat) {
  const res = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) res[c][3 - r] = mat[r][c];
  return res;
}

// Normalize matrix so blocks are packed top-left.
// This prevents “stuck/floating offset” after rotation (your screenshot bug).
function normalize(mat) {
  let minR = 4, minC = 4, maxR = -1, maxC = -1;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (mat[r][c]) {
        minR = Math.min(minR, r);
        minC = Math.min(minC, c);
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
      }
    }
  }
  const out = Array.from({ length: 4 }, () => Array(4).fill(0));
  if (maxR === -1) return out;

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (mat[r][c]) out[r - minR][c - minC] = 1;
    }
  }
  return out;
}

function pieceWidth(mat) {
  let maxC = -1;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (mat[r][c]) maxC = Math.max(maxC, c);
  return maxC + 1; // 1..4
}

// ----- Board -----
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// ----- Scripted Replay -----
// Pro-ish: stack on right, keep a left “well”, then drop vertical I at x=0 for a Tetris.
// The set intentionally fills cols 1..9 in the bottom 4 rows.
// Final piece: I vertical at x=0 clears 4 lines.

const SCRIPT = [
  // Foundation layer
  { type: "J", rot: 1, targetX: 1 },
  { type: "L", rot: 3, targetX: 4 },
  { type: "S", rot: 0, targetX: 6 },
  { type: "Z", rot: 0, targetX: 3 },
  { type: "T", rot: 2, targetX: 5 },

  // Second layer
  { type: "L", rot: 1, targetX: 2 },
  { type: "J", rot: 3, targetX: 6 },
  { type: "T", rot: 1, targetX: 4 },
  { type: "O", rot: 0, targetX: 7 },

  // Third layer
  { type: "S", rot: 0, targetX: 2 },
  { type: "Z", rot: 0, targetX: 5 },
  { type: "L", rot: 2, targetX: 7 },

  // Fourth layer shaping
  { type: "T", rot: 0, targetX: 3 },
  { type: "J", rot: 2, targetX: 6 },

  // Final Tetris
  { type: "I", rot: 1, targetX: 0 },
];

// ----- Current piece state -----
let scriptIndex = 0;
let current = null;

// Spawn from script: start centered, then slide to target while falling
function spawn(step) {
  let mat = clone4(SHAPES[step.type]);
  for (let i = 0; i < (step.rot % 4); i++) mat = rotateCW(mat);
  mat = normalize(mat);

  const w = pieceWidth(mat);
  const startX = Math.floor((COLS - w) / 2);

  return {
    type: step.type,
    mat,
    x: startX,
    y: -2,            // slightly above visible
    targetX: Math.max(0, Math.min(step.targetX, COLS - w)),
  };
}

// Collision
function collides(p, dx, dy) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!p.mat[r][c]) continue;
      const nx = p.x + c + dx;
      const ny = p.y + r + dy;

      if (nx < 0 || nx >= COLS) return true;
      if (ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function lockPiece(p) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!p.mat[r][c]) continue;
      const x = p.x + c;
      const y = p.y + r;
      if (y >= 0) board[y][x] = p.type;
    }
  }
}

function clearLines() {
  let clearedRows = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) clearedRows.push(r);
  }
  if (!clearedRows.length) return 0;

  for (const r of clearedRows) burstRow(r);

  for (const r of clearedRows) {
    board.splice(r, 1);
    board.unshift(Array(COLS).fill(null));
  }
  return clearedRows.length;
}

// ----- Explosion particles -----
let particles = [];
let state = "play"; // play -> explode -> done
let fadeStarted = false;

function burstRow(row) {
  const { x: ox, y: oy } = gridOrigin();
  const y = oy + row * CELL + CELL / 2;
  const count = 140; // tuned to avoid lag
  for (let i = 0; i < count; i++) {
    particles.push({
      x: ox + Math.random() * GRID_W,
      y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 1.0) * 8,
      life: 55,
      size: 2 + Math.random() * 2,
    });
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25;
    p.life--;
  }
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  if (!particles.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#5aa9ff";
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 55);
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ----- Drawing -----
function drawBackground() {
  ctx.fillStyle = "#0a0f1c";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // subtle ambient dots
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = "#5aa9ff";
  const t = performance.now();
  for (let i = 0; i < 45; i++) {
    const x = (i * 101 + t * 0.02) % window.innerWidth;
    const y = (i * 179 + t * 0.015) % window.innerHeight;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

function drawCell(px, py, color) {
  ctx.save();
  ctx.fillStyle = color;

  // soft glow (cheap)
  ctx.globalAlpha = 0.16;
  ctx.fillRect(px - 2, py - 2, CELL + 4, CELL + 4);

  ctx.globalAlpha = 1;
  ctx.fillRect(px, py, CELL, CELL);

  // highlight
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(px + 2, py + 2, CELL - 4, 3);
  ctx.restore();
}

function drawBoardAndPiece() {
  const { x: ox, y: oy } = gridOrigin();

  // border
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#5aa9ff";
  ctx.strokeRect(ox - 1, oy - 1, GRID_W + 2, GRID_H + 2);
  ctx.restore();

  // board
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = board[r][c];
      if (!t) continue;
      drawCell(ox + c * CELL, oy + r * CELL, COLORS[t]);
    }
  }

  // current
  if (current) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!current.mat[r][c]) continue;
        const x = current.x + c;
        const y = current.y + r;
        if (y < 0) continue;
        drawCell(ox + x * CELL, oy + y * CELL, COLORS[current.type]);
      }
    }
  }
}

// ----- Timing (fast + cinematic) -----
const DROP_MS = 35;       // gravity speed
const MOVE_MS = 55;       // horizontal slide speed
const LOCK_DELAY_MS = 70; // tiny pause before lock

let last = performance.now();
let dropAcc = 0;
let moveAcc = 0;
let lockAcc = 0;
let totalCleared = 0;

function nextPiece() {
  if (scriptIndex >= SCRIPT.length) return null;
  const p = spawn(SCRIPT[scriptIndex]);
  scriptIndex++;
  return p;
}

current = nextPiece();

function frame(now) {
  const dt = now - last;
  last = now;

  drawBackground();
  drawBoardAndPiece();

  if (state === "play" && current) {
    dropAcc += dt;
    moveAcc += dt;

    // Slide toward target X (looks like a player)
    while (moveAcc >= MOVE_MS) {
      moveAcc -= MOVE_MS;
      if (current.x < current.targetX && !collides(current, +1, 0)) current.x++;
      else if (current.x > current.targetX && !collides(current, -1, 0)) current.x--;
    }

    // Drop
    while (dropAcc >= DROP_MS) {
      dropAcc -= DROP_MS;

      if (!collides(current, 0, +1)) {
        current.y++;
        lockAcc = 0;
      } else {
        lockAcc += DROP_MS;
        if (lockAcc >= LOCK_DELAY_MS) {
          lockPiece(current);

          const cleared = clearLines();
          totalCleared += cleared;

          current = nextPiece();
          lockAcc = 0;

          // Trigger explosion as soon as we get the big 4-line clear
          // (In this script it happens on the final I piece)
          if (cleared >= 4 || totalCleared >= 4) {
            state = "explode";
          }

          // Safety: if script ends without clear, still explode
          if (!current) state = "explode";
        }
      }
    }
  } else if (state === "explode") {
    updateParticles();
    drawParticles();

    // When particles are mostly done, fade to site
    if (!fadeStarted && particles.length < 40) {
      fadeStarted = true;
      intro.style.transition = "opacity 0.55s ease";
      intro.style.opacity = "0";
      setTimeout(() => {
        intro.style.display = "none";
        content.style.opacity = "1";
      }, 560);
    }
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// ----- Scroll fade for page sections -----
const faders = document.querySelectorAll(".fade");
const observer = new IntersectionObserver(
  entries => entries.forEach(e => e.isIntersecting && e.target.classList.add("visible")),
  { threshold: 0.12 }
);
faders.forEach(el => observer.observe(el));

