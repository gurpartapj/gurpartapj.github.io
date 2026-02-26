// ======= Performance-friendly Mini Tetris Intro =======

const intro = document.getElementById("intro");
const content = document.getElementById("content");
const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d", { alpha: false }); // faster than default

// --- Responsive canvas with DPR scaling (crisp + less lag) ---
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap DPR for performance
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

// ======= Grid sizing =======
const CELL = 22;                 // size of a tetris cell in px
const ROWS = 18;                 // small grid for quick fill
const COLS = 10;
const GRID_W = COLS * CELL;
const GRID_H = ROWS * CELL;

// Center grid on screen
function gridOrigin() {
  return {
    x: Math.floor((window.innerWidth - GRID_W) / 2),
    y: Math.floor((window.innerHeight - GRID_H) / 2),
  };
}

// ======= Tetromino shapes (4x4 matrices) =======
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

// Unique colors per piece
const COLORS = {
  I: "#39c6ff", // cyan-ish
  O: "#ffd24a", // yellow
  T: "#b884ff", // purple
  S: "#58e06f", // green
  Z: "#ff5c6c", // red
  J: "#4f79ff", // blue
  L: "#ff9a3c", // orange
};

const PIECE_KEYS = Object.keys(SHAPES);

// ======= Helpers =======
function clone4(m) {
  return m.map(row => row.slice());
}

function rotateCW(mat) {
  // 4x4 rotate
  const res = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      res[c][3 - r] = mat[r][c];
    }
  }
  return res;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ======= Board =======
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

// ======= Particle burst (lightweight) =======
let particles = [];
function burstAt(row) {
  // Create a small number of particles across the cleared row (performance friendly)
  const { x: ox, y: oy } = gridOrigin();
  const y = oy + row * CELL + CELL / 2;

  const count = 90; // keep low to avoid lag
  for (let i = 0; i < count; i++) {
    const px = ox + Math.random() * GRID_W;
    particles.push({
      x: px,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.8) * 7,
      life: randInt(20, 38),
      size: randInt(1, 3),
    });
  }
}

function updateParticles() {
  // No shadows here for speed
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25;     // gravity
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
    ctx.globalAlpha = Math.max(0, p.life / 38);
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ======= Current falling piece =======
let current = null;

function newPiece() {
  const key = pick(PIECE_KEYS);
  let mat = clone4(SHAPES[key]);

  // Random rotation 0-3
  const rot = randInt(0, 3);
  for (let i = 0; i < rot; i++) mat = rotateCW(mat);

  // Random x position within bounds
  // We'll start near top. Try random positions; if collision, retry a few times.
  const tries = 10;
  for (let t = 0; t < tries; t++) {
    const x = randInt(-1, COLS - 3); // allow slight left shift; collision checks will handle
    const piece = { key, mat, x, y: -1 }; // y starts above board
    if (!collides(piece, 0, 0)) return piece;
  }
  // fallback
  return { key, mat, x: 3, y: -1 };
}

function collides(piece, dx, dy, testMat) {
  const mat = testMat || piece.mat;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!mat[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      // Outside bottom
      if (ny >= ROWS) return true;
      // Outside sides
      if (nx < 0 || nx >= COLS) return true;
      // Hit existing blocks (ignore rows above the visible board)
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

  // burst for each cleared row
  cleared.forEach(row => burstAt(row));

  // remove cleared rows and add empty rows at top
  for (const row of cleared) {
    board.splice(row, 1);
    board.unshift(Array(COLS).fill(null));
  }
  return cleared.length;
}

// ======= Drawing =======
function drawBackground() {
  // Matte dark with a subtle vignette
  ctx.fillStyle = "#0a0f1c";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  // Subtle floating particles behind grid (very light)
  // (Optional minimal effect — cheap)
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#5aa9ff";
  for (let i = 0; i < 50; i++) {
    const x = (i * 97 + (time * 0.03)) % window.innerWidth;
    const y = (i * 173 + (time * 0.02)) % window.innerHeight;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

function drawGrid() {
  const { x: ox, y: oy } = gridOrigin();

  // Soft border
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "#5aa9ff";
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 1, oy - 1, GRID_W + 2, GRID_H + 2);
  ctx.restore();

  // Board blocks
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = board[r][c];
      if (!k) continue;
      drawCell(ox + c * CELL, oy + r * CELL, COLORS[k]);
    }
  }

  // Current piece
  if (current) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!current.mat[r][c]) continue;
        const x = current.x + c;
        const y = current.y + r;
        if (y < 0) continue;
        drawCell(ox + x * CELL, oy + y * CELL, COLORS[current.key]);
      }
    }
  }
}

function drawCell(px, py, color) {
  // Subtle glow but not too expensive
  ctx.save();
  ctx.fillStyle = color;

  // glow (cheap): draw a slightly larger translucent rect behind
  ctx.globalAlpha = 0.18;
  ctx.fillRect(px - 2, py - 2, CELL + 4, CELL + 4);

  ctx.globalAlpha = 1;
  ctx.fillRect(px, py, CELL, CELL);

  // inner highlight
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(px + 2, py + 2, CELL - 4, 3);
  ctx.restore();
}

// ======= Game Loop Timing =======
let last = performance.now();
let acc = 0;
let time = 0;

let dropInterval = 60;     // ms between moves (fast so it doesn’t take long)
let state = "play";        // play -> explode -> done
let explodeTimer = 0;

// Ensure it finishes quickly: once we clear 1 line, we end intro
const LINES_TO_FINISH = 1;
let linesClearedTotal = 0;

current = newPiece();

// Main loop
function frame(now) {
  const dt = now - last;
  last = now;
  time += dt;
  acc += dt;

  drawBackground();

  if (state === "play") {
    // Move down at fixed intervals
    while (acc >= dropInterval) {
      acc -= dropInterval;

      if (!collides(current, 0, 1)) {
        current.y += 1;
      } else {
        // lock + clear
        lockPiece(current);
        const cleared = clearLines();
        linesClearedTotal += cleared;

        // spawn next
        current = newPiece();

        // if board is too full (top collision), force transition anyway
        if (collides(current, 0, 0)) {
          state = "explode";
          explodeTimer = 0;
        }

        // transition after 1 line clear
        if (linesClearedTotal >= LINES_TO_FINISH) {
          state = "explode";
          explodeTimer = 0;
        }
      }
    }
  } else if (state === "explode") {
    // run particles for a short time then fade to site
    explodeTimer += dt;

    // keep generating a tiny extra burst early for “pop”
    if (explodeTimer < 140 && particles.length < 160) {
      burstAt(randInt(Math.floor(ROWS * 0.4), ROWS - 2));
    }

    if (explodeTimer > 650) {
      // fade out intro smoothly
      intro.style.transition = "opacity 450ms ease";
      intro.style.opacity = "0";
      state = "done";

      setTimeout(() => {
        intro.style.display = "none";
        content.style.opacity = "1";
      }, 460);
    }
  }

  drawGrid();

  updateParticles();
  drawParticles();

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// ======= Reveal sections on scroll =======
const faders = document.querySelectorAll(".fade");
const observer = new IntersectionObserver(
  entries => entries.forEach(e => e.isIntersecting && e.target.classList.add("visible")),
  { threshold: 0.12 }
);
faders.forEach(el => observer.observe(el));
