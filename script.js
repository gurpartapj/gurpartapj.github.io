// =============================
// I did not code this Site - ChatGPT was used for the Site Coding
// Any Embedded System coding is done by me 
// Cinematic 4-Line Tetris Intro
// Explosion + Flash + Subtle Shake
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

const CELL = 24;
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

const COLORS = ["#39c6ff","#ffd24a","#b884ff","#58e06f","#ff5c6c","#4f79ff","#ff9a3c"];

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let particles = [];
let time = 0;

// Random gap column for guaranteed Tetris
const gapColumn = Math.floor(Math.random() * COLS);

// Pre-fill bottom 4 rows except gap column
for (let r = ROWS - 4; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    if (c !== gapColumn) {
      board[r][c] = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
  }
}

// Random visual filler blocks (lightweight)
let filler = [];
function createFiller() {
  return {
    x: Math.random() * window.innerWidth,
    y: -20,
    size: 20,
    speed: 2 + Math.random() * 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  };
}

function updateFiller() {
  if (filler.length < 25) filler.push(createFiller());
  filler.forEach(b => b.y += b.speed);
  filler = filler.filter(b => b.y < window.innerHeight);
}

function drawFiller() {
  filler.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.size, b.size);
  });
}

// Explosion particles
function createExplosion(cx, cy) {
  for (let i = 0; i < 300; i++) {
    particles.push({
      x: cx,
      y: cy,
      dx: (Math.random() - 0.5) * 10,
      dy: (Math.random() - 1.3) * 10,
      life: 70,
      size: 3
    });
  }
}

function updateParticles() {
  particles.forEach(p => {
    p.x += p.dx;
    p.y += p.dy;
    p.dy += 0.3;
    p.life--;
  });
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  particles.forEach(p => {
    ctx.globalAlpha = p.life / 70;
    ctx.fillStyle = "#5aa9ff";
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Draw board
function drawBoard(shakeX = 0, shakeY = 0) {
  const { x: ox, y: oy } = gridOrigin();
  ctx.save();
  ctx.translate(shakeX, shakeY);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        ctx.fillStyle = board[r][c];
        ctx.fillRect(ox + c * CELL, oy + r * CELL, CELL, CELL);
      }
    }
  }

  ctx.restore();
}

// I-piece drop
let iY = -4;
let dropStarted = false;
let explosionTriggered = false;
let flashAlpha = 0;
let shakeIntensity = 0;

function loop() {
  ctx.fillStyle = "#0a0f1c";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  time += 16;

  updateFiller();
  drawFiller();

  let shakeX = 0;
  let shakeY = 0;

  if (shakeIntensity > 0) {
    shakeX = (Math.random() - 0.5) * shakeIntensity;
    shakeY = (Math.random() - 0.5) * shakeIntensity;
    shakeIntensity *= 0.9; // decay
  }

  drawBoard(shakeX, shakeY);

  const { x: ox, y: oy } = gridOrigin();

  if (time > 1500) dropStarted = true;

  if (dropStarted && !explosionTriggered) {
    iY += 0.6;

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = "#39c6ff";
      ctx.fillRect(
        ox + gapColumn * CELL + shakeX,
        oy + (iY + i) * CELL + shakeY,
        CELL,
        CELL
      );
    }

    if (iY + 3 >= ROWS - 1) {
      explosionTriggered = true;

      const cx = ox + gapColumn * CELL + CELL / 2;
      const cy = oy + (ROWS - 2) * CELL;

      createExplosion(cx, cy);

      flashAlpha = 0.6;
      shakeIntensity = 10;
    }
  }

  updateParticles();
  drawParticles();

  // Screen flash
  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(90,169,255,${flashAlpha})`;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    flashAlpha *= 0.85;
  }

  // Fade to site
  if (explosionTriggered && particles.length === 0) {
    intro.style.transition = "opacity 0.5s ease";
    intro.style.opacity = "0";
    setTimeout(() => {
      intro.style.display = "none";
      content.style.opacity = "1";
    }, 500);
  }

  requestAnimationFrame(loop);
}

loop();

// Scroll fade animation
const faders = document.querySelectorAll(".fade");
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
});
faders.forEach(section => observer.observe(section));
