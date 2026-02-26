// =============================
// I did not code this Site - ChatGPT was used for the Site Coding
// Any Embedded System coding is done by me 
// =============================
// Scripted Tetris Replay Intro
// Builds cleanly -> clears 4 lines -> explode -> site
// =============================

const intro = document.getElementById("intro");
const content = document.getElementById("content");
const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d", { alpha: false });

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

// --- Config ---
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

// --- Tetrominoes (4x4) ---
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
};

const COLORS = {
  I: "#39c6ff",
  O: "#ffd24a",
  T: "#b884ff",
  J: "#4f79ff",
  L: "#ff9a3c",
};

function rotateCW(mat) {
  const res = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      res[c][3 - r] = mat[r][c];
    }
  }
  return res;
}

function clone4(m) { return m.map(r => r.slice()); }

// --- Board ---
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// --- Scripted replay ---
// Each step: { type, rot, x }
// rot = number of clockwise rotations (0-3)
// x = column where the 4x4 matrix starts
//
// This script is designed to:
// - build a clean stack
// - leave a Tetris well
// - drop a vertical I to clear 4 lines
const SCRIPT = [
  { type:"L", rot:1, x:0 },
  { type:"J", rot:3, x:7 },
  { type:"O", rot:0, x:4 },
  { type:"T", rot:0, x:3 },
  { type:"L", rot:0, x:6 },
  { type:"J", rot:0, x:0 },
  { type:"O", rot:0, x:2 },
  { type:"T", rot:1, x:5 },
  { type:"L", rot:2, x:7 },
  { type:"J", rot:2, x:0 },

  // These tighten the stack and keep a single-column well
  { type:"O", rot:0, x:4 },
  { type:"T", rot:2, x:3 },
  { type:"L", rot:1, x:6 },
  { type:"J", rot:3, x:0 },

  // Final: vertical I into the well (clear 4 lines)
  { type:"I", rot:1, x:4 },
];

let scriptIndex = 0;

// --- Current piece state ---
let current = spawnFromScript(SCRIPT[scriptIndex]);
let dropAcc = 0;
const DROP_MS = 45;     // fast gravity
const LOCK_DELAY_MS = 80; // tiny pause before locking (feels nicer)
let lockTimer = 0;

let linesClearedTotal = 0;

// --- Explosion particles ---
let particles = [];
let state = "play"; // play -> explode -> done
let fadeStarted = false;

function spawnFromScript(step) {
  let mat = clone4(SHAPES[step.type]);
  for (let i = 0; i < (step.rot % 4); i++) mat = rotateCW(mat);
  return { key: step.type, mat, x: step.x, y: -1 };
}

function collides(piece, dx, dy, matOverride) {
  const mat = matOverride || piece.mat;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!mat[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;

      if (nx < 0 || nx >= COLS) return true;
      if (ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function lockPiece(piece) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!piece.mat[r][c]) continue;
      const x = piece.x + c;
      const y = piece.y + r;
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        board[y][x] = piece.key;
      }
    }
  }
}

function clearLines() {
  let cleared = [];
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      cleared.push(r);
    }
  }
  if (!cleared.length) return 0;

  // particles per cleared row (kept light for performance)
  for (const row of cleared) burstRow(row);

  for (const row of cleared) {
    board.splice(row, 1);
    board.unshift(Array(COLS).fill(null));
  }
  return cleared.length;
}

function burstRow(row) {
  const { x: ox, y: oy } = gridOrigin();
  const y = oy + row * CELL + CELL / 2;
  const count = 120; // moderate, smooth
  for (let i = 0; i < count; i++) {
    particles.push({
      x: ox + Math.random() * GRID_W,
      y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.9) * 8,
      life: 50,
      size: 2 + Math.random() * 2,
    });
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25;
    p.life -= 1;
  }
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  if (!particles.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = "#5aa9ff";
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 50);
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// --- Drawing ---
function drawBackground() {
  ctx.fillStyle = "#0a0f1c";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // subtle ambient dots
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#5aa9ff";
  for (let i = 0; i < 50; i++) {
    const x = (i * 97 + performance.now() * 0.02) % window.innerWidth;
    const y = (i * 173 + performance.now() * 0.015) % window.innerHeight;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

function drawCell(px, py, color) {
  ctx.save();
  ctx.fillStyle = color;

  ctx.globalAlpha = 0.16;
  ctx.fillRect(px - 2, py - 2, CELL + 4, CELL + 4);

  ctx.globalAlpha = 1;
  ctx.fillRect(px, py, CELL, CELL);

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(px + 2, py + 2, CELL - 4, 3);
  ctx.restore();
}

function drawBoard() {
  const { x: ox, y: oy } = gridOrigin();

  // border
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#5aa9ff";
  ctx.strokeRect(ox - 1, oy - 1, GRID_W + 2, GRID_H + 2);
  ctx.restore();

  // locked blocks
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = board[r][c];
      if (!k) continue;
      drawCell(ox + c * CELL, oy + r * CELL, COLORS[k] || "#5aa9ff");
    }
  }

  // current piece
  if (current) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!current.mat[r][c]) continue;
        const x = current.x + c;
        const y = current.y + r;
        if (y < 0) continue;
        drawCell(ox + x * CELL, oy + y * CELL, COLORS[current.key] || "#5aa9ff");
      }
    }
  }
}

// --- Main loop ---
let last = performance.now();

function frame(now) {
  const dt = now - last;
  last = now;

  drawBackground();
  drawBoard();

  if (state === "play") {
    dropAcc += dt;

    while (dropAcc >= DROP_MS) {
      dropAcc -= DROP_MS;

      // try move down
      if (!collides(current, 0, 1)) {
        current.y += 1;
        lockTimer = 0;
      } else {
        // lock delay for nicer feel
        lockTimer += DROP_MS;
        if (lockTimer >= LOCK_DELAY_MS) {
          lockPiece(current);

          const cleared = clearLines();
          linesClearedTotal += cleared;

          scriptIndex++;
          if (scriptIndex < SCRIPT.length) {
            current = spawnFromScript(SCRIPT[scriptIndex]);
          } else {
            // end if script finishes (fallback)
            state = "explode";
          }

          lockTimer = 0;

          // Trigger cinematic ending after 4+ lines total
          if (linesClearedTotal >= 4) {
            state = "explode";
          }
        }
      }
    }
  } else if (state === "explode") {
    updateParticles();
    drawParticles();

    // keep a tiny bit of particle time, then fade
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

// --- Scroll fade ---
const faders = document.querySelectorAll(".fade");
const observer = new IntersectionObserver(
  entries => entries.forEach(e => e.isIntersecting && e.target.classList.add("visible")),
  { threshold: 0.12 }
);
faders.forEach(el => observer.observe(el));
