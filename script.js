// =============================
// I did not code this Site - ChatGPT was used for the Site Coding
// Any Embedded System coding is done by me 
// =============================
// Fast Cinematic Real Tetris Intro
// =============================

const intro = document.getElementById("intro");
const content = document.getElementById("content");
const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const CELL = 24;
const ROWS = 16;   // smaller board = faster fill
const COLS = 10;

const GRID_W = COLS * CELL;
const GRID_H = ROWS * CELL;

function gridOrigin() {
  return {
    x: Math.floor((canvas.width - GRID_W) / 2),
    y: Math.floor((canvas.height - GRID_H) / 2),
  };
}

const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  T: [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
  S: [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
  Z: [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
  J: [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
  L: [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
};

const COLORS = {
  I:"#39c6ff",
  O:"#ffd24a",
  T:"#b884ff",
  S:"#58e06f",
  Z:"#ff5c6c",
  J:"#4f79ff",
  L:"#ff9a3c"
};

const PIECES = ["I","O","T","I","O","T","L","J"]; 
// slight bias to flat pieces

let board = Array.from({length: ROWS}, () => Array(COLS).fill(null));

function rotate(mat) {
  return mat[0].map((_,i)=>mat.map(r=>r[i]).reverse());
}

function randomPiece() {
  const key = PIECES[Math.floor(Math.random()*PIECES.length)];
  let mat = SHAPES[key];
  const rotations = Math.floor(Math.random()*4);
  for(let i=0;i<rotations;i++) mat = rotate(mat);
  return { key, mat, x:3, y:-1 };
}

function collides(p, dx, dy) {
  for(let r=0;r<4;r++){
    for(let c=0;c<4;c++){
      if(!p.mat[r][c]) continue;
      const nx = p.x + c + dx;
      const ny = p.y + r + dy;
      if(nx<0||nx>=COLS||ny>=ROWS) return true;
      if(ny>=0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function lock(p) {
  for(let r=0;r<4;r++){
    for(let c=0;c<4;c++){
      if(p.mat[r][c]){
        const x=p.x+c;
        const y=p.y+r;
        if(y>=0) board[y][x]=p.key;
      }
    }
  }
}

function clearLines() {
  let cleared=0;
  for(let r=ROWS-1;r>=0;r--){
    if(board[r].every(cell=>cell)){
      board.splice(r,1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  return cleared;
}

let piece=randomPiece();
let dropSpeed=50; // very fast
let last=0;
let linesCleared=0;
let particles=[];
let state="play";

function explode() {
  const {x,y}=gridOrigin();
  for(let i=0;i<250;i++){
    particles.push({
      x:x+GRID_W/2,
      y:y+GRID_H/2,
      dx:(Math.random()-0.5)*8,
      dy:(Math.random()-1)*8,
      life:60
    });
  }
}

function updateParticles() {
  particles.forEach(p=>{
    p.x+=p.dx;
    p.y+=p.dy;
    p.dy+=0.3;
    p.life--;
  });
  particles=particles.filter(p=>p.life>0);
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation="lighter";
  particles.forEach(p=>{
    ctx.globalAlpha=p.life/60;
    ctx.fillStyle="#5aa9ff";
    ctx.fillRect(p.x,p.y,3,3);
  });
  ctx.restore();
  ctx.globalAlpha=1;
}

function drawBoard() {
  const {x:ox,y:oy}=gridOrigin();
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(board[r][c]){
        ctx.fillStyle=COLORS[board[r][c]];
        ctx.fillRect(ox+c*CELL,oy+r*CELL,CELL,CELL);
      }
    }
  }
}

function drawPiece() {
  const {x:ox,y:oy}=gridOrigin();
  for(let r=0;r<4;r++){
    for(let c=0;c<4;c++){
      if(piece.mat[r][c]){
        ctx.fillStyle=COLORS[piece.key];
        ctx.fillRect(ox+(piece.x+c)*CELL,oy+(piece.y+r)*CELL,CELL,CELL);
      }
    }
  }
}

function loop(timestamp){
  ctx.fillStyle="#0a0f1c";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if(state==="play"){
    if(timestamp-last>dropSpeed){
      if(!collides(piece,0,1)){
        piece.y++;
      } else {
        lock(piece);
        const cleared=clearLines();
        linesCleared+=cleared;
        piece=randomPiece();
        if(linesCleared>=2){ // trigger after 2 lines
          state="explode";
          explode();
        }
      }
      last=timestamp;
    }
  }

  drawBoard();
  drawPiece();

  if(state==="explode"){
    updateParticles();
    drawParticles();
    if(particles.length===0){
      intro.style.opacity="0";
      setTimeout(()=>{
        intro.style.display="none";
        content.style.opacity="1";
      },500);
    }
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
