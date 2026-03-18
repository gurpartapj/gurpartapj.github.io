// =============================
// Fast Scripted Tetris Intro + Page Animations
// =============================

const intro = document.getElementById("intro");
const content = document.getElementById("content");
const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

// ---------- Page fade animations ----------
const faders = document.querySelectorAll(".fade");
const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  },
  { threshold: 0.15 }
);
faders.forEach(section => observer.observe(section));

// subtle hero motion
document.addEventListener("mousemove", (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 10;
  const y = (e.clientY / window.innerHeight - 0.5) * 10;

  document.querySelectorAll(".hero-card").forEach(el => {
    el.style.transform = `translate(${x * 0.5}px, ${y * 0.5}px)`;
  });
});

// ---------- Stop here if intro canvas doesn't exist ----------
if (!intro || !content || !canvas || !ctx) {
  content?.style && (content.style.opacity = "1");
} else {
  // ---------- Canvas sizing ----------
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // ---------- Tetris board ----------
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
    L: [
      [0,0,1,0],
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
    L: "#ff9a3c",
    J: "#4f79ff",
    S: "#58e06f",
    Z: "#ff5c6c",
  };

  function clone4(m) {
    return m.map(r => r.slice());
  }

  function rotateCW(mat) {
    const res = Array.from({ length: 4 }, () => Array(4).fill(0));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        res[c][3 - r] = mat[r][c];
      }
    }
    return res;
  }

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
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (mat[r][c]) maxC = Math.max(maxC, c);
      }
    }
    return maxC + 1;
  }

  let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  // Scripted sequence: varied pieces, clean stack, final I for 4-line clear
  const SCRIPT = [
    { type: "J", rot: 1, targetX: 1 },
    { type: "L", rot: 3, targetX: 4 },
    { type: "S", rot: 0, targetX: 6 },
    { type: "Z", rot: 0, targetX: 3 },
    { type: "T", rot: 2, targetX: 5 },

    { type: "L", rot: 1, targetX: 2 },
    { type: "J", rot: 3, targetX: 6 },
    { type: "T", rot: 1, targetX: 4 },
    { type: "O", rot: 0, targetX: 7 },

    { type: "S", rot: 0, targetX: 2 },
    { type: "Z", rot: 0, targetX: 5 },
    { type: "L", rot: 2, targetX: 7 },

    { type: "T", rot: 0, targetX: 3 },
    { type: "J", rot: 2, targetX: 6 },

    { type: "I", rot: 1, targetX: 0 }, // final Tetris
  ];

  function spawn(step) {
    let mat = clone4(SHAPES[step.type]);
    for (let i = 0; i < step.rot; i++) mat = rotateCW(mat);
    mat = normalize(mat);

    const w = pieceWidth(mat);
    return {
      type: step.type,
      mat,
      x: Math.floor((COLS - w) / 2),
      y: -2,
      targetX: Math.max(0, Math.min(step.targetX, COLS - w)),
    };
  }

  function collides(piece, dx, dy) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!piece.mat[r][c]) continue;
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
        if (y >= 0) board[y][x] = piece.type;
      }
    }
  }

  let particles = [];

  function burstRow(row) {
    const { x: ox, y: oy } = gridOrigin();
    const y = oy + row * CELL + CELL / 2;
    for (let i = 0; i < 90; i++) {
      particles.push({
        x: ox + Math.random() * GRID_W,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.9) * 7,
        life: 42,
        size: 2 + Math.random() * 1.5,
      });
    }
  }

  function clearLines() {
    let clearedRows = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== null)) clearedRows.push(r);
    }
    if (!clearedRows.length) return 0;

    clearedRows.forEach(burstRow);

    for (const r of clearedRows) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
    }
    return clearedRows.length;
  }

  function updateParticles() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.life--;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / 42);
      ctx.fillStyle = "#5aa9ff";
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawCell(px, py, color) {
    ctx.save();
    ctx.fillStyle = color;

    ctx.globalAlpha = 0.15;
    ctx.fillRect(px - 2, py - 2, CELL + 4, CELL + 4);

    ctx.globalAlpha = 1;
    ctx.fillRect(px, py, CELL, CELL);

    ctx.globalAlpha = 0.13;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px + 2, py + 2, CELL - 4, 3);

    ctx.restore();
  }

  function drawBackground() {
    ctx.fillStyle = "#0a0f1c";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#5aa9ff";
    const t = performance.now();
    for (let i = 0; i < 38; i++) {
      const x = (i * 101 + t * 0.02) % window.innerWidth;
      const y = (i * 173 + t * 0.015) % window.innerHeight;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  }

  function drawBoardAndPiece(current) {
    const { x: ox, y: oy } = gridOrigin();

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#5aa9ff";
    ctx.strokeRect(ox - 1, oy - 1, GRID_W + 2, GRID_H + 2);
    ctx.restore();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = board[r][c];
        if (type) drawCell(ox + c * CELL, oy + r * CELL, COLORS[type]);
      }
    }

    if (!current) return;

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

  let scriptIndex = 0;
  let current = spawn(SCRIPT[scriptIndex++]);

  // faster timing
  const DROP_MS = 24;
  const MOVE_MS = 30;
  const LOCK_DELAY_MS = 26;

  let last = performance.now();
  let dropAcc = 0;
  let moveAcc = 0;
  let lockAcc = 0;
  let state = "play";
  let fadeStarted = false;
  let totalCleared = 0;

  function nextPiece() {
    if (scriptIndex >= SCRIPT.length) return null;
    return spawn(SCRIPT[scriptIndex++]);
  }

  function loop(now) {
    const dt = now - last;
    last = now;

    drawBackground();
    drawBoardAndPiece(current);

    if (state === "play" && current) {
      dropAcc += dt;
      moveAcc += dt;

      while (moveAcc >= MOVE_MS) {
        moveAcc -= MOVE_MS;
        if (current.x < current.targetX && !collides(current, 1, 0)) current.x++;
        else if (current.x > current.targetX && !collides(current, -1, 0)) current.x--;
      }

      while (dropAcc >= DROP_MS) {
        dropAcc -= DROP_MS;

        if (!collides(current, 0, 1)) {
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

            if (cleared >= 4 || totalCleared >= 4 || !current) {
              state = "explode";
            }
          }
        }
      }
    } else if (state === "explode") {
      updateParticles();
      drawParticles();

      if (!fadeStarted && particles.length < 20) {
        fadeStarted = true;
        intro.style.opacity = "0";
        setTimeout(() => {
          intro.style.display = "none";
          content.style.opacity = "1";
        }, 550);
      }
    }

    requestAnimationFrame(loop);
  }

  loop(performance.now());
}
